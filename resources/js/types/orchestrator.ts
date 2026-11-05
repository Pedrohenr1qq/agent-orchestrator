export type WorkspaceMode = 'shared_directory' | 'isolated_worktree';

export type TaskStatus =
    | 'backlog'
    | 'queued'
    | 'running'
    | 'awaiting_approval'
    | 'in_review'
    | 'completed'
    | 'failed'
    | 'halted_budget';

export interface Project {
    id: string;
    name: string;
    workspace_path: string;
    default_branch: string;
    workspace_mode: WorkspaceMode;
    monthly_budget_usd: number | null;
    created_at: string;
    updated_at: string;
}

export interface McpServer {
    id: string;
    name: string;
    transport: 'stdio' | 'sse' | 'streamable_http';
    command_or_url: string;
    args_and_env: Record<string, any> | null;
    discovered_tools_cache: Array<{
        name: string;
        description: string;
        inputSchema: any;
    }> | null;
    is_active: boolean;
}

export interface AgentNode {
    id: string;
    workflow_id: string;
    name: string;
    role_title: string;
    agent_class: string;
    provider: string;
    model_name: string;
    reasoning_effort: string | null;
    instructions: string | null;
    enabled_tools: string[] | null;
    tools_requiring_approval: string[] | null;
    max_task_budget_usd: number | null;
    max_tokens_per_run: number | null;
    position_xy: { x: number; y: number } | null;
    mcp_servers?: McpServer[];
    created_at?: string;
    updated_at?: string;
}

export interface AgentEdge {
    id: string;
    workflow_id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
}

export interface Workflow {
    id: string;
    project_id: string;
    name: string;
    viewport_state: any | null;
    agent_nodes: AgentNode[];
    agent_edges: AgentEdge[];
    created_at: string;
    updated_at: string;
}

export interface ToolApproval {
    id: string;
    agent_run_id: string;
    task_id: string;
    tool_name: string;
    tool_call_id: string;
    arguments: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected';
    decision_reason: string | null;
    modified_arguments: Record<string, any> | null;
    created_at: string;
}

export interface AgentRunEvent {
    id: string;
    agent_run_id: string;
    task_id: string;
    sequence: number;
    event_type:
        | 'user_message'
        | 'reasoning'
        | 'message_delta'
        | 'tool_call'
        | 'tool_result'
        | 'delegation'
        | 'error'
        | 'usage_update';
    payload: any;
    created_at: string;
}

export interface AgentRun {
    id: string;
    task_id: string;
    agent_node_id: string;
    status: string;
    prompt_tokens: number;
    completion_tokens: number;
    reasoning_tokens: number;
    cost_usd: number;
    duration_ms: number;
    events?: AgentRunEvent[];
    approvals?: ToolApproval[];
    created_at: string;
}

export interface Task {
    id: string;
    project_id: string;
    workflow_id: string;
    parent_task_id: string | null;
    assigned_node_id: string | null;
    title: string;
    description: string;
    attachments: any[] | null;
    status: TaskStatus;
    worktree_path: string | null;
    git_branch: string | null;
    budget_limit_usd: number | null;
    total_cost_usd: number;
    total_tokens: number;
    assigned_agent?: AgentNode | null;
    subtasks?: Task[];
    runs?: AgentRun[];
    approvals?: ToolApproval[];
    created_at: string;
    updated_at: string;
}

export interface Blueprint {
    class: string;
    name: string;
    role: string;
    description: string;
    icon: string;
    default_tools: string[];
    supports_structured_output: boolean;
}

export interface DiscoveredTool {
    class: string;
    name: string;
    description: string;
    approvable: boolean;
}
