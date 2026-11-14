import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  MonitorSmartphone,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import type { Configuration, WeatherSettings } from "../lib/config";
import { parseConfiguration } from "../lib/config";
import { Panel } from "./ui";
export function SettingsView({
  configuration,
  onChange,
  onSync,
}: {
  configuration: Configuration;
  onChange: (config: Configuration) => void;
  onSync: () => void;
}) {
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const update = (key: string, value: WeatherSettings[string]) => {
    onChange({
      ...configuration,
      settings: { ...configuration.settings, [key]: value },
    });
  };
  const s = configuration.settings;
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(configuration, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "weather-configuration.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="settings-view">
      <div className="settings-intro">
        <h2>Make yourself at home.</h2>
        <p>
          The forecast looks better your way. Changes are saved in this browser.
        </p>
      </div>
      <div className="settings-columns">
        <div>
          <Panel
            title="Appearance"
            icon={<Palette size={18} />}
            className="settings-panel"
          >
            <SettingSelect
              label="Theme"
              value={String(s.theme ?? "system")}
              options={[
                ["dark", "Dark"],
                ["light", "Light"],
                ["system", "Match device"],
              ]}
              onChange={(v) => update("theme", v)}
            />
            <div className="setting-row palette-row">
              <label>Color palette</label>
              <div className="palette-options">
                {[
                  ["purple", "#c9b7ef"],
                  ["blue", "#abc8f5"],
                  ["green", "#a9d4b6"],
                  ["pink", "#efb4d3"],
                  ["orange", "#efc09a"],
                  ["red", "#eeb5b2"],
                ].map(([key, color]) => (
                  <button
                    key={key}
                    aria-label={`${key} palette`}
                    aria-pressed={s.colorPalette === key}
                    className="palette-swatch"
                    style={{ background: color }}
                    onClick={() => update("colorPalette", key!)}
                  >
                    {s.colorPalette === key ? <Check size={16} /> : null}
                  </button>
                ))}
              </div>
            </div>
            <SettingToggle
              label="Pure black background"
              description="A quieter look for OLED displays."
              checked={s.amoledTheme === true}
              onChange={(v) => update("amoledTheme", v)}
            />
            <SettingToggle
              label="Larger weather display"
              description="A little more room for the current forecast."
              checked={s.largeElement === true}
              onChange={(v) => update("largeElement", v)}
            />
            <div className="setting-row">
              <span>Weather icons</span>
              <span className="setting-value">
                Classic · same as your phone
              </span>
            </div>
          </Panel>
          <Panel
            title="Weather & units"
            icon={<SlidersHorizontal size={18} />}
            className="settings-panel"
          >
            <SettingToggle
              label="Round degrees"
              description="Show whole numbers for temperatures."
              checked={s.roundDegree === true}
              onChange={(v) => update("roundDegree", v)}
            />
            <SettingSelect
              label="Degrees"
              value={String(s.degrees)}
              options={[
                ["fahrenheit", "Fahrenheit · °F"],
                ["celsius", "Celsius · °C"],
              ]}
              onChange={(v) => update("degrees", v)}
            />
            <SettingSelect
              label="System of measures"
              value={String(s.measurements)}
              options={[
                ["imperial", "Imperial"],
                ["metric", "Metric"],
              ]}
              onChange={(v) => update("measurements", v)}
            />
            <SettingSelect
              label="Wind"
              value={String(s.wind)}
              options={[
                ["mph", "Miles per hour"],
                ["kph", "Kilometers per hour"],
                ["m/s", "Meters per second"],
              ]}
              onChange={(v) => update("wind", v)}
            />
            <SettingSelect
              label="Pressure"
              value={String(s.pressure)}
              options={[
                ["mmHg", "mmHg"],
                ["hPa", "hPa"],
              ]}
              onChange={(v) => update("pressure", v)}
            />
            <SettingSelect
              label="AQI standard"
              value={String(s.aqiStandard)}
              options={[
                ["american", "American"],
                ["european", "European"],
              ]}
              onChange={(v) => update("aqiStandard", v)}
            />
            <SettingSelect
              label="Time format"
              value={String(s.timeformat)}
              options={[
                ["12", "12-hour"],
                ["24", "24-hour"],
              ]}
              onChange={(v) => update("timeformat", v)}
            />
          </Panel>
        </div>
        <div>
          <Panel
            title="Connected to your Weather"
            icon={<MonitorSmartphone size={18} />}
            className="settings-panel sync-settings"
          >
            <div className="connection-orb">
              <MonitorSmartphone size={30} />
            </div>
            <h3>Your phone. Your cities. Your settings.</h3>
            <p>
              Bring your mobile configuration into this browser with a short
              pairing code. You can sync again whenever you make changes on your
              phone.
            </p>
            <button className="button primary" onClick={onSync}>
              <MonitorSmartphone size={17} />
              Sync from phone
            </button>
            <div className="local-note">
              <Check size={16} />
              <span>Saved locally in this browser. No login required.</span>
            </div>
          </Panel>
          <Panel
            title="Configuration backup"
            className="settings-panel backup-panel"
          >
            <p>
              Keep a copy of all your cities and settings, or move them to
              another browser.
            </p>
            <div className="backup-actions">
              <button className="button secondary" onClick={download}>
                <ArrowDownToLine size={16} />
                Export
              </button>
              <button
                className="button secondary"
                onClick={() => file.current?.click()}
              >
                <ArrowUpFromLine size={16} />
                Import
              </button>
            </div>
            <input
              ref={file}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              aria-label="Import Weather configuration"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (!selected) return;
                if (selected.size > 48_000) {
                  setError(
                    "Choose a Weather configuration file smaller than 48 KB.",
                  );
                  return;
                }
                void selected
                  .text()
                  .then((text) => {
                    onChange(parseConfiguration(JSON.parse(text)));
                    setError("");
                  })
                  .catch(() =>
                    setError(
                      "This file is not a supported Weather configuration.",
                    ),
                  );
                event.target.value = "";
              }}
            />
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
          </Panel>
          <p className="settings-footnote">
            Mobile-only preferences, including widgets and notifications, are
            preserved in your configuration. Browser changes don’t change your
            phone.
          </p>
        </div>
      </div>
    </div>
  );
}
function SettingSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (v: string) => void;
}) {
  const id = `setting-${label.replaceAll(" ", "-").toLowerCase()}`;
  return (
    <div className="setting-row">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {!options.some(([v]) => v === value) ? (
          <option value={value}>{value}</option>
        ) : null}
        {options.map(([v, name]) => (
          <option value={v} key={v}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <span>{label}</span>
        <small>{description}</small>
      </div>
      <button
        role="switch"
        aria-label={label}
        aria-checked={checked}
        className={`toggle ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
