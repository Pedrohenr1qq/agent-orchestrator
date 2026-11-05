<?php

use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::get('/', [WorkspaceController::class, 'index'])->name('home');
Route::get('/projects/{project}', [WorkspaceController::class, 'index'])->name('workspace.project');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [WorkspaceController::class, 'index'])->name('dashboard');
});

Route::prefix('api')->group(function () {
    Route::post('/workflows/{workflow}', [WorkspaceController::class, 'saveWorkflow'])->name('api.workflows.save');
    Route::post('/projects/{project}/tasks', [WorkspaceController::class, 'createTask'])->name('api.tasks.create');
    Route::post('/tasks/{task}/messages', [WorkspaceController::class, 'addMessage'])->name('api.tasks.message');
    Route::post('/approvals/{approval}', [WorkspaceController::class, 'handleApproval'])->name('api.approvals.handle');
    Route::get('/tasks/{task}/diff', [WorkspaceController::class, 'getDiff'])->name('api.tasks.diff');
    Route::post('/tasks/{task}/merge', [WorkspaceController::class, 'mergeTask'])->name('api.tasks.merge');
    Route::post('/tasks/{task}/retry', [WorkspaceController::class, 'retryTask'])->name('api.tasks.retry');
    Route::post('/mcp-servers', [WorkspaceController::class, 'saveMcpServer'])->name('api.mcp.save');
    Route::get('/settings', [WorkspaceController::class, 'getSettings'])->name('api.settings.get');
    Route::post('/settings', [WorkspaceController::class, 'saveSettings'])->name('api.settings.save');
    Route::post('/settings/test-ai', [WorkspaceController::class, 'testAiConnection'])->name('api.settings.test-ai');
    Route::get('/workspaces/directories', [WorkspaceController::class, 'listWorkspaceDirectories'])->name('api.workspaces.directories');
    Route::post('/workspaces/init-git', [WorkspaceController::class, 'initGit'])->name('api.workspaces.init-git');
});

require __DIR__.'/settings.php';
