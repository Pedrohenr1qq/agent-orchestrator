<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\File;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ListDirectoryTool implements Tool
{
    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'List files and directories in a given workspace path.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'path' => $schema->string()->description('Relative directory path to list (use "." or empty string for workspace root)'),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $workspaceService = app(WorkspaceManagerService::class);
        $baseDir = $this->task ? $workspaceService->resolveTaskDirectory($this->task) : $workspaceService->getWorkspacesRoot();

        $relPath = $request['path'] ?? '.';
        $dirPath = $workspaceService->sanitizePath($baseDir, $relPath);

        if (! File::isDirectory($dirPath)) {
            return "Error: Directory not found: {$relPath}";
        }

        $items = scandir($dirPath);
        if ($items === false) {
            return "Error: Could not read directory: {$relPath}";
        }

        $result = [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $full = $dirPath.'/'.$item;
            $type = is_dir($full) ? '[DIR]' : '[FILE]';
            $size = is_file($full) ? ' ('.filesize($full).' bytes)' : '';
            $result[] = "{$type} {$item}{$size}";
        }

        return "Directory listing for {$relPath}:\n".(empty($result) ? '(empty directory)' : implode("\n", $result));
    }
}
