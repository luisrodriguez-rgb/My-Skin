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
  private pollIntervalId: number | null = null;

  constructor() {
    const savedOwner = localStorage.getItem("myskin_gh_owner");
    const savedRepo = localStorage.getItem("myskin_gh_repo");
    if (savedOwner) this.repoOwner = savedOwner;
    if (savedRepo) this.repoName = savedRepo;
  }

  public getTargetRepo(): string {
    return `${this.repoOwner}/${this.repoName}`;
  }

  public setTargetRepo(owner: string, repo: string) {
    this.repoOwner = owner.trim();
    this.repoName = repo.trim();
    localStorage.setItem("myskin_gh_owner", this.repoOwner);
    localStorage.setItem("myskin_gh_repo", this.repoName);
  }

  public subscribe(listener: GitHubListener) {
    this.listeners.push(listener);
  }

  /**
   * Consulta los ultimos commits del repositorio en GitHub
   */
  public async fetchLatestActivity(): Promise<{ hasNew: boolean; latestMessage?: string }> {
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/commits?per_page=1`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
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
    this.pollIntervalId = window.setInterval(() => {
      this.fetchLatestActivity();
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
