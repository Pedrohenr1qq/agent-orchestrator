import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Project,
    Workflow,
    Task,
    Blueprint,
    DiscoveredTool,
    McpServer,
    AgentNode,
} from '@/types/orchestrator';
import { WorkflowCanvas } from '@/components/orchestrator/WorkflowCanvas';
import { TaskBoard } from '@/components/orchestrator/TaskBoard';
import { TaskInspector } from '@/components/orchestrator/TaskInspector';
import { SettingsModal } from '@/components/orchestrator/SettingsModal';
import { McpServerModal } from '@/components/orchestrator/McpServerModal';
import { getEchoInstance } from '@/lib/echo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Network,
    Kanban,
    Server,
    FolderGit2,
    DollarSign,
    Sparkles,
    Activity,
    Settings,
    Plus,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    project: Project;
    workflows: Workflow[];
    currentWorkflow: Workflow;
    tasks: Task[];
    blueprints: Blueprint[];
    availableTools: DiscoveredTool[];
    mcpServers: McpServer[];
    reverb: {
        key: string;
        host: string;
        port: number;
        scheme: string;
    };
}

export default function WorkspaceIndex({
    project,
    workflows,
    currentWorkflow: initialCurrentWorkflow,
    tasks: initialTasks,
    blueprints,
    availableTools,
    mcpServers,
    reverb,
}: Props) {
    const [activeTab, setActiveTab] = useState<'canvas' | 'board' | 'mcp'>(
        'board',
    );
    const [currentProject, setCurrentProject] = useState<Project>(project);
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow>(
        initialCurrentWorkflow,
    );
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<
        'ai' | 'search' | 'workspace'
    >('ai');

    useEffect(() => {
        setCurrentProject(project);
    }, [project]);

    useEffect(() => {
        setCurrentWorkflow(initialCurrentWorkflow);
    }, [initialCurrentWorkflow]);

    // Initialize Echo and listen for real-time Reverb WebSocket events
    useEffect(() => {
        const echo = getEchoInstance(reverb);
        if (!echo) return;

        // Listen on workflow channel for task updates
        const workflowChannel = echo.channel(`workflow.${currentWorkflow.id}`);
        workflowChannel.listen('.task.status_updated', (data: any) => {
            setTasks((prevTasks) =>
                prevTasks.map((t) =>
                    t.id === data.id ? { ...t, ...data } : t,
                ),
            );

            if (selectedTask?.id === data.id) {
                setSelectedTask((prev) => (prev ? { ...prev, ...data } : null));
            }
        });

        return () => {
            echo.leave(`workflow.${currentWorkflow.id}`);
        };
    }, [currentWorkflow.id, selectedTask?.id, reverb]);

    // Listen on task-specific channel when inspector is open
    useEffect(() => {
        if (!selectedTask) return;

        const echo = getEchoInstance(reverb);
        if (!echo) return;

        const taskChannel = echo.channel(`task.${selectedTask.id}`);

        taskChannel.listen('.agent.event', (newEvent: any) => {
            setSelectedTask((prev) => {
                if (!prev) return null;
                const runs = prev.runs ? [...prev.runs] : [];
                let targetRun = runs.find(
                    (r) => r.id === newEvent.agent_run_id,
                );

                if (!targetRun) {
                    targetRun = {
                        id: newEvent.agent_run_id,
                        task_id: prev.id,
                        agent_node_id: prev.assigned_node_id || '',
                        status: 'running',
                        events: [],
                        created_at:
                            newEvent.created_at || new Date().toISOString(),
                    } as any;
                    runs.push(targetRun);
                }

                const events = targetRun.events ? [...targetRun.events] : [];
                const existingIdx = events.findIndex(
                    (e) =>
                        e.id === newEvent.id ||
                        (e.id?.toString().startsWith('optimistic-') &&
                            e.payload?.text === newEvent.payload?.text) ||
                        (e.sequence === newEvent.sequence &&
                            e.event_type === newEvent.event_type),
                );

                if (existingIdx >= 0) {
                    events[existingIdx] = newEvent;
                } else {
                    events.push(newEvent);
                }
                targetRun.events = events;

                return { ...prev, runs };
            });
        });

        taskChannel.listen('.tool.approval_requested', (newApproval: any) => {
            setSelectedTask((prev) => {
                if (!prev) return null;
                const approvals = prev.approvals ? [...prev.approvals] : [];
                approvals.push(newApproval);
                return { ...prev, approvals, status: 'awaiting_approval' };
            });
            toast.warning(
                `Approval required for tool ${newApproval.tool_name}`,
            );
        });

        return () => {
            echo.leave(`task.${selectedTask.id}`);
        };
    }, [selectedTask?.id, reverb]);

    // Active agent IDs that are currently running tasks
    const activeAgentIds = tasks
        .filter((t) => t.status === 'running' && t.assigned_node_id)
        .map((t) => t.assigned_node_id!);

    const handleSaveWorkflow = async (
        nodes: AgentNode[],
        edges: { source: string; target: string; label?: string }[],
    ) => {
        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';
        const res = await fetch(`/api/workflows/${currentWorkflow.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken,
            },
            body: JSON.stringify({ nodes, edges }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(
                errorData.message || 'Falha ao salvar workflow no servidor',
            );
        }

        const data = await res.json();
        if (data.workflow) {
            setCurrentWorkflow(data.workflow);
        }
    };

    const handleCreateTask = async (taskData: any) => {
        const res = await fetch(`/api/projects/${project.id}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(taskData),
        });

        const data = await res.json();
        if (data.task) {
            setTasks((prev) => [data.task, ...prev]);
            setSelectedTask(data.task);
            toast.success('Task created and dispatched!');
        }
    };

    const handleSendMessage = async (taskId: string, message: string) => {
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticEvent: any = {
            id: optimisticId,
            agent_run_id:
                selectedTask?.runs?.[selectedTask.runs.length - 1]?.id ||
                'optimistic',
            task_id: taskId,
            sequence: 99999,
            event_type: 'user_message',
            payload: { text: message },
            created_at: new Date().toISOString(),
        };

        setSelectedTask((prev) => {
            if (!prev) return null;
            const runs =
                prev.runs && prev.runs.length > 0
                    ? [...prev.runs]
                    : [{ id: 'run-1', events: [] } as any];
            const latestRun = runs[runs.length - 1];
            latestRun.events = [...(latestRun.events || []), optimisticEvent];
            return { ...prev, status: 'queued', runs };
        });

        const res = await fetch(`/api/tasks/${taskId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        if (res.ok) {
            const data = await res.json();
            if (data.event) {
                setSelectedTask((prev) => {
                    if (!prev) return null;
                    const runs = prev.runs ? [...prev.runs] : [];
                    runs.forEach((r) => {
                        if (r.events) {
                            r.events = r.events.map((e) =>
                                e.id === optimisticId ? data.event : e,
                            );
                        }
                    });
                    return { ...prev, runs };
                });
            }
            toast.success('Mensagem enviada ao agente');
        }
    };

    const handleApproveTool = async (approvalId: string) => {
        const res = await fetch(`/api/approvals/${approvalId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ status: 'approved' }),
        });

        if (res.ok) {
            toast.success('Tool execution approved');
        }
    };

    const handleRejectTool = async (approvalId: string, reason: string) => {
        const res = await fetch(`/api/approvals/${approvalId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                status: 'rejected',
                decision_reason: reason,
            }),
        });

        if (res.ok) {
            toast.info('Tool execution rejected');
        }
    };

    const handleMergeTask = async (taskId: string) => {
        const res = await fetch(`/api/tasks/${taskId}/merge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });

        const data = await res.json();
        if (data.success) {
            toast.success('Branch merged and worktree cleaned up!');
        } else {
            toast.error(data.message || 'Merge failed');
        }
    };

    const totalProjectSpent = tasks.reduce(
        (acc, t) => acc + Number(t.total_cost_usd || 0),
        0,
    );

    return (
        <>
            <Head title={`${currentProject.name} - Agent Orchestrator`} />

            <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
                {/* Global Application Header */}
                <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
                    {/* Brand & Project Info */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sm">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-bold tracking-tight text-foreground">
                                Antigravity Orchestrator
                            </span>
                        </div>

                        <div className="h-4 w-px bg-border" />

                        <div
                            onClick={() => {
                                setSettingsTab('workspace');
                                setIsSettingsOpen(true);
                            }}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-xs transition-colors hover:border-border/60 hover:bg-muted/60"
                            title="Clique para alterar ou navegar diretórios do workspace"
                        >
                            <span className="font-semibold text-foreground">
                                {currentProject.name}
                            </span>
                            <Badge
                                variant="outline"
                                className="gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/50"
                            >
                                <FolderGit2 className="h-3 w-3 text-indigo-500" />
                                {currentProject.workspace_path}
                            </Badge>
                        </div>
                    </div>

                    {/* View Navigation Tabs */}
                    <div className="flex items-center rounded-lg border border-border/60 bg-muted/60 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('board')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                activeTab === 'board'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Kanban className="h-3.5 w-3.5" />
                            Tasks (Paperclip)
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('canvas')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                activeTab === 'canvas'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Network className="h-3.5 w-3.5" />
                            Agent Graph (React Flow)
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('mcp')}
                            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                                activeTab === 'mcp'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Server className="h-3.5 w-3.5" />
                            MCP & Telemetry
                        </button>
                    </div>

                    {/* Cost & Budget Telemetry */}
                    <div className="flex items-center gap-3 text-xs">
                        {activeAgentIds.length > 0 && (
                            <Badge
                                variant="outline"
                                className="animate-pulse gap-1 border-amber-500 bg-amber-500/10 text-amber-600"
                            >
                                <Activity className="h-3 w-3" />
                                {activeAgentIds.length} Agents Active
                            </Badge>
                        )}

                        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1 font-mono text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="font-semibold text-foreground">
                                ${totalProjectSpent.toFixed(4)}
                            </span>
                            {project.monthly_budget_usd && (
                                <span className="text-[10px] text-muted-foreground">
                                    / $
                                    {Number(project.monthly_budget_usd).toFixed(
                                        0,
                                    )}
                                </span>
                            )}
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSettingsTab('ai');
                                setIsSettingsOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Configurações & Chaves de IA"
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                {/* Main Workspace Area with Sliding Inspector Console */}
                <div className="relative flex flex-1 overflow-hidden">
                    {/* Active View */}
                    <main className="flex-1 overflow-hidden">
                        {activeTab === 'canvas' && (
                            <WorkflowCanvas
                                workflow={currentWorkflow}
                                blueprints={blueprints}
                                availableTools={availableTools}
                                mcpServers={mcpServers}
                                activeAgentIds={activeAgentIds}
                                onSaveWorkflow={handleSaveWorkflow}
                            />
                        )}

                        {activeTab === 'board' && (
                            <TaskBoard
                                tasks={tasks}
                                agents={currentWorkflow.agent_nodes}
                                workflowId={currentWorkflow.id}
                                selectedTask={selectedTask}
                                onSelectTask={(task) => setSelectedTask(task)}
                                onCreateTask={handleCreateTask}
                            />
                        )}

                        {activeTab === 'mcp' && (
                            <div className="mx-auto max-w-4xl space-y-6 p-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold">
                                            Dynamic MCP Catalog & Telemetry
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Gerencie servidores Model Context
                                            Protocol conectados e ferramentas
                                            dinâmicas de IA.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setIsMcpModalOpen(true)}
                                        size="sm"
                                        className="gap-1.5"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Conectar Servidor MCP
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                                        <h4 className="text-sm font-semibold">
                                            Native PHP Tools Discovered
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {availableTools.length} tool classes
                                            discovered in{' '}
                                            <code>app/Ai/Tools/*</code>
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                            {availableTools.map((t) => (
                                                <Badge
                                                    key={t.class}
                                                    variant="secondary"
                                                    className="text-[11px]"
                                                >
                                                    {t.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold">
                                                Active MCP Servers
                                            </h4>
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {mcpServers.length} Conectados
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Servidores externos fornecendo
                                            ferramentas para os agentes.
                                        </p>
                                        <div className="space-y-2 pt-2">
                                            {mcpServers.length === 0 ? (
                                                <p className="text-xs text-muted-foreground italic">
                                                    Nenhum servidor MCP externo
                                                    cadastrado ainda.
                                                </p>
                                            ) : (
                                                mcpServers.map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-2"
                                                    >
                                                        <div>
                                                            <div className="text-xs font-semibold">
                                                                {s.name}
                                                            </div>
                                                            <div className="max-w-[220px] truncate font-mono text-[10px] text-muted-foreground">
                                                                {s.transport} •{' '}
                                                                {
                                                                    s.command_or_url
                                                                }
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px]"
                                                        >
                                                            {s
                                                                .discovered_tools_cache
                                                                ?.length ||
                                                                0}{' '}
                                                            tools
                                                        </Badge>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Antigravity Sliding Inspector Console */}
                    {selectedTask && (
                        <TaskInspector
                            task={selectedTask}
                            onClose={() => setSelectedTask(null)}
                            onSendMessage={handleSendMessage}
                            onApproveTool={handleApproveTool}
                            onRejectTool={handleRejectTool}
                            onMergeTask={handleMergeTask}
                        />
                    )}

                    {/* Global Settings & Provider Keys Modal */}
                    <SettingsModal
                        open={isSettingsOpen}
                        initialTab={settingsTab}
                        projectId={currentProject.id}
                        onClose={() => setIsSettingsOpen(false)}
                        onWorkspaceChanged={(newPath, updatedProject) => {
                            if (updatedProject) {
                                setCurrentProject(updatedProject);
                            }
                            router.reload();
                        }}
                    />

                    {/* Dynamic MCP Server Registration Modal */}
                    <McpServerModal
                        open={isMcpModalOpen}
                        onClose={() => setIsMcpModalOpen(false)}
                    />
                </div>
            </div>
        </>
    );
}

WorkspaceIndex.layout = (page: React.ReactNode) => page;
