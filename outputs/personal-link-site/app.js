const categories = [
  { name: "全部", color: "#17201b" },
  { name: "工程造价", color: "#176b52" },
  { name: "招投标", color: "#396f9b" },
  { name: "合同风险", color: "#d75f4f" },
  { name: "学习资料", color: "#b98216" },
  { name: "工具资源", color: "#6f5aa8" },
  { name: "生活灵感", color: "#8a6b3f" },
  { name: "待复核", color: "#8b6a11" }
];

const rules = [
  { category: "工程造价", tags: ["造价", "清单", "计量", "工程量", "成本", "结算", "定额", "预算"] },
  { category: "招投标", tags: ["招标", "投标", "评标", "标书", "采购", "响应", "报价"] },
  { category: "合同风险", tags: ["合同", "索赔", "变更", "签证", "付款", "条款", "争议", "风险"] },
  { category: "学习资料", tags: ["课程", "教程", "学习", "方法", "论文", "书单", "知识"] },
  { category: "工具资源", tags: ["工具", "模板", "表格", "软件", "插件", "AI", "效率"] }
];

const statusLabels = {
  inbox: "收件箱",
  unread: "未读",
  reading: "阅读中",
  done: "已读",
  archived: "已归档",
  failed: "抓取失败"
};

const storageKey = "personal-link-library-v1";
const apiBase = "/api/bookmarks";
let items = [];
let activeCategory = "全部";
let activeFilter = "all";
let activeStatus = "all";
let selectedId = null;
let usingCloud = false;
let isSaving = false;

const els = {
  categoryList: document.querySelector("#categoryList"),
  linkList: document.querySelector("#linkList"),
  searchInput: document.querySelector("#searchInput"),
  resultCount: document.querySelector("#resultCount"),
  detailEmpty: document.querySelector("#detailEmpty"),
  detailView: document.querySelector("#detailView"),
  countAll: document.querySelector("#countAll"),
  countUnread: document.querySelector("#countUnread"),
  countReading: document.querySelector("#countReading"),
  countDone: document.querySelector("#countDone"),
  countArchived: document.querySelector("#countArchived"),
  countFailed: document.querySelector("#countFailed"),
  metricTotal: document.querySelector("#metricTotal"),
  metricTags: document.querySelector("#metricTags"),
  metricPublic: document.querySelector("#metricPublic"),
  importDialog: document.querySelector("#importDialog"),
  importForm: document.querySelector("#importForm"),
  openImportBtn: document.querySelector("#openImportBtn"),
  exportBtn: document.querySelector("#exportBtn")
};

const seedItems = [
  {
    id: createId(),
    title: "工程量清单复核中的漏项检查方法",
    url: "https://example.com/boq-review",
    note: "用于投标前检查清单漏项、错项、项目特征矛盾，适合整理成复核清单。",
    readingNote: "",
    category: "工程造价",
    tags: ["清单", "漏项", "复核"],
    source: "文章",
    status: "unread",
    archiveStatus: "saved",
    public: true,
    important: false,
    review: false,
    createdAt: "2026-06-24",
    updatedAt: "2026-06-24"
  },
  {
    id: createId(),
    title: "施工合同付款节点与索赔风险提示",
    url: "https://example.com/contract-payment-risk",
    note: "重点看预付款、进度款、结算审计、逾期付款和变更签证约定。",
    readingNote: "",
    category: "合同风险",
    tags: ["合同", "付款", "索赔"],
    source: "网页收藏",
    status: "reading",
    archiveStatus: "saved",
    public: false,
    important: true,
    review: true,
    createdAt: "2026-06-25",
    updatedAt: "2026-06-25"
  }
];

