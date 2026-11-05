<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workflow extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'project_id',
        'name',
        'viewport_state',
    ];

    protected $casts = [
        'viewport_state' => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function agentNodes(): HasMany
    {
        return $this->hasMany(AgentNode::class);
    }

    public function agentEdges(): HasMany
    {
        return $this->hasMany(AgentEdge::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
