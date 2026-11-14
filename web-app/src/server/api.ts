import { configurationSchema } from "../lib/config";

const noStore = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: noStore });
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const codePattern = /^[A-HJ-NP-Z2-9]{8}$/;

async function boundedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("Missing configuration");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 48_000) {
        await reader.cancel();
        throw new Error("Configuration is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

export async function handleApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/health")
    return json({ ok: true, app: "Weather", configurationStorage: "browser" });
  if (url.pathname === "/api/sync" && request.method === "POST") {
    // Cross-origin websites cannot create transfers using a visitor's browser.
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin)
      return json({ error: "Unsupported origin" }, 403);
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = [...crypto.getRandomValues(new Uint8Array(8))]
        .map((n) => alphabet[n % 32])
        .join("");
      const readerToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const expiresAt = await env.PAIRING.getByName(code).create(readerToken);
      if (expiresAt) return json({ code, readerToken, expiresAt }, 201);
    }
    return json({ error: "Could not create a pairing code. Try again." }, 503);
  }
  if (url.pathname.startsWith("/api/sync/")) {
    const code = url.pathname
      .slice("/api/sync/".length)
      .replace(/[-\s]/g, "")
      .toUpperCase();
    if (!codePattern.test(code))
      return json(
        {
          error: "Enter the eight-character pairing code shown on the desktop.",
        },
        400,
      );
    const session = env.PAIRING.getByName(code);
    if (request.method === "POST") {
      if (!request.headers.get("Content-Type")?.startsWith("application/json"))
        return json({ error: "Send configuration as JSON." }, 415);
      let body: unknown;
      try {
        body = await boundedJson(request);
      } catch {
        return json({ error: "Invalid or oversized configuration." }, 400);
      }
      const result = configurationSchema.safeParse(body);
      if (!result.success)
        return json(
          { error: "This configuration format is not supported." },
          400,
        );
      const saved = await session.publish(result.data);
      return saved.status === 200
        ? json({ ok: true })
        : json({ error: saved.error }, saved.status);
    }
    const token = request.headers.get("X-Sync-Token") ?? "";
    if (request.method === "GET") {
      const result = await session.read(token);
      return json(
        result,
        result.status === "forbidden"
          ? 403
          : result.status === "expired"
            ? 410
            : 200,
      );
    }
    if (request.method === "DELETE") {
      return (await session.clear(token))
        ? json({ ok: true })
        : json({ error: "Invalid transfer token." }, 403);
    }
    return json({ error: "Method not allowed." }, 405);
  }
  if (url.pathname === "/api/cities" && request.method === "GET") {
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
    if (query.length < 2) return json({ results: [] });
    const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
    endpoint.search = new URLSearchParams({
      name: query,
      count: "8",
      language: "en",
      format: "json",
    }).toString();
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok)
        return json({ error: "City search is unavailable. Try again." }, 502);
      return new Response(response.body, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      return json({ error: "City search timed out. Try again." }, 504);
    }
  }
  if (url.pathname === "/api/weather" && request.method === "GET") {
    const latText = url.searchParams.get("lat"),
      lonText = url.searchParams.get("lon");
    const lat = Number(latText),
      lon = Number(lonText);
    if (
      latText === null ||
      lonText === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    )
      return json({ error: "Invalid city coordinates." }, 400);
    const key = new Request(
      `${url.origin}/api/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    );
    const cache = await caches.open("weather-forecasts-v1");
    const cached = await cache.match(key);
    if (cached) return cached;
    const common = {
      latitude: String(lat),
      longitude: String(lon),
      timezone: "auto",
      timeformat: "unixtime",
      forecast_days: "12",
    };
    const weatherParams = new URLSearchParams({
      ...common,
      hourly:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,visibility,evapotranspiration,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,uv_index,dew_point_2m,precipitation_probability,shortwave_radiation",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,rain_sum,wind_direction_10m_dominant",
    });
    const aqParams = new URLSearchParams({
      ...common,
      forecast_days: "7",
      hourly:
        "european_aqi,us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide",
    });
    try {
      const weatherRequest = fetch(
        `https://api.open-meteo.com/v1/forecast?${weatherParams}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      const airRequest = fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams}`,
        { signal: AbortSignal.timeout(10_000) },
      )
        .then(async (r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const [weatherResponse, air] = await Promise.all([
        weatherRequest,
        airRequest,
      ]);
      if (!weatherResponse.ok)
        return json(
          {
            error:
              "The weather provider could not load this forecast. Please try again.",
          },
          502,
        );
      const forecast: unknown = await weatherResponse.json();
      const response = Response.json(
        { forecast, air, updatedAt: Date.now() },
        {
          headers: {
            "Cache-Control": "public, max-age=300",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
      ctx.waitUntil(cache.put(key, response.clone()));
      return response;
    } catch {
      return json(
        { error: "The weather request timed out. Please try again." },
        504,
      );
    }
  }
  return json({ error: "Not found." }, 404);
}
