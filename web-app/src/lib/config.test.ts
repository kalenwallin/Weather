import { describe, expect, it } from "vitest";
import {
  addCity,
  allCities,
  cityKey,
  emptyConfiguration,
  parseConfiguration,
} from "./config";
const city = { city: "Lincoln", district: "Nebraska", lat: 40.8, lon: -96.667 };
describe("configuration transfer", () => {
  it("preserves mobile preferences while supplying web defaults", () => {
    const config = parseConfiguration({
      version: 1,
      mainCity: city,
      cities: [],
      settings: {
        degrees: "celsius",
        widgetBackgroundColorDark: "#ff1a1925",
        notificationSound: true,
        timeRange: 4,
      },
    });
    expect(config.settings.degrees).toBe("celsius");
    expect(config.settings.widgetBackgroundColorDark).toBe("#ff1a1925");
    expect(config.settings.notificationSound).toBe(true);
    expect(config.settings.timeRange).toBe(4);
    expect(config.settings.timeformat).toBe("12");
  });
  it("rejects unsupported versions, invalid coordinates, and oversized city lists", () => {
    expect(() =>
      parseConfiguration({ ...emptyConfiguration, version: 3 }),
    ).toThrow();
    expect(() =>
      parseConfiguration({
        ...emptyConfiguration,
        mainCity: { ...city, lat: 100 },
      }),
    ).toThrow();
    expect(() =>
      parseConfiguration({
        ...emptyConfiguration,
        cities: Array(101).fill(city),
      }),
    ).toThrow();
  });
  it("adds the first city as the main city and prevents duplicate locations", () => {
    const config = addCity(emptyConfiguration, city);
    expect(config.mainCity).toEqual(city);
    expect(addCity(config, { ...city, city: "Lincoln alternate" })).toEqual(
      config,
    );
    expect(allCities({ ...config, cities: [city] })).toHaveLength(1);
    expect(cityKey(city)).toBe("40.8000,-96.6670");
  });
});
