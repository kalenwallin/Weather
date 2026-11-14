import handler from "@tanstack/react-start/server-entry";
import { handleApi } from "./server/api";
export { WeatherPairing } from "./server/pairing";
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return handleApi(request, env, ctx);
    const response = await handler.fetch(request);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  },
} satisfies ExportedHandler<Env>;
