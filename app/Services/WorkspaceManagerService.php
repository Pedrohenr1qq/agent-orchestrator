<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;

class WorkspaceManagerService
{
    /**
     * Get the base workspaces root directory (mapped from Docker /workspaces).
     */
    public function getWorkspacesRoot(): string
    {
        return env('WORKSPACE_ROOT_PATH', '/workspaces');
    }

    /**
     * Resolve the absolute base directory for a project on the container filesystem.
     */
    public function resolveProjectBaseDirectory(Project $project): string
    {
        $path = $project->workspace_path;

        // Map host user path to internal mount if necessary
        if (Str::startsWith($path, '/home/pedro')) {
            $path = Str::replaceFirst('/home/pedro', '/host_home', $path);
        }

        if (Str::startsWith($path, '/')) {
            return $path;
        }

        return rtrim($this->getWorkspacesRoot(), '/').'/'.ltrim($path, '/');
    }

    /**
     * Resolve the active execution directory for a given task.
     */
    public function resolveTaskDirectory(Task $task): string
    {
        // 1. If task has a worktree assigned, use it
        if (! empty($task->worktree_path) && File::isDirectory($task->worktree_path)) {
            return $task->worktree_path;
        }

        // 2. If task has a parent task that has a worktree, inherit it!
        if ($task->parent_task_id && $task->parentTask && ! empty($task->parentTask->worktree_path)) {
            $task->update(['worktree_path' => $task->parentTask->worktree_path]);

            return $task->parentTask->worktree_path;
        }

        $project = $task->project;
        $projectBaseDir = $this->resolveProjectBaseDirectory($project);

        // 3. If project is in isolated_worktree mode, initialize worktree
        if ($project->workspace_mode === 'isolated_worktree' && File::isDirectory($projectBaseDir.'/.git')) {
            return $this->createTaskWorktree($task);
        }

        return $projectBaseDir;
    }

    /**
     * Create an isolated Git Worktree for a task.
     */
    public function createTaskWorktree(Task $task): string
    {
        $project = $task->project;
        $baseDir = $this->resolveProjectBaseDirectory($project);
        $projectSlug = Str::slug($project->name);
        $worktreeBaseDir = rtrim($this->getWorkspacesRoot(), '/')."/.worktrees/{$projectSlug}";

        File::ensureDirectoryExists($worktreeBaseDir);

        $branchName = "agent/task-{$task->id}";
        $worktreePath = "{$worktreeBaseDir}/task-{$task->id}";

        if (! File::isDirectory($worktreePath)) {
            $baseBranch = $project->default_branch ?: 'main';

            $result = Process::path($baseDir)->run([
                'git', 'worktree', 'add', '-b', $branchName, $worktreePath, $baseBranch,
            ]);

            if ($result->failed()) {
                // If branch already exists, try checking out without -b
                $retry = Process::path($baseDir)->run([
                    'git', 'worktree', 'add', $worktreePath, $branchName,
                ]);

                if ($retry->failed()) {
                    throw new RuntimeException('Failed to create git worktree: '.$result->errorOutput().' '.$retry->errorOutput());
                }
            }
        }

        $task->update([
            'worktree_path' => $worktreePath,
            'git_branch' => $branchName,
        ]);

        return $worktreePath;
    }

    /**
     * Get Git status for a task's workspace.
     */
    public function getGitStatus(Task $task): string
    {
        $dir = $this->resolveTaskDirectory($task);

        if (! File::isDirectory($dir.'/.git') && ! File::exists($dir.'/.git')) {
            return "Not a git repository: {$dir}";
        }

        $result = Process::path($dir)->run(['git', 'status', '--short']);

        return $result->successful() ? ($result->output() ?: 'Working tree clean') : $result->errorOutput();
    }

    /**
     * Get Git diff for a task's workspace against the base branch.
     */
    public function getGitDiff(Task $task): string
    {
        $dir = $this->resolveTaskDirectory($task);
        $project = $task->project;
        $baseBranch = $project->default_branch ?: 'main';

        if (! File::isDirectory($dir.'/.git') && ! File::exists($dir.'/.git')) {
            return "Not a git repository: {$dir}";
        }

        // Check if there are uncommitted changes or branch diff
        $uncommitted = Process::path($dir)->run(['git', 'diff']);
        $branchDiff = Process::path($dir)->run(['git', 'diff', "{$baseBranch}...HEAD"]);

        $output = '';
        if (! empty($uncommitted->output())) {
            $output .= "### Uncommitted Changes:\n".$uncommitted->output()."\n\n";
        }

        if (! empty($branchDiff->output())) {
            $output .= "### Branch Changes compared to {$baseBranch}:\n".$branchDiff->output();
        }

        return $output ?: 'No git diff found (branch and working directory are identical to base)';
    }

