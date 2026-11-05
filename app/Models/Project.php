<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'workspace_path',
        'default_branch',
        'workspace_mode',
        'monthly_budget_usd',
    ];

    protected $casts = [
        'monthly_budget_usd' => 'decimal:2',
    ];

    public function workflows(): HasMany
    {
        return $this->hasMany(Workflow::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
