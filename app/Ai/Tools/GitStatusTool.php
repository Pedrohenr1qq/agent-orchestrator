<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class GitStatusTool implements Tool
{
    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Show the working tree status of the active git branch / worktree.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }

    public function handle(Request $request): Stringable|string
    {
        if (! $this->task) {
            return 'No active task context to check git status.';
        }

        $workspaceService = app(WorkspaceManagerService::class);

        return $workspaceService->getGitStatus($this->task);
    }
}
