import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Key,
    FolderTree,
    Search,
    Cpu,
    CheckCircle2,
    XCircle,
    Loader2,
    Save,
    ExternalLink,
    Folder,
    GitBranch,
} from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    initialTab?: 'ai' | 'search' | 'workspace';
    onWorkspaceChanged?: (path: string, project?: any) => void;
}

export function SettingsModal({ open, onClose, projectId, initialTab = 'ai', onWorkspaceChanged }: Props) {
    const [activeTab, setActiveTab] = useState<'ai' | 'search' | 'workspace'>(initialTab);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);

    useEffect(() => {
        if (open && initialTab) {
            setActiveTab(initialTab);
        }
    }, [open, initialTab]);

    const [settings, setSettings] = useState({
        gemini_api_key: '',
        anthropic_api_key: '',
        openai_api_key: '',
        deepseek_api_key: '',
        ollama_url: 'http://host.docker.internal:11434',
        search_provider: 'duckduckgo',
        tavily_api_key: '',
        default_workspace_path: '/workspaces/website',
        has_keys: {
            gemini: false,
            anthropic: false,
            openai: false,
            deepseek: false,
            tavily: false,
        },
    });

    // Directory Browser State
    const [directoryLocations, setDirectoryLocations] = useState<any[]>([]);
    const [loadingDirs, setLoadingDirs] = useState(false);
    const [isBrowsingDirs, setIsBrowsingDirs] = useState(false);

    useEffect(() => {
        if (open) {
            fetchSettings();
        }
    }, [open]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (e) {
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const fetchDirectories = async () => {
        setLoadingDirs(true);
        setIsBrowsingDirs(true);
        try {
            const res = await fetch('/api/workspaces/directories');
            if (res.ok) {
                const data = await res.json();
                setDirectoryLocations(data.locations || []);
            }
        } catch (e) {
            toast.error('Erro ao carregar diretórios do computador');
        } finally {
            setLoadingDirs(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ ...settings, project_id: projectId }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Configurações salvas com sucesso!');
                if (onWorkspaceChanged && settings.default_workspace_path) {
                    onWorkspaceChanged(settings.default_workspace_path, data.project);
                }
                onClose();
            } else {
                toast.error('Falha ao salvar configurações');
            }
        } catch (e) {
            toast.error('Erro na requisição');
        } finally {
            setSaving(false);
        }
    };

    const handleTestAi = async (provider: string) => {
        setTestingProvider(provider);
        try {
            const res = await fetch('/api/settings/test-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ provider }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Conexão bem-sucedida!');
            } else {
                toast.error(data.message || 'Falha na conexão com o provedor');
            }
        } catch (e) {
            toast.error('Erro ao testar provedor');
        } finally {
            setTestingProvider(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        Configurações do Sistema
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Gerencie suas chaves de API, motor de pesquisa web e diretórios de trabalho sem tocar no .env.
                    </DialogDescription>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 pt-3">
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === 'ai' ? 'default' : 'ghost'}
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setActiveTab('ai')}
                        >
                            <Cpu className="h-3.5 w-3.5" />
                            Provedores de IA
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === 'search' ? 'default' : 'ghost'}
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setActiveTab('search')}
                        >
                            <Search className="h-3.5 w-3.5" />
                            Pesquisa Web
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === 'workspace' ? 'default' : 'ghost'}
                            className="h-8 text-xs gap-1.5"
                            onClick={() => setActiveTab('workspace')}
                        >
                            <FolderTree className="h-3.5 w-3.5" />
                            Workspaces & Pastas
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {/* TAB: AI PROVIDERS */}
                            {activeTab === 'ai' && (
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-border/70 p-3 bg-muted/20 text-xs text-muted-foreground">
                                        As chaves são salvas criptografadas no banco de dados e sobrescrevem as variáveis do .env dinamicamente.
                                    </div>

                                    {/* Google Gemini */}
                                    <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-card">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                Google Gemini API Key
                                                {settings.has_keys.gemini && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                                                        Configurada
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                disabled={testingProvider === 'gemini'}
                                                onClick={() => handleTestAi('gemini')}
                                            >
                                                {testingProvider === 'gemini' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Testar Conexão'}
                                            </Button>
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="Cole sua chave da Google AI Studio..."
                                            value={settings.gemini_api_key}
                                            onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                    </div>

                                    {/* Anthropic Claude */}
                                    <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-card">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                Anthropic (Claude) API Key
                                                {settings.has_keys.anthropic && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                                                        Configurada
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                disabled={testingProvider === 'anthropic'}
                                                onClick={() => handleTestAi('anthropic')}
                                            >
                                                {testingProvider === 'anthropic' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Testar Conexão'}
                                            </Button>
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="sk-ant-api..."
                                            value={settings.anthropic_api_key}
                                            onChange={(e) => setSettings({ ...settings, anthropic_api_key: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                    </div>

                                    {/* OpenAI */}
                                    <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-card">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                OpenAI (GPT / o-series) API Key
                                                {settings.has_keys.openai && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                                                        Configurada
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                disabled={testingProvider === 'openai'}
                                                onClick={() => handleTestAi('openai')}
                                            >
                                                {testingProvider === 'openai' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Testar Conexão'}
                                            </Button>
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="sk-proj-..."
                                            value={settings.openai_api_key}
                                            onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                    </div>

                                    {/* DeepSeek */}
                                    <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-card">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                DeepSeek API Key
                                                {settings.has_keys.deepseek && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                                                        Configurada
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                disabled={testingProvider === 'deepseek'}
                                                onClick={() => handleTestAi('deepseek')}
                                            >
                                                {testingProvider === 'deepseek' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Testar Conexão'}
                                            </Button>
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="sk-..."
                                            value={settings.deepseek_api_key}
                                            onChange={(e) => setSettings({ ...settings, deepseek_api_key: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                    </div>

                                    {/* Ollama Local */}
                                    <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-card">
                                        <Label className="text-xs font-semibold">Ollama URL (Modelos Locais)</Label>
                                        <Input
                                            type="text"
                                            placeholder="http://host.docker.internal:11434"
                                            value={settings.ollama_url}
                                            onChange={(e) => setSettings({ ...settings, ollama_url: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB: SEARCH ENGINE */}
                            {activeTab === 'search' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Motor de Busca Padrão</Label>
                                        <select
                                            value={settings.search_provider}
                                            onChange={(e) => setSettings({ ...settings, search_provider: e.target.value })}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm"
                                        >
                                            <option value="duckduckgo">DuckDuckGo (Gratuito, Ilimitado, Sem Chave)</option>
                                            <option value="tavily">Tavily AI Search (Otimizado para LLMs & Pesquisa)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 p-3 rounded-lg border border-border/80 bg-card">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                                Tavily API Key (Opcional)
                                                {settings.has_keys.tavily && (
                                                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                                                        Ativa
                                                    </Badge>
                                                )}
                                            </Label>
                                            <a
                                                href="https://tavily.com"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-primary flex items-center gap-0.5 hover:underline"
                                            >
                                                Obter chave <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="tvly-..."
                                            value={settings.tavily_api_key}
                                            onChange={(e) => setSettings({ ...settings, tavily_api_key: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                        <p className="text-[11px] text-muted-foreground pt-1">
                                            Utilizado pelo Agente Pesquisador para trazer artigos limpos e fontes prontas para IA. Se vazio, o sistema usa DuckDuckGo gratuitamente.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TAB: WORKSPACE & DIRECTORIES */}
                            {activeTab === 'workspace' && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold">Caminho Padrão do Workspace</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs gap-1.5"
                                                onClick={fetchDirectories}
                                            >
                                                <FolderTree className="h-3.5 w-3.5 text-primary" />
                                                Explorar Pastas do PC
                                            </Button>
                                        </div>
                                        <Input
                                            type="text"
                                            value={settings.default_workspace_path}
                                            onChange={(e) => setSettings({ ...settings, default_workspace_path: e.target.value })}
                                            className="text-xs font-mono h-9"
                                        />
                                    </div>

                                    {/* Visual Directory Picker */}
                                    {isBrowsingDirs && (
                                        <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Pastas Encontradas no Computador
                                                </h4>
                                                {loadingDirs && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                                            </div>

                                            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                                {directoryLocations.map((loc, lIdx) => (
                                                    <div key={lIdx} className="space-y-1.5">
                                                        <span className="text-[11px] font-semibold text-primary">{loc.label}</span>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {loc.directories.map((dir: any, dIdx: number) => (
                                                                <button
                                                                    key={dIdx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSettings({ ...settings, default_workspace_path: dir.path });
                                                                        toast.info(`Selecionado: ${dir.display_path}`);
                                                                    }}
                                                                    className={`flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                                                                        settings.default_workspace_path === dir.path
                                                                            ? 'border-primary bg-primary/10 font-semibold'
                                                                            : 'border-border/80 bg-card hover:border-primary/40'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                                        <span className="truncate">{dir.name}</span>
                                                                    </div>
                                                                    {dir.is_git && (
                                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground shrink-0">
                                                                            <GitBranch className="h-2.5 w-2.5 mr-0.5" /> git
                                                                        </Badge>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Configurações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
