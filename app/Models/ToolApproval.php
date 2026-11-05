<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ToolApproval extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'agent_run_id',
        'task_id',
        'tool_name',
        'tool_call_id',
        'arguments',
        'status',
        'decision_reason',
        'modified_arguments',
    ];

    protected $casts = [
        'arguments' => 'array',
        'modified_arguments' => 'array',
    ];

    public function agentRun(): BelongsTo
    {
        return $this->belongsTo(AgentRun::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
