<?php

namespace App\Http\Controllers;

use App\Ai\Agents\GeneralistAgent;
use App\Ai\Services\AgentBlueprintRegistry;
use App\Ai\Services\McpServerManager;
use App\Ai\Services\ToolRegistry;
use App\Events\AgentRunEventCreated;
use App\Events\TaskStatusUpdated;
use App\Jobs\ExecuteAgentTaskJob;
use App\Models\AgentNode;
use App\Models\McpServer;
use App\Models\Project;
use App\Models\SystemSetting;
use App\Models\Task;
use App\Models\ToolApproval;
use App\Models\Workflow;
use App\Services\WorkspaceManagerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function __construct(
        protected AgentBlueprintRegistry $blueprintRegistry,
        protected ToolRegistry $toolRegistry,
        protected McpServerManager $mcpManager,
        protected WorkspaceManagerService $workspaceService
    ) {}

    public function index(?string $projectId = null): Response
    {
        // 1. Get or create active project
        $project = $projectId ? Project::find($projectId) : Project::first();

        if (! $project) {
            $project = Project::create([
                'name' => 'My Website',
                'workspace_path' => env('WORKSPACE_DEFAULT_PATH', '/workspaces/website'),
                'default_branch' => 'main',
                'workspace_mode' => 'isolated_worktree',
                'monthly_budget_usd' => 50.00,
            ]);
        }

        // 2. Get or create active workflow with default starter nodes if empty
        $workflow = $project->workflows()->first();
        if (! $workflow) {
            $workflow = $project->workflows()->create([
                'name' => 'Autonomous Engineering Team',
            ]);

            // Create starter nodes: Planner -> Frontend Dev & Backend Dev -> QA Reviewer
            $planner = $workflow->agentNodes()->create([
                'name' => 'Tech Lead',
                'role_title' => 'Planner & Lead Architect',
                'agent_class' => 'App\\Ai\\Agents\\PlannerAgent',
                'provider' => 'gemini',
                'model_name' => 'gemini-3.5-flash-lite',
                'reasoning_effort' => 'high',
                'instructions' => 'Break down website feature requests into modular frontend and backend tasks. Delegate them to your engineers.',
                'enabled_tools' => ['App\\Ai\\Tools\\ReadFileTool', 'App\\Ai\\Tools\\ListDirectoryTool', 'App\\Ai\\Tools\\GitStatusTool'],
                'tools_requiring_approval' => [],
                'max_task_budget_usd' => 2.00,
                'position_xy' => ['x' => 100, 'y' => 150],
            ]);

            $coder = $workflow->agentNodes()->create([
                'name' => 'Full-Stack Developer',
                'role_title' => 'Software Engineer',
                'agent_class' => 'App\\Ai\\Agents\\CodingAgent',
                'provider' => 'gemini',
                'model_name' => 'gemini-3.5-flash-lite',
                'reasoning_effort' => 'medium',
                'instructions' => 'Implement features with clean code, modern UI styling, and robust error handling.',
                'enabled_tools' => [
                    'App\\Ai\\Tools\\ReadFileTool',
                    'App\\Ai\\Tools\\WriteFileTool',
                    'App\\Ai\\Tools\\EditFileTool',
                    'App\\Ai\\Tools\\ListDirectoryTool',
                    'App\\Ai\\Tools\\RunCommandTool',
                    'App\\Ai\\Tools\\GitStatusTool',
                    'App\\Ai\\Tools\\GitDiffTool',
                ],
                'tools_requiring_approval' => ['App\\Ai\\Tools\\RunCommandTool'],
                'max_task_budget_usd' => 3.00,
                'position_xy' => ['x' => 450, 'y' => 80],
            ]);

            $reviewer = $workflow->agentNodes()->create([
                'name' => 'QA & Security',
                'role_title' => 'Code Reviewer',
                'agent_class' => 'App\\Ai\\Agents\\ReviewerAgent',
                'provider' => 'gemini',
                'model_name' => 'gemini-3.5-flash-lite',
                'reasoning_effort' => 'medium',
                'instructions' => 'Inspect git diffs and test results. Verify that no regressions were introduced.',
                'enabled_tools' => ['App\\Ai\\Tools\\ReadFileTool', 'App\\Ai\\Tools\\GitDiffTool', 'App\\Ai\\Tools\\RunCommandTool'],
                'tools_requiring_approval' => [],
                'max_task_budget_usd' => 1.50,
                'position_xy' => ['x' => 800, 'y' => 150],
            ]);

            // Create delegation edges: Planner -> Coder, and Coder -> Reviewer
            $workflow->agentEdges()->create([
                'source_node_id' => $planner->id,
                'target_node_id' => $coder->id,
                'label' => 'Delegates Implementation',
            ]);

            $workflow->agentEdges()->create([
                'source_node_id' => $planner->id,
                'target_node_id' => $reviewer->id,
                'label' => 'Delegates Verification',
            ]);
        }

        // 3. Load relations
        $workflow->load(['agentNodes.mcpServers', 'agentEdges']);

        $tasks = $project->tasks()
            ->with(['assignedAgent', 'subtasks.assignedAgent', 'runs.events', 'approvals'])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Workspace/Index', [
            'project' => $project,
            'workflows' => $project->workflows()->with(['agentNodes.mcpServers', 'agentEdges'])->get(),
            'currentWorkflow' => $workflow,
            'tasks' => $tasks,
            'blueprints' => $this->blueprintRegistry->discoverBlueprints(),
            'availableTools' => $this->toolRegistry->discoverTools(),
            'mcpServers' => McpServer::all(),
            'reverb' => [
                'key' => env('REVERB_APP_KEY'),
                'host' => env('REVERB_HOST', 'localhost'),
                'port' => env('REVERB_PORT', 8080),
                'scheme' => env('REVERB_SCHEME', 'http'),
            ],
        ]);
    }

    public function saveWorkflow(Request $request, Workflow $workflow): JsonResponse
    {
        $validated = $request->validate([
            'nodes' => 'required|array',
            'edges' => 'present|array',
            'viewport' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($workflow, $validated) {
            if (isset($validated['viewport'])) {
                $workflow->update(['viewport_state' => $validated['viewport']]);
            }

            $existingNodeIds = [];

            // Save nodes
            foreach ($validated['nodes'] as $nodeData) {
                $nodeId = $nodeData['id'] ?? null;
                $data = [
                    'name' => $nodeData['name'] ?? 'Agent',
                    'role_title' => $nodeData['role_title'] ?? 'Specialist',
                    'agent_class' => $nodeData['agent_class'] ?? 'App\\Ai\\Agents\\CodingAgent',
                    'provider' => $nodeData['provider'] ?? 'gemini',
                    'model_name' => $nodeData['model_name'] ?? 'gemini-3.5-flash',
                    'reasoning_effort' => $nodeData['reasoning_effort'] ?? null,
                    'instructions' => $nodeData['instructions'] ?? '',
                    'enabled_tools' => $nodeData['enabled_tools'] ?? [],
                    'tools_requiring_approval' => $nodeData['tools_requiring_approval'] ?? [],
                    'max_task_budget_usd' => $nodeData['max_task_budget_usd'] ?? null,
                    'position_xy' => $nodeData['position_xy'] ?? ['x' => 0, 'y' => 0],
                ];

                if ($nodeId && $existing = AgentNode::find($nodeId)) {
                    $existing->update($data);
                    $existingNodeIds[] = $existing->id;
                    $targetNode = $existing;
                } else {
                    if ($nodeId) {
                        $data['id'] = $nodeId;
                    }
                    $created = $workflow->agentNodes()->create($data);
                    $existingNodeIds[] = $created->id;
                    $targetNode = $created;
                }

                if (isset($nodeData['mcp_servers']) && is_array($nodeData['mcp_servers'])) {
                    $mcpIds = collect($nodeData['mcp_servers'])->pluck('id')->filter()->all();
                    $targetNode->mcpServers()->sync($mcpIds);
                }
            }

            // Delete nodes that were removed by the user
            $workflow->agentNodes()->whereNotIn('id', $existingNodeIds)->delete();

            // Save edges safely
            $workflow->agentEdges()->delete();
            foreach ($validated['edges'] as $edgeData) {
                $source = $edgeData['source'] ?? null;
                $target = $edgeData['target'] ?? null;

                if ($source && $target && in_array($source, $existingNodeIds) && in_array($target, $existingNodeIds)) {
                    $workflow->agentEdges()->create([
                        'source_node_id' => $source,
                        'target_node_id' => $target,
                        'label' => $edgeData['label'] ?? null,
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'workflow' => $workflow->fresh(['agentNodes.mcpServers', 'agentEdges']),
            ]);
        });
    }

    public function createTask(Request $request, Project $project): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'workflow_id' => 'required|uuid|exists:workflows,id',
            'assigned_node_id' => 'nullable|uuid|exists:agent_nodes,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'attachments' => 'nullable|array',
            'budget_limit_usd' => 'nullable|numeric|min:0.1',
        ]);

        $task = $project->tasks()->create([
            'workflow_id' => $validated['workflow_id'],
            'assigned_node_id' => $validated['assigned_node_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'attachments' => $validated['attachments'] ?? null,
            'budget_limit_usd' => $validated['budget_limit_usd'] ?? 5.00,
            'status' => 'queued',
        ]);

        // Dispatch background execution job
        ExecuteAgentTaskJob::dispatch($task);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'task' => $task]);
        }

        return back();
    }

    public function addMessage(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'attachments' => 'nullable|array',
        ]);

        $run = $task->latestRun() ?? $task->runs()->create([
            'agent_node_id' => $task->assigned_node_id,
            'status' => 'running',
        ]);

        $event = $run->events()->create([
            'task_id' => $task->id,
            'sequence' => ($run->events()->max('sequence') ?? 0) + 1,
            'event_type' => 'user_message',
            'payload' => [
                'text' => $validated['message'],
                'attachments' => $validated['attachments'] ?? [],
            ],
        ]);

        event(new AgentRunEventCreated($event));

        // Re-dispatch task to process human message
        $task->update([
            'description' => $task->description."\n\nUser: ".$validated['message'],
            'status' => 'queued',
        ]);

        ExecuteAgentTaskJob::dispatch($task);

        return response()->json(['success' => true, 'event' => $event]);
    }

    public function handleApproval(Request $request, ToolApproval $approval): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'decision_reason' => 'nullable|string',
            'modified_arguments' => 'nullable|array',
        ]);

        $approval->update([
            'status' => $validated['status'],
            'decision_reason' => $validated['decision_reason'] ?? null,
            'modified_arguments' => $validated['modified_arguments'] ?? null,
        ]);

        $task = $approval->task;

        if ($validated['status'] === 'approved') {
            $task->update(['status' => 'queued']);
            ExecuteAgentTaskJob::dispatch($task);
        } else {
            $task->update(['status' => 'queued', 'description' => $task->description."\n\nSystem: Tool call {$approval->tool_name} was REJECTED by human operator: ".($validated['decision_reason'] ?? 'No reason provided')]);
            ExecuteAgentTaskJob::dispatch($task);
        }

        return response()->json(['success' => true, 'approval' => $approval]);
    }

    public function getDiff(Task $task): JsonResponse
    {
        $changes = $this->workspaceService->getTaskChanges($task);

        return response()->json($changes);
    }

    public function mergeTask(Request $request, Task $task): JsonResponse
    {
        // If task has an isolated worktree branch, merge it
        if (! empty($task->worktree_path) && ! empty($task->git_branch) && File::isDirectory($task->worktree_path)) {
            $success = $this->workspaceService->mergeAndCleanupWorktree($task);

            if (! $success) {
                return response()->json(['success' => false, 'message' => 'Falha ao mesclar branch. Por favor verifique conflitos git.'], 422);
            }
        }

        // Always mark the task as completed upon approval
        $task->update(['status' => 'completed']);
        event(new TaskStatusUpdated($task));

        return response()->json([
            'success' => true,
            'message' => ! empty($task->worktree_path) ? 'Branch mesclada e worktree limpa com sucesso.' : 'Tarefa aprovada e concluída com sucesso.',
        ]);
    }

    public function retryTask(Task $task): JsonResponse
    {
        $task->update(['status' => 'queued']);
        event(new TaskStatusUpdated($task));

        ExecuteAgentTaskJob::dispatch($task);

        return response()->json(['success' => true, 'message' => 'Tarefa enfileirada para nova execução.']);
    }

    public function initGit(Request $request): JsonResponse
    {
        $project = Project::first();
        if (! $project) {
            return response()->json(['success' => false, 'message' => 'Projeto ativo não encontrado'], 404);
        }

        $dir = $this->workspaceService->resolveProjectBaseDirectory($project);
        if (! File::isDirectory($dir)) {
            return response()->json(['success' => false, 'message' => "Diretório não existe: {$dir}"], 404);
        }

        if (File::isDirectory($dir.'/.git')) {
            return response()->json(['success' => true, 'message' => 'Repositório Git já está inicializado.']);
        }

        Process::path($dir)->run(['git', 'init', '-b', 'main']);
        Process::path($dir)->run(['git', 'config', 'user.name', 'Antigravity Agent']);
        Process::path($dir)->run(['git', 'config', 'user.email', 'agent@antigravity.ai']);
        Process::path($dir)->run(['git', 'add', '-A']);
        Process::path($dir)->run(['git', 'commit', '-m', 'chore: initial repository commit']);

        return response()->json(['success' => true, 'message' => 'Repositório Git inicializado com sucesso com commit inicial!']);
    }

    public function saveMcpServer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'transport' => 'required|in:stdio,sse,streamable_http',
            'command_or_url' => 'required|string',
            'args_and_env' => 'nullable|array',
        ]);

        $server = McpServer::updateOrCreate(
            ['name' => $validated['name']],
            $validated
        );
        $tools = $this->mcpManager->discoverServerTools($server);

        return response()->json([
            'success' => true,
            'server' => $server->fresh(),
            'tools' => $tools,
        ]);
    }

    public function getSettings(): JsonResponse
    {
        $maskSecret = function (?string $val): string {
            if (empty($val)) {
                return '';
            }
            if (strlen($val) <= 8) {
                return '********';
            }

            return substr($val, 0, 4).'...'.substr($val, -4);
        };

        $result = [
            'gemini_api_key' => $maskSecret(SystemSetting::get('gemini_api_key') ?: config('ai.providers.gemini.key')),
            'anthropic_api_key' => $maskSecret(SystemSetting::get('anthropic_api_key') ?: config('ai.providers.anthropic.key')),
            'openai_api_key' => $maskSecret(SystemSetting::get('openai_api_key') ?: config('ai.providers.openai.key')),
            'deepseek_api_key' => $maskSecret(SystemSetting::get('deepseek_api_key') ?: config('ai.providers.deepseek.key')),
            'ollama_url' => SystemSetting::get('ollama_url') ?: config('ai.providers.ollama.url', 'http://host.docker.internal:11434'),
            'search_provider' => SystemSetting::get('search_provider', 'duckduckgo'),
            'tavily_api_key' => $maskSecret(SystemSetting::get('tavily_api_key')),
            'default_workspace_path' => SystemSetting::get('default_workspace_path', '/workspaces/website'),
            'has_keys' => [
                'gemini' => ! empty(SystemSetting::get('gemini_api_key') ?: config('ai.providers.gemini.key')),
                'anthropic' => ! empty(SystemSetting::get('anthropic_api_key') ?: config('ai.providers.anthropic.key')),
                'openai' => ! empty(SystemSetting::get('openai_api_key') ?: config('ai.providers.openai.key')),
                'deepseek' => ! empty(SystemSetting::get('deepseek_api_key') ?: config('ai.providers.deepseek.key')),
                'tavily' => ! empty(SystemSetting::get('tavily_api_key')),
            ],
        ];

        return response()->json($result);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gemini_api_key' => 'nullable|string',
            'anthropic_api_key' => 'nullable|string',
            'openai_api_key' => 'nullable|string',
            'deepseek_api_key' => 'nullable|string',
            'ollama_url' => 'nullable|string',
            'search_provider' => 'nullable|string',
            'tavily_api_key' => 'nullable|string',
            'default_workspace_path' => 'nullable|string',
        ]);

        $secretKeys = ['gemini_api_key', 'anthropic_api_key', 'openai_api_key', 'deepseek_api_key', 'tavily_api_key'];

        foreach ($validated as $key => $val) {
            if ($val === null) {
                continue;
            }
            // Ignore if masked placeholder was submitted back
            if (str_contains($val, '...')) {
                continue;
            }

            $isSecret = in_array($key, $secretKeys);
            $group = str_contains($key, 'key') || $key === 'ollama_url' ? 'ai_providers' : 'general';

            SystemSetting::set($key, $val, $group, $isSecret);
        }

        $project = null;
        if (! empty($validated['default_workspace_path'])) {
            $projectId = $request->input('project_id');
            $project = $projectId ? Project::find($projectId) : Project::first();
            if ($project) {
                $dirName = basename($validated['default_workspace_path']);
                $friendlyName = ucwords(str_replace(['-', '_'], ' ', $dirName)) ?: $project->name;
                $project->update([
                    'workspace_path' => $validated['default_workspace_path'],
                    'name' => $friendlyName,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'project' => $project ?? Project::first(),
        ]);
    }

    public function testAiConnection(Request $request): JsonResponse
    {
        $provider = $request->input('provider', 'gemini');
        $model = match ($provider) {
            'gemini' => 'gemini-3.5-flash-lite',
            'anthropic' => 'claude-3-5-haiku-20241022',
            'openai' => 'gpt-4o-mini',
            'deepseek' => 'deepseek-chat',
            default => 'gemini-3.5-flash-lite',
        };

        try {
            $agent = new GeneralistAgent;
            $stream = $agent->stream('Respond with: OK', provider: $provider, model: $model);
            foreach ($stream as $event) {
                // Read stream to confirm connection
            }

            return response()->json([
                'success' => true,
                'message' => "Conexão com {$provider} ({$model}) realizada com sucesso!",
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => "Falha ao conectar com {$provider}: ".$e->getMessage(),
            ], 422);
        }
    }

    public function listWorkspaceDirectories(): JsonResponse
    {
        $locations = [
            ['root' => '/workspaces', 'label' => 'Desenvolvimento (/home/pedro/dev)'],
            ['root' => '/host_home/Documents', 'label' => 'Documentos (/home/pedro/Documents)'],
            ['root' => '/host_home/Desktop', 'label' => 'Área de Trabalho (/home/pedro/Desktop)'],
        ];

        $results = [];

        foreach ($locations as $loc) {
            $root = $loc['root'];
            if (! File::isDirectory($root)) {
                continue;
            }

            $dirs = [];
            foreach (File::directories($root) as $dir) {
                $name = basename($dir);
                if (str_starts_with($name, '.')) {
                    continue;
                }

                $dirs[] = [
                    'name' => $name,
                    'path' => $dir,
                    'display_path' => Str::replaceFirst('/host_home', '/home/pedro', Str::replaceFirst('/workspaces', '/home/pedro/dev', $dir)),
                    'is_git' => File::exists($dir.'/.git'),
                ];
            }

            $results[] = [
                'label' => $loc['label'],
                'root' => $root,
                'directories' => $dirs,
            ];
        }

        return response()->json([
            'locations' => $results,
        ]);
    }
}
