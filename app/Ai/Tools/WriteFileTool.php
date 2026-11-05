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

class WriteFileTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Create a new file or overwrite an existing file with complete contents in the workspace.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'path' => $schema->string()->description('Relative path of the file to create or overwrite')->required(),
            'content' => $schema->string()->description('The full contents to write into the file')->required(),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $workspaceService = app(WorkspaceManagerService::class);
        $baseDir = $this->task ? $workspaceService->resolveTaskDirectory($this->task) : $workspaceService->getWorkspacesRoot();

        $filePath = $workspaceService->sanitizePath($baseDir, $request['path']);
        $directory = dirname($filePath);

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        File::put($filePath, $request['content']);

        return 'Successfully wrote '.strlen($request['content'])." bytes to {$request['path']}";
    }
}
