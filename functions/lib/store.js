// functions/lib/store.js — KV shim：让原 Netlify Blobs 业务逻辑零改动跑在 Cloudflare KV 上
// 用法：const store = getStore(context.env.TREES)

export function getStore(kv) {
  return {
    async get(key, opts = {}) {
      if (opts.type === "json") {
        const v = await kv.get(key);
        return v == null ? null : JSON.parse(v);
      }
      return kv.get(key);
    },
    async setJSON(key, value) {
      await kv.put(key, JSON.stringify(value));
    },
    async delete(key) {
      await kv.delete(key);
    },
    // 返回 { blobs: [{ key }] }，自动翻页
    async list({ prefix } = {}) {
      const out = [];
      let cursor;
      do {
        const page = await kv.list({ prefix, cursor });
        for (const k of page.keys) out.push({ key: k.name });
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return { blobs: out };
    },
  };
}
