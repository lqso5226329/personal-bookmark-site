import { getStore } from "@netlify/blobs";

export const INDEX_KEY = "bookmarks-index";
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "access-control-allow-origin": "*"
    }
  });
}

export function text(body, status = 200, contentType = "text/plain; charset=utf-8") {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*"
    }
  });
}

export function bookmarksStore() {
  return getStore("bookmarks");
}

export function archiveStore() {
  return getStore("archives");
}

export async function readIndex() {
  const store = bookmarksStore();
  const data = await store.get(INDEX_KEY, { type: "json" });
  return Array.isArray(data) ? data : [];
}

export async function writeIndex(items) {
  await bookmarksStore().setJSON(INDEX_KEY, items);
}

export function createId() {
  return `bookmark_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) throw new Error("链接不能为空");
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("只支持 http/https 链接");
  return parsed.href;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

export function sourceFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("bilibili")) return "B站";
    if (host.includes("zhihu")) return "知乎";
    if (host.includes("weixin")) return "公众号";
    if (host.includes("douyin")) return "抖音";
    return host;
  } catch {
    return "链接";
  }
}

const rules = [
  { category: "工程造价", tags: ["造价", "清单", "计量", "工程量", "成本", "结算", "定额", "预算"] },
  { category: "招投标", tags: ["招标", "投标", "评标", "标书", "采购", "响应", "报价"] },
  { category: "合同风险", tags: ["合同", "索赔", "变更", "签证", "付款", "条款", "争议", "风险"] },
  { category: "学习资料", tags: ["课程", "教程", "学习", "方法", "论文", "书单", "知识"] },
  { category: "工具资源", tags: ["工具", "模板", "表格", "软件", "插件", "AI", "效率"] }
];

export function classify(input) {
  const textValue = `${input.title || ""} ${input.note || ""} ${input.url || ""} ${input.text || ""}`.toLowerCase();
  const scored = rules
    .map((rule) => ({
      category: rule.category,
      score: rule.tags.reduce((sum, tag) => sum + (textValue.includes(tag.toLowerCase()) ? 1 : 0), 0),
      matched: rule.tags.filter((tag) => textValue.includes(tag.toLowerCase()))
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score === 0) return { category: "待复核", tags: ["待复核"], review: true };
  return {
    category: best.category,
    tags: Array.from(new Set(best.matched.concat(best.category))).slice(0, 5),
    review: best.score < 2
  };
}

function extractTitle(pageHtml) {
  const match = String(pageHtml || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).trim().slice(0, 120) : "";
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractReadableText(pageHtml) {
  return decodeEntities(
    String(pageHtml || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  ).slice(0, 12000);
}

function sanitizeHtml(pageHtml, baseUrl, imageMap) {
  let result = String(pageHtml || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  result = result.replace(/\s(src|href)=["']([^"']+)["']/gi, (full, attr, value) => {
    const absolute = absoluteUrl(value, baseUrl);
    if (!absolute) return full;
    const mapped = attr.toLowerCase() === "src" && imageMap.get(absolute) ? imageMap.get(absolute) : absolute;
    return ` ${attr}="${escapeHtml(mapped)}"`;
  });

  return result;
}

function extractImageUrls(pageHtml, baseUrl) {
  const urls = [];
  const seen = new Set();
  const pattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(String(pageHtml || "")))) {
    const src = absoluteUrl(match[1], baseUrl);
    if (!src || seen.has(src) || src.startsWith("data:")) continue;
    seen.add(src);
    urls.push(src);
    if (urls.length >= MAX_IMAGES) break;
  }
  return urls;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function archivePage({ id, url, title, note }) {
  const archives = archiveStore();
  const now = new Date().toISOString();
  const result = {
    archiveStatus: "failed",
    archiveError: "",
    archiveKey: `pages/${id}.html`,
    readableKey: `readable/${id}.html`,
    imageAssets: [],
    archivedAt: now,
    title: title || ""
  };

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "user-agent": "Mozilla/5.0 personal-bookmark-archiver/1.0",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) throw new Error(`源站返回 ${response.status}`);
    const pageHtml = await response.text();
    const pageTitle = title || extractTitle(pageHtml) || url;
    const readableText = extractReadableText(pageHtml);
    const imageUrls = extractImageUrls(pageHtml, url);
    const imageMap = new Map();

    for (const [index, src] of imageUrls.entries()) {
      const asset = { src, key: `assets/${id}/${index}`, status: "failed", contentType: "", size: 0, error: "" };
      try {
        const imageRes = await fetchWithTimeout(src, { headers: { "user-agent": "Mozilla/5.0 personal-bookmark-archiver/1.0" } }, 8000);
        if (!imageRes.ok) throw new Error(`图片返回 ${imageRes.status}`);
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        if (buffer.length > MAX_IMAGE_BYTES) throw new Error("图片超过单张 3MB 限制");
        asset.contentType = imageRes.headers.get("content-type") || "application/octet-stream";
        asset.size = buffer.length;
        asset.status = "saved";
        await archives.set(asset.key, buffer, { metadata: { src, contentType: asset.contentType } });
        imageMap.set(src, `/api/archive-asset?key=${encodeURIComponent(asset.key)}`);
      } catch (error) {
        asset.error = error.message || "图片保存失败";
      }
      result.imageAssets.push(asset);
    }

    const sanitized = sanitizeHtml(pageHtml, url, imageMap);
    const archiveHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<style>body{margin:0;font-family:"Microsoft YaHei",Arial,sans-serif;background:#f7f8f6;color:#17201b}.archive-bar{position:sticky;top:0;z-index:9999;background:#17201b;color:#fff;padding:10px 14px;font-size:14px}.archive-bar a{color:#c8f0dc}.archive-source{opacity:.78;margin-left:8px}.archive-body{background:#fff;min-height:100vh}</style>
</head><body><div class="archive-bar">本站归档快照 · ${escapeHtml(new Date(now).toLocaleString("zh-CN"))}<span class="archive-source">原链接：<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></span></div><div class="archive-body">${sanitized}</div></body></html>`;

    const readableHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pageTitle)}</title><style>body{max-width:820px;margin:0 auto;padding:28px 18px;font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.8;color:#17201b;background:#fbfcfa}a{color:#176b52}.meta{color:#66716a;font-size:14px;border-bottom:1px solid #dce4de;padding-bottom:16px;margin-bottom:18px;overflow-wrap:anywhere}</style></head><body><h1>${escapeHtml(pageTitle)}</h1><div class="meta">原链接：<a href="${escapeHtml(url)}">${escapeHtml(url)}</a><br>归档时间：${escapeHtml(now)}<br>备注：${escapeHtml(note || "")}</div><p>${escapeHtml(readableText).replace(/\n/g, "</p><p>")}</p></body></html>`;

    await archives.set(result.archiveKey, archiveHtml, { metadata: { url, title: pageTitle, archivedAt: now } });
    await archives.set(result.readableKey, readableHtml, { metadata: { url, title: pageTitle, archivedAt: now } });

    result.archiveStatus = "saved";
    result.archiveError = "";
    result.title = pageTitle;
    result.text = readableText;
    return result;
  } catch (error) {
    const fallbackTitle = title || url;
    const fallbackHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(fallbackTitle)}</title></head><body><h1>${escapeHtml(fallbackTitle)}</h1><p>未能完整归档此页面。</p><p>原因：${escapeHtml(error.message || "未知错误")}</p><p>原链接：<a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p></body></html>`;
    await archives.set(result.readableKey, fallbackHtml, { metadata: { url, title: fallbackTitle, archivedAt: now } });
    result.archiveError = error.message || "归档失败";
    result.title = fallbackTitle;
    return result;
  }
}
