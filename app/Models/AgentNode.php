<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AgentNode extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'id',
        'workflow_id',
        'name',
        'role_title',
        'agent_class',
        'provider',
        'model_name',
        'reasoning_effort',
        'instructions',
        'enabled_tools',
        'tools_requiring_approval',
        'max_task_budget_usd',
        'max_tokens_per_run',
        'position_xy',
    ];

    protected $casts = [
        'enabled_tools' => 'array',
        'tools_requiring_approval' => 'array',
        'position_xy' => 'array',
        'max_task_budget_usd' => 'decimal:4',
        'max_tokens_per_run' => 'integer',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function mcpServers(): BelongsToMany
    {
        return $this->belongsToMany(McpServer::class, 'agent_node_mcp_server');
    }

    public function outgoingEdges(): HasMany
    {
        return $this->hasMany(AgentEdge::class, 'source_node_id');
    }

    public function incomingEdges(): HasMany
    {
        return $this->hasMany(AgentEdge::class, 'target_node_id');
    }

    public function delegatableAgents(): BelongsToMany
    {
        return $this->belongsToMany(
            AgentNode::class,
            'agent_edges',
            'source_node_id',
            'target_node_id'
        );
    }

    public function runs(): HasMany
    {
        return $this->hasMany(AgentRun::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_node_id');
    }
}
