const API = "/api";
const $ = (id) => document.getElementById(id);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const THEMES = ["system", "light", "dark", "lemon", "blue"];
const BUILT_IN_CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Shopping", "Bills", "Other"];
const moneyFormatter = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" });
const compactMoneyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency", currency: "GHS", notation: "compact", maximumFractionDigits: 1,
});

const CAT_VAR = {
  Food: "--c-food", Transport: "--c-transport", Housing: "--c-housing", Entertainment: "--c-entertainment",
  Health: "--c-health", Shopping: "--c-shopping", Bills: "--c-bills", Other: "--c-other",
};
const catColor = (c) => css(CAT_VAR[c] || "--c-other");
const money = (n) => moneyFormatter.format(n || 0);
const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

let categories = [];
let charts = {};
let currentExpenses = [];

async function api(path, opts) {
  const res = await fetch(API + path, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = Array.isArray(j.detail) ? j.detail.map((d) => d.msg).join(", ") : j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove("show"), 2200);
}

function filterQuery() {
  const p = new URLSearchParams();
  if ($("filterCategory").value !== "All") p.set("category", $("filterCategory").value);
  if ($("filterStart").value) p.set("start", $("filterStart").value);
  if ($("filterEnd").value) p.set("end", $("filterEnd").value);
  if ($("search").value.trim()) p.set("search", $("search").value.trim());
  const s = p.toString();
  return s ? "?" + s : "";
}

function scopeLabel() {
  const parts = [];
  if ($("filterCategory").value !== "All") parts.push($("filterCategory").value);
  if ($("filterStart").value || $("filterEnd").value) parts.push(`${$("filterStart").value || "…"} → ${$("filterEnd").value || "…"}`);
  if ($("search").value.trim()) parts.push(`“${$("search").value.trim()}”`);
  return parts.length ? "Filtered: " + parts.join(" · ") : "All time";
}

async function refresh() {
  const q = filterQuery();
  const [expenses, stats] = await Promise.all([api("/expenses" + q), api("/stats" + q)]);
  currentExpenses = expenses;
  renderList(expenses);
  renderStats(stats);
}

function renderList(rows) {
  $("tbody").innerHTML = rows.map((e) => `
    <tr>
      <td>${esc(e.date)}</td>
      <td class="title-cell">${esc(e.title)}${e.note ? `<small>${esc(e.note)}</small>` : ""}</td>
      <td><span class="chip"><i style="background:${catColor(e.category)}"></i>${esc(e.category)}</span></td>
      <td class="num">${money(e.amount)}</td>
      <td class="num"><button class="del" data-id="${e.id}" aria-label="Delete ${esc(e.title)}">Delete</button></td>
    </tr>`).join("");
  $("empty").hidden = rows.length > 0;
}

function renderStats(s) {
  $("kTotal").textContent = money(s.total);
  $("kCount").textContent = s.count;
  $("kAvg").textContent = money(s.average);
  $("kMax").textContent = money(s.largest);
  $("kScope").textContent = scopeLabel();
  $("donutTotal").textContent = money(s.total);
  renderCharts(s);
}

function chartDefaults() {
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.color = css("--text-2");
}

function upsert(key, canvasId, config) {
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart($(canvasId), config);
}

