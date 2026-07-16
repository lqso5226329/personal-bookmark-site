import { archiveStore, html, readIndex, text } from "./lib/shared.js";

export default async (_request, context) => {
  try {
    const id = context.params.id;
    const item = (await readIndex()).find((entry) => entry.id === id);
    if (!item) return text("未找到归档", 404);
    const key = item.archiveStatus === "saved" ? item.archiveKey : item.readableKey;
    const content = await archiveStore().get(key);
    if (!content) return text("归档内容不存在", 404);
    return html(content);
  } catch (error) {
    return text(error.message || "读取归档失败", 500);
  }
};

export const config = {
  path: "/api/archive/:id"
};
