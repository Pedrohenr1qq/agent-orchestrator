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
        <div className="my-2.5 overflow-hidden rounded-xl border border-indigo-500/20 bg-indigo-500/5 transition-all">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-500/10 dark:text-indigo-300"
            >
                <div className="flex items-center gap-2">
                    {isStreaming ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    ) : (
                        <Brain className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                    <span>
                        Agent Reasoning & Strategy{' '}
                        {isStreaming && '(Thinking...)'}
                    </span>
                </div>
                {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                )}
            </button>

            {isOpen && (
                <div className="max-h-60 overflow-y-auto border-t border-indigo-500/10 p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {reasoning}
                </div>
            )}
        </div>
    );
}
