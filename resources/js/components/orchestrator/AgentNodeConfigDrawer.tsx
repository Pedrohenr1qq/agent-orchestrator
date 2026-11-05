import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AgentNode, Blueprint, DiscoveredTool, McpServer } from '@/types/orchestrator';
import { Bot, Save, Trash2, ShieldAlert } from 'lucide-react';

const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = {
    gemini: [
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Fast, Reliable, Recommended)' },
        { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Multimodal)' },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (High Capacity Reasoning)' },
        { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
    ],
    anthropic: [
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Hybrid Reasoning)' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Lightweight)' },
    ],
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)' },
        { id: 'o3-mini', name: 'o3-mini (Reasoning Specialist)' },
    ],
    deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek-V3 (Chat)' },
        { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Reasoner)' },
    ],
    ollama: [
        { id: 'llama3.2', name: 'Llama 3.2 (Meta)' },
        { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder' },
        { id: 'deepseek-r1:8b', name: 'DeepSeek-R1 (8B Local)' },
    ],
};

interface Props {
    node: AgentNode | null;
    open: boolean;
    blueprints: Blueprint[];
    availableTools: DiscoveredTool[];
    mcpServers: McpServer[];
    onClose: () => void;
    onSave: (updatedNode: AgentNode) => void;
    onDelete: (nodeId: string) => void;
}

