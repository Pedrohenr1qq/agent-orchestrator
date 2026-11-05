<?php

namespace App\Events;

use App\Models\ToolApproval;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ToolApprovalRequested implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ToolApproval $approval) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("task.{$this->approval->task_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'tool.approval_requested';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->approval->id,
            'task_id' => $this->approval->task_id,
            'agent_run_id' => $this->approval->agent_run_id,
            'tool_name' => $this->approval->tool_name,
            'tool_call_id' => $this->approval->tool_call_id,
            'arguments' => $this->approval->arguments,
            'status' => $this->approval->status,
        ];
    }
}
