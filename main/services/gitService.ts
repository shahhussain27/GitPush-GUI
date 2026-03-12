import { spawn } from 'child_process';
import { GitErrorHandler, GitError } from './gitErrorHandler';

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: GitError | null;
}

export interface CommitNodeRaw {
  hash: string;
  parents: string[];
  author: string;
  date: string;
  message: string;
  refs: string;
}

class GitService {
  private currentPath: string | null = null;

  setPath(path: string) {
    this.currentPath = path;
  }

  getPath() {
    return this.currentPath;
  }

  execute(
    args: string[],
    onData?: (data: string) => void,
    onError?: (data: string) => void,
    onClose?: (code: number | null) => void,
    context?: { branch?: string; remote?: string }
  ): Promise<ExecuteResult> {
    return new Promise((resolve) => {
      if (!this.currentPath) {
        resolve({
          stdout: '',
          stderr: 'No repository path set',
          exitCode: 1,
          error: {
            type: 'NO_PATH',
            detected: true,
            message: 'No repository path set',
            safeFixAvailable: false
          }
        });
        return;
      }

      const process = spawn('git', args, { cwd: this.currentPath });
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const str = data.toString();
        stdout += str;
        if (onData) onData(str);
      });

      process.stderr.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        if (onError) onError(str);
      });

      process.on('close', (code) => {
        if (onClose) onClose(code);

        const detectedError = code !== 0 ? GitErrorHandler.detect(stderr || stdout, context) : null;

        resolve({
          stdout,
          stderr,
          exitCode: code,
          error: detectedError
        });
      });
    });
  }

  async isRepo(): Promise<boolean> {
    const result = await this.execute(['rev-parse', '--is-inside-work-tree']);
    return result.exitCode === 0;
  }

  async getStatus(): Promise<string> {
    const result = await this.execute(['status', '--short']);
    return result.stdout;
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.execute(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (result.exitCode === 0) {
      return result.stdout.trim();
    }
    return 'No branch';
  }

  async init(): Promise<ExecuteResult> {
    return await this.execute(['init']);
  }

  async add(files: string = '.'): Promise<ExecuteResult> {
    return await this.execute(['add', files]);
  }

  async commit(message: string): Promise<ExecuteResult> {
    return await this.execute(['commit', '-m', message]);
  }

  async push(remote: string = 'origin', branch: string = 'master'): Promise<ExecuteResult> {
    return await this.execute(['push', remote, branch], undefined, undefined, undefined, { remote, branch });
  }

  async pull(remote: string = 'origin', branch: string = 'master'): Promise<ExecuteResult> {
    return await this.execute(['pull', remote, branch], undefined, undefined, undefined, { remote, branch });
  }

  async fetch(): Promise<ExecuteResult> {
    return await this.execute(['fetch']);
  }

  async clone(url: string, targetPath: string): Promise<ExecuteResult> {
    // To clone into a specific directory, we don't use this.currentPath as cwd 
    // unless targetPath is relative. We can just spawn git clone url targetPath directly.
    return new Promise((resolve) => {
      const process = spawn('git', ['clone', url, targetPath]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => { stdout += data.toString(); });
      process.stderr.on('data', (data) => { stderr += data.toString(); });

      process.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code,
          error: code !== 0 ? { type: 'CLONE_ERROR', detected: true, message: stderr, safeFixAvailable: false } : null
        });
      });
    });
  }

  async getRemotes(): Promise<string> {
    const result = await this.execute(['remote', '-v']);
    return result.stdout;
  }

  async addRemote(name: string, url: string): Promise<ExecuteResult> {
    return await this.execute(['remote', 'add', name, url]);
  }

  async getLog(): Promise<ExecuteResult> {
    // Structured format: hash|author|relative_date|subject
    return await this.execute(['log', '--pretty=format:%H|%an|%ar|%s', '-n', '20']);
  }

  async getConfig(key: string): Promise<string> {
    const result = await this.execute(['config', '--global', key]);
    return result.stdout.trim();
  }

  async setConfig(key: string, value: string): Promise<ExecuteResult> {
    return await this.execute(['config', '--global', key, value]);
  }

  async removeRemote(name: string): Promise<ExecuteResult> {
    return await this.execute(['remote', 'remove', name]);
  }

  async getConflictedFiles(): Promise<string[]> {
    // U = Unmerged
    const result = await this.execute(['status', '--porcelain']);
    if (result.stdout) {
      return result.stdout.split('\n')
        .filter(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD') || line.startsWith('AU') || line.startsWith('UA') || line.startsWith('DU') || line.startsWith('UD'))
        .map(line => line.substring(3).trim());
    }
    return [];
  }

  async abortRebase(): Promise<ExecuteResult> {
    return await this.execute(['rebase', '--abort']);
  }

  async continueRebase(): Promise<ExecuteResult> {
    return await this.execute(['rebase', '--continue']);
  }

  async resolveConflict(file: string, strategy: 'ours' | 'theirs'): Promise<ExecuteResult> {
    await this.execute(['checkout', `--${strategy}`, file]);
    return await this.add(file);
  }

  async resolveConflictWithMarkers(file: string, content: string): Promise<ExecuteResult> {
    // Usually, the UI will just save the edited file, so the user already wrote the fixed string.
    // The service doesn't have to write to FS, the renderer/fs will. It just needs to add.
    return await this.add(file);
  }

  async getStatusDetails(): Promise<{ ahead: number, behind: number }> {
    // This command returns counts of ahead and behind commits relative to the upstream
    const result = await this.execute(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']);
    if (result.stdout) {
      const [ahead, behind] = result.stdout.trim().split(/\s+/).map(Number);
      return { ahead: ahead || 0, behind: behind || 0 };
    }
    return { ahead: 0, behind: 0 };
  }

  async getLatestTag(): Promise<string | null> {
    try {
      await this.execute(['fetch', '--tags']);
      const result = await this.execute(['describe', '--tags', '--abbrev=0']);
      if (result.exitCode === 0 && result.stdout) {
        return result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  async getCommitDelta(tag: string): Promise<number> {
    try {
      const result = await this.execute(['rev-list', `${tag}..HEAD`, '--count']);
      if (result.exitCode === 0 && result.stdout) {
        return parseInt(result.stdout.trim(), 10) || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async getRemoteMetadata(): Promise<{ hash: string, author: string, message: string } | null> {
    // Get the latest commit info from the upstream that we don't have locally
    const result = await this.execute(['log', 'HEAD..@{upstream}', '--format=%H|%an|%s', '-1']);
    if (result.stdout && result.stdout.trim()) {
      const [hash, author, message] = result.stdout.trim().split('|');
      return { hash, author, message };
    }
    return null;
  }

  async getBranches(): Promise<{ name: string; isRemote: boolean; isCurrent: boolean }[]> {
    const result = await this.execute(['branch', '-a']);
    if (result.stdout) {
      return result.stdout.split('\n').filter(l => l.trim()).map(line => {
        const isCurrent = line.startsWith('*');
        const trimmed = line.replace(/^\*\s*/, '').trim();
        const isRemote = trimmed.startsWith('remotes/');
        const name = isRemote ? trimmed.replace('remotes/', '') : trimmed;
        return { name, isRemote, isCurrent };
      });
    }
    return [];
  }

  async checkoutBranch(branchName: string): Promise<ExecuteResult> {
    const isRemote = branchName.includes('/');
    if (isRemote) {
      // checkout remote tracking branch
      return await this.execute(['checkout', '-t', branchName]);
    }
    return await this.execute(['checkout', branchName]);
  }

  async renameBranch(oldName: string, newName: string): Promise<ExecuteResult> {
    return await this.execute(['branch', '-m', oldName, newName]);
  }

  async setUpstream(branchName: string, remote: string = 'origin'): Promise<ExecuteResult> {
    return await this.execute(['branch', `--set-upstream-to=${remote}/${branchName}`]);
  }

  async deleteRemoteBranch(remote: string, branchName: string): Promise<ExecuteResult> {
    return await this.execute(['push', remote, '--delete', branchName]);
  }

  async getChangedFiles(): Promise<string[]> {
    // -u ensures untracked files are shown
    const result = await this.execute(['status', '--porcelain', '-u']);
    if (result.stdout) {
      return result.stdout.split('\n')
        .filter(line => line.trim())
        .map(line => line.substring(3).trim());
    }
    return [];
  }

  async getCommitGraph(limit: number = 500): Promise<CommitNodeRaw[]> {
    // Custom format: hash|parent_hashes|author_name|author_date_iso|message|refs
    // %H = commit hash, %P = parent hashes, %an = author name, %aI = strict ISO 8601 auth date, %s = subject, %D = ref names
    const format = '--pretty=format:%H|%P|%an|%aI|%s|%D';
    const result = await this.execute(['log', '--all', '--date-order', format, '-n', limit.toString()]);
    
    if (result.stdout) {
      return result.stdout.split('\n').filter(line => line.trim()).map(line => {
        const [hash, parentsStr, author, date, message, refsStr] = line.split('|');
        const parents = parentsStr ? parentsStr.split(' ').filter(Boolean) : [];
        const refs = refsStr ? refsStr.trim() : '';
        return { hash, parents, author, date, message, refs };
      });
    }
    return [];
  }

  async getCommitDetails(hash: string): Promise<{ files: { action: string, path: string }[], body: string }> {
    // Get full commit body
    let body = '';
    const bodyResult = await this.execute(['show', '-s', '--format=%b', hash]);
    if (bodyResult.stdout) {
      body = bodyResult.stdout.trim();
    }

    // Get files changed
    const filesResult = await this.execute(['diff-tree', '--no-commit-id', '--name-status', '-r', hash]);
    const files: { action: string, path: string }[] = [];
    if (filesResult.stdout) {
      filesResult.stdout.split('\n').filter(line => line.trim()).forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          files.push({ action: parts[0], path: parts[1] });
        }
      });
    }

    return { files, body };
  }

  async cherryPick(hash: string): Promise<ExecuteResult> {
    return await this.execute(['cherry-pick', hash]);
  }

  async revertCommit(hash: string): Promise<ExecuteResult> {
    return await this.execute(['revert', '--no-edit', hash]);
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.currentPath) throw new Error('No repository selected');
    const fullPath = require('path').join(this.currentPath, filePath);
    return await require('fs').promises.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.currentPath) throw new Error('No repository selected');
    const fullPath = require('path').join(this.currentPath, filePath);
    await require('fs').promises.writeFile(fullPath, content, 'utf-8');
  }

  async getRepoSize(): Promise<string> {
    if (!this.currentPath) throw new Error('No repository selected');
    const result = await this.execute(['count-objects', '-v']);
    if (result.stdout) {
      // Look for size-pack: (in KB)
      const packMatch = result.stdout.match(/size-pack:\s*(\d+)/);
      // Look for size: (loose objects in KB)
      const looseMatch = result.stdout.match(/size:\s*(\d+)/);
      
      let totalKB = 0;
      if (packMatch) totalKB += parseInt(packMatch[1], 10);
      if (looseMatch) totalKB += parseInt(looseMatch[1], 10);

      // Convert to MB
      const sizeMB = (totalKB / 1024).toFixed(2);
      return `${sizeMB} MB`;
    }
    return '0 MB';
  }

  async getLargestFiles(limit: number = 20): Promise<{ path: string, size: number }[]> {
    if (!this.currentPath) throw new Error('No repository selected');
    
    // Command to get all objects, sort by size, and grab top `limit`
    // This is a known pipeline in git: verify-pack for sizes
    const script = `git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '$1 == "blob" {print $3 "\t" $4}' | sort -nr | head -n ${limit}`;
    
    // run the script inside a shell because of the pipe
    return new Promise((resolve, reject) => {
      const exec = require('child_process').exec;
      exec(script, { cwd: this.currentPath, maxBuffer: 1024 * 1024 * 50 }, (error: any, stdout: string) => {
        if (error) {
          resolve([]);
          return;
        }

        const files: { path: string, size: number }[] = [];
        const lines = stdout.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          const [sizeStr, ...pathParts] = line.split('\t');
          const path = pathParts.join('\t');
          files.push({
            size: parseInt(sizeStr, 10),
            path
          });
        }
        
        resolve(files);
      });
    });
  }
}

export const gitService = new GitService();
