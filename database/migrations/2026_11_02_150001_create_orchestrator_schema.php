<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('workspace_path')->comment('Relative to /workspaces or absolute path');
            $table->string('default_branch')->default('main');
            $table->string('workspace_mode')->default('isolated_worktree')->comment('shared_directory or isolated_worktree');
            $table->decimal('monthly_budget_usd', 10, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('workflows', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->json('viewport_state')->nullable();
            $table->timestamps();
        });

        Schema::create('mcp_servers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('transport')->default('stdio')->comment('stdio, sse, streamable_http');
            $table->string('command_or_url');
            $table->json('args_and_env')->nullable();
            $table->json('discovered_tools_cache')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('agent_nodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workflow_id')->constrained('workflows')->cascadeOnDelete();
            $table->string('name');
            $table->string('role_title')->default('Agent');
            $table->string('agent_class')->default('App\\Ai\\Agents\\CodingAgent');
            $table->string('provider')->default('anthropic');
            $table->string('model_name')->default('claude-3-7-sonnet-20250219');
            $table->string('reasoning_effort')->nullable();
            $table->text('instructions')->nullable();
            $table->json('enabled_tools')->nullable();
            $table->json('tools_requiring_approval')->nullable();
            $table->decimal('max_task_budget_usd', 8, 4)->nullable();
            $table->integer('max_tokens_per_run')->nullable();
            $table->json('position_xy')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_edges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workflow_id')->constrained('workflows')->cascadeOnDelete();
            $table->foreignUuid('source_node_id')->constrained('agent_nodes')->cascadeOnDelete();
            $table->foreignUuid('target_node_id')->constrained('agent_nodes')->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_node_mcp_server', function (Blueprint $table) {
            $table->foreignUuid('agent_node_id')->constrained('agent_nodes')->cascadeOnDelete();
            $table->foreignUuid('mcp_server_id')->constrained('mcp_servers')->cascadeOnDelete();
            $table->primary(['agent_node_id', 'mcp_server_id']);
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('workflow_id')->constrained('workflows')->cascadeOnDelete();
            $table->uuid('parent_task_id')->nullable();
            $table->foreignUuid('assigned_node_id')->nullable()->constrained('agent_nodes')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->json('attachments')->nullable();
            $table->string('status')->default('backlog')->index();
            $table->string('worktree_path')->nullable();
            $table->string('git_branch')->nullable();
            $table->decimal('budget_limit_usd', 8, 4)->nullable();
            $table->decimal('total_cost_usd', 8, 4)->default(0);
            $table->bigInteger('total_tokens')->default(0);
            $table->timestamps();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreign('parent_task_id')->references('id')->on('tasks')->nullOnDelete();
        });

        Schema::create('agent_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignUuid('agent_node_id')->constrained('agent_nodes')->cascadeOnDelete();
            $table->string('status')->default('running')->index();
            $table->string('conversation_id', 36)->nullable()->index();
            $table->integer('prompt_tokens')->default(0);
            $table->integer('completion_tokens')->default(0);
            $table->integer('reasoning_tokens')->default(0);
            $table->decimal('cost_usd', 8, 4)->default(0);
            $table->integer('duration_ms')->default(0);
            $table->timestamps();
        });

        Schema::create('agent_run_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_run_id')->constrained('agent_runs')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->integer('sequence')->default(0);
            $table->string('event_type', 40)->index();
            $table->json('payload');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['task_id', 'sequence']);
        });

        Schema::create('tool_approvals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('agent_run_id')->constrained('agent_runs')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('tool_name');
            $table->string('tool_call_id');
            $table->json('arguments');
            $table->string('status')->default('pending')->index();
            $table->text('decision_reason')->nullable();
            $table->json('modified_arguments')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tool_approvals');
        Schema::dropIfExists('agent_run_events');
        Schema::dropIfExists('agent_runs');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('agent_node_mcp_server');
        Schema::dropIfExists('agent_edges');
        Schema::dropIfExists('agent_nodes');
        Schema::dropIfExists('mcp_servers');
        Schema::dropIfExists('workflows');
        Schema::dropIfExists('projects');
    }
};
