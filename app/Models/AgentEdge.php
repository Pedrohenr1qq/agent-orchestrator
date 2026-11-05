<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentEdge extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'workflow_id',
        'source_node_id',
        'target_node_id',
        'label',
    ];

    public function workflow(): BelongsTo
    {
        return $this->belongsTo(Workflow::class);
    }

    public function sourceNode(): BelongsTo
    {
        return $this->belongsTo(AgentNode::class, 'source_node_id');
    }

    public function targetNode(): BelongsTo
    {
        return $this->belongsTo(AgentNode::class, 'target_node_id');
    }
}
