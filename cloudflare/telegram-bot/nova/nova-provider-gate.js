import { DurableObject } from 'cloudflare:workers';

const SLOT_INTERVAL_MS = 8_000;
const SLOT_KEY = 'nextGeminiSlot';

export class NovaProviderGate extends DurableObject {
  async fetch() {
    const stored = Number(await this.ctx.storage.get(SLOT_KEY) || 0);
    const now = Date.now();
    const waitMs = Math.max(0, stored - now);
    const next = Math.max(now, stored) + SLOT_INTERVAL_MS;
    await this.ctx.storage.put(SLOT_KEY, next);
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    return Response.json({ ok: true, waitMs });
  }
}