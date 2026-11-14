import type { WeatherSettings } from "./config";

export interface Forecast {
  timezone: string;
  utc_offset_seconds: number;
  latitude: number;
  longitude: number;
  hourly: { time: number[]; [key: string]: Array<number | null> };
  daily: { time: number[]; [key: string]: Array<number | null> };
}
export interface AirQuality {
  hourly: { time: number[]; [key: string]: Array<number | null> };
}
export interface WeatherResponse {
  forecast: Forecast;
  air: AirQuality | null;
  updatedAt: number;
}
export interface Metric {
  key: string;
  label: string;
  value: string;
  icon: string;
  help: string;
}
export const previewMetricKeys = [
  "wind",
  "gust",
  "chance",
  "humidity",
  "uv",
  "cloud",
];

export function currentHour(forecast: Forecast, now = Date.now()) {
  let nearest = 0;
  for (let i = 0; i < forecast.hourly.time.length; i++) {
    if (forecast.hourly.time[i]! <= now / 1000) nearest = i;
    else break;
  }
  return nearest;
}
export function dayAt(forecast: Forecast, hour: number) {
  const time = forecast.hourly.time[hour] ?? forecast.hourly.time[0]!;
  let day = 0;
  for (let i = 0; i < forecast.daily.time.length; i++) {
    if (forecast.daily.time[i]! <= time) day = i;
    else break;
  }
  return day;
}
export function formatTime(
  time: number,
  timezone: string,
  settings: WeatherSettings,
  options: Intl.DateTimeFormatOptions = {},
) {
  let locale = "en-US";
  if (typeof settings.language === "string") {
    try {
      locale =
        Intl.getCanonicalLocales(settings.language.replaceAll("_", "-"))[0] ??
        locale;
    } catch {
      // Keep imported mobile settings intact while using a safe display locale.
    }
  }
  return new Intl.DateTimeFormat(
    locale,
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: settings.timeformat === "12",
      timeZone: timezone,
      ...options,
    },
  ).format(time * 1000);
}
export function formatDate(
  time: number,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    ...options,
  }).format(time * 1000);
}
export function temperature(
  value: number | null | undefined,
  settings: WeatherSettings,
  unit = true,
) {
  if (value == null || !Number.isFinite(value)) return "—";
  const fahrenheit = settings.degrees === "fahrenheit";
  const converted = fahrenheit ? (value * 9) / 5 + 32 : value;
  const display = settings.roundDegree
    ? Math.round(converted).toString()
    : converted.toFixed(1);
  return `${display}${unit ? (fahrenheit ? "°F" : "°C") : "°"}`;
}
export function speed(
  value: number | null | undefined,
  settings: WeatherSettings,
) {
  if (value == null) return "—";
  if (settings.wind === "mph" || settings.measurements === "imperial")
    return `${Math.round(value * 0.621371)} mph`;
  if (settings.wind === "m/s") return `${((value * 5) / 18).toFixed(1)} m/s`;
  return `${Math.round(value)} kph`;
}
export function precipitation(
  value: number | null | undefined,
  settings: WeatherSettings,
) {
  if (value == null) return "—";
  return settings.measurements === "imperial"
    ? `${(value / 25.4).toFixed(2)} in`
    : `${Number(value.toFixed(2))} mm`;
}
export function weatherLabel(code: number | null | undefined) {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code != null && code >= 51 && code <= 57) return "Drizzle";
  if (
    code != null &&
    ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
  )
    return "Rain";
  if (
    code != null &&
    ((code >= 71 && code <= 77) || code === 85 || code === 86)
  )
    return "Snow";
  if (code != null && code >= 95) return "Thunderstorm";
  return "Weather unavailable";
}
export function weatherIcon(code: number | null | undefined, day = true) {
  if (code === 0) return day ? "sun" : "full-moon";
  if (code != null && code <= 3) return day ? "cloud" : "moon";
  if (code === 45 || code === 48) return day ? "fog" : "fog_moon";
  if (
    code != null &&
    ((code >= 71 && code <= 77) || code === 85 || code === 86)
  )
    return "snow";
  if (code != null && code >= 95) return "thunder";
  return "rain";
}
export function isDay(forecast: Forecast, hour: number) {
  const day = dayAt(forecast, hour),
    t = forecast.hourly.time[hour]!;
  const sunrise = forecast.daily.sunrise?.[day],
    sunset = forecast.daily.sunset?.[day];
  return sunrise != null && sunset != null ? t >= sunrise && t < sunset : true;
}
export function metricsAt(
  forecast: Forecast,
  hour: number,
  settings: WeatherSettings,
): Metric[] {
  const h = forecast.hourly;
  const value = (key: string) => h[key]?.[hour];
  const percent = (key: string) =>
    value(key) == null ? "—" : `${Math.round(value(key)!)}%`;
  const pressure = value("surface_pressure");
  const visibility = value("visibility");
  const visibilityValue =
    visibility == null
      ? "—"
      : settings.measurements === "imperial"
        ? `${(visibility / 1609.344).toFixed(1)} mi`
        : `${(visibility / 1000).toFixed(1)} km`;
  return [
    {
      key: "wind",
      label: "Wind",
      value: speed(value("wind_speed_10m"), settings),
      icon: "wind",
      help: "Average wind speed at ten meters above the ground.",
    },
    {
      key: "gust",
      label: "Gust",
      value: speed(value("wind_gusts_10m"), settings),
      icon: "windgusts",
      help: "The strongest short burst of wind during this hour.",
    },
    {
      key: "chance",
      label: "Chance for Rain",
      value: percent("precipitation_probability"),
      icon: "precipitation_probability",
      help: "The probability of measurable precipitation during this hour.",
    },
    {
      key: "humidity",
      label: "Humidity",
      value: percent("relative_humidity_2m"),
      icon: "humidity",
      help: "The amount of moisture in the air relative to its capacity.",
    },
    {
      key: "uv",
      label: "UV-index",
      value: value("uv_index") == null ? "—" : value("uv_index")!.toFixed(1),
      icon: "uv",
      help: "The strength of ultraviolet radiation. Higher values mean stronger sun protection is needed.",
    },
    {
      key: "cloud",
      label: "Cloudcover",
      value: percent("cloud_cover"),
      icon: "cloudy",
      help: "The percentage of the sky covered by clouds.",
    },
    {
      key: "dewpoint",
      label: "Dewpoint",
      value: temperature(value("dew_point_2m"), settings),
      icon: "dew",
      help: "The temperature at which moisture condenses into dew.",
    },
    {
      key: "feels",
      label: "Feels",
      value: temperature(value("apparent_temperature"), settings),
      icon: "temperature",
      help: "How the air feels when wind, humidity, and sunlight are considered.",
    },
    {
      key: "visibility",
      label: "Visibility",
      value: visibilityValue,
      icon: "fog",
      help: "The distance at which objects can be clearly distinguished.",
    },
    {
      key: "direction",
      label: "Direction",
      value:
        value("wind_direction_10m") == null
          ? "—"
          : `${value("wind_direction_10m")}°`,
      icon: "windsock",
      help: "The direction the wind is coming from, measured clockwise from north.",
    },
    {
      key: "evaporation",
      label: "Evapotranspiration",
      value: precipitation(
        value("evapotranspiration") == null
          ? null
          : Math.abs(value("evapotranspiration")!),
        settings,
      ),
      icon: "evaporation",
      help: "Water transferred from land and plants into the atmosphere.",
    },
    {
      key: "precipitation",
      label: "Precipitation",
      value: precipitation(value("precipitation"), settings),
      icon: "rainfall",
      help: "Total rain, showers, and snow water equivalent during this hour.",
    },
    {
      key: "rain",
      label: "Rain",
      value: precipitation(value("rain"), settings),
      icon: "water",
      help: "The amount of rain expected during this hour.",
    },
    {
      key: "pressure",
      label: "Pressure",
      value:
        pressure == null
          ? "—"
          : settings.pressure === "mmHg"
            ? `${(pressure * 0.75).toFixed(1)} mmHg`
            : `${Math.round(pressure)} hPa`,
      icon: "atmospheric",
      help: "Atmospheric pressure at the location’s surface.",
    },
    {
      key: "radiation",
      label: "Shortwave radiation",
      value:
        value("shortwave_radiation") == null
          ? "—"
          : `${Math.round(value("shortwave_radiation")!)} W/m²`,
      icon: "shortwave_radiation",
      help: "Solar radiation reaching the ground during this hour.",
    },
  ];
}
export function aqiInfo(value: number, american: boolean) {
  const thresholds = american
    ? [50, 100, 150, 200, 300]
    : [20, 40, 60, 80, 100];
  const labels = american
    ? [
        "Good",
        "Moderate",
        "Unhealthy for sensitive groups",
        "Unhealthy",
        "Very unhealthy",
        "Hazardous",
      ]
    : ["Good", "Fair", "Moderate", "Poor", "Very poor", "Extremely poor"];
  const colors = [
    "#91cfa0",
    "#d8ce88",
    "#e7b779",
    "#df969e",
    "#b9a0d8",
    "#c7839a",
  ];
  const i = thresholds.findIndex((n) => value <= n);
  const index = i < 0 ? 5 : i;
  return {
    label: labels[index]!,
    color: colors[index]!,
    advice:
      index === 0
        ? "Great air for outdoor activities."
        : index === 1
          ? "Generally fine. Sensitive people may want to limit long outdoor exertion."
          : "Consider reducing prolonged outdoor exertion, especially if you are sensitive to air pollution.",
  };
}
