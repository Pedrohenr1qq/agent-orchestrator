import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Server, Sparkles, Loader2, CheckCircle2, Wrench } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Props {
    open: boolean;
    onClose: () => void;
    onServerCreated?: () => void;
}

export function McpServerModal({ open, onClose, onServerCreated }: Props) {
    const [name, setName] = useState('SolidCraft Local (Stdio)');
    const [transport, setTransport] = useState<'stdio' | 'sse'>('stdio');
    const [commandOrUrl, setCommandOrUrl] = useState('/bin/solidcraft-cli');
    const [argsJson, setArgsJson] = useState(
        '["mcp", "--headless", "--allow-any-path"]',
    );
    const [isLoading, setIsLoading] = useState(false);
    const [discoveredTools, setDiscoveredTools] = useState<any[] | null>(null);

    const handleApplyPreset = (
        preset: 'solidcraft-stdio' | 'solidcraft-sse' | 'custom',
    ) => {
        setDiscoveredTools(null);
        if (preset === 'solidcraft-stdio') {
            setName('SolidCraft Local (Stdio)');
            setTransport('stdio');
            setCommandOrUrl('/bin/solidcraft-cli');
            setArgsJson('["mcp", "--headless", "--allow-any-path"]');
        } else if (preset === 'solidcraft-sse') {
            setName('SolidCraft Supergateway (HTTP)');
            setTransport('sse');
            setCommandOrUrl('http://127.0.0.1:8090/');
            setArgsJson('');
        } else {
            setName('');
            setTransport('stdio');
            setCommandOrUrl('');
            setArgsJson('');
        }
    };

    const handleSaveAndTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setDiscoveredTools(null);

        let parsedArgs: any = null;
        if (transport === 'stdio' && argsJson.trim()) {
            try {
                const argsArray = JSON.parse(argsJson);
                parsedArgs = { args: argsArray };
            } catch (err) {
                toast.error(
                    'JSON de argumentos inválido. Use o formato: ["arg1", "arg2"]',
                );
                setIsLoading(false);
                return;
            }
        }

        try {
            const csrfToken =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') || '';
            const res = await fetch('/api/mcp-servers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    name,
                    transport,
                    command_or_url: commandOrUrl,
                    args_and_env: parsedArgs,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.message || 'Falha ao conectar ao servidor MCP',
                );
            }

            const tools = data.tools || [];
            setDiscoveredTools(tools);

            if (tools.length > 0) {
                toast.success(
                    `Servidor "${name}" conectado com sucesso! ${tools.length} ferramentas descobertas.`,
                );
            } else {
                toast.warning(
                    `Servidor registrado, mas nenhuma ferramenta foi retornada.`,
                );
            }

            if (onServerCreated) {
                onServerCreated();
            }
            router.reload({ only: ['mcpServers'] });
        } catch (error: any) {
            toast.error(
                error.message || 'Erro ao comunicar com o servidor MCP',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-primary" />
                        Conectar Servidor MCP
                    </DialogTitle>
                    <DialogDescription>
                        Cadastre e teste ferramentas dinâmicas via Model Context
                        Protocol (Stdio ou SSE).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSaveAndTest} className="space-y-4 py-2">
                    {/* Presets Rápidos */}
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                            Modelos Rápidos (Presets):
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                                onClick={() =>
                                    handleApplyPreset('solidcraft-stdio')
                                }
                            >
                                <Sparkles className="h-3 w-3 text-emerald-500" />
                                SolidCraft Local (Stdio - Recomendado)
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() =>
                                    handleApplyPreset('solidcraft-sse')
                                }
                            >
                                <Server className="h-3 w-3 text-sky-500" />
                                Supergateway HTTP (:8090)
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="mcp-name">Nome do Servidor</Label>
                        <Input
                            id="mcp-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ex: SolidCraft Parametric CAD"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="mcp-transport">
                                Tipo de Transporte
                            </Label>
                            <select
                                id="mcp-transport"
                                value={transport}
                                onChange={(e) =>
                                    setTransport(
                                        e.target.value as 'stdio' | 'sse',
                                    )
                                }
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            >
                                <option value="stdio">
                                    stdio (Execução Direta CLI)
                                </option>
                                <option value="sse">
                                    sse (HTTP Server-Sent Events)
                                </option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="mcp-cmd">
                                {transport === 'stdio'
                                    ? 'Comando / Binário'
                                    : 'URL SSE'}
                            </Label>
                            <Input
                                id="mcp-cmd"
                                value={commandOrUrl}
                                onChange={(e) =>
                                    setCommandOrUrl(e.target.value)
                                }
                                placeholder={
                                    transport === 'stdio'
                                        ? 'solidcraft-cli'
                                        : 'http://127.0.0.1:8090/sse'
                                }
                                required
                            />
                        </div>
                    </div>

                    {transport === 'stdio' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="mcp-args">
                                Argumentos do CLI (Array JSON)
                            </Label>
                            <Input
                                id="mcp-args"
                                value={argsJson}
                                onChange={(e) => setArgsJson(e.target.value)}
                                placeholder='["mcp", "--headless", "--allow-any-path"]'
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Executará diretamente o comando local com estes
                                argumentos via pipes Stdio.
                            </p>
                        </div>
                    )}

                    {/* Feedback de Ferramentas Descobertas */}
                    {discoveredTools && discoveredTools.length > 0 && (
                        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4" />
                                {discoveredTools.length} Ferramentas Descobertas
                                com Sucesso!
                            </div>
                            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                                {discoveredTools.map((t) => (
                                    <Badge
                                        key={t.name}
                                        variant="outline"
                                        className="bg-background/50 text-[10px]"
                                    >
                                        <Wrench className="mr-1 h-2.5 w-2.5 opacity-70" />
                                        {t.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Fechar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="gap-2"
                        >
                            {isLoading && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Salvar e Testar Conexão
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
