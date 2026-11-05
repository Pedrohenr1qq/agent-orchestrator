<?php

namespace App\Ai\Tools;

use App\Models\Task;
use App\Services\WorkspaceManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\Process;
use Laravel\Ai\Concerns\InteractsWithApprovals;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class RunCommandTool implements Approvable, Tool
{
    use InteractsWithApprovals;

    public function __construct(protected ?Task $task = null) {}

    public function description(): Stringable|string
    {
        return 'Execute a shell command inside the active project workspace/worktree directory.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'command' => $schema->string()->description('The exact shell command line string to execute in bash')->required(),
            'timeout_seconds' => $schema->integer()->description('Maximum execution time in seconds (default 120)'),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $workspaceService = app(WorkspaceManagerService::class);
        $workDir = $this->task ? $workspaceService->resolveTaskDirectory($this->task) : $workspaceService->getWorkspacesRoot();

        $cmd = $request['command'];
        $timeout = isset($request['timeout_seconds']) ? min(600, max(5, (int) $request['timeout_seconds'])) : 120;

        $result = Process::path($workDir)
            ->timeout($timeout)
            ->run(['bash', '-c', $cmd]);

        $output = mb_convert_encoding($result->output(), 'UTF-8', 'UTF-8');
        $error = mb_convert_encoding($result->errorOutput(), 'UTF-8', 'UTF-8');
        $exitCode = $result->exitCode();

        $response = "Exit Code: {$exitCode}\n";
        if (! empty($output)) {
            $response .= "--- Output ---\n{$output}\n";
        }
        if (! empty($error)) {
            $response .= "--- Errors/Stderr ---\n{$error}\n";
        }

        return trim(mb_convert_encoding($response, 'UTF-8', 'UTF-8'));
    }
}
