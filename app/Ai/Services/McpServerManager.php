<?php

namespace App\Ai\Services;

use App\Models\AgentNode;
use App\Models\McpServer;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Tools\McpTool;
use Laravel\Mcp\Client;
use Laravel\Mcp\Client\Transport\HttpTransport;
use Laravel\Mcp\Client\Transport\StdioTransport;
use Throwable;

class McpServerManager
{
    /**
     * Discover and cache tools from an MCP server.
     *
     * @return array<int, array{name: string, description: string, inputSchema: array}>
     */
    public function discoverServerTools(McpServer $server): array
    {
        try {
            $client = $this->createClientForServer($server);
            $tools = $client->tools();

            $serialized = [];
            foreach ($tools as $tool) {
                $serialized[] = [
                    'name' => $tool->name,
                    'description' => $tool->description ?? $tool->title ?? '',
                    'inputSchema' => $tool->inputSchema ?? [],
                ];
            }

            $server->update(['discovered_tools_cache' => $serialized]);

            return $serialized;
        } catch (Throwable $e) {
            Log::warning("Failed to discover tools for MCP server [{$server->name}]: ".$e->getMessage());

            return $server->discovered_tools_cache ?? [];
        }
    }

    /**
     * Get all initialized McpTool wrappers for an AgentNode.
     *
     * @return array<int, McpTool>
     */
    public function getToolsForAgentNode(AgentNode $node): array
    {
        $tools = [];

        foreach ($node->mcpServers()->where('is_active', true)->get() as $server) {
            try {
                $client = $this->createClientForServer($server);
                $serverTools = $client->tools();

                foreach ($serverTools as $primitiveTool) {
                    $tools[] = new McpTool($primitiveTool);
                }
            } catch (Throwable $e) {
                Log::warning("Error loading tools from MCP server {$server->name}: ".$e->getMessage());
            }
        }

        return $tools;
    }

    /**
     * Create an MCP Client instance configured for the server's transport.
     */
    public function createClientForServer(McpServer $server): Client
    {
        if ($server->transport === 'sse' || $server->transport === 'streamable_http') {
            $url = $server->command_or_url;

            if (file_exists('/.dockerenv') || env('LARAVEL_SAIL')) {
                $url = str_replace(
                    ['://127.0.0.1:', '://localhost:'],
                    '://host.docker.internal:',
                    $url
                );
            }

            $transport = new HttpTransport(
                url: $url
            );

            if (! empty($server->args_and_env['headers'])) {
                $transport->withHeaders($server->args_and_env['headers']);
            }
        } else {
            // Stdio transport
            $cmd = $server->command_or_url;
            $args = $server->args_and_env['args'] ?? [];
            $env = $server->args_and_env['env'] ?? [];

            $transport = new StdioTransport(
                command: $cmd,
                args: $args,
                env: $env
            );
        }

        $client = new Client($transport);
        $client->connect();

        return $client;
    }
}
