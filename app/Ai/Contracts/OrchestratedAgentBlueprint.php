<?php

namespace App\Ai\Contracts;

use App\Models\AgentNode;
use App\Models\Task;

interface OrchestratedAgentBlueprint
{
    /**
     * Get the blueprint metadata for UI discovery.
     *
     * @return array{
     *     name: string,
     *     role: string,
     *     description: string,
     *     icon: string,
     *     default_tools: array<string>,
     *     supports_structured_output: bool
     * }
     */
    public static function blueprintMeta(): array;

    /**
     * Bind the agent node configuration and active task.
     */
    public function bindContext(AgentNode $node, Task $task): static;
}
