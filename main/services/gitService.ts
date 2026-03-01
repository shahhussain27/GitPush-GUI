import { spawn } from 'child_process';
import { GitErrorHandler, GitError } from './gitErrorHandler';

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: GitError | null;
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
}

export const gitService = new GitService();
