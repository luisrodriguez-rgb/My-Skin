/**
 * MySkin - Monitor Ligero de GitHub (Fase 2)
 * Supervisa eventos de Pull Requests, commits y actividad de repositorios en tiempo real.
 */

export interface GitHubCommitEvent {
  message: string;
  author: string;
  sha: string;
  url?: string;
}

export interface GitHubMergeEvent {
  prNumber: number;
  title: string;
  author: string;
  mergedAt: string;
}

export type GitHubListener = {
  onMerge?: (event: GitHubMergeEvent) => void;
  onCommit?: (event: GitHubCommitEvent) => void;
};

class GitHubMonitorService {
  private repoOwner: string = "luisrodriguez-rgb";
  private repoName: string = "My-Skin";
  private listeners: GitHubListener[] = [];
  private lastCommitSha: string | null = null;
  private lastPrNumber: number | null = null;
  private pollIntervalId: number | null = null;

  constructor() {
    const savedOwner = localStorage.getItem("myskin_gh_owner");
    const savedRepo = localStorage.getItem("myskin_gh_repo");
    if (savedOwner) this.repoOwner = savedOwner;
    if (savedRepo) this.repoName = savedRepo;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    try {
      const token = localStorage.getItem("myskin_gh_token");
      if (token && token.trim().length > 0) {
        headers["Authorization"] = `Bearer ${token.trim()}`;
      }
    } catch (_) {}
    return headers;
  }

  public getTargetRepo(): string {
    return `${this.repoOwner}/${this.repoName}`;
  }

  public setTargetRepo(owner: string, repo: string) {
    this.repoOwner = owner.trim();
    this.repoName = repo.trim();
    try {
      localStorage.setItem("myskin_gh_owner", this.repoOwner);
      localStorage.setItem("myskin_gh_repo", this.repoName);
    } catch (_) {}
  }

  public setAuthToken(token: string) {
    try {
      if (token && token.trim().length > 0) {
        localStorage.setItem("myskin_gh_token", token.trim());
      } else {
        localStorage.removeItem("myskin_gh_token");
      }
    } catch (_) {}
  }

  public subscribe(listener: GitHubListener) {
    this.listeners.push(listener);
  }

  /**
   * Consulta las últimas Pull Requests cerradas y detecta merges reales
   */
  public async fetchLatestPullRequests(): Promise<void> {
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/pulls?state=closed&per_page=1`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) return;

      const pulls = await res.json();
      if (!Array.isArray(pulls) || pulls.length === 0) return;

      const pr = pulls[0];
      if (pr.merged_at) {
        if (this.lastPrNumber !== null && this.lastPrNumber !== pr.number) {
          this.lastPrNumber = pr.number;
          this.notifyMerge({
            prNumber: pr.number,
            title: pr.title || "PR Merged",
            author: pr.user?.login || "Dev",
            mergedAt: pr.merged_at,
          });
        } else {
          this.lastPrNumber = pr.number;
        }
      }
    } catch (err) {
      console.debug("[GitHubMonitor] Error al consultar PRs:", err);
    }
  }

  /**
   * Consulta los ultimos commits del repositorio en GitHub
   */
  public async fetchLatestActivity(): Promise<{ hasNew: boolean; latestMessage?: string }> {
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits?per_page=1`;
      const res = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        console.debug(`[GitHubMonitor] HTTP ${res.status} al consultar ${url}`);
        return { hasNew: false };
      }

      const commits = await res.json();
      if (!Array.isArray(commits) || commits.length === 0) {
        return { hasNew: false };
      }

      const latest = commits[0];
      const sha = latest.sha?.slice(0, 7) || "unknown";
      const message = latest.commit?.message?.split("\n")[0] || "Nuevo commit";
      const author = latest.commit?.author?.name || "Dev";

      if (this.lastCommitSha && this.lastCommitSha !== sha) {
        this.lastCommitSha = sha;
        this.notifyCommit({
          sha,
          message,
          author,
          url: latest.html_url,
        });
        return { hasNew: true, latestMessage: message };
      }

      this.lastCommitSha = sha;
      return { hasNew: false, latestMessage: message };
    } catch (err) {
      console.debug("[GitHubMonitor] Error de red o rate limit de GitHub API:", err);
      return { hasNew: false };
    }
  }

  /**
   * Simula un evento de PR Merged para pruebas rapidas sin esperar commits reales
   */
  public triggerSimulatedMerge(title = "feat: integrar companero a escritorio", prNumber = 12) {
    const event: GitHubMergeEvent = {
      prNumber,
      title,
      author: "luisrodriguez-rgb",
      mergedAt: new Date().toISOString(),
    };
    this.notifyMerge(event);
  }

  /**
   * Inicia el sondeo periodico hacia la API publica de GitHub
   */
  public startPolling(intervalSeconds = 180) {
    if (this.pollIntervalId !== null) return;
    this.fetchLatestActivity();
    this.fetchLatestPullRequests();
    this.pollIntervalId = window.setInterval(() => {
      this.fetchLatestActivity();
      this.fetchLatestPullRequests();
    }, intervalSeconds * 1000);
  }

  public stopPolling() {
    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private notifyMerge(event: GitHubMergeEvent) {
    for (const l of this.listeners) {
      l.onMerge?.(event);
    }
  }

  private notifyCommit(event: GitHubCommitEvent) {
    for (const l of this.listeners) {
      l.onCommit?.(event);
    }
  }
}

export const githubMonitor = new GitHubMonitorService();
