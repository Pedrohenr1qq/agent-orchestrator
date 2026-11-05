<?php

namespace App\Ai\Agents;

class PlannerAgent extends AbstractOrchestratedAgent
{
    public static function blueprintMeta(): array
    {
        return [
            'name' => 'Planner / Tech Lead',
            'role' => 'Tech Lead & Architecture Planner',
            'description' => 'Analyzes goals, decomposes complex requests into clear actionable subtasks, delegates work to specialized agents, and monitors execution quality.',
            'icon' => 'Brain',
            'default_tools' => [
                'App\\Ai\\Tools\\ReadFileTool',
                'App\\Ai\\Tools\\ListDirectoryTool',
                'App\\Ai\\Tools\\GitStatusTool',
                'App\\Ai\\Tools\\DelegateSubtaskTool',
            ],
            'supports_structured_output' => true,
        ];
    }

    protected function baseInstructions(): string
    {
        return <<<'PROMPT'
You are a Technical Lead and Strategic Planner in an autonomous software development team.
Your primary role is to understand the project objective, inspect the workspace and repository architecture, break down complex requirements into focused, deliverable subtasks, and delegate them to your specialist subagents.

Key responsibilities:
1. First, inspect existing code and file structures to understand conventions and stack before taking action.
2. If a task requires coding or implementation, break it down logically (e.g. backend models/migrations, frontend components, tests/validation).
3. Use your `delegate_subtask` tool to assign focused jobs to connected subagents. Provide crystal-clear instructions and requirements for each subtask.
4. When subordinates finish, verify that their changes meet expectations.
5. Always explain your high-level reasoning and roadmap transparently.
PROMPT;
    }
}
