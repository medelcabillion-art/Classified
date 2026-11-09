const SUPABASE_URL = "https://gxolslxhzlfqglneyfjh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4b2xzbHhoemxmcWdsbmV5ZmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxOTczNDAsImV4cCI6MjEwOTc3MzM0MH0.6AJ59Otl9flLV13SQ9UxRgP6FhfEOahp2WtSAVfHMpQ";
// =================================================

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (i) => document.getElementById(i);

let cfg = { name: "Outing", amount: 50, start_date: "2026-12-06", weeks: 56 };
let members = [];
let paid = new Set(); // "memberId|YYYY-MM-DD"
let sel = 0;

const key = (m, w) => m + "|" + w;
const peso = (n) => "₱" + Number(n).toLocaleString("en-PH");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

function sundays() {
  const p = cfg.start_date.split("-"), d = new Date(+p[0], p[1] - 1, +p[2]), out = [];
  for (let i = 0; i < cfg.weeks; i++) { out.push(iso(d)); d.setDate(d.getDate() + 7); }
  return out;
}
function fmtD(k, long) {
  const p = k.split("-");
  return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString("en-PH",
    long ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" });
}
function note(t) {
  const n = $("note"); n.textContent = t; n.classList.remove("hide");
  setTimeout(() => n.classList.add("hide"), 4000);
}

// ---------- LOAD DATA ----------
async function load() {
  const [s, m, p] = await Promise.all([
    sb.from("settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("members").select("*").order("created_at"),
    sb.from("payments").select("member_id,sunday"),
  ]);
  if (s.error || m.error || p.error) { note("Load error: " + (s.error || m.error || p.error).message); return; }
  if (s.data) cfg = s.data;
  members = m.data;
  paid = new Set(p.data.map((x) => key(x.member_id, x.sunday)));
  fillCfg(); render();
}

// ---------- RENDER ----------
function render() {
  const wks = sundays(); if (sel >= wks.length) sel = 0;
  $("title").textContent = "🏖️ " + cfg.name + " Payments";
  $("sub").textContent = peso(cfg.amount) + " per Sunday · " + cfg.weeks + " Sundays · " + members.length + " members";
  let total = 0; const perWk = {}; wks.forEach((w) => (perWk[w] = 0));
  members.forEach((m) => wks.forEach((w) => { if (paid.has(key(m.id, w))) { total += cfg.amount; perWk[w] += cfg.amount; } }));
  const target = members.length * cfg.amount * wks.length;
  $("sTotal").textContent = peso(total); $("sTarget").textContent = peso(target);
  $("sBal").textContent = peso(Math.max(0, target - total));
  $("pbar").style.width = (target ? Math.round((total / target) * 100) : 0) + "%";
  const today = iso(new Date()), cur = wks.find((w) => w >= today) || wks[wks.length - 1];
  $("sWk").textContent = peso(perWk[cur] || 0);

  $("tabs").innerHTML = wks.map((w, i) => `<button class="tab${i === sel ? " on" : ""}" data-i="${i}">${fmtD(w)}</button>`).join("");
  const w = wks[sel];
  $("wkTitle").textContent = fmtD(w, true);
  const paidN = members.filter((m) => paid.has(key(m.id, w))).length;
  $("wkSum").textContent = paidN + "/" + members.length + " paid · " + peso(perWk[w]) + " collected";

  $("list").innerHTML = members.length ? members.map((m) => {
    const p = paid.has(key(m.id, w));
    const tp = wks.filter((x) => paid.has(key(m.id, x))).length * cfg.amount;
    return `<div class="row${p ? " paid" : ""}" data-id="${m.id}"><div><div class="n">${esc(m.name)}</div>
      <div class="s">Total paid: ${peso(tp)} · Balance: ${peso(wks.length * cfg.amount - tp)}</div></div>
      <div style="display:flex;align-items:center;gap:6px"><button class="x-btn" data-del="${m.id}" title="Remove">✕</button>
      <div class="chk">${p ? "✓" : ""}</div></div></div>`;
  }).join("") : '<div class="sub">No members yet. Add the first one below.</div>';

  let h = "<thead><tr><th>Name</th>" + wks.map((x) => "<th>" + fmtD(x) + "</th>").join("") + "<th>Total</th></tr></thead><tbody>";
  members.forEach((m) => {
    let t = 0;
    h += "<tr><td>" + esc(m.name) + "</td>" + wks.map((x) => {
      const p = paid.has(key(m.id, x)); if (p) t += cfg.amount;
      return p ? '<td class="y">✓</td>' : '<td class="x">–</td>';
    }).join("") + "<td>" + peso(t) + "</td></tr>";
  });
  h += "</tbody><tfoot><tr><td>Total</td>" + wks.map((x) => "<td>" + peso(perWk[x]) + "</td>").join("") + "<td>" + peso(total) + "</td></tr></tfoot>";
  $("tbl").innerHTML = h;
}
function fillCfg() {
  $("cName").value = cfg.name; $("cAmt").value = cfg.amount;
  $("cStart").value = cfg.start_date; $("cWeeks").value = cfg.weeks;
}

// ---------- ACTIONS ----------
$("tabs").addEventListener("click", (e) => {
  const b = e.target.closest(".tab"); if (b) { sel = +b.dataset.i; render(); }
});

$("list").addEventListener("click", async (e) => {
  const d = e.target.closest("[data-del]");
  if (d) {
    e.stopPropagation();
    if (d.dataset.arm !== "1") { d.dataset.arm = "1"; d.textContent = "Delete?"; setTimeout(render, 2500); return; }
    const { error } = await sb.from("members").delete().eq("id", d.dataset.del);
    if (error) note("Error: " + error.message); else load();
    return;
  }
  const r = e.target.closest(".row"); if (!r) return;
  const id = r.dataset.id, w = sundays()[sel], k = key(id, w);
  if (paid.has(k)) {
    paid.delete(k); render();
    const { error } = await sb.from("payments").delete().eq("member_id", id).eq("sunday", w);
    if (error) { note("Error: " + error.message); load(); }
  } else {
    paid.add(k); render();
    const { error } = await sb.from("payments").insert({ member_id: id, sunday: w });
    if (error) { note("Error: " + error.message); load(); }
  }
});

async function addMember() {
  const v = $("newName").value.trim(); if (!v) return;
  $("newName").value = "";
  const { error } = await sb.from("members").insert({ name: v });
  if (error) note("Error: " + error.message); else load();
}
$("addBtn").onclick = addMember;
$("newName").addEventListener("keydown", (e) => { if (e.key === "Enter") addMember(); });

$("saveCfg").onclick = async () => {
  const row = {
    id: 1,
    name: $("cName").value.trim() || "Outing",
    amount: Math.max(0, +$("cAmt").value || 0),
    start_date: $("cStart").value || cfg.start_date,
    weeks: Math.min(60, Math.max(1, +$("cWeeks").value || 1)),
  };
  const { error } = await sb.from("settings").upsert(row);
  if (error) note("Error: " + error.message); else { cfg = row; render(); note("Settings saved"); }
};

// ---------- LIVE UPDATES (other people's changes show automatically) ----------
sb.channel("live")
  .on("postgres_changes", { event: "*", schema: "public" }, () => load())
  .subscribe();

load();