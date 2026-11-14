import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CloudSun,
  CloudSunRain,
  Home,
  LayoutGrid,
  MapPin,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  addCity,
  allCities,
  cityKey,
  cityLabel,
  CONFIG_STORAGE_KEY,
  emptyConfiguration,
  loadConfiguration,
  parseConfiguration,
  saveConfiguration,
} from "../lib/config";
import type { City, Configuration, WeatherSettings } from "../lib/config";
import { useWeather } from "../lib/use-weather";
import {
  currentHour,
  formatDate,
  formatTime,
  isDay,
  temperature,
  weatherIcon,
  weatherLabel,
} from "../lib/weather";
import { WeatherDashboard } from "./WeatherDashboard";
import { SettingsView } from "./SettingsView";
import { SearchDialog } from "./SearchDialog";
import { SyncDialog } from "./SyncDialog";
import { LoadingForecast, WeatherImage } from "./ui";

type Page = "weather" | "cities" | "settings";
const palettes: Record<string, string> = {
  purple: "#ccbbef",
  blue: "#abc8f5",
  green: "#a9d4b6",
  pink: "#efb4d3",
  orange: "#efc09a",
  red: "#eeb5b2",
};

export function WeatherApp() {
  const [configuration, setConfiguration] =
    useState<Configuration>(emptyConfiguration);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>("weather");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState("");
  const cities = allCities(configuration);
  const city =
    cities.find((c) => cityKey(c) === selectedKey) ?? configuration.mainCity;
  const weather = useWeather(city, refresh);
  const settings = configuration.settings;
  const commit = useCallback((config: Configuration) => {
    const validated = parseConfiguration(config);
    try {
      saveConfiguration(validated);
    } catch {
      throw new Error(
        "Browser storage is unavailable. Allow site storage, then try again.",
      );
    }
    setConfiguration(validated);
    setSelectedKey((old) =>
      allCities(validated).some((c) => cityKey(c) === old)
        ? old
        : validated.mainCity
          ? cityKey(validated.mainCity)
          : null,
    );
  }, []);
  const receive = useCallback(
    (config: Configuration) => {
      commit(config);
      setSelectedKey(config.mainCity ? cityKey(config.mainCity) : null);
      setPage("weather");
      setNotice("Your cities and settings are ready.");
    },
    [commit],
  );
  useEffect(() => {
    try {
      const saved = loadConfiguration();
      setConfiguration(saved);
      setSelectedKey(saved.mainCity ? cityKey(saved.mainCity) : null);
    } catch {
      setNotice(
        "Your saved configuration could not be read. Sync from your phone or import a backup to restore it.",
      );
    }
    setReady(true);
    const storage = (event: StorageEvent) => {
      if (event.key === CONFIG_STORAGE_KEY) {
        try {
          const saved = loadConfiguration();
          setConfiguration(saved);
          setSelectedKey(saved.mainCity ? cityKey(saved.mainCity) : null);
        } catch {
          setNotice("Another tab saved an unreadable configuration.");
        }
      }
    };
    window.addEventListener("storage", storage);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.removeEventListener("storage", storage);
      clearInterval(timer);
    };
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme !== "light" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.dataset.amoled = String(
        settings.amoledTheme === true && dark,
      );
      document.documentElement.style.setProperty(
        "--accent",
        palettes[String(settings.colorPalette)] ?? palettes.purple!,
      );
      document.documentElement.style.setProperty(
        "--app-font",
        settings.appFont === "ubuntu" ? "Ubuntu" : "system-ui",
      );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [
    ready,
    settings.theme,
    settings.amoledTheme,
    settings.colorPalette,
    settings.appFont,
  ]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" &&
          !(event.target instanceof HTMLInputElement) &&
          !(event.target instanceof HTMLTextAreaElement))
      ) {
        event.preventDefault();
        setSearchOpen(true);
        setSyncOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  const select = (target: City) => {
    setSelectedKey(cityKey(target));
    setRefresh(0);
    setPage("weather");
  };
  const add = (target: City) => {
    try {
      commit(addCity(configuration, target));
      select(target);
      setSearchOpen(false);
      setNotice(`${target.city} is ready.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save the city.");
    }
  };
  const change = (config: Configuration) => {
    try {
      commit(config);
      setNotice("Configuration saved in this browser.");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not save configuration.",
      );
    }
  };
  const sync = () => {
    setSearchOpen(false);
    setSyncOpen(true);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to weather
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Weather home">
          <img src="/icon.png" alt="" />
          <span>Weather</span>
        </a>
        <nav className="main-navigation" aria-label="Main navigation">
          <button
            aria-label="Weather"
            aria-current={page === "weather" ? "page" : undefined}
            className={page === "weather" ? "is-active" : ""}
            onClick={() => setPage("weather")}
          >
            <MainCityIcon city={configuration.mainCity} now={now} />
            <span>Weather</span>
          </button>
          <button
            aria-label="Cities"
            aria-current={page === "cities" ? "page" : undefined}
            className={page === "cities" ? "is-active" : ""}
            onClick={() => setPage("cities")}
          >
            <LayoutGrid size={20} />
            <span>Cities</span>
            {cities.length ? <small>{cities.length}</small> : null}
          </button>
          <button
            aria-label="Settings"
            aria-current={page === "settings" ? "page" : undefined}
            className={page === "settings" ? "is-active" : ""}
            onClick={() => setPage("settings")}
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-cities-heading">
          <span>YOUR CITIES</span>
          <button
            className="icon-button"
            aria-label="Add a city"
            onClick={() => setSearchOpen(true)}
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="sidebar-city-list">
          {cities.length ? (
            cities.map((place) => (
              <SidebarCity
                key={cityKey(place)}
                place={place}
                isMain={
                  !!configuration.mainCity &&
                  cityKey(place) === cityKey(configuration.mainCity)
                }
                selected={
                  !!city &&
                  cityKey(city) === cityKey(place) &&
                  page === "weather"
                }
                settings={settings}
                now={now}
                onSelect={() => select(place)}
              />
            ))
          ) : (
            <p className="sidebar-empty">
              Your favorite places will feel right at home here.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="local-storage-note">
            <span className="status-dot" />
            Saved in this browser
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-place">
            <span className="eyebrow">
              {page === "weather"
                ? "YOUR DAILY OUTLOOK"
                : "YOUR WEATHER, YOUR WAY"}
            </span>
            <h1>
              {page === "weather"
                ? (city?.city ?? "Welcome to Weather")
                : page === "cities"
                  ? "Your Cities"
                  : "Settings"}
              {page === "weather" && city?.district ? (
                <span>{city.district}</span>
              ) : null}
            </h1>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              aria-label="Find a city"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} />
              <span>Find a city</span>
              <kbd>⌘ K</kbd>
            </button>
            {city && page === "weather" ? (
              <button
                className="icon-button refresh-button"
                aria-label="Refresh weather"
                disabled={weather.loading}
                onClick={() => setRefresh((r) => r + 1)}
              >
                <RefreshCw
                  size={19}
                  className={weather.loading ? "spinning" : ""}
                />
              </button>
            ) : null}
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {!ready ? (
            <LoadingForecast />
          ) : page === "settings" ? (
            <SettingsView
              configuration={configuration}
              onChange={change}
              onSync={sync}
            />
          ) : page === "cities" ? (
            <CitiesView
              configuration={configuration}
              onChange={change}
              onSelect={select}
              onAdd={() => setSearchOpen(true)}
            />
          ) : !city ? (
            <div className="welcome-state">
              <div className="welcome-weather">
                <WeatherImage name="cloud" />
                <span className="welcome-dot one" />
                <span className="welcome-dot two" />
              </div>
              <span className="eyebrow">
                A FAMILIAR FORECAST. A LITTLE MORE ROOM.
              </span>
              <h2>Your Weather starts here.</h2>
              <p>
                All the little details that make up your day.
                <br />
                Bring your cities from your phone, or find your first city.
              </p>
              <div className="welcome-actions">
                <button className="button primary" onClick={sync}>
                  <MonitorSmartphone size={18} />
                  Sync from phone
                </button>
                <button
                  className="button secondary"
                  onClick={() => setSearchOpen(true)}
                >
                  <Plus size={18} />
                  Find a city
                </button>
              </div>
              <p className="welcome-footnote">
                <Check size={14} />
                No account needed. Your configuration stays in this browser.
              </p>
            </div>
          ) : weather.data ? (
            <>
              <div className="outlook-caption">
                <span>
                  {formatDate(now / 1000, weather.data.forecast.timezone, {
                    weekday: "long",
                    year: "numeric",
                  })}
                </span>
                <span>
                  <span className="status-dot" />
                  {formatTime(
                    now / 1000,
                    weather.data.forecast.timezone,
                    settings,
                  )}{" "}
                  local time
                </span>
              </div>
              <WeatherDashboard
                key={cityKey(city)}
                data={weather.data}
                settings={settings}
                now={now}
                error={weather.error}
              />
            </>
          ) : weather.loading ? (
            <LoadingForecast />
          ) : (
            <div className="forecast-error" role="alert">
              <WeatherImage name="cloud" />
              <h2>A little cloudy on our end.</h2>
              <p>{weather.error ?? "Could not load this forecast."}</p>
              <button
                className="button primary"
                onClick={() => setRefresh((r) => r + 1)}
              >
                <RefreshCw size={17} />
                Try again
              </button>
              <button
                className="text-button"
                onClick={() => setSearchOpen(true)}
              >
                Choose another city
              </button>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>Weather, wherever your day takes you.</span>
          <span>
            Forecasts & air quality by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>
          </span>
        </footer>
      </div>
      {searchOpen ? (
        <SearchDialog onClose={() => setSearchOpen(false)} onSelect={add} />
      ) : null}
      {syncOpen ? (
        <SyncDialog onClose={() => setSyncOpen(false)} onReceive={receive} />
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CitiesView({
  configuration,
  onChange,
  onSelect,
  onAdd,
}: {
  configuration: Configuration;
  onChange: (config: Configuration) => void;
  onSelect: (city: City) => void;
  onAdd: () => void;
}) {
  const [limit, setLimit] = useState(12);
  const cities = allCities(configuration);
  const makeMain = (city: City) => {
    const previous = configuration.mainCity;
    onChange({
      ...configuration,
      mainCity: city,
      cities: [previous, ...configuration.cities]
        .filter((c): c is City => Boolean(c) && cityKey(c!) !== cityKey(city))
        .filter(
          (c, i, all) =>
            all.findIndex((other) => cityKey(other) === cityKey(c)) === i,
        ),
    });
  };
  const remove = (city: City) => {
    const remaining = cities.filter((c) => cityKey(c) !== cityKey(city));
    const mainCity =
      configuration.mainCity &&
      cityKey(configuration.mainCity) !== cityKey(city)
        ? configuration.mainCity
        : (remaining[0] ?? null);
    onChange({
      ...configuration,
      mainCity,
      cities: remaining.filter(
        (c) => !mainCity || cityKey(c) !== cityKey(mainCity),
      ),
    });
  };
  return (
    <div className="cities-view">
      <div className="view-intro">
        <div>
          <h2>A forecast for every favorite place.</h2>
          <p>Your main city and the places you keep an eye on.</p>
        </div>
        <button className="button primary" onClick={onAdd}>
          <Plus size={17} />
          Add city
        </button>
      </div>
      <div className="cities-grid">
        {cities.slice(0, limit).map((city) => (
          <CityCard
            key={cityKey(city)}
            city={city}
            main={Boolean(
              configuration.mainCity &&
              cityKey(configuration.mainCity) === cityKey(city),
            )}
            settings={configuration.settings}
            onSelect={() => onSelect(city)}
            onMakeMain={() => makeMain(city)}
            onRemove={() => remove(city)}
          />
        ))}
        <button className="add-city-card" onClick={onAdd}>
          <span>
            <Plus size={27} />
          </span>
          <strong>Somewhere new?</strong>
          <small>Add another city</small>
        </button>
      </div>
      {cities.length > limit ? (
        <button
          className="button secondary"
          onClick={() => setLimit((n) => n + 12)}
        >
          Show more places
        </button>
      ) : null}
    </div>
  );
}
function CityCard({
  city,
  main,
  settings,
  onSelect,
  onMakeMain,
  onRemove,
}: {
  city: City;
  main: boolean;
  settings: WeatherSettings;
  onSelect: () => void;
  onMakeMain: () => void;
  onRemove: () => void;
}) {
  const weather = useWeather(city);
  const f = weather.data?.forecast,
    hour = f ? currentHour(f) : 0;
  return (
    <article className="panel city-card">
      <header>
        <span className={`city-badge ${main ? "is-main" : ""}`}>
          {main ? <Home size={12} /> : <MapPin size={12} />}
          {main ? "Main city" : "Saved city"}
        </span>
        <button
          className="icon-button"
          aria-label={`Remove ${city.city}`}
          onClick={onRemove}
        >
          <Trash2 size={16} />
        </button>
      </header>
      <button className="city-forecast-link" onClick={onSelect}>
        <div>
          <h3>{city.city}</h3>
          <p>{city.district}</p>
        </div>
        {f ? (
          <>
            <div className="city-card-weather">
              <strong>
                {temperature(f.hourly.temperature_2m?.[hour], settings)}
              </strong>
              <WeatherImage
                name={weatherIcon(
                  f.hourly.weather_code?.[hour],
                  isDay(f, hour),
                )}
              />
            </div>
            <span className="city-card-condition">
              {weatherLabel(f.hourly.weather_code?.[hour])}
            </span>
          </>
        ) : (
          <div className="city-card-loading">
            {weather.loading ? (
              <span className="small-spinner" />
            ) : (
              <CloudSunRain size={35} />
            )}
            <span>
              {weather.loading ? "Loading forecast…" : "Forecast unavailable"}
            </span>
          </div>
        )}
      </button>
      <footer>
        {main ? (
          <span>
            <Check size={14} />
            Your daily starting point
          </span>
        ) : (
          <button className="text-button" onClick={onMakeMain}>
            <Star size={14} />
            Make main city
          </button>
        )}
        <button
          className="icon-button"
          aria-label={`View ${cityLabel(city)} weather`}
          onClick={onSelect}
        >
          <ArrowRight size={17} />
        </button>
      </footer>
    </article>
  );
}

/** Sidebar nav icon showing the main city's current weather. */
function MainCityIcon({ city, now }: { city: City | null; now: number }) {
  const { data } = useWeather(city);
  if (!data) return <CloudSun size={21} />;
  const f = data.forecast,
    hour = currentHour(f, now);
  return (
    <WeatherImage
      className="nav-weather-image"
      name={weatherIcon(f.hourly.weather_code?.[hour], isDay(f, hour))}
      alt=""
    />
  );
}

/** One saved city in the sidebar, with its current temperature. */
function SidebarCity({
  place,
  isMain,
  selected,
  settings,
  now,
  onSelect,
}: {
  place: City;
  isMain: boolean;
  selected: boolean;
  settings: WeatherSettings;
  now: number;
  onSelect: () => void;
}) {
  const { data } = useWeather(place);
  return (
    <button
      className={`sidebar-city ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
    >
      {isMain ? <Home size={17} /> : <MapPin size={17} />}
      <span>
        <strong>{place.city}</strong>
        <small>{place.district || "Saved location"}</small>
      </span>
      {data ? (
        <span className="sidebar-temperature">
          {temperature(
            data.forecast.hourly.temperature_2m?.[
              currentHour(data.forecast, now)
            ],
            settings,
            false,
          )}
        </span>
      ) : null}
    </button>
  );
}
