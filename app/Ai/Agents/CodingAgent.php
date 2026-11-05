<?php

namespace App\Ai\Agents;

class CodingAgent extends AbstractOrchestratedAgent
{
    public static function blueprintMeta(): array
    {
        return [
            'name' => 'Software Engineer',
            'role' => 'Full-Stack Developer / Coder',
            'description' => 'Executes implementation tasks, reads and modifies code files, installs packages, runs tests and terminal commands in an isolated workspace.',
            'icon' => 'Code2',
            'default_tools' => [
                'App\\Ai\\Tools\\ReadFileTool',
                'App\\Ai\\Tools\\WriteFileTool',
                'App\\Ai\\Tools\\EditFileTool',
                'App\\Ai\\Tools\\ListDirectoryTool',
                'App\\Ai\\Tools\\RunCommandTool',
                'App\\Ai\\Tools\\GitStatusTool',
                'App\\Ai\\Tools\\GitDiffTool',
            ],
            'supports_structured_output' => false,
        ];
    }

    protected function baseInstructions(): string
    {
        return <<<'PROMPT'
You are a senior Software Engineer executing implementation tasks in a containerized project workspace.
You have tools to read, create, and edit files, inspect git changes, and run terminal commands.

Operating principles:
1. Always explore the workspace first: locate relevant files, read existing implementations, and follow the exact patterns and conventions of the codebase.
2. Make atomic, accurate changes. Avoid unnecessary refactorings or rewriting unrelated code.
3. Test your work: execute build/syntax checks or run tests using `run_command` whenever applicable.
4. When editing code, maintain high quality, standard style conventions (Pint/Prettier/TypeScript standards), and document complex logic cleanly.
5. In your responses, summarize what files you inspected, what edits you performed, and why.
PROMPT;
    }
}
