<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GitDiffTool implements Tool
{
    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Show uncommitted changes and branch commits compared to the base project branch.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }

    public function handle(Request $request): Stringable|string
    {
        if (! $this->task) {
            return 'No active task context to compute git diff.';
        }

        $workspaceService = app(WorkspaceManagerService::class);

        return $workspaceService->getGitDiff($this->task);
    }
}
