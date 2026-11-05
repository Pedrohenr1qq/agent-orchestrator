import React from 'react';
import { Task, TaskStatus } from '@/types/orchestrator';
import { Badge } from '@/components/ui/badge';
import {
    Bot,
    GitBranch,
    ShieldAlert,
    GitPullRequest,
    DollarSign,
    ListTree,
} from 'lucide-react';

interface Props {
    task: Task;
    isSelected: boolean;
    onSelect: (task: Task) => void;
}

const statusBadgeStyles: Record<
    TaskStatus,
    { label: string; className: string }
> = {
    backlog: { label: 'Backlog', className: 'bg-muted text-muted-foreground' },
    queued: {
        label: 'Queued',
        className: 'bg-blue-500/10 text-blue-600 border-blue-200',
    },
    running: {
        label: 'Running',
        className:
            'bg-amber-500/10 text-amber-600 border-amber-300 animate-pulse',
    },
    awaiting_approval: {
        label: 'Needs Approval',
        className: 'bg-red-500/10 text-red-600 border-red-300 animate-bounce',
    },
    in_review: {
        label: 'Review Gate',
        className: 'bg-purple-500/10 text-purple-600 border-purple-300',
    },
    completed: {
        label: 'Completed',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
    },
    failed: {
        label: 'Failed',
        className: 'bg-destructive/10 text-destructive border-destructive/30',
    },
    halted_budget: {
        label: 'Budget Halted',
        className: 'bg-rose-500/10 text-rose-600 border-rose-300',
    },
};

export function TaskCard({ task, isSelected, onSelect }: Props) {
    const statusMeta =
        statusBadgeStyles[task.status] || statusBadgeStyles.backlog;
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(
        (s) => s.status === 'completed',
    ).length;

    return (
        <div
            onClick={() => onSelect(task)}
            className={`group cursor-pointer rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md ${
                isSelected
                    ? 'border-primary bg-accent/10 ring-2 ring-primary/20'
                    : 'border-border'
            }`}
        >
            {/* Status and Assigned Agent */}
            <div className="mb-2 flex items-center justify-between gap-2">
                <Badge
                    variant="outline"
                    className={`border px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.className}`}
                >
                    {statusMeta.label}
                </Badge>

                {task.assigned_agent && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Bot className="h-3.5 w-3.5 text-primary" />
                        <span className="max-w-[120px] truncate">
                            {task.assigned_agent.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Task Title */}
            <h4 className="line-clamp-2 text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
                {task.title}
            </h4>

            {/* Subtasks Progress */}
            {subtasks.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ListTree className="h-3.5 w-3.5 text-indigo-500" />
                    <span>
                        {completedSubtasks}/{subtasks.length} subtasks completed
                    </span>
                </div>
            )}

            {/* Git Branch / Worktree */}
            {task.git_branch && (
                <div className="mt-2 flex w-fit items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    <GitBranch className="h-3 w-3 text-emerald-500" />
                    <span className="max-w-[180px] truncate">
                        {task.git_branch}
                    </span>
                </div>
            )}

            {/* Footer: Tokens & Cost */}
            <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                <span>{(task.total_tokens || 0).toLocaleString()} tokens</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    ${Number(task.total_cost_usd || 0).toFixed(4)}
                </span>
            </div>
        </div>
    );
}
