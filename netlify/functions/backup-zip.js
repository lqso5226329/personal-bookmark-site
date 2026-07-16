import { archiveStore, readIndex } from "./lib/shared.js";

const encoder = new TextEncoder();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function normalizePath(path) {
  return String(path || "file").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\./g, "_");
}

function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(normalizePath(file.name), "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data || "", "utf8");
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(2048),
      u16(0),
      u16(time),
      u16(day),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name
    ]);

    chunks.push(localHeader, data);
    central.push(Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(2048),
      u16(0),
      u16(time),
      u16(day),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    ]));
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0)
  ]);

  return Buffer.concat([...chunks, centralDirectory, end]);
}

function safeFileName(value, fallback) {
  return String(value || fallback)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || fallback;
}

export default async () => {
  try {
    const items = await readIndex();
    const store = archiveStore();
    const files = [
      {
        name: "README.md",
        data: `# 我的收藏库备份\n\n导出时间：${new Date().toISOString()}\n\n- bookmarks.json：收藏数据\n- archives/：本站保存的网页归档\n- readable/：可读正文归档\n- assets/：已保存的图片资源\n\n此备份包可直接解压到本地保存，也可迁移到其他平台。`
      },
      {
        name: "bookmarks.json",
        data: JSON.stringify({ exportedAt: new Date().toISOString(), format: "personal-bookmark-portable-zip-v1", items }, null, 2)
      }
    ];

    for (const item of items) {
      const base = `${safeFileName(item.title, item.id)}-${item.id}`;
      if (item.archiveKey) {
        const html = await store.get(item.archiveKey);
        if (html) files.push({ name: `archives/${base}.html`, data: html });
      }
      if (item.readableKey) {
        const readable = await store.get(item.readableKey);
        if (readable) files.push({ name: `readable/${base}.html`, data: readable });
      }
      for (const [index, asset] of (item.imageAssets || []).entries()) {
        if (asset.status !== "saved" || !asset.key) continue;
        const arrayBuffer = await store.get(asset.key, { type: "arrayBuffer" });
        if (!arrayBuffer) continue;
        const ext = String(asset.contentType || "").includes("png") ? "png" : String(asset.contentType || "").includes("webp") ? "webp" : "jpg";
        files.push({ name: `assets/${item.id}/${index}.${ext}`, data: Buffer.from(arrayBuffer) });
      }
    }

    const zip = createZip(files);
    return new Response(zip, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="personal-bookmark-backup-${new Date().toISOString().slice(0, 10)}.zip"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return Response.json({ error: error.message || "ZIP 导出失败" }, { status: 500 });
  }
};

export const config = {
  path: "/api/backup.zip"
};
