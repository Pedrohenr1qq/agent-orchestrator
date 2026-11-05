<?php

namespace App\Jobs;

use App\Ai\Agents\AbstractOrchestratedAgent;
use App\Ai\Agents\GeneralistAgent;
use App\Events\AgentRunEventCreated;
use App\Events\TaskStatusUpdated;
use App\Events\ToolApprovalRequested;
use App\Models\AgentRun;
use App\Models\Task;
use App\Models\ToolApproval;
use App\Services\WorkspaceManagerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Streaming\Events\ReasoningDelta;
use Laravel\Ai\Streaming\Events\TextDelta;
use Laravel\Ai\Streaming\Events\ToolApprovalRequest;
use Laravel\Ai\Streaming\Events\ToolCall;
use Laravel\Ai\Streaming\Events\ToolResult;
use Throwable;

class ExecuteAgentTaskJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900; // 15 minutes max execution time

    public function __construct(public Task $task) {}

    public function handle(): void
    {
        $task = $this->task->fresh();
        if (! $task || in_array($task->status, ['completed', 'cancelled'])) {
            return;
        }

        $node = $task->assignedAgent;
        if (! $node) {
            $task->update(['status' => 'failed']);
            event(new TaskStatusUpdated($task));

            return;
        }

        // Set status to running
        $task->update(['status' => 'running']);
        event(new TaskStatusUpdated($task));

        // Prepare workspace directory
        $workspaceService = app(WorkspaceManagerService::class);
        $workDir = $workspaceService->resolveTaskDirectory($task);

        // Instantiate Agent Archetype
        $agentClass = $node->agent_class;
        if (! class_exists($agentClass)) {
            $agentClass = GeneralistAgent::class;
        }

        /** @var AbstractOrchestratedAgent $agentInstance */
        $agentInstance = app($agentClass);
        $agentInstance->bindContext($node, $task);

        // Create AgentRun record
        $startTime = microtime(true);
        /** @var AgentRun $run */
        $run = $task->runs()->create([
            'agent_node_id' => $node->id,
            'status' => 'running',
        ]);

        $sequence = 1;
        $accumulatedReasoning = '';
        $accumulatedText = '';

        try {
            // Prompt the agent with streaming
            $stream = $agentInstance->stream(
                prompt: $task->description,
                attachments: $task->attachments ?? [],
                provider: $agentInstance->provider(),
                model: $agentInstance->model()
            );

            foreach ($stream as $event) {
                if ($event instanceof ReasoningDelta) {
                    $accumulatedReasoning .= $event->delta;
                    $this->recordAndBroadcastEvent($run, $task, $sequence++, 'reasoning', [
                        'delta' => $event->delta,
                        'reasoning' => $accumulatedReasoning,
                    ]);
                } elseif ($event instanceof TextDelta) {
                    $accumulatedText .= $event->delta;
                    $this->recordAndBroadcastEvent($run, $task, $sequence++, 'message_delta', [
                        'delta' => $event->delta,
                        'text' => $accumulatedText,
                    ]);
                } elseif ($event instanceof ToolCall) {
                    $this->recordAndBroadcastEvent($run, $task, $sequence++, 'tool_call', [
                        'call_id' => $event->toolCall->id,
                        'name' => $event->toolCall->name,
                        'arguments' => $event->toolCall->arguments,
                    ]);
                } elseif ($event instanceof ToolResult) {
                    $this->recordAndBroadcastEvent($run, $task, $sequence++, 'tool_result', [
                        'call_id' => $event->toolResult->id,
                        'name' => $event->toolResult->name,
                        'result' => $event->toolResult->text(),
                    ]);
                } elseif ($event instanceof ToolApprovalRequest) {
                    // Handle Human-in-the-Loop tool approval
                    foreach ($event->pendingApprovals as $pending) {
                        $approval = ToolApproval::create([
                            'agent_run_id' => $run->id,
                            'task_id' => $task->id,
                            'tool_name' => $pending->tool,
                            'tool_call_id' => $pending->id,
                            'arguments' => $pending->arguments,
                            'status' => 'pending',
                        ]);

                        $task->update(['status' => 'awaiting_approval']);
                        $run->update(['status' => 'suspended_for_approval']);

                        event(new ToolApprovalRequested($approval));
                        event(new TaskStatusUpdated($task));
                    }

                    return; // Pause execution until human responds via UI
                }
            }

            // If agent ran tools but finished without emitting text, prompt for a final comprehensive response
            if (empty(trim($accumulatedText))) {
                $summaryAgent = app(GeneralistAgent::class);
                $summaryAgent->bindContext($node, $task);
                $finalPrompt = "You have finished inspecting the workspace and running tools for task '{$task->title}'.\n\nNow, provide a clear, helpful, and comprehensive response in markdown directly answering the user's latest request:\n{$task->description}";

                try {
                    $summaryStream = $summaryAgent->stream(
                        prompt: $finalPrompt,
                        provider: $agentInstance->provider(),
                        model: $agentInstance->model()
                    );
                    foreach ($summaryStream as $ev) {
                        if ($ev instanceof TextDelta) {
                            $accumulatedText .= $ev->delta;
                            $this->recordAndBroadcastEvent($run, $task, $sequence++, 'message_delta', [
                                'delta' => $ev->delta,
                                'text' => $accumulatedText,
                            ]);
                        }
                    }
                } catch (Throwable $e) {
                    Log::warning("Could not generate fallback summary text: {$e->getMessage()}");
                }
            }

            // Execution finished
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);
            $usage = $stream->usage;

            $promptTokens = $usage?->inputTokens ?? $usage?->promptTokens ?? 0;
            $completionTokens = $usage?->outputTokens ?? $usage?->completionTokens ?? 0;
            $reasoningTokens = $usage?->reasoningTokens ?? 0;
            $totalTokens = $promptTokens + $completionTokens;

            $cost = $this->calculateCost($node->provider, $node->model_name, $promptTokens, $completionTokens);

            $run->update([
                'status' => 'completed',
                'prompt_tokens' => $promptTokens,
                'completion_tokens' => $completionTokens,
                'reasoning_tokens' => $reasoningTokens,
                'cost_usd' => $cost,
                'duration_ms' => $durationMs,
            ]);

            // Update Task totals
            $task->increment('total_tokens', $totalTokens);
            $task->increment('total_cost_usd', $cost);
            $task->refresh();

            // Budget Limiter Check
            if ($task->budget_limit_usd && $task->total_cost_usd >= $task->budget_limit_usd) {
                $task->update(['status' => 'halted_budget']);
                $this->recordAndBroadcastEvent($run, $task, $sequence++, 'error', [
                    'message' => "Execution paused: Hard Budget limit of \${$task->budget_limit_usd} reached.",
                ]);
            } else {
                // Determine next status: Root tasks go to 'in_review' for human/QA diff review; Subtasks complete
                $nextStatus = $task->parent_task_id ? 'completed' : 'in_review';
                $task->update(['status' => $nextStatus]);
            }

            event(new TaskStatusUpdated($task));

        } catch (Throwable $e) {
            Log::error("Task execution error on task #{$task->id}: ".$e->getMessage(), [
                'exception' => $e,
            ]);

            $msg = strtolower($e->getMessage());
            $isTransient = str_contains($msg, 'rate limit')
                || str_contains($e->getMessage(), '429')
                || str_contains($msg, 'overloaded')
                || str_contains($msg, 'unavailable')
                || str_contains($e->getMessage(), '503')
                || str_contains($msg, 'exhausted');

            // If it's a temporary rate limit or overload from the AI provider, auto-retry with backoff if attempts remain
            if ($isTransient && $this->attempts() < 4) {
                $this->recordAndBroadcastEvent($run, $task, $sequence++, 'error', [
                    'message' => 'O provedor de IA está temporariamente sobrecarregado (503/429). Re-tentando automaticamente em 5 segundos...',
                ]);
                $task->update(['status' => 'queued']);
                event(new TaskStatusUpdated($task));
                $this->release(5);

                return;
            }

            $run->update(['status' => 'failed']);
            $task->update(['status' => 'failed']);

            $this->recordAndBroadcastEvent($run, $task, $sequence++, 'error', [
                'message' => $e->getMessage(),
            ]);

            event(new TaskStatusUpdated($task));
        }
    }

    protected function recordAndBroadcastEvent(AgentRun $run, Task $task, int $sequence, string $type, array $payload): void
    {
        $payload = $this->sanitizeUtf8($payload);

        $event = $run->events()->create([
            'task_id' => $task->id,
            'sequence' => $sequence,
            'event_type' => $type,
            'payload' => $payload,
        ]);

        event(new AgentRunEventCreated($event));
    }

    protected function sanitizeUtf8(mixed $data): mixed
    {
        if (is_string($data)) {
            return mb_convert_encoding($data, 'UTF-8', 'UTF-8');
        }

        if (is_array($data)) {
            return array_map([$this, 'sanitizeUtf8'], $data);
        }

        return $data;
    }

    protected function calculateCost(?string $provider, ?string $model, int $promptTokens, int $completionTokens): float
    {
        // Cost per 1 million tokens ($)
        [$inputPrice, $outputPrice] = match (strtolower($provider ?? '')) {
            'anthropic' => [3.00, 15.00], // Claude 3.7 Sonnet estimate
            'openai' => [2.50, 10.00],    // GPT-4o estimate
            'gemini', 'google' => [0.15, 0.60], // Gemini 2.5 Flash estimate
            'deepseek' => [0.14, 0.28],
            default => [1.00, 3.00],
        };

        $inputCost = ($promptTokens / 1_000_000) * $inputPrice;
        $outputCost = ($completionTokens / 1_000_000) * $outputPrice;

        return round($inputCost + $outputCost, 6);
    }
}
