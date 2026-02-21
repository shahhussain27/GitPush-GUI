export interface GitHubRepoResponse {
  clone_url: string;
  name: string;
  private: boolean;
}

export class GitHubService {
  private static API_BASE = 'https://api.github.com';

  static async createRepo(token: string, name: string, isPrivate: boolean): Promise<GitHubRepoResponse> {
    try {
      const response = await fetch(`${this.API_BASE}/user/repos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'GitPush-GUI-App',
        },
        body: JSON.stringify({
          name,
          private: isPrivate,
        }),
      });

      const data: any = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid GitHub token. Please check your PAT.');
        } else if (response.status === 422) {
          throw new Error(`Repository "${name}" already exists on your GitHub account.`);
        } else {
          throw new Error(data.message || 'Failed to create repository on GitHub.');
        }
      }

      return {
        clone_url: data.clone_url,
        name: data.name,
        private: data.private,
      };
    } catch (error: any) {
      if (error.message.includes('token') || error.message.includes('exists') || error.message.includes('Failed')) {
        throw error;
      }
      throw new Error('Network error or GitHub API is unreachable.');
    }
  }

  static async getRepoDetails(token: string, owner: string, repo: string) {
    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitPush-GUI-App',
      },
    });
    if (!response.ok) throw new Error('Failed to fetch repo details');
    return await response.json();
  }

  static async listCollaborators(token: string, owner: string, repo: string) {
    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/collaborators`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitPush-GUI-App',
      },
    });
    if (!response.ok) throw new Error('Failed to list collaborators');
    return await response.json();
  }

  static async addCollaborator(token: string, owner: string, repo: string, username: string, permission: string = 'push') {
    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/collaborators/${username}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'GitPush-GUI-App',
      },
      body: JSON.stringify({ permission }),
    });
    if (!response.ok) throw new Error(`Failed to add collaborator: ${username}`);
    return true;
  }

  static async removeCollaborator(token: string, owner: string, repo: string, username: string) {
    const response = await fetch(`${this.API_BASE}/repos/${owner}/${repo}/collaborators/${username}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitPush-GUI-App',
      },
    });
    if (!response.ok) throw new Error(`Failed to remove collaborator: ${username}`);
    return true;
  }

  static async addRepoToTeam(token: string, org: string, team: string, owner: string, repo: string, permission: string = 'push') {
    const response = await fetch(`${this.API_BASE}/orgs/${org}/teams/${team}/repos/${owner}/${repo}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'GitPush-GUI-App',
      },
      body: JSON.stringify({ permission }),
    });
    if (!response.ok) throw new Error(`Failed to add repo to team: ${team}`);
    return true;
  }
}
