<?php

namespace Tests\Feature;

use App\Ai\Tools\ReadDocumentTool;
use App\Jobs\ExecuteAgentTaskJob;
use App\Models\Project;
use App\Services\WorkspaceManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Queue;
use Laravel\Ai\Tools\Request;
use Tests\TestCase;

class AgentOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_home_loads_successfully_with_initial_workflow_and_blueprints(): void
    {
        $response = $this->get(route('home'));

        $response->assertOk();
        $this->assertDatabaseHas('projects', ['name' => 'My Website']);
        $this->assertDatabaseHas('workflows', ['name' => 'Autonomous Engineering Team']);
        $this->assertDatabaseCount('agent_nodes', 3);
        $this->assertDatabaseCount('agent_edges', 2);
    }

    public function test_can_create_task_and_dispatch_execution_job(): void
    {
        Queue::fake();

        $project = Project::create([
            'name' => 'Demo Site',
            'workspace_path' => '/workspaces/demo',
        ]);

        $workflow = $project->workflows()->create(['name' => 'Main Flow']);
        $node = $workflow->agentNodes()->create([
            'name' => 'Frontend Dev',
            'role_title' => 'Coder',
            'agent_class' => 'App\\Ai\\Agents\\CodingAgent',
        ]);

        $response = $this->postJson(route('api.tasks.create', $project), [
            'workflow_id' => $workflow->id,
            'assigned_node_id' => $node->id,
            'title' => 'Create Landing Page',
            'description' => 'Build Hero section and Pricing table',
            'budget_limit_usd' => 2.50,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('tasks', [
            'title' => 'Create Landing Page',
            'status' => 'queued',
        ]);

        Queue::assertPushed(ExecuteAgentTaskJob::class);
    }

    public function test_can_save_workflow_nodes_and_edges(): void
    {
        $project = Project::create([
            'name' => 'Demo Site',
            'workspace_path' => '/workspaces/demo',
        ]);
        $workflow = $project->workflows()->create(['name' => 'Main Flow']);

        $response = $this->postJson(route('api.workflows.save', $workflow), [
            'nodes' => [
                [
                    'name' => 'Custom Architect',
                    'role_title' => 'Lead',
                    'agent_class' => 'App\\Ai\\Agents\\PlannerAgent',
                    'provider' => 'anthropic',
                    'model_name' => 'claude-3-7-sonnet-20250219',
                    'instructions' => 'Decompose tasks cleanly',
                    'position_xy' => ['x' => 100, 'y' => 200],
                ],
                [
                    'name' => 'Tester',
                    'role_title' => 'QA',
                    'agent_class' => 'App\\Ai\\Agents\\ReviewerAgent',
                    'provider' => 'openai',
                    'model_name' => 'gpt-4o',
                    'instructions' => 'Run pest and check diffs',
                    'position_xy' => ['x' => 500, 'y' => 200],
                ],
            ],
            'edges' => [],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('agent_nodes', ['name' => 'Custom Architect']);
        $this->assertDatabaseHas('agent_nodes', ['name' => 'Tester']);
    }

    public function test_workspace_manager_prevents_path_traversal(): void
    {
        $service = app(WorkspaceManagerService::class);
        $base = '/workspaces/project-1';

        $safe = $service->sanitizePath($base, 'app/Models/User.php');
        $this->assertEquals('/workspaces/project-1/app/Models/User.php', $safe);

        $this->expectException(\RuntimeException::class);
        $service->sanitizePath($base, '../../etc/passwd');
    }

    public function test_system_settings_api_stores_and_retrieves_settings(): void
    {
        $saveResponse = $this->postJson(route('api.settings.save'), [
            'gemini_api_key' => 'test-gemini-key-1234567890',
            'anthropic_api_key' => 'sk-ant-test-9876543210',
            'search_provider' => 'duckduckgo',
            'default_workspace_path' => '/host_home/dev/my-project',
        ]);

        $saveResponse->assertOk();
        $this->assertTrue($saveResponse->json('success'));

        $getResponse = $this->getJson(route('api.settings.get'));
        $getResponse->assertOk();

        // Ensure sensitive keys are masked
        $this->assertStringContainsString('...', $getResponse->json('gemini_api_key'));
        $this->assertTrue($getResponse->json('has_keys.gemini'));
        $this->assertEquals('/host_home/dev/my-project', $getResponse->json('default_workspace_path'));
    }

    public function test_workspace_directories_api_returns_locations(): void
    {
        $service = app(WorkspaceManagerService::class);
        $workspacesRoot = $service->getWorkspacesRoot();
        File::ensureDirectoryExists($workspacesRoot.'/sample-project');

        $response = $this->getJson(route('api.workspaces.directories'));
        $response->assertOk();
        $this->assertIsArray($response->json('locations'));
        $this->assertNotEmpty($response->json('locations'));
    }

    public function test_read_document_tool_computes_metrics(): void
    {
        $tool = new ReadDocumentTool;
        $service = app(WorkspaceManagerService::class);
        $workspacesRoot = $service->getWorkspacesRoot();
        File::ensureDirectoryExists($workspacesRoot);
        $docPath = $workspacesRoot.'/test_doc.md';
        file_put_contents($docPath, "# Guia de Agentes\n\nEste é um parágrafo de teste sobre inteligência artificial.\n");

        $request = new Request(['path' => 'test_doc.md']);
        $result = (string) $tool->handle($request);

        $this->assertStringContainsString('words', $result);
        $this->assertStringContainsString('lines', $result);
        $this->assertStringContainsString('Guia de Agentes', $result);

        if (file_exists($docPath)) {
            unlink($docPath);
        }
    }
}