    /**
     * Get detailed change summary and document contents for dual review gate.
     *
     * @return array{diff: string, status: string, changed_files: array, documents: array, is_document_task: bool, worktree_path: ?string, git_branch: ?string}
     */
    public function getTaskChanges(Task $task): array
    {
        $dir = $this->resolveTaskDirectory($task);
        $project = $task->project;
        $baseBranch = $project->default_branch ?: 'main';

        $diff = $this->getGitDiff($task);
        $status = $this->getGitStatus($task);

        $changedFiles = [];
        $documents = [];

        if (File::isDirectory($dir.'/.git') || File::exists($dir.'/.git')) {
            // Get changed files from working tree
            $cmd = Process::path($dir)->run(['git', 'status', '--porcelain']);
            $lines = explode("\n", trim($cmd->output()));
            foreach ($lines as $line) {
                if (strlen(trim($line)) > 3) {
                    $file = trim(substr($line, 3));
                    if (str_contains($file, '->')) {
                        $parts = explode('->', $file);
                        $file = trim(end($parts));
                    }
                    $changedFiles[] = $file;
                }
            }

            // Get committed files in branch
            $branchFilesCmd = Process::path($dir)->run(['git', 'diff', '--name-only', "{$baseBranch}...HEAD"]);
            $branchFiles = array_filter(explode("\n", trim($branchFilesCmd->output())));
            $changedFiles = array_values(array_unique(array_merge($changedFiles, $branchFiles)));

            // Extract content for any markdown, html, or text documents
            foreach ($changedFiles as $file) {
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array($ext, ['md', 'markdown', 'txt', 'html', 'json', 'csv', 'yaml', 'yml'])) {
                    $filePath = $dir.'/'.$file;
                    if (File::exists($filePath) && ! File::isDirectory($filePath)) {
                        $content = File::get($filePath);
                        $wordCount = str_word_count(strip_tags($content));
                        $documents[] = [
                            'path' => $file,
                            'name' => basename($file),
                            'extension' => $ext,
                            'content' => $content,
                            'size_bytes' => strlen($content),
                            'word_count' => $wordCount,
                            'lines_count' => substr_count($content, "\n") + 1,
                        ];
                    }
                }
            }
        }

        return [
            'diff' => $diff,
            'status' => $status,
            'changed_files' => $changedFiles,
            'documents' => $documents,
            'is_document_task' => count($documents) > 0,
            'worktree_path' => $task->worktree_path,
            'git_branch' => $task->git_branch,
        ];
    }

    /**
     * Merge a task's branch and clean up worktree.
     */
    public function mergeAndCleanupWorktree(Task $task): bool
    {
        $project = $task->project;
        $baseDir = $this->resolveProjectBaseDirectory($project);
        $branchName = $task->git_branch;
        $worktreePath = $task->worktree_path;
        $baseBranch = $project->default_branch ?: 'main';

        if (! $branchName || ! $worktreePath || ! File::isDirectory($worktreePath)) {
            return false;
        }

        // Commit any remaining staged/unstaged changes in worktree
        Process::path($worktreePath)->run(['git', 'add', '-A']);
        Process::path($worktreePath)->run(['git', 'commit', '-m', "feat: completed task {$task->title}"]);

        // Remove worktree
        Process::path($baseDir)->run(['git', 'worktree', 'remove', '--force', $worktreePath]);

        // Merge branch into base branch
        Process::path($baseDir)->run(['git', 'checkout', $baseBranch]);
        $merge = Process::path($baseDir)->run(['git', 'merge', '--no-ff', '-m', "Merge task #{$task->id}: {$task->title}", $branchName]);

        return $merge->successful();
    }

    /**
     * Sanitize and validate that a target file path remains strictly within the workspace directory.
     */
    public function sanitizePath(string $baseDir, string $targetPath): string
    {
        $baseRealPath = realpath($baseDir) ?: $baseDir;

        // If targetPath is relative, join it
        $combined = Str::startsWith($targetPath, '/')
            ? $targetPath
            : rtrim($baseRealPath, '/').'/'.ltrim($targetPath, '/');

        // Resolve traversal dots without requiring file to exist
        $parts = explode('/', str_replace('\\', '/', $combined));
        $resolvedParts = [];

        foreach ($parts as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                array_pop($resolvedParts);
            } else {
                $resolvedParts[] = $part;
            }
        }

        $resolved = '/'.implode('/', $resolvedParts);

        if (! Str::startsWith($resolved, rtrim($baseRealPath, '/'))) {
            throw new RuntimeException("Access denied: path traversal attempt outside workspace ({$targetPath})");
        }

        return $resolved;
    }
}
