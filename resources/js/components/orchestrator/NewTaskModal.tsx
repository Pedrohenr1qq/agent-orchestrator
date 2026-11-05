import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AgentNode } from '@/types/orchestrator';
import { Sparkles, Image as ImageIcon, Send } from 'lucide-react';

interface Props {
    open: boolean;
    agents: AgentNode[];
    workflowId: string;
    onClose: () => void;
    onSubmit: (data: {
        workflow_id: string;
        assigned_node_id: string | null;
        title: string;
        description: string;
        attachments?: any[];
        budget_limit_usd?: number;
    }) => Promise<void>;
}

export function NewTaskModal({ open, agents, workflowId, onClose, onSubmit }: Props) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedNodeId, setAssignedNodeId] = useState<string>(agents[0]?.id || '');
    const [budgetLimit, setBudgetLimit] = useState('3.00');
    const [attachments, setAttachments] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setAttachments((prev) => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        setSubmitting(true);
        try {
            await onSubmit({
                workflow_id: workflowId,
                assigned_node_id: assignedNodeId || null,
                title: title.trim(),
                description: description.trim(),
                attachments: attachments.length > 0 ? attachments : undefined,
                budget_limit_usd: budgetLimit ? parseFloat(budgetLimit) : undefined,
            });

            setTitle('');
            setDescription('');
            setAttachments([]);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Create Autonomous Task
                    </DialogTitle>
                    <DialogDescription>
                        Assign a goal to an agent. The agent will execute tools, create worktrees, and stream its reasoning.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Build Pricing Page with FAQ accordion and CTA"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description">Requirements & User Story</Label>
                        <textarea
                            id="description"
                            rows={4}
                            placeholder="Describe what needs to be created or modified, target routes, styling preferences..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            className="w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="assigned-agent">Lead Agent</Label>
                            <select
                                id="assigned-agent"
                                value={assignedNodeId}
                                onChange={(e) => setAssignedNodeId(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            >
                                {agents.map((ag) => (
                                    <option key={ag.id} value={ag.id}>
                                        {ag.name} ({ag.role_title})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="budget">Budget Limit ($)</Label>
                            <Input
                                id="budget"
                                type="number"
                                step="0.5"
                                value={budgetLimit}
                                onChange={(e) => setBudgetLimit(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Multimodal Attachments (Vision) */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            Mockups / Attachments (Vision)
                        </Label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                        />

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {attachments.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`Mockup ${idx}`}
                                        className="h-14 w-14 object-cover rounded-md border border-border"
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-3">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            <Send className="h-4 w-4 mr-1.5" />
                            {submitting ? 'Dispatching...' : 'Dispatch Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
