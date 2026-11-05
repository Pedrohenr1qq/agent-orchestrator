import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, XCircle, ShieldAlert, Terminal, FileCode, Check, X } from 'lucide-react';
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
        <div className={`rounded-xl border my-2 overflow-hidden transition-all text-xs ${
            isPendingApproval
                ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20'
                : 'border-border/80 bg-card/60'
        }`}>
            {/* Tool Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground hover:text-primary transition-colors"
                >
                    <Wrench className="h-3.5 w-3.5 text-primary" />
                    <span>{toolName}</span>
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>

                <div className="flex items-center gap-2">
                    {isPendingApproval ? (
                        <Badge variant="outline" className="border-amber-500 bg-amber-500/10 text-amber-600 gap-1 animate-pulse">
                            <ShieldAlert className="h-3 w-3" />
                            Approval Required
                        </Badge>
                    ) : result ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="text-[10px]">Calling...</Badge>
                    )}
                </div>
            </div>

            {/* Human-in-the-Loop Approval Action Bar */}
            {isPendingApproval && (
                <div className="border-t border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                            Ação sensível aguardando confirmação humana
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-2.5"
                                onClick={() => setIsRejecting(true)}
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Rejeitar
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 font-medium shadow-sm"
                                onClick={() => onApprove && onApprove(approval.id)}
                            >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Aprovar Execução
                            </Button>
                        </div>
                    </div>

                    {isRejecting && (
                        <div className="flex gap-2 pt-2 border-t border-amber-500/20">
                            <input
                                type="text"
                                placeholder="Motivo da recusa (para orientar o agente)..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="flex-1 rounded border border-border px-2 py-1 text-xs bg-background"
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => onReject && onReject(approval.id, rejectReason)}
                            >
                                Confirmar Rejeição
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Collapsible Details: Arguments and Output */}
            {(isOpen || isPendingApproval) && (
                <div className="border-t border-border/60 p-3 space-y-2 font-mono">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Arguments:</span>
                        <pre className="rounded bg-muted/50 p-2 text-[11px] overflow-x-auto text-foreground">
                            {typeof argumentsPayload === 'string'
                                ? argumentsPayload
                                : JSON.stringify(argumentsPayload, null, 2)}
                        </pre>
                    </div>

                    {result && (
                        <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Result:</span>
                            <pre className="rounded bg-muted/40 p-2 text-[11px] overflow-x-auto text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {result}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
