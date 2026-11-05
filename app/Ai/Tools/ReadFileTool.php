<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\File;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ReadFileTool implements Tool
{
    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Read the contents of a text or code file in the project workspace.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'path' => $schema->string()->description('Relative path of the file inside the project workspace')->required(),
            'start_line' => $schema->integer()->description('Optional 1-based start line to read from'),
            'end_line' => $schema->integer()->description('Optional 1-based end line to read up to'),
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

        if (File::isDirectory($filePath)) {
            return "Error: Path is a directory, not a file: {$request['path']}";
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return "Error: Unable to read file {$request['path']}";
        }

        $totalLines = count($lines);
        $start = isset($request['start_line']) ? max(1, (int) $request['start_line']) : 1;
        $end = isset($request['end_line']) ? min($totalLines, (int) $request['end_line']) : min($totalLines, $start + 400);

        $output = [];
        for ($i = $start; $i <= $end; $i++) {
            $output[] = $i.': '.($lines[$i - 1] ?? '');
        }

        $header = "File: {$request['path']} (Showing lines {$start} to {$end} of {$totalLines})\n";

        return $header.implode("\n", $output);
    }
}
