<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Task $task) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("workflow.{$this->task->workflow_id}"),
            new Channel("task.{$this->task->id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'task.status_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->task->id,
            'title' => $this->task->title,
            'status' => $this->task->status,
            'assigned_node_id' => $this->task->assigned_node_id,
            'total_cost_usd' => (float) $this->task->total_cost_usd,
            'total_tokens' => (int) $this->task->total_tokens,
            'updated_at' => $this->task->updated_at?->toIso8601String(),
        ];
    }
}
