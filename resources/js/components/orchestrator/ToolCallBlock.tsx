import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Wrench,
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Terminal,
    FileCode,
    Check,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
    toolName: string;
    callId: string;
    argumentsPayload: any;
    result?: string;
    approval?: {
        id: string;
        status: 'pending' | 'approved' | 'rejected';
        decision_reason?: string | null;
    };
    onApprove?: (approvalId: string) => void;
    onReject?: (approvalId: string, reason: string) => void;
}

export function ToolCallBlock({
    toolName,
    callId,
    argumentsPayload,
    result,
    approval,
    onApprove,
    onReject,
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    const isPendingApproval = approval && approval.status === 'pending';

    return (
        <div
            className={`my-2 overflow-hidden rounded-xl border text-xs transition-all ${
                isPendingApproval
                    ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20'
                    : 'border-border/80 bg-card/60'
            }`}
        >
            {/* Tool Header */}
            <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground transition-colors hover:text-primary"
                >
                    <Wrench className="h-3.5 w-3.5 text-primary" />
                    <span>{toolName}</span>
                    {isOpen ? (
                        <ChevronDown className="h-3 w-3" />
                    ) : (
                        <ChevronRight className="h-3 w-3" />
                    )}
                </button>

                <div className="flex items-center gap-2">
                    {isPendingApproval ? (
                        <Badge
                            variant="outline"
                            className="animate-pulse gap-1 border-amber-500 bg-amber-500/10 text-amber-600"
                        >
                            <ShieldAlert className="h-3 w-3" />
                            Approval Required
                        </Badge>
                    ) : result ? (
                        <Badge
                            variant="outline"
                            className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="text-[10px]">
                            Calling...
                        </Badge>
                    )}
                </div>
            </div>

            {/* Human-in-the-Loop Approval Action Bar */}
            {isPendingApproval && (
                <div className="space-y-2 border-t border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                            Ação sensível aguardando confirmação humana
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => setIsRejecting(true)}
                            >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Rejeitar
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 bg-emerald-600 px-2.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
                                onClick={() =>
                                    onApprove && onApprove(approval.id)
                                }
                            >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Aprovar Execução
                            </Button>
                        </div>
                    </div>

                    {isRejecting && (
                        <div className="flex gap-2 border-t border-amber-500/20 pt-2">
                            <input
                                type="text"
                                placeholder="Motivo da recusa (para orientar o agente)..."
                                value={rejectReason}
                                onChange={(e) =>
                                    setRejectReason(e.target.value)
                                }
                                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() =>
                                    onReject &&
                                    onReject(approval.id, rejectReason)
                                }
                            >
                                Confirmar Rejeição
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Collapsible Details: Arguments and Output */}
            {(isOpen || isPendingApproval) && (
                <div className="space-y-2 border-t border-border/60 p-3 font-mono">
                    <div>
                        <span className="mb-1 block text-[10px] font-bold text-muted-foreground uppercase">
                            Arguments:
                        </span>
                        <pre className="overflow-x-auto rounded bg-muted/50 p-2 text-[11px] text-foreground">
                            {typeof argumentsPayload === 'string'
                                ? argumentsPayload
                                : JSON.stringify(argumentsPayload, null, 2)}
                        </pre>
                    </div>

                    {result && (
                        <div>
                            <span className="mb-1 block text-[10px] font-bold text-muted-foreground uppercase">
                                Result:
                            </span>
                            <pre className="max-h-48 overflow-x-auto overflow-y-auto rounded bg-muted/40 p-2 text-[11px] whitespace-pre-wrap text-muted-foreground">
                                {result}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
