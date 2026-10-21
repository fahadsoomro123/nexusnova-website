const REVIEW_ORIGIN = "https://review.nexusnova-seo-audit-studio-review.pages.dev";
const MAX_HTML_BYTES = 1_500_000;
const REDIRECT_LIMIT = 3;
const SOURCE_TIMEOUT_MS = 12_000;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    }
  });
}

function isDisallowedHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  if (!host || host.length > 253 || !host.includes(".")) return true;
  if (host === "localhost" || /\.(localhost|local|internal|test|invalid|home\.arpa)$/.test(host)) return true;
  // Do not proxy literal IPv4/IPv6 addresses. This prevents direct access to
  // loopback, link-local, RFC1918, and cloud metadata IP literals.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return true;
  if (host === "metadata.google.internal" || host.endsWith(".metadata.google.internal")) return true;
  return false;
}

function validateTarget(raw) {
  let target;
  try {
    target = new URL(raw);
  } catch {
    return { error: "Enter a valid public website URL." };
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return { error: "Only public HTTP or HTTPS website URLs can be checked." };
  }
  if (target.username || target.password) return { error: "Website URLs must not contain embedded credentials." };
  if (target.port && target.port !== "80" && target.port !== "443") {
    return { error: "Only standard HTTP/HTTPS ports are allowed." };
  }
  if (isDisallowedHost(target.hostname)) return { error: "This hostname is not allowed for public website auditing." };
  target.hash = "";
  return { target };
}

async function readHtmlLimited(response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_HTML_BYTES) throw new Error("The target HTML page exceeds the 1.5 MB preview limit.");
  if (!response.body) throw new Error("The target website returned an empty response body.");
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_HTML_BYTES) {
        await reader.cancel("Preview HTML size limit reached.");
        throw new Error("The target HTML page exceeds the 1.5 MB preview limit.");
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== REVIEW_ORIGIN || requestUrl.hostname !== "review.nexusnova-seo-audit-studio-review.pages.dev") {
    return json({ ok: false, error: "This raw HTML audit endpoint is restricted to the isolated review preview." }, 404);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== REVIEW_ORIGIN) return json({ ok: false, error: "Cross-origin requests are not allowed." }, 403);
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== REVIEW_ORIGIN) return json({ ok: false, error: "Requests must come from the isolated review preview." }, 403);
    } catch {
      return json({ ok: false, error: "Invalid request origin." }, 403);
    }
  }

  const raw = requestUrl.searchParams.get("url") || "";
  const initial = validateTarget(raw);
  if (initial.error) return json({ ok: false, error: initial.error }, 400);

  let target = initial.target;
  for (let redirects = 0; redirects <= REDIRECT_LIMIT; redirects++) {
    let response;
    try {
      response = await fetch(target.href, {
        method: "GET",
        redirect: "manual",
        headers: {
          "accept": "text/html,application/xhtml+xml;q=0.9",
          "user-agent": "NexusNova-Review-Audit/1.0"
        },
        signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS)
      });
    } catch {
      return json({ ok: false, error: "The target website could not be reached from the review edge. No sample HTML was substituted." }, 502);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return json({ ok: false, error: "The target website returned a redirect without a destination." }, 502);
      if (redirects === REDIRECT_LIMIT) return json({ ok: false, error: "The target website exceeded the 3-redirect limit." }, 502);
      const redirected = validateTarget(new URL(location, target).href);
      if (redirected.error) return json({ ok: false, error: "A target redirect was blocked: " + redirected.error }, 502);
      target = redirected.target;
      continue;
    }

    if (!response.ok) return json({ ok: false, error: "The target website returned HTTP " + response.status + "." }, 502);
    const type = String(response.headers.get("content-type") || "").toLowerCase();
    if (type && !type.includes("text/html") && !type.includes("application/xhtml+xml")) {
      return json({ ok: false, error: "The target returned " + type.split(";")[0] + " instead of HTML." }, 415);
    }

    let html;
    try {
      html = await readHtmlLimited(response);
    } catch (error) {
      return json({ ok: false, error: error.message || "Could not read the target HTML." }, 502);
    }
    if (html.length < 80 || !(/<html|<!doctype|<head|<title/i.test(html))) {
      return json({ ok: false, error: "The target response did not contain recognizable raw HTML." }, 415);
    }

    return json({
      ok: true,
      finalUrl: target.href,
      httpStatus: response.status,
      contentType: type || "unknown",
      bytes: new TextEncoder().encode(html).byteLength,
      fetchedAt: new Date().toISOString(),
      html
    });
  }
  return json({ ok: false, error: "The target website could not be fetched." }, 502);
}
