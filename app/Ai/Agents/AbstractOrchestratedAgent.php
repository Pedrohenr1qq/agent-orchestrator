<?php

namespace App\Ai\Agents;

use App\Ai\Contracts\OrchestratedAgentBlueprint;
use App\Ai\Services\McpServerManager;
use App\Ai\Services\ToolRegistry;
use App\Ai\Tools\DelegateSubtaskTool;
use App\Models\AgentNode;
use App\Models\Task;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

abstract class AbstractOrchestratedAgent implements Agent, Conversational, HasTools, OrchestratedAgentBlueprint
{
    use Promptable;

    protected ?AgentNode $node = null;

    protected ?Task $task = null;

    /**
     * Bind the agent node and active task to this agent instance.
     */
    public function bindContext(AgentNode $node, Task $task): static
    {
        $this->node = $node;
        $this->task = $task;

        return $this;
    }

    /**
     * Get the active agent node model.
     */
    public function getNode(): ?AgentNode
    {
        return $this->node;
    }

    /**
     * Get the active task model.
     */
    public function getTask(): ?Task
    {
        return $this->task;
    }

    /**
     * Resolve provider dynamically from node configuration.
     */
    public function provider(): Lab|string
    {
        if (! $this->node || empty($this->node->provider)) {
            return Lab::Anthropic;
        }

        return match (strtolower($this->node->provider)) {
            'anthropic' => Lab::Anthropic,
            'openai' => Lab::OpenAI,
            'gemini', 'google' => Lab::Gemini,
            'deepseek' => Lab::DeepSeek,
            'ollama' => Lab::Ollama,
            default => $this->node->provider,
        };
    }

    /**
     * Resolve model dynamically from node configuration.
     */
    public function model(): ?string
    {
        return $this->node?->model_name ?? config('ai.default_model');
    }

    /**
     * Maximum number of tool iterations allowed per invocation.
     */
    public function maxSteps(): int
    {
        return 25;
    }

    /**
     * Base instructions specific to this archetype.
     */
    abstract protected function baseInstructions(): string;

    /**
     * Compose final instructions combining blueprint, node instructions, and project workspace context.
     */
    public function instructions(): Stringable|string
    {
        $parts = [];

        $parts[] = trim($this->baseInstructions());

        if ($this->node && ! empty($this->node->instructions)) {
            $parts[] = "\n## Custom Persona & Role Instructions:\n".$this->node->instructions;
        }

        if ($this->task) {
            $project = $this->task->project;
            $workspace = $this->task->worktree_path ?: ($project?->workspace_path ?: '/workspaces');

            $parts[] = "\n## Environment & Workspace Context:";
            $parts[] = '- Project: '.($project?->name ?? 'Default Project');
            $parts[] = "- Active Workspace Directory: {$workspace}";
            $parts[] = '- Git Branch: '.($this->task->git_branch ?? $project?->default_branch ?? 'main');
            $parts[] = "- Task ID: {$this->task->id}";
            $parts[] = "- Task Title: {$this->task->title}";

            if ($this->node) {
                $subordinates = $this->node->delegatableAgents;
                if ($subordinates->isNotEmpty()) {
                    $parts[] = "\n## Delegatable Subagents (Available via delegate_subtask tool):";
                    foreach ($subordinates as $sub) {
                        $parts[] = "- **{$sub->name}** (Role: {$sub->role_title}, Archetype: {$sub->agent_class})";
                    }
                }
            }
        }

        $parts[] = "\n## Communication Guidelines:";
        $parts[] = "- Always provide a direct, helpful, and thorough response to the user's latest query or instruction.";
        $parts[] = '- After analyzing files, code, or running tools, write a clear, complete answer in conversational markdown.';

        return implode("\n", $parts);
    }

    /**
     * Get the tools available to the agent.
     */
    public function tools(): iterable
    {
        $tools = [];

        // 1. If agent node can delegate, inject the DelegateSubtaskTool
        if ($this->node && $this->task) {
            $subordinates = $this->node->delegatableAgents;
            if ($subordinates->isNotEmpty()) {
                $tools[] = new DelegateSubtaskTool($this->node, $this->task);
            }
        }

        // 2. Load configured native PHP tools
        $toolRegistry = app(ToolRegistry::class);
        $enabledToolNames = $this->node?->enabled_tools ?? static::blueprintMeta()['default_tools'];

        foreach ($enabledToolNames as $toolClassOrName) {
            if ($toolClassOrName === DelegateSubtaskTool::class || class_basename($toolClassOrName) === 'DelegateSubtaskTool') {
                continue;
            }
            $toolInstance = $toolRegistry->resolveTool($toolClassOrName, $this->task, $this->node);
            if ($toolInstance) {
                $tools[] = $toolInstance;
            }
        }

        // 3. Load tools from attached dynamic MCP servers
        if ($this->node) {
            $mcpManager = app(McpServerManager::class);
            $mcpTools = $mcpManager->getToolsForAgentNode($this->node);
            foreach ($mcpTools as $mcpTool) {
                $tools[] = $mcpTool;
            }
        }

        return $tools;
    }

    /**
     * Get the list of messages for the conversation.
     *
     * @return Message[]
     */
    public function messages(): iterable
    {
        return [];
    }
}
