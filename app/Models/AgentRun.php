<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AgentRun extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'task_id',
        'agent_node_id',
        'status',
        'conversation_id',
        'prompt_tokens',
        'completion_tokens',
        'reasoning_tokens',
        'cost_usd',
        'duration_ms',
    ];

    protected $casts = [
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'reasoning_tokens' => 'integer',
        'cost_usd' => 'decimal:4',
        'duration_ms' => 'integer',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function agentNode(): BelongsTo
    {
        return $this->belongsTo(AgentNode::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(AgentRunEvent::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ToolApproval::class);
    }
}
