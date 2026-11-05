import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Loader2 } from 'lucide-react';

interface Props {
    reasoning: string;
    isStreaming?: boolean;
}

export function ReasoningBlock({ reasoning, isStreaming }: Props) {
    const [isOpen, setIsOpen] = useState(true);

    if (!reasoning) return null;

    return (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 my-2.5 overflow-hidden transition-all">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isStreaming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    ) : (
                        <Brain className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                    <span>Agent Reasoning & Strategy {isStreaming && '(Thinking...)'}</span>
                </div>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {isOpen && (
                <div className="border-t border-indigo-500/10 p-3.5 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {reasoning}
                </div>
            )}
        </div>
    );
}
