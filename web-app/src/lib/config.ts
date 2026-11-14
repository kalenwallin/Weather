import { z } from "zod";

export const CONFIG_STORAGE_KEY = "weather.configuration.v1";
export const citySchema = z.object({
  city: z.string().trim().min(1).max(160),
  district: z.string().max(160).default(""),
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
});
const settingValue = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export const configurationSchema = z.object({
  version: z.literal(1),
  mainCity: citySchema.nullable(),
  cities: z.array(citySchema).max(100),
  settings: z
    .record(z.string().max(80), settingValue)
    .refine((s) => Object.keys(s).length <= 100),
  exportedAt: z.string().max(80).optional(),
});
export type City = z.infer<typeof citySchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type WeatherSettings = Configuration["settings"];

export const defaultSettings: WeatherSettings = {
  theme: "dark",
  colorPalette: "purple",
  amoledTheme: false,
  roundDegree: true,
  largeElement: false,
  measurements: "imperial",
  degrees: "fahrenheit",
  wind: "mph",
  pressure: "mmHg",
  timeformat: "12",
  appFont: "ubuntu",
  weatherIconTheme: "classic",
  aqiStandard: "american",
  language: "en",
};
export const emptyConfiguration: Configuration = {
  version: 1,
  mainCity: null,
  cities: [],
  settings: defaultSettings,
};
export function cityKey(city: City) {
  return `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
}
export function cityLabel(city: City) {
  return city.district && city.district !== city.city
    ? `${city.city}, ${city.district}`
    : city.city;
}
export function allCities(config: Configuration) {
  const unique = new Map<string, City>();
  for (const city of [config.mainCity, ...config.cities])
    if (city && !unique.has(cityKey(city))) unique.set(cityKey(city), city);
  return [...unique.values()];
}
export function parseConfiguration(input: unknown): Configuration {
  const parsed = configurationSchema.parse(input);
  return { ...parsed, settings: { ...defaultSettings, ...parsed.settings } };
}
export function saveConfiguration(config: Configuration) {
  const validated = parseConfiguration(config);
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(validated));
}
export function loadConfiguration(): Configuration {
  const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
  return raw ? parseConfiguration(JSON.parse(raw)) : emptyConfiguration;
}
export function addCity(config: Configuration, city: City): Configuration {
  if (!config.mainCity) return { ...config, mainCity: city };
  if (allCities(config).some((c) => cityKey(c) === cityKey(city)))
    return config;
  return { ...config, cities: [...config.cities, city] };
}
