import React, { useEffect, useRef, useState } from 'react';
import { Task, AgentRunEvent, ToolApproval } from '@/types/orchestrator';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { DiffViewerBlock } from './DiffViewerBlock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    X,
    Bot,
    Send,
    DollarSign,
    Cpu,
    ListTree,
    CornerDownRight,
    User,
    Sparkles,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface Props {
    task: Task | null;
    onClose: () => void;
    onSendMessage: (taskId: string, message: string) => Promise<void>;
    onApproveTool: (approvalId: string) => Promise<void>;
    onRejectTool: (approvalId: string, reason: string) => Promise<void>;
    onMergeTask: (taskId: string) => Promise<void>;
}

export function TaskInspector({
    task,
    onClose,
    onSendMessage,
    onApproveTool,
    onRejectTool,
    onMergeTask,
}: Props) {
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const scrollBottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [task?.runs]);

    if (!task) return null;

    // Gather all events across runs preserved in strict chronological order
    const allEvents: AgentRunEvent[] = [];
    const sortedRuns = [...(task.runs || [])].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeA - timeB;
    });

    sortedRuns.forEach((run) => {
        const sortedRunEvents = [...(run.events || [])].sort((a, b) => a.sequence - b.sequence);

        // Consolidate streaming message_delta events into the latest text within this run
        const consolidatedEvents: AgentRunEvent[] = [];
        let latestMessageDelta: AgentRunEvent | null = null;

        sortedRunEvents.forEach((ev) => {
            if (ev.event_type === 'message_delta') {
                latestMessageDelta = ev;
            } else {
                if (latestMessageDelta) {
                    consolidatedEvents.push(latestMessageDelta);
                    latestMessageDelta = null;
                }
                consolidatedEvents.push(ev);
            }
        });

        if (latestMessageDelta) {
            consolidatedEvents.push(latestMessageDelta);
        }

        consolidatedEvents.forEach((ev) => allEvents.push(ev));
    });

    // Deduplicate events by ID and prevent duplicate consecutive user messages
    const uniqueEvents: AgentRunEvent[] = [];
    const seenEventIds = new Set<string>();

    allEvents.forEach((ev) => {
        if (ev.id && seenEventIds.has(ev.id)) return;
        if (ev.id) seenEventIds.add(ev.id);

        if (ev.event_type === 'user_message') {
            const lastEv = uniqueEvents[uniqueEvents.length - 1];
            if (
                lastEv &&
                lastEv.event_type === 'user_message' &&
                lastEv.payload?.text?.trim() === ev.payload?.text?.trim()
            ) {
                return;
            }
        }

        uniqueEvents.push(ev);
    });

    // Approvals indexed by call_id or tool_name
    const approvals = task.approvals || [];

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || sending) return;

        setSending(true);
        const msg = inputMessage.trim();
        setInputMessage('');
        try {
            await onSendMessage(task.id, msg);
        } finally {
            setSending(false);
        }
    };

    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        setRetrying(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}/retry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            });
            if (res.ok) {
                toast.success('Tarefa reiniciada com sucesso!');
            } else {
                toast.error('Erro ao re-tentar tarefa');
            }
        } catch (e) {
            toast.error('Falha na requisição');
        } finally {
            setRetrying(false);
        }
    };

    return (
        <aside className="flex flex-col w-[480px] xl:w-[540px] h-full border-l border-border bg-card shadow-2xl z-20">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/80 p-4 bg-muted/20">
                <div className="space-y-1.5 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs uppercase font-semibold">
                            {task.status.replace('_', ' ')}
                        </Badge>
                        {task.assigned_agent && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                <Bot className="h-3.5 w-3.5 text-primary" />
                                {task.assigned_agent.name}
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold leading-tight text-foreground">{task.title}</h3>
                </div>

                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Failed Task Retry Banner */}
            {task.status === 'failed' && (
                <div className="flex items-center justify-between gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                    <div className="flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>A execução foi interrompida (ex: taxa da IA).</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleRetry}
                        disabled={retrying}
                        className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1 px-2.5 font-medium shadow-sm shrink-0"
                    >
                        <RotateCcw className={`h-3 w-3 ${retrying ? 'animate-spin' : ''}`} />
                        {retrying ? 'Re-tentando...' : 'Re-tentar'}
                    </Button>
                </div>
            )}

            {/* Live Metrics Bar (Paperclip Style) */}
            <div className="grid grid-cols-3 border-b border-border/60 bg-muted/10 py-2 px-4 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{(task.total_tokens || 0).toLocaleString()} tokens</span>
                </div>
                <div className="flex items-center gap-1 justify-center">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ${Number(task.total_cost_usd || 0).toFixed(4)}
                    </span>
                </div>
                <div className="text-right">
                    <span>Limit: ${Number(task.budget_limit_usd || 5.0).toFixed(2)}</span>
                </div>
            </div>

            {/* Delegated Subtasks Tree */}
            {(task.subtasks || []).length > 0 && (
                <div className="border-b border-border/60 bg-indigo-500/5 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                        <ListTree className="h-3.5 w-3.5" />
                        <span>Autonomous Subtasks ({task.subtasks!.length})</span>
                    </div>
                    <div className="space-y-1.5 pl-2">
                        {task.subtasks!.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between py-0.5 border-l-2 border-indigo-400 pl-2">
                                <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                                    <CornerDownRight className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium text-foreground">{sub.title}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {sub.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Review Gate Diff (when task is in_review) */}
            {task.status === 'in_review' && (
                <div className="p-4 pb-0">
                    <DiffViewerBlock
                        taskId={task.id}
                        gitBranch={task.git_branch}
                        worktreePath={task.worktree_path}
                        onMerge={() => onMergeTask(task.id)}
                    />
                </div>
            )}

            {/* Conversational Timeline (Antigravity AI Elements) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Initial Task Objective */}
                <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs text-foreground space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                        <User className="h-3 w-3" /> Initial Prompt / Goal
                    </div>
                    <p className="whitespace-pre-wrap">{task.description}</p>
                </div>

                {/* Streamed Events */}
                {uniqueEvents.map((ev) => {
                    if (ev.event_type === 'reasoning') {
                        return (
                            <ReasoningBlock
                                key={ev.id}
                                reasoning={ev.payload.reasoning || ev.payload.delta}
                                isStreaming={task.status === 'running'}
                            />
                        );
                    }

                    if (ev.event_type === 'tool_call') {
                        const matchedApproval = approvals.find(
                            (a) => a.tool_call_id === ev.payload.call_id || a.tool_name === ev.payload.name
                        );

                        // Find subsequent tool_result if available
                        const resultEvent = uniqueEvents.find(
                            (e) => e.event_type === 'tool_result' && e.payload.call_id === ev.payload.call_id
                        );

                        return (
                            <ToolCallBlock
                                key={ev.id}
                                toolName={ev.payload.name}
                                callId={ev.payload.call_id}
                                argumentsPayload={ev.payload.arguments}
                                result={resultEvent?.payload.result}
                                approval={matchedApproval}
                                onApprove={onApproveTool}
                                onReject={onRejectTool}
                            />
                        );
                    }

                    if (ev.event_type === 'message_delta') {
                        return (
                            <div key={ev.id} className="rounded-xl border border-border/80 bg-card p-3.5 text-xs leading-relaxed text-foreground shadow-sm">
                                <div className="flex items-center gap-1.5 font-semibold text-primary mb-2 text-[11px]">
                                    <Bot className="h-3.5 w-3.5" />
                                    <span>{task.assigned_agent?.name || 'Agent'}</span>
                                </div>
                                <div className="prose dark:prose-invert max-w-none text-xs">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {ev.payload.text || ev.payload.delta}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        );
                    }

                    if (ev.event_type === 'user_message') {
                        return (
                            <div key={ev.id} className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground mr-1">
                                    <User className="h-3 w-3" />
                                    <span>You</span>
                                </div>
                                <div className="rounded-xl bg-primary text-primary-foreground p-3 text-xs max-w-[85%] whitespace-pre-wrap shadow-sm">
                                    {ev.payload.text}
                                </div>
                            </div>
                        );
                    }

                    if (ev.event_type === 'error') {
                        return (
                            <div key={ev.id} className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                                {ev.payload.message}
                            </div>
                        );
                    }

                    return null;
                })}

                <div ref={scrollBottomRef} />
            </div>

            {/* Human Input Prompt Bar */}
            <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2">
                <Input
                    placeholder="Provide additional instructions or answer agent questions..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 h-10 text-xs"
                />
                <Button type="submit" size="sm" className="h-10 px-3.5" disabled={sending || !inputMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </aside>
    );
}
