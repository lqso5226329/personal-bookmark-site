import { archiveStore, text } from "./lib/shared.js";

export default async (request) => {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || !key.startsWith("assets/")) return text("缺少资源 key", 400);
    const entry = await archiveStore().getWithMetadata(key, { type: "arrayBuffer" });
    if (!entry?.data) return text("资源不存在", 404);
    return new Response(entry.data, {
      headers: {
        "content-type": entry.metadata?.contentType || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    return text(error.message || "读取资源失败", 500);
  }
};

export const config = {
  path: "/api/archive-asset"
};
