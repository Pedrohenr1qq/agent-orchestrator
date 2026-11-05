import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import {
    Bot,
    Brain,
    Code2,
    ShieldCheck,
    Sparkles,
    Cpu,
    Play,
    Globe,
    PenTool,
    BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AgentNode } from '@/types/orchestrator';

export type AgentNodeData = {
    node: AgentNode;
    isRunning?: boolean;
    onConfigure: (node: AgentNode) => void;
};

export type AgentCustomNode = Node<AgentNodeData, 'agentNode'>;

const archetypeIcons: Record<string, React.ElementType> = {
    Brain,
    Code2,
    ShieldCheck,
    Sparkles,
    'Planner & Lead Architect': Brain,
    'Tech Lead & Architecture Planner': Brain,
    'Software Engineer': Code2,
    'Full-Stack Developer / Coder': Code2,
    'Code Reviewer': ShieldCheck,
    'QA Engineer & Security Reviewer': ShieldCheck,
    'Research Specialist': Globe,
    'Technical Writer & Drafter': PenTool,
    'Content Editor & Reviewer': BookOpen,
    'Custom Specialist': Sparkles,
};

export const AgentNodeCard = memo(
    ({ data, selected }: NodeProps<AgentCustomNode>) => {
        const { node, isRunning, onConfigure } = data;
        const IconComponent = archetypeIcons[node.role_title] || Bot;

        return (
            <div
                onClick={() => onConfigure(node)}
                className={`group relative max-w-[280px] min-w-[240px] cursor-pointer rounded-xl border bg-card p-4 text-card-foreground shadow-md transition-all hover:shadow-lg ${
                    selected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border'
                } ${isRunning ? 'animate-pulse shadow-xl ring-2 shadow-amber-500/20 ring-amber-500' : ''}`}
            >
                {/* Input Connection Handle */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!h-3 !w-3 !border-2 !border-background !bg-primary"
                />

                {/* Header with Avatar and Role */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                isRunning
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-primary/10 text-primary'
                            }`}
                        >
                            <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm leading-tight font-semibold text-foreground">
                                {node.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                {node.role_title}
                            </p>
                        </div>
                    </div>

                    {isRunning && (
                        <Badge
                            variant="outline"
                            className="animate-pulse border-amber-500/50 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600"
                        >
                            Active
                        </Badge>
                    )}
                </div>

                {/* Badges: Provider & Model */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge
                        variant="secondary"
                        className="flex items-center gap-1 text-[11px] font-normal"
                    >
                        <Cpu className="h-3 w-3" />
                        {node.provider}
                    </Badge>
                    <Badge
                        variant="outline"
                        className="font-mono text-[10px] text-muted-foreground"
                    >
                        {node.model_name.length > 20
                            ? node.model_name.slice(0, 18) + '...'
                            : node.model_name}
                    </Badge>
                </div>

                {/* Tools count & Subordinates indicator */}
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    <span>{(node.enabled_tools || []).length} tools</span>
                    {node.max_task_budget_usd && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            ${Number(node.max_task_budget_usd).toFixed(2)} max
                        </span>
                    )}
                </div>

                {/* Output Connection Handle */}
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!h-3 !w-3 !border-2 !border-background !bg-primary"
                />
            </div>
        );
    },
);

AgentNodeCard.displayName = 'AgentNodeCard';
