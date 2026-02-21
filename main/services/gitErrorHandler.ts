export interface GitError {
  type: string;
  detected: boolean;
  message: string;
  safeFixAvailable: boolean;
  fixCommand?: string;
  requiresUserDecision?: boolean;
}

export class GitErrorHandler {
  private static patterns = [
    {
      type: 'NOT_A_REPO',
      regex: /not a git repository/i,
      message: 'This folder is not a Git repository.',
      safeFixAvailable: true,
      fixCommand: 'git init'
    },
    {
      type: 'DUBIOUS_OWNERSHIP',
      regex: /dubious ownership in repository at '(.*)'/i,
      message: 'Git detected dubious ownership for this directory.',
      safeFixAvailable: true,
      fixCommand: 'git config --global --add safe.directory "$1"'
    },
    {
      type: 'REMOTE_EXISTS',
      regex: /remote origin already exists/i,
      message: 'The "origin" remote already exists.',
      safeFixAvailable: true,
      fixCommand: 'git remote set-url origin {url}' // Placeholder for UI to fill
    },
    {
      type: 'NO_UPSTREAM',
      regex: /fatal: The current branch (.*) has no upstream branch/i,
      message: 'The current branch has no upstream branch on the remote.',
      safeFixAvailable: true,
      fixCommand: 'git push --set-upstream origin $1'
    },
    {
      type: 'FAILED_TO_PUSH_REFS',
      regex: /failed to push some refs to/i,
      message: 'Push failed. The remote contains work that you do not have locally.',
      safeFixAvailable: true,
      fixCommand: 'git pull {remote} {branch}'
    },
    {
      type: 'UNRELATED_HISTORIES',
      regex: /refusing to merge unrelated histories/i,
      message: 'Refusing to merge unrelated histories.',
      safeFixAvailable: false,
      requiresUserDecision: true
    },
    {
      type: 'AUTH_FAILED',
      regex: /Authentication failed for|could not read Username for/i,
      message: 'Authentication failed. Please check your credentials.',
      safeFixAvailable: false,
      requiresUserDecision: true
    },
    {
      type: 'REPO_NOT_FOUND',
      regex: /repository '(.*)' not found/i,
      message: 'Remote repository not found.',
      safeFixAvailable: false,
      requiresUserDecision: true
    },
    {
      type: 'NETWORK_ERROR',
      regex: /could not resolve host|Connection refused|network is unreachable/i,
      message: 'Network error: could not resolve host or reach remote.',
      safeFixAvailable: false,
      requiresUserDecision: true
    },
    {
      type: 'PATHSPEC_NOT_MATCH',
      regex: /pathspec '(.*)' did not match any files/i,
      message: 'File or path not found.',
      safeFixAvailable: false
    },
    {
      type: 'NOTHING_TO_COMMIT',
      regex: /nothing to commit, working tree clean/i,
      message: 'No changes to commit.',
      safeFixAvailable: false
    },
    {
      type: 'DETACHED_HEAD',
      regex: /You are in 'detached HEAD' state/i,
      message: 'You are in a detached HEAD state.',
      safeFixAvailable: false,
      requiresUserDecision: true
    },
    {
      type: 'MERGE_CONFLICT',
      regex: /Automatic merge failed; fix conflicts and then commit the result/i,
      message: 'Merge conflicts detected. Please resolve them manually.',
      safeFixAvailable: false,
      requiresUserDecision: true
    },
    {
      type: 'LFS_NOT_INSTALLED',
      regex: /git-lfs: command not found|not a git-lfs command/i,
      message: 'Git LFS is not installed on your system.',
      safeFixAvailable: false,
      requiresUserDecision: true
    }
  ];

  static detect(output: string, context?: { branch?: string; remote?: string }): GitError | null {
    for (const pattern of this.patterns) {
      const match = output.match(pattern.regex);
      if (match) {
        let fixCommand = pattern.fixCommand;
        
        // Replace regex groups ($1, $2, etc.)
        if (fixCommand && match[1]) {
          fixCommand = fixCommand.replace(/\$1/g, match[1]);
        }
        
        // Replace context placeholders ({branch}, {remote})
        if (fixCommand && context) {
          if (context.branch) fixCommand = fixCommand.replace(/{branch}/g, context.branch);
          if (context.remote) fixCommand = fixCommand.replace(/{remote}/g, context.remote);
        }
        
        return {
          type: pattern.type,
          detected: true,
          message: pattern.message,
          safeFixAvailable: pattern.safeFixAvailable,
          fixCommand,
          requiresUserDecision: pattern.requiresUserDecision
        };
      }
    }
    return null;
  }
}
