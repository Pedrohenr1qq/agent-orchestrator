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

export function DiffViewerBlock({
    taskId,
    gitBranch,
    worktreePath,
    onMerge,
}: Props) {
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
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
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
    const isNotGit =
        changes?.status?.includes('Not a git repository') ||
        changes?.diff?.includes('Not a git repository');

    return (
        <div className="my-3 space-y-3 overflow-hidden rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
            {/* Top Gate Header */}
            <div className="flex flex-col gap-2.5 border-b border-purple-500/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {isDocTask ? (
                            <BookOpen className="h-4 w-4 shrink-0 text-purple-600" />
                        ) : (
                            <GitPullRequest className="h-4 w-4 shrink-0 text-purple-600" />
                        )}
                        <span className="text-sm font-semibold text-foreground">
                            {isDocTask
                                ? 'Review Gate & Prévia Editorial'
                                : 'Review Gate & Alterações'}
                        </span>
                        {isDocTask && (
                            <Badge
                                variant="secondary"
                                className="border-purple-300 bg-purple-500/10 text-[10px] text-purple-600"
                            >
                                Documento
                            </Badge>
                        )}
                    </div>
                    {gitBranch && (
                        <div className="flex items-center gap-1">
                            <Badge
                                variant="outline"
                                className="max-w-[240px] truncate border-purple-300 font-mono text-[10px] text-purple-600"
                                title={gitBranch}
                            >
                                <GitBranch className="mr-1 h-3 w-3 shrink-0" />
                                <span className="truncate">{gitBranch}</span>
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={fetchChanges}
                        title="Recarregar"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                        />
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-purple-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
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
                    <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 p-1 text-xs">
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
                            Diff Git ({changes?.changed_files?.length || 0}{' '}
                            arquivos)
                        </button>
                    </div>

                    {/* Multi-document selector if more than 1 file */}
                    {documents.length > 1 && activeTab === 'preview' && (
                        <div className="flex max-w-[280px] items-center gap-1 overflow-x-auto">
                            {documents.map((doc, idx) => (
                                <button
                                    key={doc.path}
                                    type="button"
                                    onClick={() => setSelectedDocIndex(idx)}
                                    className={`truncate rounded px-2 py-0.5 font-mono text-[11px] transition-all ${
                                        selectedDocIndex === idx
                                            ? 'border border-purple-400 bg-purple-500/20 font-semibold text-purple-700'
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
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-1.5 text-[11px]">
                        <div className="flex items-center gap-2 font-mono text-muted-foreground">
                            <span className="font-semibold text-foreground">
                                {activeDoc.name}
                            </span>
                            <span>•</span>
                            <span>{activeDoc.word_count} palavras</span>
                            <span>•</span>
                            <span>{activeDoc.lines_count} linhas</span>
                            <span>•</span>
                            <span>
                                {(activeDoc.size_bytes / 1024).toFixed(1)} KB
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px]"
                            onClick={() => handleCopyContent(activeDoc.content)}
                        >
                            {copied ? (
                                <CheckCheck className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <Copy className="h-3 w-3" />
                            )}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </Button>
                    </div>

                    {/* Rich Rendered Document */}
                    <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-background p-5 leading-relaxed shadow-inner">
                        <div className="prose dark:prose-invert max-w-none space-y-2 text-xs leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {activeDoc.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            ) : isNotGit ? (
                <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-foreground">
                                Diretório sem Repositório Git
                            </h4>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Este projeto está rodando em um diretório do
                                computador sem versionamento Git. Você pode
                                inicializar o Git agora para habilitar branches
                                isoladas, worktrees e diffs automáticos.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-amber-500/40 text-xs text-amber-400 hover:bg-amber-500/20"
                            onClick={handleInitGit}
                            disabled={initializingGit}
                        >
                            <GitBranch className="h-3.5 w-3.5" />
                            {initializingGit
                                ? 'Inicializando Git...'
                                : 'Inicializar Repositório Git (1-Clique)'}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {changes?.status && (
                        <div className="rounded bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                            {changes.status}
                        </div>
                    )}
                    <pre className="max-h-72 overflow-x-auto overflow-y-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground shadow-inner">
                        {changes?.diff || 'No diff found'}
                    </pre>
                </div>
            )}
        </div>
    );
}
