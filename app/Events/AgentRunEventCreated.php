<?php

namespace App\Events;

use App\Models\AgentRunEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AgentRunEventCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public AgentRunEvent $event) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("task.{$this->event->task_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'agent.event';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->event->id,
            'task_id' => $this->event->task_id,
            'agent_run_id' => $this->event->agent_run_id,
            'sequence' => $this->event->sequence,
            'event_type' => $this->event->event_type,
            'payload' => $this->event->payload,
            'created_at' => $this->event->created_at?->toIso8601String(),
        ];
    }
}
