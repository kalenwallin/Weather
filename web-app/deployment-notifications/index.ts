interface BuildEvent {
  type?: string;
  source?: { workerName?: string };
  payload?: {
    buildUuid?: string;
    buildTriggerMetadata?: { branch?: string; commitHash?: string };
  };
}

export function buildNotification(event: BuildEvent, env: Env) {
  const started = event.type === "cf.workersBuilds.worker.build.started";
  const succeeded = event.type === "cf.workersBuilds.worker.build.succeeded";
  const failed = event.type === "cf.workersBuilds.worker.build.failed";
  const metadata = event.payload?.buildTriggerMetadata;
  if (
    (!started && !succeeded && !failed) ||
    event.source?.workerName !== env.WORKER_NAME ||
    metadata?.branch !== env.BRANCH ||
    !event.payload?.buildUuid
  ) return null;

  const buildUrl = `https://dash.cloudflare.com/${env.ACCOUNT_ID}/workers/services/view/${encodeURIComponent(env.WORKER_NAME)}/production/builds/${encodeURIComponent(event.payload.buildUuid)}`;
  return {
    username: "Weather Deployments",
    avatar_url: "https://weather.kalenwallin.com/icon.png",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: started
        ? "🔨 Weather build started"
        : succeeded
          ? "✅ Weather deployment succeeded"
          : "❌ Weather build or deployment failed",
      color: started ? 3900150 : succeeded ? 2278750 : 15680580,
      url: buildUrl,
      description: started
        ? "Cloudflare has started the production build and deploy."
        : succeeded
          ? "The production build and deploy completed successfully."
          : "Cloudflare could not complete the production build and deploy. Open the build logs for details.",
      fields: [
        { name: "Branch", value: env.BRANCH, inline: true },
        { name: "Commit", value: metadata.commitHash?.slice(0, 7) || "Unavailable", inline: true },
        { name: "Build logs", value: `[Open in Cloudflare](${buildUrl})` },
      ],
    }],
  };
}

export async function deliverNotification(event: BuildEvent, env: Env, send = fetch) {
  const notification = buildNotification(event, env);
  if (!notification) return;
  let url: URL;
  try {
    url = new URL(env.DISCORD_WEBHOOK_URL);
  } catch {
    throw new Error("Discord webhook is not configured correctly");
  }
  if (
    url.protocol !== "https:" || url.hostname !== "discord.com" ||
    !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)
  ) throw new Error("Discord webhook is not configured correctly");

  url.searchParams.set("wait", "true");
  const response = await send(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notification),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Discord delivery failed (HTTP ${response.status})`);
}

export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await deliverNotification(message.body, env);
        message.ack();
      } catch {
        // Do not log network errors that may contain the secret webhook URL.
        console.error("Weather deployment notification delivery failed; retrying.");
        message.retry({ delaySeconds: 60 });
      }
    }
  },
} satisfies ExportedHandler<Env, BuildEvent>;
