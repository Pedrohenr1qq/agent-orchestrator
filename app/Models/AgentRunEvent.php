<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentRunEvent extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'agent_run_id',
        'task_id',
        'sequence',
        'event_type',
        'payload',
        'created_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'created_at' => 'datetime',
        'sequence' => 'integer',
    ];

    public function setPayloadAttribute(mixed $value): void
    {
        $sanitize = function ($data) use (&$sanitize) {
            if (is_string($data)) {
                return mb_convert_encoding($data, 'UTF-8', 'UTF-8');
            }
            if (is_array($data)) {
                return array_map($sanitize, $data);
            }

            return $data;
        };

        $clean = is_array($value) ? $sanitize($value) : $value;
        $this->attributes['payload'] = json_encode($clean, JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function agentRun(): BelongsTo
    {
        return $this->belongsTo(AgentRun::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