async function init() {
  await loadItems();
  render();
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function loadItems() {
  try {
    const response = await fetch(apiBase, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("云端接口不可用");
    const data = await response.json();
    usingCloud = true;
    items = Array.isArray(data.items) ? data.items : [];
  } catch {
    usingCloud = false;
    items = loadLocalItems();
  }
  selectedId = items[0]?.id ?? null;
}

function loadLocalItems() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return seedItems;
  try {
    return JSON.parse(saved).map(normalizeLegacyItem);
  } catch {
    return seedItems;
  }
}

function saveLocalItems() {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function normalizeLegacyItem(item) {
  return {
    readingNote: "",
    status: item.status || (item.review ? "unread" : "unread"),
    archiveStatus: item.archiveStatus || "local",
    important: Boolean(item.important),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    ...item
  };
}

function classify(input) {
  const text = `${input.title} ${input.note} ${input.url}`.toLowerCase();
  const scored = rules
    .map((rule) => ({
      category: rule.category,
      score: rule.tags.reduce((sum, tag) => sum + (text.includes(tag.toLowerCase()) ? 1 : 0), 0),
      matched: rule.tags.filter((tag) => text.includes(tag.toLowerCase()))
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score === 0) return { category: "待复核", tags: ["待复核"], review: true };
  return {
    category: best.category,
    tags: Array.from(new Set(best.matched.concat(best.category))).slice(0, 4),
    review: best.score < 2
  };
}

function sourceFromUrl(url) {
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

function colorFor(category) {
  return categories.find((item) => item.name === category)?.color ?? "#66716a";
}

function filteredItems() {
  const keyword = els.searchInput.value.trim().toLowerCase();
  return items.filter((item) => {
    const text = `${item.title} ${item.url} ${item.note} ${item.readingNote || ""} ${item.source} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesCategory = activeCategory === "全部" || item.category === activeCategory;
    const matchesFilter =
      activeFilter === "all" ||
      item.category === activeFilter ||
      (activeFilter === "待复核" && item.review) ||
      (activeFilter === "重要" && item.important);
    const matchesStatus = activeStatus === "all" || item.status === activeStatus || (activeStatus === "failed" && item.archiveStatus === "failed");
    return matchesKeyword && matchesCategory && matchesFilter && matchesStatus;
  });
}

function renderCategories() {
  els.categoryList.innerHTML = categories
    .map((category) => {
      const count = category.name === "全部" ? items.length : items.filter((item) => item.category === category.name).length;
      return `
        <button class="category-button ${activeCategory === category.name ? "active" : ""}" data-category="${category.name}" type="button">
          <span class="category-main">
            <span class="category-dot" style="background:${category.color}"></span>
            <span>${category.name}</span>
          </span>
          <strong>${count}</strong>
        </button>
      `;
    })
    .join("");
}

function renderList() {
  const rows = filteredItems();
  els.resultCount.textContent = `${rows.length} 条结果 · ${usingCloud ? "云端同步" : "本地模式"}`;
  if (!rows.length) {
    els.linkList.innerHTML = `<div class="empty-list">没有找到匹配收藏，可以换个关键词或导入新链接。</div>`;
    renderDetail(null);
    return;
  }

  if (!rows.some((item) => item.id === selectedId)) selectedId = rows[0].id;
  els.linkList.innerHTML = rows.map(renderListItem).join("");
  renderDetail(items.find((item) => item.id === selectedId));
}

function renderListItem(item) {
  const tags = item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const archiveLabel = item.archiveStatus === "saved" ? "已保存快照" : item.archiveStatus === "failed" ? "抓取失败" : "本地收藏";
  return `
    <button class="link-item ${selectedId === item.id ? "active" : ""}" data-id="${item.id}" type="button">
      <span>
        <span class="link-title-row">
          <span class="status-dot ${item.review ? "review" : ""}"></span>
          <strong>${escapeHtml(item.title)}</strong>
        </span>
        <span class="link-meta">
          <span class="tag category-pill" style="background:${colorFor(item.category)}">${escapeHtml(item.category)}</span>
          <span>${escapeHtml(item.source)}</span>
          <span>${escapeHtml(statusLabels[item.status] || item.status)}</span>
          <span>${escapeHtml(archiveLabel)}</span>
        </span>
        <span class="tag-row">${tags}</span>
      </span>
      <span class="link-actions">
        <span class="small-toggle ${item.important ? "is-public" : ""}" aria-label="${item.important ? "重要" : "普通"}">
          <span class="toggle-track"><span class="toggle-knob"></span></span>
          <span>${item.important ? "重要" : "普通"}</span>
        </span>
      </span>
    </button>
  `;
}

function renderDetail(item) {
  if (!item) {
    els.detailEmpty.classList.remove("hidden");
    els.detailView.classList.add("hidden");
    return;
  }
  els.detailEmpty.classList.add("hidden");
  els.detailView.classList.remove("hidden");
  const archiveUrl = usingCloud ? `/api/archive/${encodeURIComponent(item.id)}` : item.url;
  const archiveButton = item.archiveStatus === "saved" || item.archiveStatus === "failed"
    ? `<a class="primary-button button-link" href="${escapeAttribute(archiveUrl)}" target="_blank" rel="noreferrer">阅读归档内容</a>`
    : `<span class="ghost-button disabled-button">本地收藏暂无云端快照</span>`;
  els.detailView.innerHTML = `
    <div>
      <div class="detail-meta">
        <span class="tag category-pill" style="background:${colorFor(item.category)}">${escapeHtml(item.category)}</span>
        <span>${escapeHtml(statusLabels[item.status] || item.status)}</span>
        <span>${item.review ? "需要人工复核" : "分类可信"}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
    </div>
    <div class="archive-actions">
      ${archiveButton}
      <a class="ghost-button button-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">打开原链接</a>
    </div>
    ${item.archiveError ? `<div class="warning-box">归档提示：${escapeHtml(item.archiveError)}</div>` : ""}
    <div class="detail-block">
      <strong>自动标签</strong>
      <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    <div class="detail-block">
      <strong>整理建议</strong>
      <p>${suggestionFor(item)}</p>
    </div>
    <div class="detail-block">
      <strong>收藏备注</strong>
      <p>${escapeHtml(item.note || "暂无备注。")}</p>
    </div>
    <label class="reading-note">
      <strong>读后备注</strong>
      <textarea id="readingNoteInput" rows="4" placeholder="读完后的结论、可复用要点、待办事项">${escapeHtml(item.readingNote || "")}</textarea>
    </label>
    <div class="status-grid">
      ${renderStatusButton(item, "unread")}
      ${renderStatusButton(item, "reading")}
      ${renderStatusButton(item, "done")}
      ${renderStatusButton(item, "archived")}
    </div>
    <div class="detail-actions">
      <button class="ghost-button" data-action="toggle-review" type="button">${item.review ? "标为已复核" : "标为待复核"}</button>
      <button class="ghost-button" data-action="toggle-important" type="button">${item.important ? "取消重要" : "标为重要"}</button>
      <button class="primary-button" data-action="toggle-public" type="button">${item.public ? "设为私密" : "公开分享"}</button>
      <button class="primary-button" data-action="save-reading-note" type="button">保存读后备注</button>
    </div>
  `;
}

function renderStatusButton(item, status) {
  return `<button class="filter-tab ${item.status === status ? "active" : ""}" data-set-status="${status}" type="button">${statusLabels[status]}</button>`;
}

function suggestionFor(item) {
  const map = {
    工程造价: "建议补充适用项目类型、计量口径、对应清单编码和可复用检查点。",
    招投标: "建议记录招标阶段、报价口径、响应要求和容易漏填的商务条款。",
    合同风险: "建议摘出付款条件、变更签证、索赔时限和结算依据，方便后续复盘。",
    学习资料: "建议写下使用场景、关键结论和下一步要做的实践动作。",
    工具资源: "建议标明工具用途、适合文件类型、费用和是否能导出 Excel 或 PDF。"
  };
  return map[item.category] ?? "建议人工确认分类，并补充来源、关键词和可公开范围。";
}

function renderStats() {
  const tagCount = new Set(items.flatMap((item) => item.tags)).size;
  els.countAll.textContent = items.length;
  els.countUnread.textContent = items.filter((item) => item.status === "unread").length;
  els.countReading.textContent = items.filter((item) => item.status === "reading").length;
  els.countDone.textContent = items.filter((item) => item.status === "done").length;
  els.countArchived.textContent = items.filter((item) => item.status === "archived").length;
  els.countFailed.textContent = items.filter((item) => item.status === "failed" || item.archiveStatus === "failed").length;
  els.metricTotal.textContent = items.length;
  els.metricTags.textContent = tagCount;
  els.metricPublic.textContent = items.filter((item) => item.archiveStatus === "saved").length;
}

function render() {
  renderStats();
  renderCategories();
  renderList();
}

async function addItem(formData) {
  const draft = {
    title: formData.get("title").trim(),
    url: formData.get("url").trim(),
    note: formData.get("note").trim()
  };
  if (usingCloud) {
    const response = await fetch(apiBase, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "保存失败");
    if (!data.duplicate) items = [data.item, ...items];
    selectedId = data.item.id;
    render();
    return data.duplicate ? "duplicate" : "created";
  }

  const result = classify(draft);
  const item = {
    id: createId(),
    ...draft,
    title: draft.title || draft.url,
    ...result,
    source: sourceFromUrl(draft.url),
    readingNote: "",
    status: "unread",
    archiveStatus: "local",
    important: false,
    public: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  items = [item, ...items];
  selectedId = item.id;
  saveLocalItems();
  render();
  return "created";
}

async function updateSelected(patch) {
  const selected = items.find((item) => item.id === selectedId);
  if (!selected) return;
  if (usingCloud) {
    const response = await fetch(`${apiBase}/${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "更新失败");
    items = items.map((item) => item.id === selected.id ? data.item : item);
  } else {
    items = items.map((item) => item.id === selected.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    saveLocalItems();
  }
  render();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

document.addEventListener("click", async (event) => {
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    activeCategory = categoryButton.dataset.category;
    render();
    return;
  }

  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    activeFilter = filterButton.dataset.filter;
    document.querySelectorAll(".filter-tab[data-filter]").forEach((button) => button.classList.toggle("active", button === filterButton));
    renderList();
    return;
  }

  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    activeStatus = statusButton.dataset.status;
    document.querySelectorAll(".side-stat").forEach((button) => button.classList.toggle("active", button === statusButton));
    renderList();
    return;
  }

  const itemButton = event.target.closest("[data-id]");
  if (itemButton) {
    selectedId = itemButton.dataset.id;
    renderList();
    return;
  }

  const setStatus = event.target.closest("[data-set-status]")?.dataset.setStatus;
  if (setStatus) {
    await updateSelected({ status: setStatus });
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  const selected = items.find((item) => item.id === selectedId);
  if (!selected) return;
  try {
    if (action === "toggle-review") await updateSelected({ review: !selected.review });
    if (action === "toggle-public") await updateSelected({ public: !selected.public });
    if (action === "toggle-important") await updateSelected({ important: !selected.important });
    if (action === "save-reading-note") {
      await updateSelected({ readingNote: document.querySelector("#readingNoteInput")?.value || "" });
    }
  } catch (error) {
    alert(error.message || "操作失败");
  }
});

els.searchInput.addEventListener("input", renderList);

els.openImportBtn.addEventListener("click", () => {
  els.importDialog.showModal();
});

function closeImportDialog() {
  els.importForm.reset();
  els.importDialog.close();
}

els.importForm.addEventListener("click", (event) => {
  if (!event.target.closest("[data-close-import]")) return;
  closeImportDialog();
});

els.importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSaving) return;
  isSaving = true;
  const submitButton = event.submitter;
  const originalText = submitButton?.textContent;
  if (submitButton) submitButton.textContent = "正在保存归档...";
  try {
    const formData = new FormData();
    formData.set("url", document.querySelector("#urlInput").value);
    formData.set("title", document.querySelector("#titleInput").value);
    formData.set("note", document.querySelector("#noteInput").value);
    const result = await addItem(formData);
    closeImportDialog();
    if (result === "duplicate") alert("这个链接已经收藏过，已为你定位到原收藏。");
  } catch (error) {
    alert(error.message || "保存失败");
  } finally {
    isSaving = false;
    if (submitButton && originalText) submitButton.textContent = originalText;
  }
});

els.exportBtn.addEventListener("click", async () => {
  if (usingCloud) {
    const response = await fetch("/api/backup");
    if (!response.ok) {
      alert("云端备份导出失败，请稍后重试。");
      return;
    }
    const data = await response.json();
    downloadJson(data, `我的收藏库-云端备份-${new Date().toISOString().slice(0, 10)}.json`);
    return;
  }

  downloadJson({
    exportedAt: new Date().toISOString(),
    format: "personal-bookmark-local-backup-v1",
    items
  }, `我的收藏库-本地备份-${new Date().toISOString().slice(0, 10)}.json`);
});

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

init();
