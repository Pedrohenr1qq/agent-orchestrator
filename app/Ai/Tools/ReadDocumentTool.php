<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\File;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ReadDocumentTool implements Tool
{
    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Read an existing Markdown, text, or documentation file from the workspace with word count and header outline.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'path' => $schema->string()
                ->description('Relative path to the document file (e.g. docs/architecture.md, README.md, report.txt)')
                ->required(),
            'start_line' => $schema->integer()
                ->description('Optional starting line number')
                ->default(1),
            'line_count' => $schema->integer()
                ->description('Optional number of lines to read')
                ->default(500),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $workspaceService = app(WorkspaceManagerService::class);
        $baseDir = $this->task ? $workspaceService->resolveTaskDirectory($this->task) : $workspaceService->getWorkspacesRoot();

        $filePath = $workspaceService->sanitizePath($baseDir, $request['path']);

        if (! File::exists($filePath)) {
            return "Error: Document file does not exist at path: {$request['path']}";
        }

        $content = File::get($filePath);
        $lines = explode("\n", $content);
        $totalLines = count($lines);
        $wordCount = str_word_count(strip_tags($content));

        $startLine = max(1, (int) ($request['start_line'] ?? 1));
        $lineCount = min(500, max(1, (int) ($request['line_count'] ?? 500)));

        $slice = array_slice($lines, $startLine - 1, $lineCount);
        $outputLines = [];

        foreach ($slice as $idx => $line) {
            $currentLineNumber = $startLine + $idx;
            $outputLines[] = "{$currentLineNumber}: {$line}";
        }

        $headerInfo = "Document: {$request['path']} (Total: {$totalLines} lines, ~{$wordCount} words)\n";
        $headerInfo .= "Displaying lines {$startLine} to ".($startLine + count($slice) - 1).":\n\n";

        return $headerInfo.implode("\n", $outputLines);
    }
}
