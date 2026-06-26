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

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const seedItems = [
  {
    id: createId(),
    title: "工程量清单复核中的漏项检查方法",
    url: "https://example.com/boq-review",
    note: "用于投标前检查清单漏项、错项、项目特征矛盾，适合整理成复核清单。",
    category: "工程造价",
    tags: ["清单", "漏项", "复核"],
    source: "文章",
    public: true,
    review: false,
    createdAt: "2026-06-24"
  },
  {
    id: createId(),
    title: "施工合同付款节点与索赔风险提示",
    url: "https://example.com/contract-payment-risk",
    note: "重点看预付款、进度款、结算审计、逾期付款和变更签证约定。",
    category: "合同风险",
    tags: ["合同", "付款", "索赔"],
    source: "网页收藏",
    public: false,
    review: true,
    createdAt: "2026-06-25"
  },
  {
    id: createId(),
    title: "投标报价分析表模板",
    url: "https://example.com/bid-pricing-template",
    note: "可作为投标前报价差异分析、成本测算和风险备注的表格模板来源。",
    category: "招投标",
    tags: ["投标", "报价", "模板"],
    source: "资料",
    public: true,
    review: false,
    createdAt: "2026-06-25"
  },
  {
    id: createId(),
    title: "AI 辅助资料整理工作流",
    url: "https://example.com/ai-knowledge-workflow",
    note: "适合把微信、知乎、B站、公众号、PDF 摘要统一整理为个人知识库。",
    category: "工具资源",
    tags: ["AI", "工具", "知识库"],
    source: "视频",
    public: true,
    review: false,
    createdAt: "2026-06-26"
  }
];

const storageKey = "personal-link-library-v1";
let items = loadItems();
let activeCategory = "全部";
let activeFilter = "all";
let activeStatus = "all";
let selectedId = items[0]?.id ?? null;

const els = {
  categoryList: document.querySelector("#categoryList"),
  linkList: document.querySelector("#linkList"),
  searchInput: document.querySelector("#searchInput"),
  resultCount: document.querySelector("#resultCount"),
  detailEmpty: document.querySelector("#detailEmpty"),
  detailView: document.querySelector("#detailView"),
  countAll: document.querySelector("#countAll"),
  countReview: document.querySelector("#countReview"),
  countPublic: document.querySelector("#countPublic"),
  metricTotal: document.querySelector("#metricTotal"),
  metricTags: document.querySelector("#metricTags"),
  metricPublic: document.querySelector("#metricPublic"),
  importDialog: document.querySelector("#importDialog"),
  importForm: document.querySelector("#importForm"),
  openImportBtn: document.querySelector("#openImportBtn"),
  exportBtn: document.querySelector("#exportBtn")
};

