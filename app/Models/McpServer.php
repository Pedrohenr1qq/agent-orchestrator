<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class McpServer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'transport',
        'command_or_url',
        'args_and_env',
        'discovered_tools_cache',
        'is_active',
    ];

    protected $casts = [
        'args_and_env' => 'array',
        'discovered_tools_cache' => 'array',
        'is_active' => 'boolean',
    ];

    public function agentNodes(): BelongsToMany
    {
        return $this->belongsToMany(AgentNode::class, 'agent_node_mcp_server');
    }
}
