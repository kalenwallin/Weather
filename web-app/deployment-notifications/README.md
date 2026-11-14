# Deployment notifications

Cloudflare Workers Builds sends production build events for the Weather web app
(`weather-desktop`) to `#deployments` in kalen's server: `build.started`,
`build.succeeded`, and `build.failed`. Only the `main` branch is delivered. Each
message includes the branch, commit, and a link to the Cloudflare build logs, with
mentions disabled.

It mirrors Cost Splitter and Tier List Maker but runs on its own Worker and queue:

- Worker: `weather-deployment-notifications` (source and tests in this folder)
- Discord webhook: `Weather Deployments` in `#deployments`
- Queue: `weather-deployments`
- Failed-delivery queue: `weather-deployments-failed`
- Subscription: `weather-deployment-results` (ID `8b3ec3f113d048d1a32838c3b957e2d9`)
- Source: `workersBuilds.worker`, worker name `weather-desktop`

The Discord webhook URL is stored only as the Worker secret `DISCORD_WEBHOOK_URL`.
Never commit it.

## Workers Builds connection

Events are only emitted when `weather-desktop` is built by Workers Builds. In the
Cloudflare dashboard, `weather-desktop` → **Settings** → **Builds** is connected to
`kalenwallin/Weather` with:

- Production branch: `main`
- Root directory: `web-app`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Build watch paths: include `web-app/*`, so Flutter-only commits do not redeploy

## Maintenance

Run these from `web-app/`. The event subscription is managed outside
`wrangler.jsonc`. To change it, deploy the consumer first, then update the existing
subscription:

```sh
npx wrangler deploy -c deployment-notifications/wrangler.jsonc
npx wrangler secret put DISCORD_WEBHOOK_URL -c deployment-notifications/wrangler.jsonc
npx wrangler queues subscription list weather-deployments -c deployment-notifications/wrangler.jsonc
npx wrangler queues subscription update weather-deployments --id 8b3ec3f113d048d1a32838c3b957e2d9 --events build.started,build.succeeded,build.failed -c deployment-notifications/wrangler.jsonc
```

Tests:

```sh
npx tsc --noEmit -p deployment-notifications/tsconfig.json
npx vitest run --config deployment-notifications/vitest.config.ts
```

Local tests do not verify live delivery. Confirm that the next real production
build posts both the start and result messages in Discord.

Cloudflare documentation: https://developers.cloudflare.com/workers/ci-cd/builds/event-subscriptions/
