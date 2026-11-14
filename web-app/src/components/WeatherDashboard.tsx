import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Droplets,
  Info,
  Leaf,
  Sunrise,
  Wind,
} from "lucide-react";
import type { City, WeatherSettings } from "../lib/config";
import { cityLabel } from "../lib/config";
import type { WeatherResponse, Metric } from "../lib/weather";
import {
  aqiInfo,
  currentHour,
  dayAt,
  formatDate,
  formatTime,
  isDay,
  metricsAt,
  temperature,
  weatherIcon,
  weatherLabel,
} from "../lib/weather";
import { Panel, WeatherImage } from "./ui";

export function WeatherDashboard({
  data,
  city,
  settings,
  now,
  error,
}: {
  data: WeatherResponse;
  city: City;
  settings: WeatherSettings;
  now: number;
  error?: string;
}) {
  const [chosenHour, setChosenHour] = useState<number | null>(null);
  const [variablesExpanded, setVariablesExpanded] = useState(false);
  const [pollutantsExpanded, setPollutantsExpanded] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const f = data.forecast,
    liveHour = currentHour(f, now);
  const hour = Math.min(chosenHour ?? liveHour, f.hourly.time.length - 1);
  const day = dayAt(f, hour),
    time = f.hourly.time[hour]!;
  const values = metricsAt(f, hour, settings);
  const preview = values.slice(0, 6),
    rest = values.slice(6);
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "instant",
      });
  }, [liveHour]);
  const days = f.daily.time;
  const rangeMin = Math.min(
    ...(f.daily.temperature_2m_min ?? []).filter((v): v is number => v != null),
  );
  const rangeMax = Math.max(
    ...(f.daily.temperature_2m_max ?? []).filter((v): v is number => v != null),
  );
  const aqIndex = data.air?.hourly.time.indexOf(time) ?? -1;
  const american = settings.aqiStandard === "american";
  const aqi =
    aqIndex >= 0
      ? data.air?.hourly[american ? "us_aqi" : "european_aqi"]?.[aqIndex]
      : null;
  const aq = aqi != null ? aqiInfo(aqi, american) : null;
  const selectedDayLabel = formatDate(time, f.timezone, {
    weekday: "long",
    year: "numeric",
  });
  const chooseDay = (i: number) => {
    const index = f.hourly.time.findIndex((t) => t! >= days[i]! + 12 * 3600);
    setChosenHour(index < 0 ? f.hourly.time.length - 1 : index);
  };
  return (
    <div
      className={`dashboard ${settings.largeElement ? "large-elements" : ""}`}
    >
      {error ? (
        <div className="forecast-warning" role="status">
          <Info size={17} />
          <span>{error} Showing the last saved forecast.</span>
        </div>
      ) : null}
      <div className="weather-primary">
        <Panel className="current-card">
          <div className="current-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              {chosenHour === null
                ? "CURRENT WEATHER"
                : formatTime(time, f.timezone, settings)}
            </div>
            <p className="current-date">{selectedDayLabel}</p>
            <h2>{weatherLabel(f.hourly.weather_code?.[hour])}</h2>
            <p className="feels">
              Feels{" "}
              {temperature(f.hourly.apparent_temperature?.[hour], settings)}
            </p>
            <div className="hero-temperature">
              {temperature(f.hourly.temperature_2m?.[hour], settings)}
            </div>
            <div className="high-low">
              <span>
                <ArrowUp size={16} />
                {temperature(f.daily.temperature_2m_max?.[day], settings)}
              </span>
              <span>
                <ArrowDown size={16} />
                {temperature(f.daily.temperature_2m_min?.[day], settings)}
              </span>
            </div>
          </div>
          <WeatherImage
            className="hero-weather-image"
            name={weatherIcon(f.hourly.weather_code?.[hour], isDay(f, hour))}
            alt={weatherLabel(f.hourly.weather_code?.[hour])}
          />
          <footer className="current-footer">
            <span>
              Updated {formatTime(data.updatedAt / 1000, f.timezone, settings)}
            </span>
            <span>{cityLabel(city)}</span>
          </footer>
        </Panel>
        <Panel
          title="Hourly overview"
          icon={<Clock3 size={17} />}
          className="hourly-card"
          action={
            <div className="strip-actions">
              {chosenHour !== null ? (
                <button
                  className="text-button"
                  onClick={() => {
                    setChosenHour(null);
                    strip.current
                      ?.querySelector(`[data-hour="${liveHour}"]`)
                      ?.scrollIntoView({
                        block: "nearest",
                        inline: "center",
                        behavior: "smooth",
                      });
                  }}
                >
                  Back to now
                </button>
              ) : null}
              <button
                className="icon-button"
                aria-label="Previous hours"
                onClick={() =>
                  strip.current?.scrollBy({ left: -400, behavior: "smooth" })
                }
              >
                <ChevronLeft size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Next hours"
                onClick={() =>
                  strip.current?.scrollBy({ left: 400, behavior: "smooth" })
                }
              >
                <ChevronRight size={17} />
              </button>
            </div>
          }
        >
          <div className="hourly-strip" ref={strip}>
            {f.hourly.time.map((t, index) => (
              <button
                key={t}
                data-hour={index}
                className={`hour-tile ${index === hour ? "is-selected" : ""}`}
                aria-pressed={index === hour}
                onClick={() => setChosenHour(index)}
              >
                <span className="hour-time">
                  {index === liveHour
                    ? "Now"
                    : formatTime(t!, f.timezone, settings, {
                        minute: undefined,
                      })}
                </span>
                <span className="hour-day">
                  {formatDate(t!, f.timezone, {
                    weekday: "short",
                    month: undefined,
                    day: undefined,
                  })}
                </span>
                <WeatherImage
                  name={weatherIcon(
                    f.hourly.weather_code?.[index],
                    isDay(f, index),
                  )}
                />
                <strong>
                  {temperature(
                    f.hourly.temperature_2m?.[index],
                    settings,
                    false,
                  )}
                </strong>
                {(f.hourly.precipitation_probability?.[index] ?? 0) > 0 ? (
                  <small className="rain-chance">
                    <Droplets size={11} />
                    {f.hourly.precipitation_probability?.[index]}%
                  </small>
                ) : (
                  <small className="rain-chance">&nbsp;</small>
                )}
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="variables-card">
          <button
            className="expand-header"
            aria-expanded={variablesExpanded}
            aria-controls="extra-weather-variables"
            onClick={() => setVariablesExpanded(!variablesExpanded)}
          >
            <h2>
              <Wind size={17} />
              Hourly weather variables
            </h2>
            <ChevronDown
              className={variablesExpanded ? "rotated" : ""}
              size={20}
            />
          </button>
          <div className="metrics-grid preview-metrics">
            {preview.map((m) => (
              <MetricCell key={m.key} metric={m} />
            ))}
          </div>
          {variablesExpanded ? (
            <div
              className="metrics-grid extra-metrics"
              id="extra-weather-variables"
            >
              {rest.map((m) => (
                <MetricCell key={m.key} metric={m} />
              ))}
            </div>
          ) : null}
          {!variablesExpanded ? (
            <button
              className="more-variables"
              onClick={() => setVariablesExpanded(true)}
            >
              Show all {values.length} variables
              <ChevronDown size={14} />
            </button>
          ) : null}
        </Panel>
      </div>
      <aside className="weather-secondary">
        <Panel
          title={`${days.length}-day forecast`}
          icon={<CalendarDays size={17} />}
          className="daily-card"
        >
          <div className="daily-list">
            {days.map((t, i) => {
              const min = f.daily.temperature_2m_min?.[i],
                max = f.daily.temperature_2m_max?.[i];
              const denominator = Math.max(1, rangeMax - rangeMin);
              return (
                <button
                  key={t}
                  className={`daily-row ${day === i ? "is-selected" : ""}`}
                  onClick={() => chooseDay(i)}
                  aria-label={`View ${formatDate(t, f.timezone, { weekday: "long" })}`}
                >
                  <span className="daily-date">
                    <strong>
                      {i === dayAt(f, liveHour)
                        ? "Today"
                        : formatDate(t, f.timezone, {
                            weekday: "short",
                            month: undefined,
                            day: undefined,
                          })}
                    </strong>
                    <small>{formatDate(t, f.timezone)}</small>
                  </span>
                  <WeatherImage name={weatherIcon(f.daily.weather_code?.[i])} />
                  <strong className="daily-high">
                    {temperature(max, settings, false)}
                  </strong>
                  <span className="temperature-track">
                    <span
                      style={{
                        left: `${((rangeMax - (max ?? rangeMax)) / denominator) * 100}%`,
                        width: `${Math.max(8, (((max ?? rangeMax) - (min ?? rangeMin)) / denominator) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="daily-low">
                    {temperature(min, settings, false)}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel
          className="sun-card"
          title="A little daylight"
          icon={<Sunrise size={17} />}
        >
          <div className="sun-times">
            <div>
              <WeatherImage name="sunrise" />
              <span>Sunrise</span>
              <strong>
                {formatTime(
                  f.daily.sunrise?.[day] ?? days[day]!,
                  f.timezone,
                  settings,
                )}
              </strong>
            </div>
            <span className="sun-divider" />
            <div>
              <WeatherImage name="sunset" />
              <span>Sunset</span>
              <strong>
                {formatTime(
                  f.daily.sunset?.[day] ?? days[day]!,
                  f.timezone,
                  settings,
                )}
              </strong>
            </div>
          </div>
        </Panel>
        <Panel
          title="Air quality"
          icon={<Leaf size={17} />}
          className="air-quality-card"
        >
          {aq && aqi != null ? (
            <>
              <div className="aq-head">
                <div>
                  <span>{american ? "US AQI" : "European AQI"}</span>
                  <strong>{Math.round(aqi)}</strong>
                </div>
                <span
                  className="aq-badge"
                  style={{ color: aq.color, backgroundColor: `${aq.color}18` }}
                >
                  {aq.label}
                </span>
              </div>
              <div className="aq-scale">
                <div
                  className="aq-indicator"
                  style={{
                    left: `${Math.min(98, (aqi / (american ? 300 : 100)) * 100)}%`,
                  }}
                />
              </div>
              <div className="scale-labels">
                <span>0</span>
                <span>{american ? "300" : "100"}</span>
              </div>
              <p className="aq-advice">{aq.advice}</p>
              <button
                className="expand-header pollutant-header"
                aria-expanded={pollutantsExpanded}
                onClick={() => setPollutantsExpanded(!pollutantsExpanded)}
              >
                <span>Pollutants</span>
                <ChevronDown
                  size={17}
                  className={pollutantsExpanded ? "rotated" : ""}
                />
              </button>
              {pollutantsExpanded ? (
                <div className="pollutant-list">
                  {[
                    ["pm2_5", "PM 2.5"],
                    ["pm10", "PM 10"],
                    ["ozone", "Ozone"],
                    ["nitrogen_dioxide", "Nitrogen dioxide"],
                    ["sulphur_dioxide", "Sulphur dioxide"],
                    ["carbon_monoxide", "Carbon monoxide"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <strong>
                        {data.air?.hourly[key!]?.[aqIndex]?.toFixed(1) ?? "—"}{" "}
                        <small>µg/m³</small>
                      </strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted unavailable-air">
              Air quality isn’t available for this hour.
            </p>
          )}
        </Panel>
      </aside>
    </div>
  );
}
function MetricCell({ metric }: { metric: Metric }) {
  return (
    <div className="metric-cell" title={metric.help}>
      <WeatherImage name={metric.icon} />
      <strong>{metric.value}</strong>
      <span>{metric.label}</span>
    </div>
  );
}