function renderCharts(s) {
  chartDefaults();
  const grid = css("--grid"), surface = css("--surface");
  const moneyTick = (v) => compactMoneyFormatter.format(v);
  const tooltip = { callbacks: { label: (c) => " " + money(c.parsed.y ?? c.parsed) } };

  // Category donut
  const cats = s.by_category;
  upsert("cat", "catChart", {
    type: "doughnut",
    data: {
      labels: cats.map((c) => c.category),
      datasets: [{ data: cats.map((c) => c.total), backgroundColor: cats.map((c) => catColor(c.category)), borderColor: surface, borderWidth: 2 }],
    },
    options: {
      maintainAspectRatio: false, cutout: "68%",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${money(c.parsed)} (${s.total ? Math.round((c.parsed / s.total) * 100) : 0}%)` } } },
    },
  });
  $("catLegend").innerHTML = cats.map((c) =>
    `<li><span class="sw" style="background:${catColor(c.category)}"></span>${esc(c.category)}<span class="v">${money(c.total)}</span></li>`).join("");

  // Monthly bars
  upsert("month", "monthChart", {
    type: "bar",
    data: {
      labels: s.by_month.map((m) => m.month),
      datasets: [{ data: s.by_month.map((m) => m.total), backgroundColor: css("--accent"), borderRadius: 4, maxBarThickness: 36 }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { callback: moneyTick } } },
    },
  });

  // Daily line
  upsert("day", "dayChart", {
    type: "line",
    data: {
      labels: s.by_day.map((d) => d.date),
      datasets: [{ data: s.by_day.map((d) => d.total), borderColor: css("--accent"), backgroundColor: css("--accent") + "22", fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: css("--accent"), pointBorderColor: surface, pointBorderWidth: 2 }],
    },
    options: {
      maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip },
      scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { callback: moneyTick } } },
    },
  });
}

/* ---------- events ---------- */
function syncCustomCategoryField() {
  const custom = $("category").value === "Other";
  $("customCategoryField").hidden = !custom;
  $("customCategory").required = custom;
  if (!custom) $("customCategory").value = "";
}

function renderCategoryOptions() {
  const selectedCategory = $("category").value;
  const selectedFilter = $("filterCategory").value;
  $("category").innerHTML = categories
    .map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
  const filterCategories = ["All", ...categories];
  $("filterCategory").innerHTML = filterCategories
    .map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
  const customCategories = categories.filter((category) => !BUILT_IN_CATEGORIES.includes(category));
  $("customCategories").innerHTML = customCategories.map((category) => `
    <span class="custom-category">
      <span>${esc(category)}</span>
      <button class="del category-delete" type="button" data-category="${esc(category)}" aria-label="Delete ${esc(category)} category" title="Delete ${esc(category)} category">×</button>
    </span>`).join("");
  if (filterCategories.includes(selectedFilter)) $("filterCategory").value = selectedFilter;
  if (categories.includes(selectedCategory)) $("category").value = selectedCategory;
  syncCustomCategoryField();
}

$("category").addEventListener("change", syncCustomCategoryField);

$("customCategories").addEventListener("click", async (ev) => {
  const button = ev.target.closest(".category-delete");
  if (!button) return;
  const category = button.dataset.category;
  if (!category || !confirm(`Delete the "${category}" category? Its expenses will be moved to Other.`)) return;
  try {
    await api("/categories?" + new URLSearchParams({ category }), { method: "DELETE" });
    categories = await api("/categories");
    renderCategoryOptions();
    if ($("category").value === category) $("category").value = BUILT_IN_CATEGORIES[0];
    syncCustomCategoryField();
    toast("Category deleted");
    await refresh();
  } catch (e) {
    toast(e.message);
  }
});

$("expenseForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const err = $("formError"); err.hidden = true;
  const body = {
    title: $("title").value.trim(), amount: parseFloat($("amount").value),
    category: $("category").value, date: $("date").value, note: $("note").value.trim(),
  };
  if (body.category === "Other") {
    body.category = $("customCategory").value.trim();
    if (!body.category) return showErr("Please enter a custom category.");
  }
  if (!body.title) return showErr("Please enter a title.");
  if (!(body.amount > 0)) return showErr("Amount must be greater than 0.");
  if (!body.date) return showErr("Please pick a date.");
  try {
    await api("/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!categories.includes(body.category)) {
      categories.push(body.category);
    }
    renderCategoryOptions();
    $("category").value = body.category;
    syncCustomCategoryField();
    $("title").value = ""; $("amount").value = ""; $("note").value = ""; $("customCategory").value = "";
    toast("Expense added");
    await refresh();
  } catch (e) { showErr(e.message); }
  function showErr(m) { err.textContent = m; err.hidden = false; }
});

$("tbody").addEventListener("click", async (ev) => {
  const btn = ev.target.closest(".del");
  if (!btn) return;
  const e = currentExpenses.find((x) => x.id === +btn.dataset.id);
  if (!confirm(`Delete "${e ? e.title : "this expense"}"?`)) return;
  try { await api("/expenses/" + btn.dataset.id, { method: "DELETE" }); toast("Expense deleted"); await refresh(); }
  catch (er) { toast(er.message); }
});

let debounce;
["filterCategory", "filterStart", "filterEnd"].forEach((id) => $(id).addEventListener("change", refresh));
$("search").addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(refresh, 250); });
$("clearFilters").addEventListener("click", () => {
  $("filterCategory").value = "All"; $("filterStart").value = ""; $("filterEnd").value = ""; $("search").value = "";
  refresh();
});

$("exportCsv").addEventListener("click", () => {
  const rows = [["Date", "Title", "Category", "Amount", "Note"], ...currentExpenses.map((e) => [e.date, e.title, e.category, e.amount, e.note || ""])];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "expenses.csv"; a.click();
  URL.revokeObjectURL(a.href);
});

function applyTheme(theme) {
  const selected = THEMES.includes(theme) ? theme : "system";
  if (selected === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = selected;
  $("themeSelect").value = selected;
  try { localStorage.setItem("theme", selected); } catch {}
}

$("themeSelect").addEventListener("change", () => {
  applyTheme($("themeSelect").value);
  refresh();
});

/* ---------- init ---------- */
(async function init() {
  let savedTheme = "system";
  try { savedTheme = localStorage.getItem("theme") || "system"; } catch {}
  applyTheme(savedTheme);
  $("date").value = new Date().toISOString().slice(0, 10);
  categories = await api("/categories");
  renderCategoryOptions();
  syncCustomCategoryField();
  await refresh();
})();
