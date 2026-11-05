<?php

namespace App\Ai\Services;

use App\Ai\Tools\DelegateSubtaskTool;
use App\Models\AgentNode;
use App\Models\Task;
use Illuminate\Support\Facades\File;
use Laravel\Ai\Contracts\Approvable;
use Laravel\Ai\Contracts\Tool;
use ReflectionClass;

class ToolRegistry
{
    /**
     * Get all discoverable native PHP tools.
     *
     * @return array<int, array{class: string, name: string, description: string, approvable: bool}>
     */
    public function discoverTools(): array
    {
        $tools = [];
        $toolsPath = app_path('Ai/Tools');

        if (! File::isDirectory($toolsPath)) {
            return [];
        }

        foreach (File::files($toolsPath) as $file) {
            $className = 'App\\Ai\\Tools\\'.$file->getFilenameWithoutExtension();

            if (! class_exists($className)) {
                continue;
            }

            $reflection = new ReflectionClass($className);
            if ($reflection->isAbstract() || ! $reflection->implementsInterface(Tool::class)) {
                continue;
            }

            // Exclude dynamic internal orchestration tools from the static catalog
            if ($className === 'App\\Ai\\Tools\\DelegateSubtaskTool') {
                continue;
            }

            try {
                /** @var Tool $instance */
                $instance = $reflection->newInstanceWithoutConstructor();
                $description = method_exists($instance, 'description') ? (string) $instance->description() : '';
                $isApprovable = $reflection->implementsInterface(Approvable::class);

                $tools[] = [
                    'class' => $className,
                    'name' => $file->getFilenameWithoutExtension(),
                    'description' => $description,
                    'approvable' => $isApprovable,
                ];
            } catch (\Throwable $e) {
                // Ignore instantiation issues during discovery
            }
        }

        return $tools;
    }

    /**
     * Resolve and configure an instance of a tool class for a specific task.
     */
    public function resolveTool(string $toolClass, ?Task $task = null, ?AgentNode $node = null): ?Tool
    {
        if (! class_exists($toolClass)) {
            return null;
        }

        $reflection = new ReflectionClass($toolClass);
        if ($reflection->isAbstract() || ! $reflection->implementsInterface(Tool::class)) {
            return null;
        }

        if ($toolClass === DelegateSubtaskTool::class) {
            $agentNode = $node ?? $task?->assignedAgent;
            if (! $agentNode || ! $task) {
                return null;
            }

            return new DelegateSubtaskTool($agentNode, $task);
        }

        /** @var Tool $instance */
        $constructor = $reflection->getConstructor();
        if ($constructor && $constructor->getNumberOfParameters() > 0) {
            $instance = new $toolClass($task);
        } else {
            $instance = new $toolClass;
        }

        // Apply Human-in-the-Loop approval requirement if the node configured it
        if ($instance instanceof Approvable) {
            $approvals = $task?->assignedAgent?->tools_requiring_approval ?? [];
            if (in_array($toolClass, $approvals) || in_array(class_basename($toolClass), $approvals)) {
                $instance->requireApproval("Approval required by workflow policy for {$reflection->getShortName()}");
            } else {
                $instance->withoutApproval();
            }
        }

        return $instance;
    }
}
