import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import "@fontsource/ubuntu/400.css";
import "@fontsource/ubuntu/500.css";
import "@fontsource/ubuntu/700.css";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Weather — A little clarity for your day" },
      {
        name: "description",
        content:
          "Your weather, your cities, your settings. A calm desktop companion to Weather.",
      },
      { name: "theme-color", content: "#141218" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/icon.png" },
    ],
  }),
  shellComponent: RootDocument,
  errorComponent: ({ reset }) => (
    <main className="fatal-error">
      <img src="/weather-icons/cloud.png" alt="" />
      <h1>A cloud passed over.</h1>
      <p>Something went wrong loading Weather.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  ),
  notFoundComponent: () => (
    <main className="fatal-error">
      <h1>This forecast wandered off.</h1>
      <a className="button primary" href="/">
        Back to Weather
      </a>
    </main>
  ),
});
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const s=JSON.parse(localStorage.getItem('weather.configuration.v1')||'{}').settings||{};document.documentElement.dataset.theme=s.theme==='light'||(s.theme==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches)?'light':'dark';}catch{}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
