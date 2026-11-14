import { useEffect, useState } from "react";
import type { City } from "./config";
import { cityKey } from "./config";
import type { WeatherResponse } from "./weather";

interface WeatherState {
  key: string;
  data?: WeatherResponse;
  loading: boolean;
  error?: string;
}
const prefix = "weather.forecast.v1.";
function readCached(key: string): WeatherResponse | undefined {
  try {
    const raw = sessionStorage.getItem(prefix + key);
    if (!raw) return;
    const data: WeatherResponse = JSON.parse(raw);
    if (
      data.forecast?.hourly?.time?.length &&
      typeof data.updatedAt === "number"
    )
      return data;
  } catch {
    /* The forecast cache is optional. */
  }
}
function writeCached(key: string, data: WeatherResponse) {
  try {
    const entries = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(prefix),
    );
    while (entries.length >= 12) sessionStorage.removeItem(entries.shift()!);
    sessionStorage.setItem(prefix + key, JSON.stringify(data));
  } catch {
    /* Configuration storage is separate from this disposable cache. */
  }
}
const inflight = new Map<string, Promise<WeatherResponse>>();
async function requestForecast(lat: number, lon: number) {
  const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
  const body = (await response.json()) as WeatherResponse & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(body.error ?? "Could not load the forecast.");
  if (
    !body.forecast?.hourly?.time?.length ||
    !body.forecast.daily?.time?.length
  )
    throw new Error("The forecast response is incomplete. Please try again.");
  return body;
}
/** Shares one network request between components asking for the same city. */
function fetchForecast(key: string, lat: number, lon: number, fresh: boolean) {
  const pending = fresh ? undefined : inflight.get(key);
  if (pending) return pending;
  const request = requestForecast(lat, lon).then((body) => {
    writeCached(key, body);
    return body;
  });
  inflight.set(key, request);
  void request.then(
    () => inflight.get(key) === request && inflight.delete(key),
    () => inflight.get(key) === request && inflight.delete(key),
  );
  return request;
}
export function useWeather(city: City | null, refresh = 0) {
  const key = city ? cityKey(city) : "";
  const lat = city?.lat,
    lon = city?.lon;
  const [state, setState] = useState<WeatherState>({ key: "", loading: false });
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    const controller = new AbortController();
    const cached = readCached(key);
    if (cached && refresh === 0 && Date.now() - cached.updatedAt < 300_000) {
      setState({ key, data: cached, loading: false });
      return;
    }
    setState({ key, data: cached, loading: true });
    void (async () => {
      try {
        const body = await fetchForecast(key, lat, lon, refresh > 0);
        if (controller.signal.aborted) return;
        setState({ key, data: body, loading: false });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            key,
            data: cached,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not load the forecast.",
          });
      }
    })();
    return () => controller.abort();
  }, [key, lat, lon, refresh]);
  return state.key === key ? state : { key, loading: Boolean(city) };
}
