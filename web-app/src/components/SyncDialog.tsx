import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Monitor,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { Modal } from "./ui";
import { allCities, parseConfiguration } from "../lib/config";
import type { Configuration } from "../lib/config";
interface Pairing {
  code: string;
  readerToken: string;
  expiresAt: number;
}
export function SyncDialog({
  onClose,
  onReceive,
}: {
  onClose: () => void;
  onReceive: (config: Configuration) => void;
}) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [error, setError] = useState("");
  const [received, setReceived] = useState<Configuration | null>(null);
  const [generation, setGeneration] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let current: Pairing | undefined,
      timer: ReturnType<typeof setTimeout> | undefined;
    const clear = (session: Pairing) =>
      fetch(`/api/sync/${session.code}`, {
        method: "DELETE",
        headers: { "X-Sync-Token": session.readerToken },
        keepalive: true,
      }).catch(() => undefined);
    setError("");
    setPairing(null);
    setReceived(null);
    const poll = async () => {
      if (!current || controller.signal.aborted) return;
      try {
        const response = await fetch(`/api/sync/${current.code}`, {
          headers: { "X-Sync-Token": current.readerToken },
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          status: string;
          configuration?: unknown;
        };
        if (controller.signal.aborted) return;
        if (body.status === "received") {
          const configuration = parseConfiguration(body.configuration);
          onReceive(configuration);
          setReceived(configuration);
          await clear(current);
          return;
        }
        if (body.status === "expired") {
          setError("This code has expired. Create a new code to try again.");
          return;
        }
        if (!response.ok)
          throw new Error("This transfer is unavailable. Create a new code.");
        timer = setTimeout(() => {
          void poll();
        }, 2000);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Could not receive the configuration. Try again.",
          );
      }
    };
    void (async () => {
      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Could not create a pairing code. Please try again.");
        current = (await response.json()) as Pairing;
        if (controller.signal.aborted) {
          await clear(current);
          return;
        }
        setPairing(current);
        void poll();
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not create a pairing code.",
          );
      }
    })();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (current) void clear(current);
    };
  }, [generation, onReceive]);
  const seconds = pairing
    ? Math.max(0, Math.ceil((pairing.expiresAt - now) / 1000))
    : 0;
  return (
    <Modal
      title={
        received
          ? "All your Weather, right here."
          : "Bring your Weather with you"
      }
      subtitle={
        received
          ? "Your phone’s configuration is now saved in this browser."
          : "Copy your cities and settings from your phone. No account needed."
      }
      onClose={onClose}
      className="sync-modal"
    >
      <div className={`device-illustration ${received ? "is-complete" : ""}`}>
        <Smartphone size={44} />
        <span>{received ? <Check size={24} /> : <ArrowRight size={24} />}</span>
        <Monitor size={48} />
      </div>
      {received ? (
        <div className="sync-success">
          <h3>Ready for your day.</h3>
          <p>
            {allCities(received).length}{" "}
            {allCities(received).length === 1 ? "city" : "cities"} and your
            settings have been received.
          </p>
          <p className="muted">They’ll be here when you reopen this browser.</p>
          <button className="button primary" onClick={onClose}>
            View weather
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <div
            className="pairing-code"
            aria-label="Pairing code"
            aria-live="polite"
          >
            {pairing ? (
              <>
                <span>{pairing.code.slice(0, 4)}</span>
                <i>—</i>
                <span>{pairing.code.slice(4)}</span>
              </>
            ) : (
              <span className="code-loading">Creating your code…</span>
            )}
          </div>
          {pairing ? (
            <div className="code-tools">
              <span>
                {seconds > 0
                  ? `Code expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                  : "Code expired"}
              </span>
              <button
                className="text-button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(pairing.code)
                    .then(() => setCopied(true))
                    .catch(() => setError("Select and copy the code above."));
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
          ) : null}
          <ol className="sync-steps">
            <li>
              <span>1</span>
              <div>
                Open <strong>Weather</strong> on your phone.
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                Go to <strong>Settings → Sync to desktop</strong>.
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                Enter this code and tap <strong>Send configuration</strong>.
              </div>
            </li>
          </ol>
          {error ? (
            <div className="inline-error" role="alert">
              <p>{error}</p>
              <button
                className="text-button"
                onClick={() => {
                  setCopied(false);
                  setGeneration((n) => n + 1);
                }}
              >
                <RefreshCw size={15} />
                Create a new code
              </button>
            </div>
          ) : (
            <p className="waiting-label">
              <span className="status-pulse" />
              Waiting for your phone
            </p>
          )}
          <p className="sync-note">
            Your main city, saved cities, and settings are copied to this
            browser. The temporary transfer is deleted after receipt.
          </p>
        </>
      )}
    </Modal>
  );
}
