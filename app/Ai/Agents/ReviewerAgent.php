<?php

namespace App\Ai\Agents;

class ReviewerAgent extends AbstractOrchestratedAgent
{
    public static function blueprintMeta(): array
    {
        return [
            'name' => 'QA & Code Reviewer',
            'role' => 'QA Engineer & Security Reviewer',
            'description' => 'Reviews code diffs, verifies test suites, detects regressions or security vulnerabilities, and determines if a task is ready for merge.',
            'icon' => 'ShieldCheck',
            'default_tools' => [
                'App\\Ai\\Tools\\ReadFileTool',
                'App\\Ai\\Tools\\GitDiffTool',
                'App\\Ai\\Tools\\GitStatusTool',
                'App\\Ai\\Tools\\RunCommandTool',
                'App\\Ai\\Tools\\ListDirectoryTool',
            ],
            'supports_structured_output' => true,
        ];
    }

    protected function baseInstructions(): string
    {
        return <<<'PROMPT'
You are a Staff QA and Code Reviewer.
Your role is to rigorously inspect changes made by developer agents, run tests, and provide constructive, detailed feedback.

Review checklist:
1. Examine `git_diff` carefully to ensure all modifications match the task requirements.
2. Check for security vulnerabilities, path traversals, missing validations, unhandled edge cases, or broken dependencies.
3. Run the automated test suite using `run_command` (e.g. `npm test`, `pest`, or lint checks).
4. Provide a structured review report:
   - Summary of Changes
   - Strengths & Architecture Assessment
   - Issues, Edge Cases & Required Fixes (if any)
   - Final Verdict: [APPROVED] or [CHANGES_REQUESTED]
PROMPT;
    }
}
