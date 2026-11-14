import { describe, expect, it, vi } from "vitest";
import worker, { buildNotification, deliverNotification } from "./index";
const env = {
  ACCOUNT_ID: "237d967ddf37a3b1587e673236320925",
  WORKER_NAME: "weather-desktop",
  BRANCH: "main",
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/123/test-token",
} as const;
const event = (status = "started") => ({
  type: `cf.workersBuilds.worker.build.${status}`,
  source: { workerName: "weather-desktop" },
  payload: { buildUuid: "build-id", buildTriggerMetadata: { branch: "main", commitHash: "abcdef123456" } },
});
describe("Weather deployment notifications", () => {
  it("matches the existing build and deployment embeds", () => {
    for (const [status, title] of [["started", "🔨 Weather build started"], ["succeeded", "✅ Weather deployment succeeded"], ["failed", "❌ Weather build or deployment failed"]]) {
      const body = buildNotification(event(status), env)!;
      expect(body.username).toBe("Weather Deployments");
      expect(body.allowed_mentions).toEqual({ parse: [] });
      expect(body.embeds[0].title).toBe(title);
      expect(body.embeds[0].fields[1].value).toBe("abcdef1");
      expect(body.embeds[0].url).toContain("/weather-desktop/production/builds/build-id");
    }
  });
  it("ignores other projects, preview branches, and unrelated events", () => {
    expect(buildNotification({ ...event(), source: { workerName: "cost-splitter" } }, env)).toBeNull();
    const preview = event();
    preview.payload.buildTriggerMetadata.branch = "feature";
    expect(buildNotification(preview, env)).toBeNull();
    expect(buildNotification(event("canceled"), env)).toBeNull();
    expect(buildNotification({ type: event().type }, env)).toBeNull();
  });
  it("waits for Discord to confirm delivery", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    await deliverNotification(event(), env, send);
    expect(new URL(String(send.mock.calls[0][0])).searchParams.get("wait")).toBe("true");
    expect(send.mock.calls[0][1]?.method).toBe("POST");
    send.mockResolvedValue(new Response(null, { status: 429 }));
    await expect(deliverNotification(event(), env, send)).rejects.toThrow("HTTP 429");
  });
  it("acknowledges successful delivery and retries failures without logging secrets", async () => {
    const send = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const message = { id: "message-id", timestamp: new Date(), attempts: 1, body: event(), ack: vi.fn(), retry: vi.fn() };
    const batch = { queue: "weather-deployments", messages: [message], ackAll: vi.fn(), retryAll: vi.fn() };
    await worker.queue(batch, env);
    expect(message.ack).toHaveBeenCalledOnce();
    send.mockRejectedValue(new Error(env.DISCORD_WEBHOOK_URL));
    message.ack.mockClear();
    await worker.queue(batch, env);
    expect(message.ack).not.toHaveBeenCalled();
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
    expect(JSON.stringify(log.mock.calls)).not.toContain("test-token");
    vi.restoreAllMocks();
  });
});
