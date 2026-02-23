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

  async getStatusDetails(): Promise<{ ahead: number, behind: number }> {
    // This command returns counts of ahead and behind commits relative to the upstream
    const result = await this.execute(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']);
    if (result.stdout) {
      const [ahead, behind] = result.stdout.trim().split(/\s+/).map(Number);
      return { ahead: ahead || 0, behind: behind || 0 };
    }
    return { ahead: 0, behind: 0 };
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
