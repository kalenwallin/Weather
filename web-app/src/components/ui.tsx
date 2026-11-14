import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function WeatherImage({
  name,
  className = "",
  alt = "",
}: {
  name: string;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      className={`weather-image ${className}`}
      src={`/weather-icons/${name}.png`}
      alt={alt}
      draggable={false}
    />
  );
}
export function Panel({
  title,
  icon,
  action,
  className = "",
  children,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {title ? (
        <header className="panel-heading">
          <h2>
            {icon}
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input:not([type=file])")?.focus();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function LoadingForecast() {
  return (
    <div
      className="forecast-skeleton"
      aria-label="Loading forecast"
      role="status"
    >
      <div className="skeleton hero-skeleton" />
      <div className="skeleton strip-skeleton" />
      <div className="skeleton metrics-skeleton" />
    </div>
  );
}
