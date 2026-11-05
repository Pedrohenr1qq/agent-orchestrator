import React, { useEffect, useState } from 'react';
import {
    GitPullRequest,
    GitBranch,
    Check,
    RefreshCw,
    FileText,
    Code2,
    Copy,
    CheckCheck,
    Files,
    BookOpen,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface DocumentItem {
    path: string;
    name: string;
    extension: string;
    content: string;
    size_bytes: number;
    word_count: number;
    lines_count: number;
}

interface ChangesResponse {
    diff: string;
    status: string;
    changed_files: string[];
    documents: DocumentItem[];
    is_document_task: boolean;
    worktree_path?: string | null;
    git_branch?: string | null;
}

interface Props {
    taskId: string;
    gitBranch?: string | null;
    worktreePath?: string | null;
    onMerge: () => Promise<void>;
}

export function DiffViewerBlock({ taskId, gitBranch, worktreePath, onMerge }: Props) {
    const [changes, setChanges] = useState<ChangesResponse | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'diff'>('preview');
    const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [merging, setMerging] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    const fetchChanges = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${taskId}/diff`);
            const data: ChangesResponse = await res.json();
            setChanges(data);

            // Default to diff if no documents found
            if (!data.documents || data.documents.length === 0) {
                setActiveTab('diff');
            } else {
                setActiveTab('preview');
            }
        } catch (e) {
            toast.error('Erro ao carregar alterações do Review Gate');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChanges();
    }, [taskId]);

    const handleMerge = async () => {
        setMerging(true);
        try {
            await onMerge();
        } finally {
            setMerging(false);
        }
    };

    const handleCopyContent = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Conteúdo copiado para a área de transferência');
        setTimeout(() => setCopied(false), 2000);
    };

    const [initializingGit, setInitializingGit] = useState<boolean>(false);

    const handleInitGit = async () => {
        setInitializingGit(true);
        try {
            const res = await fetch('/api/workspaces/init-git', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Repositório Git inicializado!');
                await fetchChanges();
            } else {
                toast.error(data.message || 'Falha ao inicializar Git');
            }
        } catch (e) {
            toast.error('Erro ao conectar com servidor para inicializar Git');
        } finally {
            setInitializingGit(false);
        }
    };

    const documents = changes?.documents || [];
    const activeDoc = documents[selectedDocIndex] || documents[0];
    const isDocTask = documents.length > 0;
    const isNotGit = changes?.status?.includes('Not a git repository') || changes?.diff?.includes('Not a git repository');

    return (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3 my-3 overflow-hidden">
            {/* Top Gate Header */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-purple-500/20 pb-3">
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {isDocTask ? (
                            <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                        ) : (
                            <GitPullRequest className="h-4 w-4 text-purple-600 shrink-0" />
                        )}
                        <span className="font-semibold text-sm text-foreground">
                            {isDocTask ? 'Review Gate & Prévia Editorial' : 'Review Gate & Alterações'}
                        </span>
                        {isDocTask && (
                            <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-300">
                                Documento
                            </Badge>
                        )}
                    </div>
                    {gitBranch && (
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className="font-mono text-[10px] text-purple-600 border-purple-300 max-w-[240px] truncate" title={gitBranch}>
                                <GitBranch className="h-3 w-3 mr-1 shrink-0" />
                                <span className="truncate">{gitBranch}</span>
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={fetchChanges} title="Recarregar">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm px-3"
                        onClick={handleMerge}
                        disabled={merging}
                    >
                        <Check className="h-4 w-4" />
                        {merging
                            ? 'Processando...'
                            : isDocTask
                            ? 'Aprovar & Publicar'
                            : gitBranch
                            ? 'Aprovar & Merge'
                            : 'Aprovar & Concluir'}
                    </Button>
                </div>
            </div>

            {/* Mode Switcher (Document vs Raw Diff) */}
            {isDocTask && (
                <div className="flex items-center justify-between gap-2 border-b border-purple-500/10 pb-2">
                    <div className="flex items-center gap-1 rounded-lg bg-background/80 p-1 border border-border/60 text-xs">
                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all ${
                                activeTab === 'preview'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Documento Formatado
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('diff')}
                            className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-all ${
                                activeTab === 'diff'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Code2 className="h-3.5 w-3.5" />
                            Diff Git ({changes?.changed_files?.length || 0} arquivos)
                        </button>
                    </div>

                    {/* Multi-document selector if more than 1 file */}
                    {documents.length > 1 && activeTab === 'preview' && (
                        <div className="flex items-center gap-1 overflow-x-auto max-w-[280px]">
                            {documents.map((doc, idx) => (
                                <button
                                    key={doc.path}
                                    type="button"
                                    onClick={() => setSelectedDocIndex(idx)}
                                    className={`px-2 py-0.5 text-[11px] rounded font-mono truncate transition-all ${
                                        selectedDocIndex === idx
                                            ? 'bg-purple-500/20 text-purple-700 font-semibold border border-purple-400'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {doc.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Body Content */}
            {loading ? (
                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                    Carregando dados do Review Gate...
                </div>
            ) : activeTab === 'preview' && activeDoc ? (
                <div className="space-y-3">
                    {/* Document Stats Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50 text-[11px]">
                        <div className="flex items-center gap-2 font-mono text-muted-foreground">
                            <span className="font-semibold text-foreground">{activeDoc.name}</span>
                            <span>•</span>
                            <span>{activeDoc.word_count} palavras</span>
                            <span>•</span>
                            <span>{activeDoc.lines_count} linhas</span>
                            <span>•</span>
                            <span>{(activeDoc.size_bytes / 1024).toFixed(1)} KB</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px]"
                            onClick={() => handleCopyContent(activeDoc.content)}
                        >
                            {copied ? <CheckCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </Button>
                    </div>

                    {/* Rich Rendered Document */}
                    <div className="rounded-xl bg-background border border-border p-5 max-h-96 overflow-y-auto leading-relaxed shadow-inner">
                        <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {activeDoc.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            ) : isNotGit ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-foreground">Diretório sem Repositório Git</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Este projeto está rodando em um diretório do computador sem versionamento Git. Você pode inicializar o Git agora para habilitar branches isoladas, worktrees e diffs automáticos.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/20 gap-1.5"
                            onClick={handleInitGit}
                            disabled={initializingGit}
                        >
                            <GitBranch className="h-3.5 w-3.5" />
                            {initializingGit ? 'Inicializando Git...' : 'Inicializar Repositório Git (1-Clique)'}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {changes?.status && (
                        <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded">
                            {changes.status}
                        </div>
                    )}
                    <pre className="rounded-xl bg-background border border-border p-3 text-[11px] font-mono overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed text-foreground shadow-inner">
                        {changes?.diff || 'No diff found'}
                    </pre>
                </div>
            )}
        </div>
    );
}
