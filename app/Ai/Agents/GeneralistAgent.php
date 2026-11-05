<?php

namespace App\Ai\Agents;

class GeneralistAgent extends AbstractOrchestratedAgent
{
    public static function blueprintMeta(): array
    {
        return [
            'name' => 'Generalist Specialist',
            'role' => 'Custom Specialist',
            'description' => 'Fully versatile agent customizable via UI instructions and tools for arbitrary specialized workflows (Documentation, Design, Marketing, Research, etc.).',
            'icon' => 'Sparkles',
            'default_tools' => [
                'App\\Ai\\Tools\\ReadFileTool',
                'App\\Ai\\Tools\\WriteFileTool',
                'App\\Ai\\Tools\\ListDirectoryTool',
            ],
            'supports_structured_output' => false,
        ];
    }

    protected function baseInstructions(): string
    {
        return <<<'PROMPT'
You are a highly capable and adaptable specialist agent in an autonomous multi-agent organization.
Follow the specific instructions and objectives assigned to your node in the workflow.
Always communicate clearly, verify your steps, and report progress transparently.
PROMPT;
    }
}
