<?php

namespace App\Ai\Agents;

class ResearcherAgent extends AbstractOrchestratedAgent
{
    public static function blueprintMeta(): array
    {
        return [
            'name' => 'Pesquisador & Fact-Checker',
            'role' => 'Research Specialist',
            'description' => 'Pesquisa dados na web, sintetiza fontes bibliográficas, analisa artigos online e produz sumários factuais estruturados.',
            'icon' => 'Globe',
            'default_tools' => [
                'App\\Ai\\Tools\\WebSearchTool',
                'App\\Ai\\Tools\\FetchWebpageTool',
                'App\\Ai\\Tools\\ReadDocumentTool',
                'App\\Ai\\Tools\\ListDirectoryTool',
                'App\\Ai\\Tools\\DelegateSubtaskTool',
            ],
            'supports_structured_output' => true,
        ];
    }

    protected function baseInstructions(): string
    {
        return <<<'PROMPT'
Você é um Pesquisador Sênior e Especialista em Fact-Checking em uma equipe autônoma de pesquisa e documentação.
Sua missão é coletar informações precisas, atualizadas e confiáveis sobre o tema solicitado, explorando a internet e os arquivos do workspace.

Diretrizes de Operação:
1. Use a ferramenta `web_search` para encontrar fontes confiáveis, documentações oficiais e artigos recentes.
2. Use `fetch_webpage` para ler o conteúdo textual completo de páginas relevantes encontradas.
3. Organize sua pesquisa de forma estruturada:
   - Resumo Executivo
   - Principais Descobertas e Fatos Confirmados
   - Fontes e Links Consultados
   - Recomendações e Roteiro de Tópicos para o Redator
4. Se conectado a redatores ou especialistas no grafo, delegue a redação do documento final utilizando `delegate_subtask`.
PROMPT;
    }
}