function loadItems() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return seedItems;
  try {
    return JSON.parse(saved);
  } catch {
    return seedItems;
  }
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(items));
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
  if (!best || best.score === 0) {
    return { category: "待复核", tags: ["待复核"], review: true };
  }
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
    const text = `${item.title} ${item.url} ${item.note} ${item.source} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesCategory = activeCategory === "全部" || item.category === activeCategory;
    const matchesFilter =
      activeFilter === "all" ||
      item.category === activeFilter ||
      (activeFilter === "待复核" && item.review);
    const matchesStatus =
      activeStatus === "all" ||
      (activeStatus === "review" && item.review) ||
      (activeStatus === "public" && item.public);
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
  els.resultCount.textContent = `${rows.length} 条结果`;
  if (!rows.length) {
    els.linkList.innerHTML = `<div class="empty-list">没有找到匹配收藏，可以换个关键词或导入新链接。</div>`;
    renderDetail(null);
    return;
  }

  if (!rows.some((item) => item.id === selectedId)) selectedId = rows[0].id;
  els.linkList.innerHTML = rows
    .map((item) => {
      const tags = item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
      return `
        <button class="link-item ${selectedId === item.id ? "active" : ""}" data-id="${item.id}" type="button">
          <span>
            <span class="link-title-row">
              <span class="status-dot ${item.review ? "review" : ""}"></span>
              <strong>${escapeHtml(item.title)}</strong>
            </span>
            <span class="link-meta">
              <span class="tag category-pill" style="background:${colorFor(item.category)}">${item.category}</span>
              <span>${item.source}</span>
              <span>${item.createdAt}</span>
            </span>
            <span class="tag-row">${tags}</span>
          </span>
          <span class="link-actions">
            <span class="small-toggle ${item.public ? "is-public" : ""}" aria-label="${item.public ? "已公开" : "未公开"}">
              <span class="toggle-track"><span class="toggle-knob"></span></span>
              <span>${item.public ? "公开" : "私密"}</span>
            </span>
          </span>
        </button>
      `;
    })
    .join("");
  renderDetail(items.find((item) => item.id === selectedId));
}

function renderDetail(item) {
  if (!item) {
    els.detailEmpty.classList.remove("hidden");
    els.detailView.classList.add("hidden");
    return;
  }
  els.detailEmpty.classList.add("hidden");
  els.detailView.classList.remove("hidden");
  els.detailView.innerHTML = `
    <div>
      <div class="detail-meta">
        <span class="tag category-pill" style="background:${colorFor(item.category)}">${item.category}</span>
        <span>${item.review ? "需要人工复核" : "分类可信"}</span>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
    </div>
    <a class="detail-url" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a>
    <div class="detail-block">
      <strong>自动标签</strong>
      <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    </div>
    <div class="detail-block">
      <strong>整理建议</strong>
      <p>${suggestionFor(item)}</p>
    </div>
    <div class="detail-block">
      <strong>备注</strong>
      <p>${escapeHtml(item.note || "暂无备注。")}</p>
    </div>
    <div class="detail-actions">
      <button class="ghost-button" data-action="toggle-review" type="button">${item.review ? "标为已复核" : "标为待复核"}</button>
      <button class="primary-button" data-action="toggle-public" type="button">${item.public ? "设为私密" : "公开分享"}</button>
    </div>
  `;
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
  els.countReview.textContent = items.filter((item) => item.review).length;
  els.countPublic.textContent = items.filter((item) => item.public).length;
  els.metricTotal.textContent = items.length;
  els.metricTags.textContent = tagCount;
  els.metricPublic.textContent = items.filter((item) => item.public).length;
}

function render() {
  renderStats();
  renderCategories();
  renderList();
}

function addItem(formData) {
  const draft = {
    title: formData.get("title").trim(),
    url: formData.get("url").trim(),
    note: formData.get("note").trim()
  };
  const result = classify(draft);
  const item = {
    id: createId(),
    ...draft,
    ...result,
    source: sourceFromUrl(draft.url),
    public: false,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  items = [item, ...items];
  selectedId = item.id;
  saveItems();
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

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    activeCategory = categoryButton.dataset.category;
    render();
    return;
  }

  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    activeFilter = filterButton.dataset.filter;
    document.querySelectorAll(".filter-tab").forEach((button) => button.classList.toggle("active", button === filterButton));
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

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action) {
    items = items.map((item) => {
      if (item.id !== selectedId) return item;
      if (action === "toggle-review") return { ...item, review: !item.review };
      if (action === "toggle-public") return { ...item, public: !item.public };
      return item;
    });
    saveItems();
    render();
  }
});

els.searchInput.addEventListener("input", renderList);

els.openImportBtn.addEventListener("click", () => {
  els.importDialog.showModal();
});

els.importForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const formData = new FormData();
  formData.set("url", document.querySelector("#urlInput").value);
  formData.set("title", document.querySelector("#titleInput").value);
  formData.set("note", document.querySelector("#noteInput").value);
  addItem(formData);
  els.importForm.reset();
  els.importDialog.close();
});

els.exportBtn.addEventListener("click", () => {
  const header = ["标题", "链接", "分类", "标签", "来源", "是否公开", "是否待复核", "备注"];
  const lines = items.map((item) => [
    item.title,
    item.url,
    item.category,
    item.tags.join(" / "),
    item.source,
    item.public ? "公开" : "私密",
    item.review ? "待复核" : "已复核",
    item.note
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "我的收藏库.csv";
  link.click();
  URL.revokeObjectURL(url);
});

render();
