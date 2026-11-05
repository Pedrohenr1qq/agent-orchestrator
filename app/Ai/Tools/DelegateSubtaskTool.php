<?php

namespace App\Ai\Tools;

use App\Events\AgentRunEventCreated;
use App\Jobs\ExecuteAgentTaskJob;
use App\Models\AgentNode;
use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class DelegateSubtaskTool implements Tool
{
    public function __construct(
        protected AgentNode $node,
        protected Task $task
    ) {}

    public function description(): Stringable|string
    {
        $names = $this->node->delegatableAgents->pluck('name')->implode(', ');

        return "Delegate an autonomous subtask to a subordinate agent connected to you in the workflow graph. Available subagents: [{$names}].";
    }

    public function schema(JsonSchema $schema): array
    {
        $allowedNames = $this->node->delegatableAgents->pluck('name')->toArray();

        return [
            'target_agent' => $schema->string()
                ->enum($allowedNames)
                ->description('Name of the target subordinate agent to delegate to')
                ->required(),
            'title' => $schema->string()
                ->description('Short, clear title describing the subtask objective')
                ->required(),
            'instructions' => $schema->string()
                ->description('Detailed instructions, context, constraints, and files for the subagent to work on')
                ->required(),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $targetAgentName = $request['target_agent'];
        $title = $request['title'];
        $instructions = $request['instructions'];

        $targetNode = $this->node->delegatableAgents->firstWhere('name', $targetAgentName);

        if (! $targetNode) {
            return "Error: Subagent '{$targetAgentName}' is not connected to your node in the workflow graph.";
        }

        // Create the child task in database
        $subtask = Task::create([
            'project_id' => $this->task->project_id,
            'workflow_id' => $this->task->workflow_id,
            'parent_task_id' => $this->task->id,
            'assigned_node_id' => $targetNode->id,
            'title' => $title,
            'description' => $instructions,
            'status' => 'queued',
            'worktree_path' => $this->task->worktree_path,
            'git_branch' => $this->task->git_branch,
            'budget_limit_usd' => $targetNode->max_task_budget_usd,
        ]);

        // Broadcast delegation event
        $latestRun = $this->task->latestRun();
        if ($latestRun) {
            $event = $latestRun->events()->create([
                'task_id' => $this->task->id,
                'sequence' => ($latestRun->events()->max('sequence') ?? 0) + 1,
                'event_type' => 'delegation',
                'payload' => [
                    'subtask_id' => $subtask->id,
                    'target_agent_id' => $targetNode->id,
                    'target_agent_name' => $targetNode->name,
                    'title' => $title,
                    'instructions' => $instructions,
                ],
            ]);

            event(new AgentRunEventCreated($event));
        }

        // Smooth out burst requests to avoid provider RPM rate limiting
        usleep(1500000);

        // Execute subtask
        // In local/synchronous processing or child dispatch, run job
        $subtaskJob = new ExecuteAgentTaskJob($subtask);
        $subtaskJob->handle();

        $subtask->refresh();
        $subtaskRun = $subtask->latestRun();
        $finalOutput = $subtaskRun?->events()->where('event_type', 'user_message')->orWhere('event_type', 'message_delta')->latest()->first()?->payload['text']
            ?? "Subtask '{$title}' processed by {$targetNode->name} with status: {$subtask->status}.";

        return "Subtask '{$title}' assigned to {$targetNode->name} has completed.\nStatus: {$subtask->status}\n\nResult:\n{$finalOutput}";
    }
}
