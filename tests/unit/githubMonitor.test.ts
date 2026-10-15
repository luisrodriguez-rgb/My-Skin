import { expect, it, vi } from "vitest";
import { GitHubMonitorService } from "../../src/githubMonitor";
const pull = (number: number, updated: string, merged: string | null = null) => ({ number, updated_at: updated, merged_at: merged, title: `PR ${number}` });
const response = (items: unknown) => new Response(JSON.stringify(items));
it("detects a merge behind a closed unmerged PR and deduplicates it", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const service = new GitHubMonitorService(); const onMerge = vi.fn(); service.subscribe({ onMerge });
  fetchMock.mockResolvedValueOnce(response([pull(1, "2026-10-14T00:00:00Z", "2026-10-14T00:00:00Z")]));
  await service.fetchLatestPullRequests(); expect(onMerge).not.toHaveBeenCalled();
  const latest = [pull(2, "2026-10-15T12:00:00Z"), pull(3, "2026-10-15T11:00:00Z", "2026-10-15T11:00:00Z")];
  fetchMock.mockResolvedValueOnce(response(latest)); await service.fetchLatestPullRequests();
  expect(onMerge).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ prNumber: 3 }));
  fetchMock.mockResolvedValueOnce(response(latest)); await service.fetchLatestPullRequests();
  expect(onMerge).toHaveBeenCalledOnce();
});
it("keeps the merge cursor when the application is reopened", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(response([pull(1, "2026-10-14T00:00:00Z", "2026-10-14T00:00:00Z")]))));
  await new GitHubMonitorService().fetchLatestPullRequests();
  const service = new GitHubMonitorService(); const onMerge = vi.fn(); service.subscribe({ onMerge });
  await service.fetchLatestPullRequests(); expect(onMerge).not.toHaveBeenCalled();
});
it("paginates when all first-page updates are newer than the cursor", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const service = new GitHubMonitorService(); const onMerge = vi.fn(); service.subscribe({ onMerge });
  fetchMock.mockResolvedValueOnce(response([pull(1, "2026-10-14T00:00:00Z", "2026-10-14T00:00:00Z")]));
  await service.fetchLatestPullRequests();
  fetchMock.mockResolvedValueOnce(response(Array.from({ length: 100 }, (_, i) => pull(i + 10, "2026-10-15T12:00:00Z"))));
  fetchMock.mockResolvedValueOnce(response([pull(200, "2026-10-15T11:00:00Z", "2026-10-15T11:00:00Z")]));
  await service.fetchLatestPullRequests();
  expect(onMerge).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ prNumber: 200 }));
  expect(fetchMock.mock.calls[2][0]).toContain("page=2");
});
it("respects rate limits before making more requests", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "120" } }));
  vi.stubGlobal("fetch", fetchMock); const service = new GitHubMonitorService();
  await service.fetchLatestPullRequests(); await service.fetchLatestPullRequests();
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(service.lastError).toContain("esperar");
});
it("does not persist tokens and migrates the legacy token to memory", async () => {
  localStorage.setItem("myskin_gh_token", "test-only-token");
  const fetchMock = vi.fn().mockResolvedValue(response([])); vi.stubGlobal("fetch", fetchMock);
  const service = new GitHubMonitorService();
  expect(localStorage.getItem("myskin_gh_token")).toBeNull();
  service.setAuthToken("replacement-test-token"); await service.fetchLatestPullRequests();
  expect(localStorage.getItem("myskin_gh_token")).toBeNull();
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer replacement-test-token");
});
it("detects a new full commit SHA without replaying the baseline", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const service = new GitHubMonitorService(); const onCommit = vi.fn(); service.subscribe({ onCommit });
  fetchMock.mockResolvedValueOnce(response([{ sha: "1234567aaa", commit: { message: "old" } }]));
  await service.fetchLatestActivity(); expect(onCommit).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(response([{ sha: "1234567bbb", commit: { message: "new" } }]));
  expect((await service.fetchLatestActivity()).hasNew).toBe(true);
  expect(onCommit).toHaveBeenCalledOnce();
});
