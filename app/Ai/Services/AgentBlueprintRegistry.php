<?php

namespace App\Ai\Services;

use App\Ai\Contracts\OrchestratedAgentBlueprint;
use Illuminate\Support\Facades\File;
use ReflectionClass;

class AgentBlueprintRegistry
{
    /**
     * Discover all registered agent blueprints.
     *
     * @return array<int, array{
     *     class: string,
     *     name: string,
     *     role: string,
     *     description: string,
     *     icon: string,
     *     default_tools: array<string>,
     *     supports_structured_output: bool
     * }>
     */
    public function discoverBlueprints(): array
    {
        $blueprints = [];
        $agentsPath = app_path('Ai/Agents');

        if (! File::isDirectory($agentsPath)) {
            return [];
        }

        foreach (File::files($agentsPath) as $file) {
            $className = 'App\\Ai\\Agents\\'.$file->getFilenameWithoutExtension();

            if (! class_exists($className)) {
                continue;
            }

            $reflection = new ReflectionClass($className);
            if ($reflection->isAbstract() || ! $reflection->implementsInterface(OrchestratedAgentBlueprint::class)) {
                continue;
            }

            try {
                $meta = $className::blueprintMeta();
                $meta['class'] = $className;
                $blueprints[] = $meta;
            } catch (\Throwable $e) {
                // Ignore any reflection failures
            }
        }

        return $blueprints;
    }
}
