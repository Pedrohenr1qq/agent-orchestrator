# 🤝 Guia de Contribuição — Agent Orchestrator

Obrigado pelo interesse em contribuir com o **Agent Orchestrator**! Este documento orienta sobre o fluxo de desenvolvimento, convenções de código e como submeter melhorias para o projeto.

---

## 📋 Sumário
- [Fluxo de Trabalho Git](#fluxo-de-trabalho-git)
- [Padrões de Commit](#padrões-de-commit)
- [Criando Novos Agentes](#criando-novos-agentes)
- [Criando Novas Ferramentas (Tools)](#criando-novas-ferramentas-tools)
- [Testes e Validação](#testes-e-validação)
- [Padrões de Código](#padrões-de-código)
- [Submetendo um Pull Request](#submetendo-um-pull-request)

---

## 🔀 Fluxo de Trabalho Git

1. **Faça um Fork** do repositório em sua conta do GitHub.
2. **Clone** o fork localmente:
   ```bash
   git clone https://github.com/<seu-usuario>/agent-orchestrator.git
   cd agent-orchestrator
   ```
3. **Crie uma branch** a partir da `main` com um nome descritivo:
   ```bash
   git checkout -b feat/novo-agente-sql
   # ou
   git checkout -b fix/echo-reconnect-issue
   ```

---

## 📝 Padrões de Commit

Utilizamos o padrão de [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade ou capacidade de agente.
- `fix:` Correção de bug.
- `refactor:` Refatoração de código sem alteração de comportamento.
- `test:` Adição ou correção de testes automatizados.
- `docs:` Alterações em documentação ou comentários.
- `chore:` Tarefas de manutenção ou dependências.

Exemplo:
```bash
git commit -m "feat: add PostgreSQL introspection tool to DatabaseAgent"
```

---

## 🤖 Criando Novos Agentes

Todos os agentes especializados estendem `App\Ai\Agents\AbstractOrchestratedAgent` e implementam `App\Ai\Contracts\OrchestratedAgentBlueprint`.

Para criar um novo arquétipo de agente:

1. Crie a classe em `app/Ai/Agents/`:
   ```php
   namespace App\Ai\Agents;

   use App\Ai\Contracts\OrchestratedAgentBlueprint;

   class DatabaseAgent extends AbstractOrchestratedAgent implements OrchestratedAgentBlueprint
   {
       public static function blueprintKey(): string
       {
           return 'database_agent';
       }

       public static function blueprintTitle(): string
       {
           return 'Database & Migration Specialist';
       }

       public static function defaultCapabilities(): array
       {
           return ['sql_query', 'schema_analysis', 'migration_generator'];
       }

       public static function defaultAllowedTools(): array
       {
           return ['read_file', 'write_file', 'edit_file', 'run_command'];
       }

       public function instructions(): string
       {
           return "Você é um especialista em modelagem de dados e bancos relacionais...";
       }
   }
   ```

2. Registre o blueprint no `App\Ai\Services\AgentBlueprintRegistry`.

---

## 🔧 Criando Novas Ferramentas (Tools)

As ferramentas fornecem capacidades aos agentes para interagir com o ambiente de arquivos, sistema operacional ou serviços externos:

1. Crie a ferramenta em `app/Ai/Tools/`:
   ```php
   namespace App\Ai\Tools;

   use Laravel\Ai\Contracts\Tool;
   use Laravel\Ai\Tools\Request;
   use Laravel\Ai\Tools\Response;

   class InspectSchemaTool implements Tool
   {
       public function description(): string
       {
           return 'Inspeciona a estrutura de tabelas do banco de dados configurado.';
       }

       public function handle(Request $request): Response
       {
           // Lógica da ferramenta...
           return Response::json(['tables' => [...]]);
       }

       public function schema(): array
       {
           return [
               'type' => 'object',
               'properties' => [
                   'table' => ['type' => 'string', 'description' => 'Nome da tabela (opcional)'],
               ],
           ];
       }
   }
   ```

2. Registre a nova ferramenta no `App\Ai\Services\ToolRegistry`.

---

## 🧪 Testes e Validação

Antes de abrir um Pull Request, certifique-se de que todas as etapas de validação estejam passando:

```bash
# 1. Executar todos os testes do Pest
php artisan test --compact

# 2. Formatar código PHP com o Laravel Pint
vendor/bin/pint --format agent

# 3. Validar TypeScript e Lint frontend
npm run types:check
npm run check
```

---

## 🎨 Padrões de Código

- **PHP 8.4**:
  - Sempre utilize chaves `{}` mesmo para condicionais de linha única.
  - Tipagem estrita em parâmetros e retornos de métodos.
  - Construtor com propriedades promovidas sempre que aplicável.
- **Frontend (React & Inertia)**:
  - Componentes funcionais com TypeScript estrito.
  - Tailwind CSS para estilização utilitária.
  - Ícones consistentes importados de `lucide-react`.

---

## 🚀 Submetendo um Pull Request

1. Faça o push da sua branch:
   ```bash
   git push origin feat/sua-feature
   ```
2. Abra um **Pull Request** apontando para a branch `main` do repositório original.
3. Descreva claramente:
   - Qual problema a alteração resolve.
   - Quais agentes ou ferramentas foram afetados.
   - Como testar manualmente a novidade.
4. O repositório utiliza proteção de branch com `CODEOWNERS`: a aprovação do mantenedor do projeto é obrigatória para a mesclagem.
