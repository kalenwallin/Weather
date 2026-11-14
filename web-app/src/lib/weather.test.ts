import { describe, expect, it } from "vitest";
import {
  currentHour,
  dayAt,
  formatTime,
  metricsAt,
  precipitation,
  speed,
  temperature,
  weatherIcon,
} from "./weather";
import type { Forecast } from "./weather";
import { defaultSettings } from "./config";
const forecast: Forecast = {
  latitude: 40.8,
  longitude: -96.6,
  timezone: "America/Chicago",
  utc_offset_seconds: -21600,
  hourly: {
    time: [1763164800, 1763168400, 1763251200],
    temperature_2m: [0, 1, 2],
    precipitation_probability: [30, 40, 50],
  },
  daily: { time: [1763100000, 1763186400] },
};
describe("weather parity", () => {
  it("converts units using the mobile configuration", () => {
    expect(temperature(0, defaultSettings)).toBe("32°F");
    expect(
      temperature(1.2, {
        ...defaultSettings,
        degrees: "celsius",
        roundDegree: false,
      }),
    ).toBe("1.2°C");
    expect(speed(16.0934, defaultSettings)).toBe("10 mph");
    expect(
      speed(36, { ...defaultSettings, measurements: "metric", wind: "m/s" }),
    ).toBe("10.0 m/s");
    expect(precipitation(25.4, defaultSettings)).toBe("1.00 in");
  });
  it("uses real forecast timestamps and the city timezone", () => {
    expect(currentHour(forecast, 1763168500 * 1000)).toBe(1);
    expect(dayAt(forecast, 2)).toBe(1);
    expect(
      formatTime(Date.parse("2026-11-14T18:00:00Z") / 1000, "America/Chicago", {
        timeformat: "12",
      }),
    ).toBe("12:00 PM");
  });
  it("keeps the six preview variables in the same order as the phone", () => {
    const metrics = metricsAt(forecast, 0, defaultSettings);
    expect(metrics.slice(0, 6).map((m) => m.label)).toEqual([
      "Wind",
      "Gust",
      "Chance for Rain",
      "Humidity",
      "UV-index",
      "Cloudcover",
    ]);
    expect(metrics).toHaveLength(15);
    expect(metrics[2]!.value).toBe("30%");
    expect(weatherIcon(0, false)).toBe("full-moon");
    expect(metrics.find((m) => m.key === "pressure")!.value).toBe("—");
  });
  it("renders the phone locale format and tolerates invalid imported locales", () => {
    const time = Date.parse("2026-11-14T18:00:00Z") / 1000;
    for (const language of ["en_US", "en-US", "invalid_locale_@", ""]) {
      expect(
        formatTime(time, "America/Chicago", {
          timeformat: "12",
          language,
        }),
      ).toBe("12:00 PM");
    }
  });
});
