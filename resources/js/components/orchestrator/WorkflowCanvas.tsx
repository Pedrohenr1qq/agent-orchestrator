import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNodeCard, AgentCustomNode } from './AgentNodeCard';
import { AgentNodeConfigDrawer } from './AgentNodeConfigDrawer';
import {
    AgentNode,
    Blueprint,
    DiscoveredTool,
    McpServer,
    Workflow,
} from '@/types/orchestrator';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    Save,
    Sparkles,
    Check,
    LayoutTemplate,
    Layers,
    ChevronDown,
    Brain,
    Code2,
    ShieldCheck,
    Globe,
    PenTool,
    BookOpen,
    Trash2,
    FileText,
    Box,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    workflow: Workflow;
    blueprints: Blueprint[];
    availableTools: DiscoveredTool[];
    mcpServers: McpServer[];
    activeAgentIds?: string[];
    onSaveWorkflow: (
        nodes: AgentNode[],
        edges: { source: string; target: string; label?: string }[],
    ) => Promise<void>;
}

export function WorkflowCanvas({
    workflow,
    blueprints,
    availableTools,
    mcpServers,
    activeAgentIds = [],
    onSaveWorkflow,
}: Props) {
    const nodeTypes = useMemo(() => ({ agentNode: AgentNodeCard as any }), []);

    // Convert AgentNodes to ReactFlow nodes
    const initialNodes: Node[] = useMemo(() => {
        return (workflow.agent_nodes || []).map((node, index) => ({
            id: node.id,
            type: 'agentNode',
            position: node.position_xy || { x: 150 + index * 260, y: 150 },
            data: {
                node,
                isRunning: activeAgentIds.includes(node.id),
                onConfigure: (selectedNode: AgentNode) =>
                    setSelectedNode(selectedNode),
            },
        }));
    }, [workflow.agent_nodes, activeAgentIds]);

    // Convert AgentEdges to ReactFlow edges
    const initialEdges: Edge[] = useMemo(() => {
        return (workflow.agent_edges || []).map((edge) => ({
            id: edge.id,
            source: edge.source_node_id,
            target: edge.target_node_id,
            label: edge.label || 'Delegates to',
            animated: true,
            style: { strokeWidth: 2 },
        }));
    }, [workflow.agent_edges]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [workflow.id, workflow.updated_at]);

    const onConnect = useCallback(
        (params: Connection) =>
            setEdges((eds) =>
                addEdge(
                    { ...params, animated: true, label: 'Delegates to' },
                    eds,
                ),
            ),
        [setEdges],
    );

    const handleAddNodeFromBlueprint = (blueprint: Blueprint) => {
        const newNodeId = crypto.randomUUID();
        const newNode: AgentNode = {
            id: newNodeId,
            workflow_id: workflow.id,
            name: blueprint.name,
            role_title: blueprint.role || blueprint.name,
            agent_class: blueprint.class,
            provider: 'gemini',
            model_name: 'gemini-3.5-flash-lite',
            reasoning_effort: 'medium',
            instructions: '',
            enabled_tools: blueprint.default_tools,
            tools_requiring_approval: [],
            max_task_budget_usd: 2.0,
            max_tokens_per_run: 100000,
            position_xy: { x: 250, y: 200 },
        };

        const flowNode: Node = {
            id: newNodeId,
            type: 'agentNode',
            position: {
                x: 250 + nodes.length * 30,
                y: 200 + nodes.length * 20,
            },
            data: {
                node: newNode,
                isRunning: false,
                onConfigure: (selected: AgentNode) => setSelectedNode(selected),
            },
        };

        setNodes((nds) => [...nds, flowNode]);
        toast.success(`Added ${blueprint.name} agent node`);
    };

    const handleApplyTemplate = (type: 'code' | 'content' | 'blank') => {
        if (type === 'blank') {
            setNodes([]);
            setEdges([]);
            toast.info('Canvas limpo. Adicione nós ou selecione um template.');
            return;
        }

        if (type === 'content') {
            const resBp =
                blueprints.find((b) => b.class.includes('ResearcherAgent')) ||
                blueprints[0];
            const wrtBp =
                blueprints.find((b) => b.class.includes('WriterAgent')) ||
                blueprints[0];
            const edtBp =
                blueprints.find((b) => b.class.includes('EditorAgent')) ||
                blueprints[0];

            const id1 = crypto.randomUUID();
            const id2 = crypto.randomUUID();
            const id3 = crypto.randomUUID();

            const node1: AgentNode = {
                id: id1,
                workflow_id: workflow.id,
                name: 'Pesquisador & Fact-Checker',
                role_title: 'Research Specialist',
                agent_class: resBp.class,
                provider: 'gemini',
                model_name: 'gemini-3.5-flash-lite',
                reasoning_effort: 'medium',
                instructions:
                    'Pesquise fontes e referências online antes de delegar a escrita.',
                enabled_tools: resBp.default_tools,
                tools_requiring_approval: [],
                max_task_budget_usd: 2.0,
                position_xy: { x: 100, y: 150 },
            };

            const node2: AgentNode = {
                id: id2,
                workflow_id: workflow.id,
                name: 'Redator Técnico & Escritor',
                role_title: 'Technical Writer & Drafter',
                agent_class: wrtBp.class,
                provider: 'gemini',
                model_name: 'gemini-3.5-flash-lite',
                reasoning_effort: 'medium',
                instructions:
                    'Redija o documento completo em Markdown estruturado.',
                enabled_tools: wrtBp.default_tools,
                tools_requiring_approval: [],
                max_task_budget_usd: 2.5,
                position_xy: { x: 370, y: 430 },
            };

            const node3: AgentNode = {
                id: id3,
                workflow_id: workflow.id,
                name: 'Editor & Revisor de Conteúdo',
                role_title: 'Content Editor & Reviewer',
                agent_class: edtBp.class,
                provider: 'gemini',
                model_name: 'gemini-3.5-flash-lite',
                reasoning_effort: 'medium',
                instructions:
                    'Revise gramática, fluidez e qualidade antes da aprovação final.',
                enabled_tools: edtBp.default_tools,
                tools_requiring_approval: [],
                max_task_budget_usd: 1.5,
                position_xy: { x: -160, y: 430 },
            };

            const newNodes: Node[] = [
                {
                    id: id1,
                    type: 'agentNode',
                    position: { x: 100, y: 150 },
                    data: { node: node1, onConfigure: setSelectedNode },
                },
                {
                    id: id2,
                    type: 'agentNode',
                    position: { x: 370, y: 430 },
                    data: { node: node2, onConfigure: setSelectedNode },
                },
                {
                    id: id3,
                    type: 'agentNode',
                    position: { x: -160, y: 430 },
                    data: { node: node3, onConfigure: setSelectedNode },
                },
            ];

            const newEdges: Edge[] = [
                {
                    id: `e-${id1}-${id2}`,
                    source: id1,
                    target: id2,
                    label: 'Delega Redação',
                    animated: true,
                },
                {
                    id: `e-${id1}-${id3}`,
                    source: id1,
                    target: id3,
                    label: 'Delega Revisão',
                    animated: true,
                },
            ];

            setNodes(newNodes);
            setEdges(newEdges);
            toast.success(
                'Template de Conteúdo & Pesquisa aplicado! Clique em "Salvar Workflow" para confirmar.',
            );
            return;
        }

        if (type === 'code') {
            const planBp =
                blueprints.find((b) => b.class.includes('PlannerAgent')) ||
                blueprints[0];
            const codeBp =
                blueprints.find((b) => b.class.includes('CodingAgent')) ||
                blueprints[0];
            const revBp =
                blueprints.find((b) => b.class.includes('ReviewerAgent')) ||
                blueprints[0];

            const id1 = crypto.randomUUID();
            const id2 = crypto.randomUUID();
            const id3 = crypto.randomUUID();

            const node1: AgentNode = {
                id: id1,
                workflow_id: workflow.id,
                name: 'Tech Lead',
                role_title: 'Planner & Lead Architect',
                agent_class: planBp.class,
                provider: 'gemini',
                model_name: 'gemini-3.5-flash-lite',
                reasoning_effort: 'medium',
                instructions:
                    'Planeje e decomponha tarefas de software em subtarefas.',
                enabled_tools: planBp.default_tools,
                tools_requiring_approval: [],
                max_task_budget_usd: 2.0,
                position_xy: { x: 100, y: 150 },
            };

            const node2: AgentNode = {
                id: id2,
                workflow_id: workflow.id,
                name: 'Full-Stack Developer',
                role_title: 'Software Engineer',
                agent_class: codeBp.class,
                provider: 'gemini',
                model_name: 'gemini-3.5-flash-lite',
                reasoning_effort: 'medium',
                instructions:
                    'Implemente os requisitos com código limpo e padrões do projeto.',
                enabled_tools: codeBp.default_tools,
                tools_requiring_approval: [],
                max_task_budget_usd: 3.0,
                position_xy: { x: 370, y: 430 },
            };

            const node3: AgentNode = {
                id: id3,
                workflow_id: workflow.id,
                name: 'QA & Security',
                role_title: 'Code Reviewer',
                agent_class: revBp.class,
                provider: 'gemini',
                model_name: 'gemini-3.5-flash-lite',
                reasoning_effort: 'medium',
                instructions:
                    'Revise o diff de código e execute validações antes do merge.',
                enabled_tools: revBp.default_tools,
                tools_requiring_approval: [],
                max_task_budget_usd: 1.5,
                position_xy: { x: -160, y: 430 },
            };

            const newNodes: Node[] = [
                {
                    id: id1,
                    type: 'agentNode',
                    position: { x: 100, y: 150 },
                    data: { node: node1, onConfigure: setSelectedNode },
                },
                {
                    id: id2,
                    type: 'agentNode',
                    position: { x: 370, y: 430 },
                    data: { node: node2, onConfigure: setSelectedNode },
                },
                {
                    id: id3,
                    type: 'agentNode',
                    position: { x: -160, y: 430 },
                    data: { node: node3, onConfigure: setSelectedNode },
                },
            ];

            const newEdges: Edge[] = [
                {
                    id: `e-${id1}-${id2}`,
                    source: id1,
                    target: id2,
                    label: 'Delega Implementação',
                    animated: true,
                },
                {
                    id: `e-${id1}-${id3}`,
                    source: id1,
                    target: id3,
                    label: 'Delega Verificação',
                    animated: true,
                },
            ];

            setNodes(newNodes);
            setEdges(newEdges);
            toast.success(
                'Template de Engenharia de Software aplicado! Clique em "Salvar Workflow" para confirmar.',
            );
        }
    };

    const handleSaveNodeConfig = (updatedNode: AgentNode) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === updatedNode.id) {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            node: updatedNode,
                        },
                    };
                }
                return n;
            }),
        );
        setSelectedNode(null);
        toast.success('Agent node updated');
    };

    const handleDeleteNode = (nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) =>
            eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
        );
        setSelectedNode(null);
        toast.info('Agent node deleted');
    };

    const handleSaveWorkflow = async () => {
        setIsSaving(true);
        try {
            const rawNodes: AgentNode[] = nodes.map((n) => ({
                ...(n.data.node as AgentNode),
                position_xy: { x: n.position.x, y: n.position.y },
            }));

            const rawEdges = edges.map((e) => ({
                source: e.source,
                target: e.target,
                label: typeof e.label === 'string' ? e.label : undefined,
            }));

            await onSaveWorkflow(rawNodes, rawEdges);
            toast.success('Workflow salvo com sucesso!');
        } catch (error: any) {
            toast.error(error?.message || 'Falha ao salvar workflow');
        } finally {
            setIsSaving(false);
        }
    };

    const getBlueprintIcon = (roleTitle?: string, iconName?: string) => {
        const text = ((roleTitle || '') + ' ' + (iconName || '')).toLowerCase();
        if (
            text.includes('cad') ||
            text.includes('solidcraft') ||
            text.includes('box') ||
            text.includes('3d') ||
            text.includes('mechanical')
        )
            return Box;
        if (text.includes('research') || text.includes('globe')) return Globe;
        if (
            text.includes('writer') ||
            text.includes('drafter') ||
            text.includes('pen')
        )
            return PenTool;
        if (
            text.includes('editor') ||
            (text.includes('reviewer') &&
                !text.includes('code') &&
                !text.includes('qa')) ||
            text.includes('book')
        )
            return BookOpen;
        if (
            text.includes('lead') ||
            text.includes('planner') ||
            text.includes('brain')
        )
            return Brain;
        if (
            text.includes('engineer') ||
            text.includes('developer') ||
            text.includes('code')
        )
            return Code2;
        if (
            text.includes('security') ||
            text.includes('qa') ||
            text.includes('shield')
        )
            return ShieldCheck;
        return Sparkles;
    };

    return (
        <div className="relative h-full w-full bg-background select-none">
            {/* Top Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-border/80 bg-background/95 p-1.5 shadow-lg backdrop-blur-md">
                {/* Templates Selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium"
                        >
                            <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                            <span>Templates</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Modelos de Workflow
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            className="cursor-pointer gap-2 py-2"
                            onClick={() => handleApplyTemplate('code')}
                        >
                            <Code2 className="h-4 w-4 text-sky-400" />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium">
                                    Engenharia de Software
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Tech Lead + Dev + QA
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer gap-2 py-2"
                            onClick={() => handleApplyTemplate('content')}
                        >
                            <FileText className="h-4 w-4 text-emerald-400" />
                            <div className="flex flex-col">
                                <span className="text-xs font-medium">
                                    Pesquisa & Redação
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Pesquisador + Redator + Revisor
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer gap-2 py-1.5 text-destructive focus:text-destructive"
                            onClick={() => handleApplyTemplate('blank')}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs">
                                Limpar Canvas (Em Branco)
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Add Agent Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1.5 text-xs font-medium"
                        >
                            <Plus className="h-3.5 w-3.5 text-primary" />
                            <span>Adicionar Agente</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                        <DropdownMenuLabel className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Arquétipos Disponíveis
                        </DropdownMenuLabel>
                        {blueprints.map((bp) => {
                            const Icon = getBlueprintIcon(bp.role, bp.icon);
                            return (
                                <DropdownMenuItem
                                    key={bp.class}
                                    className="cursor-pointer gap-2.5 py-2"
                                    onClick={() =>
                                        handleAddNodeFromBlueprint(bp)
                                    }
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-primary">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">
                                            {bp.name}
                                        </span>
                                        <span className="line-clamp-1 text-[10px] text-muted-foreground">
                                            {bp.role || bp.description}
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <div className="mx-1 h-4 w-px bg-border/60" />

                <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-medium shadow-sm"
                    onClick={handleSaveWorkflow}
                    disabled={isSaving}
                >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? 'Salvando...' : 'Salvar Workflow'}
                </Button>
            </div>

            {/* React Flow Canvas */}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-dot-pattern"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={1}
                />
                <Controls className="!rounded-lg !border-border !bg-background !shadow-md" />
                <MiniMap
                    nodeStrokeColor={() => '#6366f1'}
                    nodeColor={() => '#818cf8'}
                    className="!rounded-lg !border-border !bg-background/80 !shadow-md"
                />
            </ReactFlow>

            {/* Node Configuration Drawer */}
            <AgentNodeConfigDrawer
                node={selectedNode}
                open={!!selectedNode}
                blueprints={blueprints}
                availableTools={availableTools}
                mcpServers={mcpServers}
                onClose={() => setSelectedNode(null)}
                onSave={handleSaveNodeConfig}
                onDelete={handleDeleteNode}
            />
        </div>
    );
}
