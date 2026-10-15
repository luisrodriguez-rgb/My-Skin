export interface GitHubCommitEvent { message: string; author: string; sha: string; url?: string; }
export interface GitHubMergeEvent { prNumber: number; title: string; author: string; mergedAt: string; }
export type GitHubListener = {
  onMerge?: (event: GitHubMergeEvent) => void;
  onCommit?: (event: GitHubCommitEvent) => void;
};
interface PullRequest {
  number: number;
  title?: string;
  user?: { login?: string };
  merged_at: string | null;
  updated_at: string;
}

export class GitHubMonitorService {
  private repoOwner = localStorage.getItem("myskin_gh_owner") || "luisrodriguez-rgb";
  private repoName = localStorage.getItem("myskin_gh_repo") || "My-Skin";
  private listeners: GitHubListener[] = [];
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;
  private token = "";
  private lastCommitSha: string | null = null;
  private prWatermark: string | null = null;
  private seenMerges = new Set<number>();
  private cooldownUntil = 0;
  private checkingPulls = false;
  private checkingCommits = false;
  public lastError: string | null = null;

  constructor() {
    // Migrate legacy plaintext persistence into this process only. Future keys are never persisted.
    this.token = localStorage.getItem("myskin_gh_token") || "";
    localStorage.removeItem("myskin_gh_token");
    this.restoreCursor();
  }

  private get cursorKey() { return `myskin_gh_cursor:${this.getTargetRepo()}`; }
  private restoreCursor() {
    this.lastCommitSha = null;
    this.prWatermark = null;
    this.seenMerges.clear();
    try {
      const saved = JSON.parse(localStorage.getItem(this.cursorKey) || "null");
      if (saved) {
        this.lastCommitSha = typeof saved.commit === "string" ? saved.commit : null;
        this.prWatermark = typeof saved.watermark === "string" ? saved.watermark : null;
        this.seenMerges = new Set(Array.isArray(saved.merges) ? saved.merges.filter(Number.isInteger) : []);
      }
    } catch { /* A corrupt cursor starts a fresh, silent baseline. */ }
  }
  private saveCursor() {
    localStorage.setItem(this.cursorKey, JSON.stringify({
      commit: this.lastCommitSha, watermark: this.prWatermark, merges: [...this.seenMerges].slice(-2000),
    }));
  }

  public getTargetRepo() { return `${this.repoOwner}/${this.repoName}`; }
  public setTargetRepo(owner: string, repo: string) {
    if (!/^[\w.-]+$/.test(owner.trim()) || !/^[\w.-]+$/.test(repo.trim())) throw new Error("Repositorio de GitHub inválido.");
    this.repoOwner = owner.trim(); this.repoName = repo.trim();
    localStorage.setItem("myskin_gh_owner", this.repoOwner);
    localStorage.setItem("myskin_gh_repo", this.repoName);
    this.restoreCursor();
  }

  /** Session-only credential. Public repositories do not require a token. */
  public setAuthToken(token: string) {
    this.token = token.trim();
    localStorage.removeItem("myskin_gh_token");
    this.cooldownUntil = 0;
  }
  public subscribe(listener: GitHubListener) { this.listeners.push(listener); }

  private async request(url: string): Promise<Response> {
    if (Date.now() < this.cooldownUntil) throw new Error("GitHub solicita esperar antes de volver a consultar.");
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        const retry = response.headers.get("retry-after");
        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
        const retryAt = retry ? (Number.isFinite(Number(retry)) ? Date.now() + Number(retry) * 1000 : Date.parse(retry)) : 0;
        this.cooldownUntil = Math.max(Date.now() + 60000, retryAt || 0, reset || 0);
      }
      throw new Error(`GitHub HTTP ${response.status}`);
    }
    this.lastError = null;
    return response;
  }

  public async fetchLatestPullRequests(): Promise<void> {
    if (this.checkingPulls) return;
    this.checkingPulls = true;
    const target = this.getTargetRepo();
    try {
      const collected: PullRequest[] = [];
      let complete = false;
      for (let page = 1; page <= 10; page++) {
        const response = await this.request(`https://api.github.com/repos/${target}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`);
        const pulls: PullRequest[] = await response.json();
        if (!Array.isArray(pulls)) throw new Error("Respuesta de PRs inválida.");
        collected.push(...pulls);
        if (pulls.length < 100 || !this.prWatermark || pulls.some((pr) => pr.updated_at < this.prWatermark!)) {
          complete = true; break;
        }
      }
      if (!complete) throw new Error("Hay más de 1000 PRs actualizadas; no se avanzó el punto de seguimiento.");
      if (target !== this.getTargetRepo()) return;
      const baseline = this.prWatermark === null;
      const newlyMerged: PullRequest[] = [];
      for (const pr of collected) {
        if (!pr.merged_at) continue;
        if (!baseline && !this.seenMerges.has(pr.number) && pr.merged_at >= this.prWatermark!) newlyMerged.push(pr);
        this.seenMerges.add(pr.number);
      }
      this.prWatermark = collected.reduce((latest, pr) => pr.updated_at > latest ? pr.updated_at : latest, this.prWatermark ?? "1970-01-01T00:00:00Z");
      this.saveCursor();
      for (const pr of newlyMerged.reverse()) {
        for (const listener of this.listeners) listener.onMerge?.({
          prNumber: pr.number, title: pr.title || "PR Merged", author: pr.user?.login || "Dev", mergedAt: pr.merged_at!,
        });
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    } finally { this.checkingPulls = false; }
  }

  public async fetchLatestActivity(): Promise<{ hasNew: boolean; latestMessage?: string }> {
    if (this.checkingCommits) return { hasNew: false };
    this.checkingCommits = true;
    const target = this.getTargetRepo();
    try {
      const response = await this.request(`https://api.github.com/repos/${target}/commits?per_page=1`);
      const commits = await response.json();
      if (!Array.isArray(commits) || !commits.length || target !== this.getTargetRepo()) return { hasNew: false };
      const latest = commits[0];
      if (typeof latest.sha !== "string") throw new Error("Respuesta de commits inválida.");
      const message = latest.commit?.message?.split("\n")[0] || "Nuevo commit";
      const hasNew = this.lastCommitSha !== null && this.lastCommitSha !== latest.sha;
      this.lastCommitSha = latest.sha;
      this.saveCursor();
      if (hasNew) for (const listener of this.listeners) listener.onCommit?.({
        sha: latest.sha.slice(0, 7), message, author: latest.commit?.author?.name || "Dev", url: latest.html_url,
      });
      return { hasNew, latestMessage: message };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return { hasNew: false };
    } finally { this.checkingCommits = false; }
  }

  public triggerSimulatedMerge(title = "feat: integrar compañero a escritorio", prNumber = 12) {
    for (const listener of this.listeners) listener.onMerge?.({
      prNumber, title, author: "demo", mergedAt: new Date().toISOString(),
    });
  }
  public startPolling(intervalSeconds = 180) {
    if (this.pollIntervalId !== null) return;
    const poll = () => { void this.fetchLatestActivity(); void this.fetchLatestPullRequests(); };
    poll(); this.pollIntervalId = setInterval(poll, intervalSeconds * 1000);
  }
  public stopPolling() {
    if (this.pollIntervalId !== null) clearInterval(this.pollIntervalId);
    this.pollIntervalId = null;
  }
}

export const githubMonitor = new GitHubMonitorService();
