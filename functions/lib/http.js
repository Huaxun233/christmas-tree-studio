// functions/lib/http.js — 共用响应工具

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function randomHex(n) {
  const bytes = crypto.getRandomValues(new Uint8Array(n / 2));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function tokenHash(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export function newId() {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

export function adminKey(context) {
  return context.env && context.env.ADMIN_KEY ? String(context.env.ADMIN_KEY) : "";
}
