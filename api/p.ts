import {
  applyPlay,
  applyShare,
  dayMetrics,
  isBeaconDay,
  parseBeaconBody,
  parseStored,
  type DayState,
} from "../src/beacon/logic";

export const config = { runtime: "edge" };

const KEY_PREFIX = "skew:p:v1:";

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function empty(): Response {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

function redisCreds(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(
    /\/$/,
    "",
  );
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  if (!url || !token) return null;
  return { url, token };
}

async function redis(cmd: unknown[]): Promise<unknown> {
  const creds = redisCreds();
  if (!creds) throw new Error("no redis");
  const res = await fetch(`${creds.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([cmd]),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const data = (await res.json()) as Array<{ result?: unknown }>;
  return data[0]?.result;
}

async function loadDay(day: string): Promise<DayState> {
  const raw = await redis(["GET", KEY_PREFIX + day]);
  return parseStored(typeof raw === "string" ? raw : null);
}

async function saveDay(day: string, state: DayState): Promise<void> {
  await redis(["SET", KEY_PREFIX + day, JSON.stringify(state)]);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === "GET") {
      if (!redisCreds()) return empty();
      const url = new URL(req.url);
      const raw = url.searchParams.get("d") ?? "";
      const day = isBeaconDay(raw) ? raw : new Date().toISOString().slice(0, 10);
      const state = await loadDay(day);
      return json(dayMetrics(day, state));
    }
    if (req.method !== "POST") return empty();
    if (!redisCreds()) return empty();
    let raw: unknown = null;
    try {
      raw = await req.json();
    } catch {
      return empty();
    }
    const body = parseBeaconBody(raw);
    if (!body) return empty();
    const state = await loadDay(body.d);
    const next = body.e === "play" ? applyPlay(state, body.sid) : applyShare(state, body.sid);
    await saveDay(body.d, next);
    return empty();
  } catch {
    return empty();
  }
}
