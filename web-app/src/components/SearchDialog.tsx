import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { Modal } from "./ui";
import { citySchema } from "../lib/config";
import type { City } from "../lib/config";
interface Result {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}
export function SearchDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (city: City) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/cities?q=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          const data = (await response.json()) as {
            results?: Result[];
            error?: string;
          };
          if (!response.ok)
            throw new Error(data.error ?? "City search is unavailable.");
          if (!controller.signal.aborted) {
            setResults(data.results ?? []);
            setError("");
          }
        } catch (e) {
          if (!controller.signal.aborted)
            setError(e instanceof Error ? e.message : "City search failed.");
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <Modal
      title="Find your city"
      subtitle="A familiar place, or somewhere you’re headed."
      onClose={onClose}
      className="search-modal"
    >
      {manual ? (
        <form
          className="manual-city-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const parsed = citySchema.safeParse({
              city: data.get("city"),
              district: data.get("district"),
              lat: Number(data.get("lat")),
              lon: Number(data.get("lon")),
            });
            if (!parsed.success) {
              setError("Enter a city name and valid latitude and longitude.");
              return;
            }
            onSelect(parsed.data);
          }}
        >
          <label>
            City
            <input required name="city" maxLength={160} />
          </label>
          <label>
            State or region
            <input name="district" maxLength={160} />
          </label>
          <div className="field-pair">
            <label>
              Latitude
              <input
                required
                name="lat"
                type="number"
                step="any"
                min="-90"
                max="90"
              />
            </label>
            <label>
              Longitude
              <input
                required
                name="lon"
                type="number"
                step="any"
                min="-180"
                max="180"
              />
            </label>
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button primary" type="submit">
            Add city
            <ArrowRight size={17} />
          </button>
        </form>
      ) : (
        <>
          <div className="search-input-wrap">
            <Search size={20} />
            <input
              autoFocus
              aria-label="Search for a city"
              placeholder="Search cities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {loading ? <span className="small-spinner" /> : null}
          </div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="search-results" aria-live="polite">
            {results.map((city) => (
              <button
                key={city.id}
                className="search-result"
                onClick={() =>
                  onSelect({
                    city: city.name,
                    district: city.admin1 ?? city.country ?? "",
                    lat: city.latitude,
                    lon: city.longitude,
                  })
                }
              >
                <span className="place-icon">
                  <MapPin size={19} />
                </span>
                <span>
                  <strong>{city.name}</strong>
                  <small>
                    {[city.admin1, city.country].filter(Boolean).join(", ")}
                  </small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
            {!loading &&
            !error &&
            query.trim().length >= 2 &&
            results.length === 0 ? (
              <p className="empty-search">
                No cities found. Try another name or add coordinates.
              </p>
            ) : null}
            {query.trim().length < 2 ? (
              <p className="empty-search">
                Search by city name to see your forecast.
              </p>
            ) : null}
          </div>
        </>
      )}
      <footer className="modal-footer">
        <button
          className="text-button"
          onClick={() => {
            setManual(!manual);
            setError("");
          }}
        >
          {manual ? "Back to city search" : "Add a location by coordinates"}
        </button>
        <span>Open-Meteo geocoding</span>
      </footer>
    </Modal>
  );
}
