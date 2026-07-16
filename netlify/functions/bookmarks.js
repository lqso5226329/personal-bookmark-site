import { archivePage, classify, createId, json, normalizeUrl, readIndex, sourceFromUrl, writeIndex } from "./lib/shared.js";

export default async (request, context) => {
  if (request.method === "OPTIONS") return json({ ok: true });

  try {
    if (request.method === "GET") {
      return json({ items: await readIndex() });
    }

    if (request.method === "POST") {
      const payload = await request.json().catch(() => ({}));
      const url = normalizeUrl(payload.url);
      const items = await readIndex();
      const existing = items.find((item) => item.url === url);
      if (existing) return json({ item: existing, duplicate: true });

      const id = createId();
      const archived = await archivePage({ id, url, title: String(payload.title || "").trim(), note: String(payload.note || "").trim() });
      const classification = classify({ title: archived.title || payload.title, note: payload.note, url, text: archived.text || "" });
      const now = new Date().toISOString();
      const item = {
        id,
        title: archived.title || payload.title || url,
        url,
        source: sourceFromUrl(url),
        category: classification.category,
        tags: classification.tags,
        note: String(payload.note || "").trim(),
        readingNote: "",
        status: archived.archiveStatus === "saved" ? "unread" : "failed",
        review: classification.review || archived.archiveStatus !== "saved",
        important: false,
        public: false,
        archiveStatus: archived.archiveStatus,
        archiveError: archived.archiveError,
        archiveKey: archived.archiveKey,
        readableKey: archived.readableKey,
        imageAssets: archived.imageAssets,
        archivedAt: archived.archivedAt,
        createdAt: now,
        updatedAt: now,
        externalSync: { oneNote: null }
      };
      items.unshift(item);
      await writeIndex(items);
      return json({ item, duplicate: false }, 201);
    }

    if (request.method === "PATCH") {
      const id = context.params.id;
      const payload = await request.json().catch(() => ({}));
      const allowed = ["category", "tags", "note", "readingNote", "status", "review", "important", "public"];
      const items = await readIndex();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return json({ error: "未找到收藏" }, 404);
      const next = { ...items[index] };
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) next[key] = payload[key];
      }
      next.updatedAt = new Date().toISOString();
      items[index] = next;
      await writeIndex(items);
      return json({ item: next });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ error: error.message || "请求失败" }, 400);
  }
};

export const config = {
  path: ["/api/bookmarks", "/api/bookmarks/:id"]
};
