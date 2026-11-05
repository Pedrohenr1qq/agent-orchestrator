<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\File;
use Laravel\Ai\Concerns\InteractsWithApprovals;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class EditFileTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Replace an exact target snippet in an existing file with replacement text.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'path' => $schema->string()->description('Relative path of the file to edit')->required(),
            'target' => $schema->string()->description('The exact string to find and replace (including exact indentation)')->required(),
            'replacement' => $schema->string()->description('The replacement content (empty string to delete the target)')->required(),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $workspaceService = app(WorkspaceManagerService::class);
        $baseDir = $this->task ? $workspaceService->resolveTaskDirectory($this->task) : $workspaceService->getWorkspacesRoot();

        $filePath = $workspaceService->sanitizePath($baseDir, $request['path']);

        if (! File::exists($filePath)) {
            return "Error: File does not exist: {$request['path']}";
        }

        $content = File::get($filePath);
        $target = $request['target'];
        $replacement = $request['replacement'] ?? '';

        if (! str_contains($content, $target)) {
            return "Error: Target string not found in {$request['path']}. Make sure the target text and indentation match the file exactly.";
        }

        $newContent = str_replace($target, $replacement, $content);
        File::put($filePath, $newContent);

        return "Successfully updated {$request['path']}.";
    }
}
