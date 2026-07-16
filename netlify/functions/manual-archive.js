import { archiveStore, createReadableHtml, json, readIndex, writeIndex } from "./lib/shared.js";

export default async (request, context) => {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const id = context.params.id;
    const payload = await request.json().catch(() => ({}));
    const content = String(payload.content || "").trim();
    if (content.length < 20) return json({ error: "正文内容太短，请至少粘贴 20 个字。" }, 400);

    const items = await readIndex();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return json({ error: "未找到收藏" }, 404);

    const item = items[index];
    const now = new Date().toISOString();
    const archiveKey = item.archiveKey || `pages/${id}.html`;
    const readableKey = item.readableKey || `readable/${id}.html`;
    const html = createReadableHtml({
      title: payload.title || item.title,
      url: item.url,
      note: item.note,
      content,
      archivedAt: now,
      reason: "此归档由你手动补充正文生成，用于弥补源站限制或抓取失败。"
    });

    const store = archiveStore();
    await store.set(archiveKey, html, { metadata: { url: item.url, title: item.title, archivedAt: now, manual: true } });
    await store.set(readableKey, html, { metadata: { url: item.url, title: item.title, archivedAt: now, manual: true } });

    const next = {
      ...item,
      title: String(payload.title || item.title || item.url).trim(),
      archiveStatus: "saved",
      archiveError: "",
      archiveKey,
      readableKey,
      status: item.status === "failed" ? "unread" : item.status,
      review: item.review,
      manualArchive: true,
      archivedAt: now,
      updatedAt: now
    };
    items[index] = next;
    await writeIndex(items);
    return json({ item: next });
  } catch (error) {
    return json({ error: error.message || "手动归档失败" }, 500);
  }
};

export const config = {
  path: "/api/manual-archive/:id"
};
