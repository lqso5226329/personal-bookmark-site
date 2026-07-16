import { archiveStore, json, readIndex } from "./lib/shared.js";

export default async () => {
  try {
    const items = await readIndex();
    const store = archiveStore();
    const archives = [];
    for (const item of items) {
      archives.push({
        id: item.id,
        url: item.url,
        title: item.title,
        archiveStatus: item.archiveStatus,
        archiveError: item.archiveError,
        archivedAt: item.archivedAt,
        imageAssets: item.imageAssets || [],
        html: item.archiveKey ? await store.get(item.archiveKey) : "",
        readable: item.readableKey ? await store.get(item.readableKey) : ""
      });
    }

    return json({
      exportedAt: new Date().toISOString(),
      format: "personal-bookmark-backup-v1",
      site: "personal-bookmark-site",
      items,
      archives
    });
  } catch (error) {
    return json({ error: error.message || "导出失败" }, 500);
  }
};

export const config = {
  path: "/api/backup"
};
