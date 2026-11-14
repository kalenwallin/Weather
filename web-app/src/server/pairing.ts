import { DurableObject } from "cloudflare:workers";
import { timingSafeEqual } from "node:crypto";
import type { Configuration } from "../lib/config";

interface Session {
  readerToken: string;
  expiresAt: number;
  configuration?: Configuration;
}
export class WeatherPairing extends DurableObject<Env> {
  async create(readerToken: string) {
    if (await this.ctx.storage.get<Session>("session")) return null;
    const expiresAt = Date.now() + 10 * 60_000;
    await this.ctx.storage.put("session", {
      readerToken,
      expiresAt,
    } satisfies Session);
    await this.ctx.storage.setAlarm(expiresAt);
    return expiresAt;
  }
  private async session() {
    const session = await this.ctx.storage.get<Session>("session");
    if (!session || session.expiresAt <= Date.now()) {
      await this.ctx.storage.deleteAll();
      return null;
    }
    return session;
  }
  private authorized(session: Session, token: string) {
    const expected = new TextEncoder().encode(session.readerToken);
    const actual = new TextEncoder().encode(token);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
  async publish(configuration: Configuration) {
    const session = await this.session();
    if (!session)
      return {
        error:
          "This pairing code has expired. Create a new code on the desktop.",
        status: 410,
      };
    if (session.configuration)
      return {
        error: "This code has already received a configuration.",
        status: 409,
      };
    await this.ctx.storage.put("session", { ...session, configuration });
    return { status: 200 };
  }
  async read(token: string) {
    const session = await this.session();
    if (!session) return { status: "expired" as const };
    if (!this.authorized(session, token))
      return { status: "forbidden" as const };
    return session.configuration
      ? { status: "received" as const, configuration: session.configuration }
      : { status: "pending" as const };
  }
  async clear(token: string) {
    const session = await this.session();
    if (!session) return true;
    if (!this.authorized(session, token)) return false;
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    return true;
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
