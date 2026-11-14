# Weather for desktop

The desktop companion to the Flutter Weather app, built with TanStack Start, React, and the Cloudflare Vite plugin. Production: https://weather.kalenwallin.com.

## Run and deploy

```sh
npm ci
npm run cf-typegen
npm run dev             # http://localhost:3012
npm run check
npm test
node scripts/smoke.mjs # checks the running local Workers pairing relay
npm run build
npm run deploy
```

Run commands from `web-app/`. Wrangler uses the authenticated Cloudflare account and the custom domain in `wrangler.jsonc`. The Vite build emits the production Worker and its assets into `dist/`.

## Phone → browser configuration transfer

1. On the desktop site, choose **Sync from phone**.
2. In the updated Android app, open **Settings → Sync to desktop**.
3. Enter the eight-character code and choose **Send configuration**.

The versioned payload includes the main location, saved cities in their current order, and every mobile settings field. Forecast caches are not transferred. The desktop uses the phone's units, theme, palette, rounding, time format, and AQI preference; mobile-only notification and widget preferences are preserved for export without being activated in the browser.

The received configuration is saved to `localStorage` as `weather.configuration.v1` for this browser and origin. Changes in one tab are reflected in other tabs. Export/import in Settings provides a portable JSON backup. Clearing site data removes that browser's configuration. A later transfer replaces its configuration with a new snapshot from the phone; changes do not automatically propagate between devices.

A Cloudflare SQLite-backed Durable Object handles each temporary pairing session. The eight-character code allows the phone to publish once. A separate unpredictable reader token, held only by the receiving browser, is required to retrieve or delete the transfer. Sessions expire after ten minutes and are deleted after the browser acknowledges saving. Configuration is not published in the site's HTML or kept in a shared global profile. No user account, login, D1 database, or permanent cloud configuration store is needed.

## Weather data and UI

Forecast and air-quality requests are made to Open-Meteo through the Worker, with five-minute public caching and bounded request deadlines. Air-quality failures do not block the weather forecast. The browser keeps a small disposable session forecast cache to retain the most recent forecast during an outage.

The interface reuses the mobile app's Classic weather icons and Ubuntu typography, with current conditions, a selectable hourly strip, six preview variables, expandable remaining variables, sunrise/sunset, air quality, and a twelve-day forecast. Cities can be added, viewed, removed, or made the main city; browser settings persist independently of the phone.

Weather icons and the mobile app derive from this repository's Rain/Weather code and retain the root MIT license. Forecast/air-quality attribution links to [Open-Meteo](https://open-meteo.com/). Framework integration follows the official [Cloudflare TanStack Start guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/).