export function AgentNodeConfigDrawer({
    node,
    open,
    blueprints,
    availableTools,
    mcpServers,
    onClose,
    onSave,
    onDelete,
}: Props) {
    const [formData, setFormData] = useState<AgentNode | null>(node);

    useEffect(() => {
        setFormData(node);
    }, [node]);

    if (!formData) return null;

    const handleToolToggle = (toolClass: string) => {
        const currentTools = formData.enabled_tools || [];
        const updated = currentTools.includes(toolClass)
            ? currentTools.filter((t) => t !== toolClass)
            : [...currentTools, toolClass];

        setFormData({ ...formData, enabled_tools: updated });
    };

    const handleApprovalToggle = (toolClass: string) => {
        const currentApprovals = formData.tools_requiring_approval || [];
        const updated = currentApprovals.includes(toolClass)
            ? currentApprovals.filter((t) => t !== toolClass)
            : [...currentApprovals, toolClass];

        setFormData({ ...formData, tools_requiring_approval: updated });
    };

    return (
        <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 overflow-hidden">
                <SheetHeader className="p-6 pb-4 border-b border-border/80">
                    <SheetTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        Configure Agent Node
                    </SheetTitle>
                    <SheetDescription>
                        Customize persona, AI provider, instructions, tools, and budget governance for this agent.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-6 p-6 text-sm">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="agent-name">Agent Name</Label>
                            <Input
                                id="agent-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="agent-role">Role Title</Label>
                            <Input
                                id="agent-role"
                                value={formData.role_title}
                                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Archetype / Blueprint Class */}
                    <div className="space-y-1.5">
                        <Label>Archetype Blueprint (PHP Class)</Label>
                        <select
                            value={formData.agent_class}
                            onChange={(e) => {
                                const selectedBp = blueprints.find((b) => b.class === e.target.value);
                                setFormData({
                                    ...formData,
                                    agent_class: e.target.value,
                                    enabled_tools: selectedBp ? selectedBp.default_tools : formData.enabled_tools,
                                });
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        >
                            {blueprints.map((bp) => (
                                <option key={bp.class} value={bp.class}>
                                    {bp.name} ({bp.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Provider and Model */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>AI Provider</Label>
                            <select
                                value={formData.provider}
                                onChange={(e) => {
                                    const nextProvider = e.target.value;
                                    const available = PROVIDER_MODELS[nextProvider] || [];
                                    setFormData({
                                        ...formData,
                                        provider: nextProvider,
                                        model_name: available[0]?.id || '',
                                    });
                                }}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            >
                                <option value="gemini">Google Gemini</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                                <option value="openai">OpenAI (GPT / o-series)</option>
                                <option value="deepseek">DeepSeek</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Model Name</Label>
                            <select
                                value={formData.model_name}
                                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            >
                                {(PROVIDER_MODELS[formData.provider] || []).map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                                {!(PROVIDER_MODELS[formData.provider] || []).some((m) => m.id === formData.model_name) && (
                                    <option value={formData.model_name}>
                                        {formData.model_name}
                                    </option>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Reasoning Effort */}
                    <div className="space-y-1.5">
                        <Label>Reasoning Effort (Thinking Budget)</Label>
                        <select
                            value={formData.reasoning_effort || ''}
                            onChange={(e) => setFormData({ ...formData, reasoning_effort: e.target.value || null })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        >
                            <option value="">Disabled / Default</option>
                            <option value="low">Low (Fast reasoning)</option>
                            <option value="medium">Medium (Standard)</option>
                            <option value="high">High (Deep thinking for complex coding)</option>
                        </select>
                    </div>

                    {/* System Instructions */}
                    <div className="space-y-1.5">
                        <Label htmlFor="instructions">Custom System Instructions</Label>
                        <textarea
                            id="instructions"
                            rows={4}
                            value={formData.instructions || ''}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
                            placeholder="Add specific guidelines, CAD preferences, or project requirements for this agent..."
                        />
                    </div>

                    {/* Tools Selection & Human Approval */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold">Tools & Governance</Label>
                            <span className="text-xs text-muted-foreground">Check shield for Human Approval</span>
                        </div>

                        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                            {availableTools.map((tool) => {
                                const isEnabled = (formData.enabled_tools || []).includes(tool.class);
                                const requiresApproval = (formData.tools_requiring_approval || []).includes(tool.class);

                                return (
                                    <div key={tool.class} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id={`tool-${tool.name}`}
                                                checked={isEnabled}
                                                onCheckedChange={() => handleToolToggle(tool.class)}
                                            />
                                            <label htmlFor={`tool-${tool.name}`} className="text-xs font-medium cursor-pointer">
                                                {tool.name}
                                                <span className="block text-[10px] text-muted-foreground">{tool.description}</span>
                                            </label>
                                        </div>

                                        {tool.approvable && isEnabled && (
                                            <button
                                                type="button"
                                                onClick={() => handleApprovalToggle(tool.class)}
                                                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors ${
                                                    requiresApproval
                                                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium'
                                                        : 'text-muted-foreground hover:bg-muted'
                                                }`}
                                            >
                                                <ShieldAlert className="h-3 w-3" />
                                                {requiresApproval ? 'Approval Required' : 'Auto-Approve'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Connected MCP Servers */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold">Connected MCP Servers</Label>
                            <span className="text-xs text-muted-foreground">{mcpServers.length} Available</span>
                        </div>

                        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20">
                            {mcpServers.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">
                                    No external MCP servers added yet.
                                </p>
                            ) : (
                                mcpServers.map((server) => {
                                    const attachedIds = (formData.mcp_servers || []).map((s) => s.id);
                                    const isAttached = attachedIds.includes(server.id);

                                    return (
                                        <div key={server.id} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`mcp-server-${server.id}`}
                                                    checked={isAttached}
                                                    onCheckedChange={() => {
                                                        const current = formData.mcp_servers || [];
                                                        const updated = isAttached
                                                            ? current.filter((s) => s.id !== server.id)
                                                            : [...current, server];
                                                        setFormData({ ...formData, mcp_servers: updated });
                                                    }}
                                                />
                                                <label htmlFor={`mcp-server-${server.id}`} className="text-xs font-medium cursor-pointer">
                                                    {server.name}
                                                    <span className="block text-[10px] text-muted-foreground font-mono">
                                                        {server.transport} • {server.command_or_url}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Hard Budget Controls */}
                    <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="max-budget">Max Budget per Task ($)</Label>
                            <Input
                                id="max-budget"
                                type="number"
                                step="0.5"
                                value={formData.max_task_budget_usd || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, max_task_budget_usd: e.target.value ? parseFloat(e.target.value) : null })
                                }
                                placeholder="5.00"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="max-tokens">Max Tokens per Run</Label>
                            <Input
                                id="max-tokens"
                                type="number"
                                value={formData.max_tokens_per_run || ''}
                                onChange={(e) =>
                                    setFormData({ ...formData, max_tokens_per_run: e.target.value ? parseInt(e.target.value) : null })
                                }
                                placeholder="100000"
                            />
                        </div>
                    </div>
                </div>

                <SheetFooter className="p-6 py-4 border-t border-border/80 bg-muted/15 flex flex-row items-center justify-between gap-3">
                    <Button variant="destructive" size="sm" onClick={() => onDelete(formData.id)}>
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Delete Node
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={() => onSave(formData)}>
                            <Save className="h-4 w-4 mr-1.5" />
                            Save Node
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
