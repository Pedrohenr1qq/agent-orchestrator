import React, { useState } from 'react';
import { Task, TaskStatus, AgentNode } from '@/types/orchestrator';
import { TaskCard } from './TaskCard';
import { NewTaskModal } from './NewTaskModal';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
    tasks: Task[];
    agents: AgentNode[];
    workflowId: string;
    selectedTask: Task | null;
    onSelectTask: (task: Task) => void;
    onCreateTask: (data: any) => Promise<void>;
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'backlog', title: 'Backlog', color: 'border-t-slate-400' },
    { id: 'queued', title: 'Queued', color: 'border-t-blue-500' },
    { id: 'running', title: 'Running', color: 'border-t-amber-500' },
    {
        id: 'awaiting_approval',
        title: 'Needs Approval',
        color: 'border-t-red-500',
    },
    { id: 'in_review', title: 'Review Gate', color: 'border-t-purple-500' },
    { id: 'completed', title: 'Completed', color: 'border-t-emerald-500' },
    { id: 'failed', title: 'Failed', color: 'border-t-rose-500' },
];

export function TaskBoard({
    tasks,
    agents,
    workflowId,
    selectedTask,
    onSelectTask,
    onCreateTask,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Only display top-level tasks on the main board (subtasks are shown inside the parent card/inspector)
    const filteredTasks = tasks.filter((t) => {
        if (t.parent_task_id) return false;
        if (!searchQuery.trim()) return true;
        return (
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-background/50">
            {/* Board Header Toolbar */}
            <div className="flex items-center justify-between border-b border-border/80 bg-card/60 px-6 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {filteredTasks.length} active tasks
                    </span>
                </div>

                <Button
                    size="sm"
                    onClick={() => setIsCreateOpen(true)}
                    className="h-9 gap-1.5"
                >
                    <Plus className="h-4 w-4" />
                    New Task
                </Button>
            </div>

            {/* Kanban Columns */}
            <div className="flex-1 scrollbar-thin overflow-x-auto p-4 sm:p-6">
                <div className="flex h-full min-w-max gap-3.5 pb-2">
                    {columns.map((col) => {
                        const colTasks = filteredTasks.filter((t) =>
                            col.id === 'failed'
                                ? t.status === 'failed' ||
                                  t.status === 'halted_budget'
                                : t.status === col.id,
                        );

                        return (
                            <div
                                key={col.id}
                                className={`flex w-72 flex-col rounded-xl border border-t-4 border-border/80 bg-muted/20 ${col.color} shrink-0 p-3`}
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between px-1 pb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                            {col.title}
                                        </h3>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            {colTasks.length}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        onClick={() => setIsCreateOpen(true)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {/* Task List in Column */}
                                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                                    {colTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isSelected={
                                                selectedTask?.id === task.id
                                            }
                                            onSelect={onSelectTask}
                                        />
                                    ))}

                                    {colTasks.length === 0 && (
                                        <div
                                            onClick={() =>
                                                setIsCreateOpen(true)
                                            }
                                            className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/30"
                                        >
                                            <Plus className="h-4 w-4 text-primary" />
                                            <span>No tasks in {col.title}</span>
                                            <span className="text-[10px] text-primary underline">
                                                Click to create task
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create Task Modal */}
            <NewTaskModal
                open={isCreateOpen}
                agents={agents}
                workflowId={workflowId}
                onClose={() => setIsCreateOpen(false)}
                onSubmit={onCreateTask}
            />
        </div>
    );
}
