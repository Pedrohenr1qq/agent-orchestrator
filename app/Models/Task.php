<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'workflow_id',
        'parent_task_id',
        'assigned_node_id',
        'title',
        'description',
        'attachments',
        'status',
        'worktree_path',
        'git_branch',
        'budget_limit_usd',
        'total_cost_usd',
        'total_tokens',
    ];

    protected $casts = [
        'attachments' => 'array',
        'budget_limit_usd' => 'decimal:4',
        'total_cost_usd' => 'decimal:4',
        'total_tokens' => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function parentTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(AgentNode::class, 'assigned_node_id');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(AgentRun::class);
    }

    public function latestRun(): ?AgentRun
    {
        return $this->runs()->latest()->first();
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
