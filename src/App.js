import { useState, useEffect, useCallback } from "react";
import { saveData, listenData } from "./firebase";

const ADMIN_CODE = "Aigle1899";

const RAW_RESOURCES = [
  { id: "minerai_soufre", name: "Minerai de soufre", unit: "unité", icon: "🟡", color: "#E8C840" },
  { id: "minerai_acier", name: "Minerai d'acier", unit: "unité", icon: "⚙️", color: "#7B8D9E" },
  { id: "minerai_fer", name: "Minerai de fer", unit: "unité", icon: "🔩", color: "#A0522D" },
  { id: "charbon", name: "Charbon", unit: "unité", icon: "⬛", color: "#4A4A4A" },
];

const CRAFTED_PRODUCTS = [
  { id: "lingot_fer", name: "Lingot de fer", unit: "unité", icon: "🟫", color: "#B87333" },
  { id: "lingot_acier", name: "Lingot d'acier", unit: "unité", icon: "🔘", color: "#8FA4B8" },
  { id: "amas_soufre", name: "Amas de soufre", unit: "unité", icon: "💛", color: "#DAA520" },
  { id: "tete_outil", name: "Tête d'outil", unit: "unité", icon: "🔨", color: "#CD853F" },
  { id: "clous", name: "Clous", unit: "unité", icon: "📌", color: "#808080" },
  { id: "jarres", name: "Jarres vides", unit: "unité", icon: "🏺", color: "#C4A882" },
  { id: "pioches", name: "Pioches", unit: "unité", icon: "⛏️", color: "#8B6914" },
];

const ALL_ITEMS = [...RAW_RESOURCES, ...CRAFTED_PRODUCTS];

const RECIPES = [
  { id: "craft_lingot_fer", inputs: [{ itemId: "minerai_fer", qty: 5 }], outputs: [{ itemId: "lingot_fer", qty: 1 }], description: "5 minerais de fer → 1 lingot de fer" },
  { id: "craft_lingot_acier", inputs: [{ itemId: "minerai_acier", qty: 5 }], outputs: [{ itemId: "lingot_acier", qty: 1 }], description: "5 minerais d'acier → 1 lingot d'acier" },
  { id: "craft_amas_soufre", inputs: [{ itemId: "minerai_soufre", qty: 5 }], outputs: [{ itemId: "amas_soufre", qty: 1 }], description: "5 minerais de soufre → 1 amas de soufre" },
  { id: "craft_tete_outil", inputs: [{ itemId: "lingot_acier", qty: 2 }], outputs: [{ itemId: "tete_outil", qty: 1 }], description: "2 lingots d'acier → 1 tête d'outil" },
  { id: "craft_clous", inputs: [{ itemId: "lingot_fer", qty: 5 }], outputs: [{ itemId: "clous", qty: 50 }], description: "5 lingots de fer → 50 clous" },
  { id: "craft_jarres", inputs: [{ itemId: "lingot_fer", qty: 2 }], outputs: [{ itemId: "jarres", qty: 20 }], description: "2 lingots de fer → 20 jarres vides" },
];

const PRICE_INFO = {
  minerai_soufre: { min: 1, max: 1.2, export: false },
  amas_soufre: { min: 1, max: 1.2, export: true },
  lingot_fer: { min: 1.3, max: 1.5, export: true },
  lingot_acier: { min: 1.4, max: 1.6, export: true },
  charbon: { min: 0.8, max: 1, export: true },
  tete_outil: { min: 3, max: 3.3, export: false },
  clous: { min: 0, max: 0.2, export: false },
  jarres: { min: 0, max: 0.05, export: false },
  pioches: { min: null, max: null, export: false, libre: true },
  minerai_fer: { min: null, max: null, export: false, libre: true },
  minerai_acier: { min: null, max: null, export: false, libre: true },
};

const EXPENSE_CATEGORIES = ["Pioches & Outils","Dynamite & Explosifs","Bois de soutènement","Équipement de sécurité","Transport & Chariots","Salaires","Nourriture & Provisions","Matériel divers","Taxes"];

const initState = () => ({ employees: [], productions: [], crafts: [], contracts: [], sales: [], expenses: [], stockAdjustments: [] });
function gid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function fmtDate(ts) { if (!ts) return "—"; return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }); }
function fmtDT(ts) { if (!ts) return "—"; const d = new Date(ts); return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

function computeStocks(data) {
  const s = {};
  ALL_ITEMS.forEach(r => { s[r.id] = 0; });
  (data.productions || []).forEach(p => { s[p.resourceId] = (s[p.resourceId] || 0) + p.quantity; });
  (data.crafts || []).forEach(c => {
    const recipe = RECIPES.find(r => r.id === c.recipeId);
    if (!recipe) return;
    recipe.inputs.forEach(inp => { s[inp.itemId] = (s[inp.itemId] || 0) - (inp.qty * c.multiplier); });
    recipe.outputs.forEach(out => { s[out.itemId] = (s[out.itemId] || 0) + (out.qty * c.multiplier); });
  });
  (data.sales || []).forEach(x => { s[x.resourceId] = (s[x.resourceId] || 0) - x.quantity; });
  (data.stockAdjustments || []).forEach(a => { s[a.itemId] = (s[a.itemId] || 0) + a.quantity; });
  return s;
}

// Storage is handled by firebase.js (saveData + listenData)

const C = {
  bg: "#0D0906", card: "#1A120A", border: "#3D2B1A", goldDk: "#7A5C1F", gold: "#C9A84C", goldLt: "#E8D5A3",
  text: "#CBBFA0", muted: "#7A6B52", dark: "#4A3E2E", accent: "#8B3A1A", accentLt: "#C45A2A",
  green: "#5A8F4A", greenLt: "#7BBF65", red: "#9B3030", redLt: "#C45050",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Crimson+Text:wght@400;600;700&display=swap');
* { box-sizing: border-box; }
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: ${C.bg}; }
::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .6; } }
@keyframes grain { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-2%,-1%)} 50%{transform:translate(1%,2%)} 75%{transform:translate(-1%,-2%)} }
`;

const inp = { background: "rgba(26,18,10,0.9)", border: `2px solid ${C.border}`, borderRadius: 3, color: C.goldLt, padding: "14px 16px", width: "100%", fontSize: 17, fontFamily: "'Crimson Text',serif", outline: "none", boxSizing: "border-box" };
const sel = { ...inp, cursor: "pointer" };
const btnP = { background: `linear-gradient(180deg,${C.accent},#5C2010)`, border: `2px solid ${C.accentLt}`, borderRadius: 3, color: "#FFF3E0", padding: "14px 28px", cursor: "pointer", fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", textShadow: "0 1px 2px rgba(0,0,0,.5)" };
const btnS = { background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, color: C.muted, padding: "12px 20px", cursor: "pointer", fontFamily: "'Crimson Text',serif", fontSize: 16 };
const btnD = { background: "transparent", border: `1px solid ${C.red}`, borderRadius: 3, color: C.redLt, padding: "8px 14px", cursor: "pointer", fontFamily: "'Crimson Text',serif", fontSize: 14 };

function Card({ children, style = {} }) {
  return (
    <div style={{ border: `2px solid ${C.border}`, borderRadius: 4, background: `linear-gradient(145deg,${C.card},#120D07)`, position: "relative", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(201,168,76,.08)", ...style }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 18, height: 18, borderTop: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}`, opacity: .4 }} />
      <div style={{ position: "absolute", top: 0, right: 0, width: 18, height: 18, borderTop: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}`, opacity: .4 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 18, height: 18, borderBottom: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}`, opacity: .4 }} />
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderBottom: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}`, opacity: .4 }} />
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${C.goldDk},transparent)` }} /><span style={{ color: C.goldDk, fontSize: 14 }}>✦</span><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${C.goldDk},transparent)` }} /></div>;
}

function Title({ icon, children }) {
  return <div style={{ marginBottom: 20 }}><h3 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 800, color: C.gold, letterSpacing: 1, textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>{icon} {children}</h3><div style={{ marginTop: 8, height: 2, background: `linear-gradient(90deg,${C.gold},transparent)`, borderRadius: 1 }} /></div>;
}

function PTag({ id, big }) {
  const i = PRICE_INFO[id]; if (!i) return null;
  const fs = big ? 15 : 13;
  if (i.libre) return <span style={{ color: C.muted, fontSize: fs, fontStyle: "italic" }}>Prix libre</span>;
  if (i.min == null) return null;
  return <span style={{ fontSize: fs, color: C.gold }}>${i.min.toFixed(2)} – ${i.max.toFixed(2)}{i.export && <span style={{ color: C.greenLt, marginLeft: 6, fontSize: fs - 1, fontWeight: 700 }}> EXPORT</span>}</span>;
}

function PriceReminder({ rid }) {
  const i = PRICE_INFO[rid]; if (!i) return null;
  const it = ALL_ITEMS.find(x => x.id === rid);
  return (
    <div style={{ background: "rgba(201,168,76,.06)", border: `1px solid ${C.goldDk}`, borderRadius: 3, padding: "10px 14px", marginTop: 8 }}>
      <span style={{ color: C.muted, fontSize: 15 }}>💲 Fourchette pour <strong style={{ color: C.goldLt }}>{it?.name}</strong> : </span>
      {i.libre ? <span style={{ color: C.gold, fontWeight: 700 }}>Prix libre</span> : <span style={{ color: C.gold, fontWeight: 700, fontSize: 17 }}>${i.min?.toFixed(2)} – ${i.max?.toFixed(2)}</span>}
      {i.export && <span style={{ color: C.greenLt, marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(Exportateur ✓)</span>}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, border: `2px solid ${C.gold}`, borderRadius: 6, maxWidth: 580, width: "100%", maxHeight: "88vh", overflow: "auto", padding: 32, boxShadow: `0 0 60px rgba(201,168,76,.15)`, animation: "fadeIn .3s ease-out" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 26, cursor: "pointer" }}>✕</button>
        </div>
        <Divider />
        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  );
}

function Row({ children, style = {} }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", ...style }}>{children}</div>;
}

// ── EMPLOYEE VIEW ──
function EmployeeView({ name, data, setData }) {
  const [rid, setRid] = useState(RAW_RESOURCES[0].id);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [editId, setEditId] = useState(null);
  const [editRid, setEditRid] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editNote, setEditNote] = useState("");
  const my = data.productions.filter(p => p.employeeName.toLowerCase() === name.toLowerCase()).sort((a, b) => b.timestamp - a.timestamp);

  const submit = async () => {
    const q = parseFloat(qty); if (!q || q <= 0) return;
    const updated = { ...data, productions: [...data.productions, { id: gid(), employeeName: name, resourceId: rid, quantity: q, note: note.trim(), timestamp: Date.now() }] };
    setData(updated); await saveData(updated); setQty(""); setNote("");
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setEditRid(p.resourceId);
    setEditQty(String(p.quantity));
    setEditNote(p.note || "");
  };

  const cancelEdit = () => { setEditId(null); };

  const saveEdit = async () => {
    const q = parseFloat(editQty); if (!q || q <= 0) return;
    const updated = { ...data, productions: data.productions.map(p => p.id === editId ? { ...p, resourceId: editRid, quantity: q, note: editNote.trim() } : p) };
    setData(updated); await saveData(updated); setEditId(null);
  };

  const deleteProd = async (id) => {
    const updated = { ...data, productions: data.productions.filter(p => p.id !== id) };
    setData(updated); await saveData(updated);
    if (editId === id) setEditId(null);
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🤠</div>
        <p style={{ color: C.muted, fontSize: 20, margin: 0 }}>Bienvenue, <span style={{ color: C.gold, fontWeight: 700, fontSize: 26, fontFamily: "'Playfair Display',serif" }}>{name}</span></p>
      </div>
      <Card>
        <div style={{ padding: 28 }}>
          <h3 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>⛏️ Déclarer une production</h3>
          <Divider />
          <div style={{ display: "grid", gap: 18, marginTop: 16 }}>
            <div><label style={{ color: C.muted, fontSize: 16, display: "block", marginBottom: 6, fontWeight: 600 }}>Ressource extraite</label><select value={rid} onChange={e => setRid(e.target.value)} style={sel}>{RAW_RESOURCES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}</select></div>
            <div><label style={{ color: C.muted, fontSize: 16, display: "block", marginBottom: 6, fontWeight: 600 }}>Quantité</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Ex: 10" style={inp} min="0" step="1" /></div>
            <div><label style={{ color: C.muted, fontSize: 16, display: "block", marginBottom: 6, fontWeight: 600 }}>Note (optionnel)</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Filon nord" style={inp} /></div>
            <button onClick={submit} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>ENREGISTRER LA PRODUCTION</button>
          </div>
        </div>
      </Card>
      <div style={{ marginTop: 32 }}>
        <Title icon="📋">Mes productions récentes</Title>
        {my.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucune production enregistrée.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{my.slice(0, 30).map(p => { const r = ALL_ITEMS.find(x => x.id === p.resourceId);

            if (editId === p.id) {
              return (
                <Card key={p.id} style={{ border: `2px solid ${C.accentLt}` }}>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ color: C.gold, fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif" }}>✏️ Modifier cette production</span>
                      <span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(p.timestamp)}</span>
                    </div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div><label style={{ color: C.muted, fontSize: 14, display: "block", marginBottom: 4 }}>Ressource</label><select value={editRid} onChange={e => setEditRid(e.target.value)} style={sel}>{RAW_RESOURCES.map(r2 => <option key={r2.id} value={r2.id}>{r2.icon} {r2.name}</option>)}</select></div>
                      <div><label style={{ color: C.muted, fontSize: 14, display: "block", marginBottom: 4 }}>Quantité</label><input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} style={inp} min="0" step="1" /></div>
                      <div><label style={{ color: C.muted, fontSize: 14, display: "block", marginBottom: 4 }}>Note</label><input value={editNote} onChange={e => setEditNote(e.target.value)} style={inp} /></div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={saveEdit} style={{ ...btnP, flex: 1, padding: "12px 20px" }}>SAUVEGARDER</button>
                        <button onClick={cancelEdit} style={{ ...btnS, flex: 1, padding: "12px 20px" }}>ANNULER</button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            }

            return (
              <Row key={p.id}>
                <div><span style={{ color: r?.color, fontWeight: 700, fontSize: 18 }}>{r?.icon} {r?.name}</span><span style={{ color: C.goldLt, marginLeft: 12, fontSize: 20, fontWeight: 700 }}>×{p.quantity}</span>{p.note && <span style={{ color: C.dark, marginLeft: 12, fontSize: 15 }}>— {p.note}</span>}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(p.timestamp)}</span>
                  <button onClick={() => startEdit(p)} style={{ ...btnS, padding: "4px 10px", fontSize: 13, color: C.gold, borderColor: C.goldDk }}>✏️</button>
                  <button onClick={() => deleteProd(p.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button>
                </div>
              </Row>
            );
          })}</div>}
      </div>
    </div>
  );
}

// ── ADMIN ──
function Admin({ data, setData }) {
  const [tab, setTab] = useState("stocks");
  const [modal, setModal] = useState(null);
  const [newEmp, setNewEmp] = useState("");
  const [newEmpTelegram, setNewEmpTelegram] = useState("");
  const [editEmpId, setEditEmpId] = useState(null);
  const [editTelegram, setEditTelegram] = useState("");
  const [salaryEmpId, setSalaryEmpId] = useState(null);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryNote, setSalaryNote] = useState("");
  const [editSaleId, setEditSaleId] = useState(null);
  const [editSaleQty, setEditSaleQty] = useState("");
  const [cf, setCf] = useState({ buyer: "", resourceId: ALL_ITEMS[0].id, quantity: "", pricePerUnit: "", notes: "" });
  const [sf, setSf] = useState({ contractId: "", quantity: "" });
  const [ef, setEf] = useState({ category: EXPENSE_CATEGORIES[0], amount: "", description: "" });
  const [pf, setPf] = useState({ employeeName: "", resourceId: RAW_RESOURCES[0].id, quantity: "", note: "" });
  const [cr, setCr] = useState(RECIPES[0].id);
  const [cm, setCm] = useState("1");
  const [adjItem, setAdjItem] = useState(ALL_ITEMS[0].id);
  const [adjQty, setAdjQty] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const stocks = computeStocks(data);

  // ── Weekly bilan helpers ──
  function getWeekBounds(offset) {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + (offset * 7));
    monday.setHours(0, 0, 1, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday.getTime(), end: sunday.getTime(), mondayDate: new Date(monday), sundayDate: new Date(sunday) };
  }
  const week = getWeekBounds(weekOffset);
  const fmtShort = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const weekSales = data.sales.filter(s => s.timestamp >= week.start && s.timestamp <= week.end);
  const weekExpenses = data.expenses.filter(e => e.timestamp >= week.start && e.timestamp <= week.end);
  const weekRev = weekSales.reduce((s, x) => s + x.totalPrice, 0);
  const weekExp = weekExpenses.reduce((s, x) => s + x.amount, 0);
  const weekProfit = weekRev - weekExp;
  const tabs = [
    { id: "stocks", l: "📦 Stocks" }, { id: "employees", l: "🤠 Employés" }, { id: "productions", l: "⛏️ Extractions" },
    { id: "craft", l: "🔨 Fabrication" }, { id: "contracts", l: "📜 Contrats" }, { id: "sales", l: "💰 Ventes" },
    { id: "expenses", l: "🧾 Dépenses" }, { id: "summary", l: "📊 Bilan" }, { id: "prices", l: "💲 Tarifs" },
  ];

  const addEmp = async () => { if (!newEmp.trim()) return; if (data.employees.find(e => e.name.toLowerCase() === newEmp.trim().toLowerCase())) return; const u = { ...data, employees: [...data.employees, { id: gid(), name: newEmp.trim(), telegram: newEmpTelegram.trim(), joinedAt: Date.now() }] }; setData(u); await saveData(u); setNewEmp(""); setNewEmpTelegram(""); };
  const rmEmp = async (id) => { const u = { ...data, employees: data.employees.filter(e => e.id !== id) }; setData(u); await saveData(u); };
  const rm = async (col, id) => { const u = { ...data, [col]: data[col].filter(x => x.id !== id) }; setData(u); await saveData(u); };

  const saveTelegram = async (empId) => {
    const u = { ...data, employees: data.employees.map(e => e.id === empId ? { ...e, telegram: editTelegram.trim() } : e) };
    setData(u); await saveData(u); setEditEmpId(null);
  };

  const paySalary = async (empId) => {
    const a = parseFloat(salaryAmount); if (!a || a <= 0) return;
    const emp = data.employees.find(e => e.id === empId);
    const expense = { id: gid(), category: "Salaires", amount: a, description: `Salaire — ${emp?.name}${salaryNote ? ` (${salaryNote})` : ""}`, employeeId: empId, timestamp: Date.now() };
    const u = { ...data, expenses: [...data.expenses, expense] };
    setData(u); await saveData(u); setSalaryEmpId(null); setSalaryAmount(""); setSalaryNote("");
  };

  const editSale = async (saleId) => {
    const newQty = parseFloat(editSaleQty); if (!newQty || newQty <= 0) return;
    const sale = data.sales.find(s => s.id === saleId); if (!sale) return;
    const diff = newQty - sale.quantity;
    const updatedSales = data.sales.map(s => s.id === saleId ? { ...s, quantity: newQty, totalPrice: newQty * s.pricePerUnit } : s);
    const updatedContracts = data.contracts.map(c => {
      if (c.id === sale.contractId) {
        const newDelivered = c.deliveredQuantity + diff;
        return { ...c, deliveredQuantity: newDelivered, status: newDelivered >= c.totalQuantity ? "completed" : "active" };
      }
      return c;
    });
    const u = { ...data, sales: updatedSales, contracts: updatedContracts };
    setData(u); await saveData(u); setEditSaleId(null); setEditSaleQty("");
  };

  const addContract = async () => {
    const q = parseFloat(cf.quantity), p = parseFloat(cf.pricePerUnit);
    if (!cf.buyer.trim() || !q || !p) return;
    const u = { ...data, contracts: [...data.contracts, { id: gid(), buyer: cf.buyer.trim(), resourceId: cf.resourceId, totalQuantity: q, deliveredQuantity: 0, pricePerUnit: p, notes: cf.notes.trim(), status: "active", createdAt: Date.now() }] };
    setData(u); await saveData(u); setCf({ buyer: "", resourceId: ALL_ITEMS[0].id, quantity: "", pricePerUnit: "", notes: "" }); setModal(null);
  };

  const doSale = async () => {
    const q = parseFloat(sf.quantity); if (!sf.contractId || !q || q <= 0) return;
    const con = data.contracts.find(c => c.id === sf.contractId); if (!con) return;
    if ((stocks[con.resourceId] || 0) < q) { alert("Stock insuffisant !"); return; }
    const rem = con.totalQuantity - con.deliveredQuantity; if (q > rem) { alert(`Reste ${rem} sur ce contrat`); return; }
    const sale = { id: gid(), contractId: con.id, resourceId: con.resourceId, quantity: q, pricePerUnit: con.pricePerUnit, totalPrice: q * con.pricePerUnit, buyer: con.buyer, timestamp: Date.now() };
    const uc = data.contracts.map(c => c.id === con.id ? { ...c, deliveredQuantity: c.deliveredQuantity + q, status: (c.deliveredQuantity + q >= c.totalQuantity) ? "completed" : "active" } : c);
    const u = { ...data, sales: [...data.sales, sale], contracts: uc }; setData(u); await saveData(u); setSf({ contractId: "", quantity: "" }); setModal(null);
  };

  const addExp = async () => { const a = parseFloat(ef.amount); if (!a || !ef.description.trim()) return; const u = { ...data, expenses: [...data.expenses, { id: gid(), category: ef.category, amount: a, description: ef.description.trim(), timestamp: Date.now() }] }; setData(u); await saveData(u); setEf({ category: EXPENSE_CATEGORIES[0], amount: "", description: "" }); setModal(null); };

  const addProd = async () => { const q = parseFloat(pf.quantity); if (!pf.employeeName || !q || q <= 0) return; const u = { ...data, productions: [...data.productions, { id: gid(), employeeName: pf.employeeName, resourceId: pf.resourceId, quantity: q, note: pf.note.trim() || "Ajouté par le patron", timestamp: Date.now() }] }; setData(u); await saveData(u); setPf({ employeeName: "", resourceId: RAW_RESOURCES[0].id, quantity: "", note: "" }); setModal(null); };

  const doCraft = async () => {
    const recipe = RECIPES.find(r => r.id === cr); const mult = parseInt(cm) || 1;
    if (!recipe || mult < 1) return;
    for (const i of recipe.inputs) { if ((stocks[i.itemId] || 0) < i.qty * mult) { const it = ALL_ITEMS.find(x => x.id === i.itemId); alert(`Stock insuffisant de ${it?.name} : besoin de ${i.qty * mult}, stock ${Math.floor(stocks[i.itemId] || 0)}`); return; } }
    const u = { ...data, crafts: [...(data.crafts || []), { id: gid(), recipeId: recipe.id, multiplier: mult, timestamp: Date.now() }] };
    setData(u); await saveData(u); setCm("1");
  };

  const adjustStock = async () => {
    const q = parseFloat(adjQty); if (!q) return;
    const adj = { id: gid(), itemId: adjItem, quantity: q, note: adjNote.trim() || "Ajustement manuel", timestamp: Date.now() };
    const u = { ...data, stockAdjustments: [...(data.stockAdjustments || []), adj] };
    setData(u); await saveData(u); setAdjQty(""); setAdjNote(""); setModal(null);
  };

  const totalRev = data.sales.reduce((s, x) => s + x.totalPrice, 0);
  const totalExp = data.expenses.reduce((s, x) => s + x.amount, 0);
  const profit = totalRev - totalExp;
  const selRecipe = RECIPES.find(r => r.id === cr);
  const cMult = parseInt(cm) || 1;
  const sellable = ALL_ITEMS.filter(i => PRICE_INFO[i.id]);

  const lbl = (t) => <label style={{ color: C.muted, fontSize: 16, display: "block", marginBottom: 6, fontWeight: 600 }}>{t}</label>;

  return (
    <div style={{ padding: "0 28px 32px" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "16px 0", marginBottom: 24, borderBottom: `2px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? `linear-gradient(180deg,rgba(139,58,26,.3),rgba(139,58,26,.1))` : "transparent",
            border: `2px solid ${tab === t.id ? C.accentLt : C.border}`, borderRadius: 3,
            color: tab === t.id ? C.gold : C.muted, padding: "10px 14px", cursor: "pointer",
            fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: tab === t.id ? 700 : 400, whiteSpace: "nowrap",
          }}>{t.l}</button>
        ))}
      </div>

      {/* STOCKS */}
      {tab === "stocks" && <div style={{ animation: "fadeIn .4s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <Title icon="📦">Stocks</Title>
          <button onClick={() => setModal("adjustStock")} style={btnP}>±  AJUSTER UN STOCK</button>
        </div>
        <Title icon="⛏️">Matières Premières</Title>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 32 }}>
          {RAW_RESOURCES.map(r => <Card key={r.id}><div style={{ padding: 28, textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 8 }}>{r.icon}</div><div style={{ color: r.color, fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700 }}>{r.name}</div><div style={{ color: C.goldLt, fontSize: 44, fontFamily: "'Playfair Display',serif", fontWeight: 900, marginTop: 10, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>{Math.floor(stocks[r.id] || 0)}</div><div style={{ marginTop: 8 }}><PTag id={r.id} big /></div></div></Card>)}
        </div>
        <Title icon="🔨">Produits Fabriqués</Title>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 32 }}>
          {CRAFTED_PRODUCTS.map(r => <Card key={r.id}><div style={{ padding: 28, textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 8 }}>{r.icon}</div><div style={{ color: r.color, fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700 }}>{r.name}</div><div style={{ color: C.goldLt, fontSize: 44, fontFamily: "'Playfair Display',serif", fontWeight: 900, marginTop: 10, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>{Math.floor(stocks[r.id] || 0)}</div><div style={{ marginTop: 8 }}><PTag id={r.id} big /></div></div></Card>)}
        </div>
        {/* Adjustment history */}
        {(data.stockAdjustments || []).length > 0 && <>
          <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Historique des ajustements</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...(data.stockAdjustments || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30).map(a => {
              const it = ALL_ITEMS.find(x => x.id === a.itemId);
              return <Row key={a.id}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 17 }}>
                  <span style={{ color: a.quantity > 0 ? C.greenLt : C.redLt, fontWeight: 700, fontSize: 20 }}>{a.quantity > 0 ? "+" : ""}{a.quantity}</span>
                  <span style={{ color: it?.color }}>{it?.icon} {it?.name}</span>
                  {a.note && <span style={{ color: C.dark }}>— {a.note}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(a.timestamp)}</span>
                  <button onClick={() => rm("stockAdjustments", a.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button>
                </div>
              </Row>;
            })}
          </div>
        </>}
      </div>}

      {/* EMPLOYEES */}
      {tab === "employees" && <div style={{ animation: "fadeIn .4s" }}>
        <Title icon="🤠">Employés ({data.employees.length})</Title>
        <Card style={{ marginBottom: 24 }}><div style={{ padding: 22 }}>
          <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Ajouter un employé</h4>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={newEmp} onChange={e => setNewEmp(e.target.value)} placeholder="Nom de l'employé" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && addEmp()} />
              <input value={newEmpTelegram} onChange={e => setNewEmpTelegram(e.target.value)} placeholder="N° Télégramme (optionnel)" style={{ ...inp, flex: 1 }} />
            </div>
            <button onClick={addEmp} style={btnP}>AJOUTER</button>
          </div>
        </div></Card>
        {data.employees.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucun employé.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.employees.map(emp => {
              const tots = {}; data.productions.filter(p => p.employeeName.toLowerCase() === emp.name.toLowerCase()).forEach(p => { tots[p.resourceId] = (tots[p.resourceId] || 0) + p.quantity; });
              const empSalaries = data.expenses.filter(e => e.employeeId === emp.id && e.category === "Salaires");
              const totalSalary = empSalaries.reduce((s, e) => s + e.amount, 0);
              return <Card key={emp.id}><div style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.goldLt, fontWeight: 700, fontSize: 22, fontFamily: "'Playfair Display',serif" }}>{emp.name}</div>
                    <div style={{ color: C.dark, fontSize: 15, marginTop: 4 }}>Embauché le {fmtDate(emp.joinedAt)}</div>

                    {/* Telegram */}
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: C.muted, fontSize: 14 }}>📨 Télégramme :</span>
                      {editEmpId === emp.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input value={editTelegram} onChange={e => setEditTelegram(e.target.value)} style={{ ...inp, padding: "6px 10px", fontSize: 14, width: 160 }} />
                          <button onClick={() => saveTelegram(emp.id)} style={{ ...btnP, padding: "6px 12px", fontSize: 12 }}>OK</button>
                          <button onClick={() => setEditEmpId(null)} style={{ ...btnS, padding: "6px 10px", fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <span>
                          <span style={{ color: emp.telegram ? C.goldLt : C.dark, fontSize: 15 }}>{emp.telegram || "Non renseigné"}</span>
                          <button onClick={() => { setEditEmpId(emp.id); setEditTelegram(emp.telegram || ""); }} style={{ ...btnS, padding: "2px 8px", fontSize: 12, marginLeft: 6, color: C.gold, borderColor: C.goldDk }}>✏️</button>
                        </span>
                      )}
                    </div>

                    {/* Production totals */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                      {Object.entries(tots).map(([id, q]) => { const r = ALL_ITEMS.find(x => x.id === id); return <span key={id} style={{ background: "rgba(201,168,76,.1)", border: `1px solid ${C.border}`, padding: "5px 14px", borderRadius: 3, fontSize: 16, color: r?.color, fontWeight: 600 }}>{r?.icon} ×{Math.floor(q)}</span>; })}
                    </div>

                    {/* Salary section */}
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(0,0,0,.2)", borderRadius: 4, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: C.muted, fontSize: 15 }}>💰 Total salaires versés : <strong style={{ color: C.gold, fontSize: 18 }}>${totalSalary.toFixed(2)}</strong></span>
                        <button onClick={() => { setSalaryEmpId(salaryEmpId === emp.id ? null : emp.id); setSalaryAmount(""); setSalaryNote(""); }} style={{ ...btnP, padding: "6px 14px", fontSize: 12 }}>{salaryEmpId === emp.id ? "ANNULER" : "+ SALAIRE"}</button>
                      </div>
                      {salaryEmpId === emp.id && (
                        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                          <input type="number" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} placeholder="Montant ($)" style={inp} min="0" step="0.01" />
                          <input value={salaryNote} onChange={e => setSalaryNote(e.target.value)} placeholder="Note (optionnel)" style={inp} />
                          <button onClick={() => paySalary(emp.id)} style={{ ...btnP, padding: "10px 20px" }}>VERSER LE SALAIRE</button>
                        </div>
                      )}
                      {empSalaries.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          {empSalaries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).map(s => (
                            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                              <span style={{ color: C.muted }}>{fmtDT(s.timestamp)} — <strong style={{ color: C.redLt }}>${s.amount.toFixed(2)}</strong>{s.description.includes("(") && <span style={{ color: C.dark }}> {s.description.split("(").slice(1).join("(").replace(")", "")}</span>}</span>
                              <button onClick={() => rm("expenses", s.id)} style={{ ...btnD, padding: "2px 8px", fontSize: 11 }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => rmEmp(emp.id)} style={{ ...btnD, marginLeft: 12 }}>✕</button>
                </div>
              </div></Card>;
            })}
          </div>}
      </div>}

      {/* PRODUCTIONS */}
      {tab === "productions" && <div style={{ animation: "fadeIn .4s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}><Title icon="⛏️">Historique des Extractions</Title><button onClick={() => setModal("addProd")} style={btnP}>+ EXTRACTION</button></div>
        {data.productions.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucune extraction.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...data.productions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50).map(p => { const r = ALL_ITEMS.find(x => x.id === p.resourceId); return (
              <Row key={p.id}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: C.gold, fontWeight: 700, fontSize: 18, minWidth: 120, fontFamily: "'Playfair Display',serif" }}>{p.employeeName}</span>
                  <span style={{ color: r?.color, fontSize: 17 }}>{r?.icon} ×{p.quantity} {r?.name}</span>
                  {p.note && <span style={{ color: C.dark, fontSize: 14 }}>({p.note})</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(p.timestamp)}</span><button onClick={() => rm("productions", p.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button></div>
              </Row>); })}
          </div>}
      </div>}

      {/* CRAFT */}
      {tab === "craft" && <div style={{ animation: "fadeIn .4s" }}>
        <Title icon="🔨">Atelier de Fabrication</Title>
        <Card><div style={{ padding: 28 }}>
          <div style={{ display: "grid", gap: 18 }}>
            <div>{lbl("Recette")}<select value={cr} onChange={e => setCr(e.target.value)} style={sel}>{RECIPES.map(r => <option key={r.id} value={r.id}>{r.description}</option>)}</select></div>
            <div>{lbl("Nombre de fois")}<input type="number" value={cm} onChange={e => setCm(e.target.value)} min="1" step="1" style={inp} /></div>
            {selRecipe && <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 4, padding: 22, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.redLt, fontSize: 17, marginBottom: 10, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>Consomme :</div>
              {selRecipe.inputs.map(i => { const it = ALL_ITEMS.find(x => x.id === i.itemId); const need = i.qty * cMult; const av = stocks[i.itemId] || 0; const ok = av >= need; return <div key={i.itemId} style={{ color: ok ? C.goldLt : C.redLt, fontSize: 17, marginBottom: 6 }}>{it?.icon} <strong>{need}</strong> {it?.name} <span style={{ color: C.dark, fontSize: 14 }}>(stock: {Math.floor(av)})</span>{!ok && <span style={{ color: C.redLt, fontWeight: 700, marginLeft: 6 }}>⚠ INSUFFISANT</span>}</div>; })}
              <Divider />
              <div style={{ color: C.greenLt, fontSize: 17, marginTop: 10, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>Produit :</div>
              {selRecipe.outputs.map(o => { const it = ALL_ITEMS.find(x => x.id === o.itemId); return <div key={o.itemId} style={{ color: C.greenLt, fontSize: 20, marginTop: 6, fontWeight: 700 }}>{it?.icon} <strong>{o.qty * cMult}</strong> {it?.name}</div>; })}
            </div>}
            <button onClick={doCraft} style={{ ...btnP, fontSize: 17, padding: "16px 32px" }}>🔨 FABRIQUER</button>
          </div>
        </div></Card>
        <div style={{ marginTop: 32 }}>
          <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Historique</h4>
          {(!data.crafts || data.crafts.length === 0) ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucune fabrication.</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...(data.crafts || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30).map(c => { const recipe = RECIPES.find(r => r.id === c.recipeId); return <Row key={c.id}><div style={{ fontSize: 17 }}><span style={{ color: C.goldLt }}>🔨 </span><span style={{ color: C.gold, fontWeight: 700, fontSize: 20 }}>×{c.multiplier}</span><span style={{ color: C.muted, marginLeft: 12 }}>{recipe?.description}</span></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(c.timestamp)}</span><button onClick={() => rm("crafts", c.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button></div></Row>; })}
            </div>}
        </div>
      </div>}

      {/* CONTRACTS */}
      {tab === "contracts" && <div style={{ animation: "fadeIn .4s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}><Title icon="📜">Contrats</Title><button onClick={() => setModal("addContract")} style={btnP}>+ CONTRAT</button></div>
        {data.contracts.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucun contrat.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[...data.contracts].sort((a, b) => b.createdAt - a.createdAt).map(c => {
              const r = ALL_ITEMS.find(x => x.id === c.resourceId);
              const prog = c.totalQuantity > 0 ? (c.deliveredQuantity / c.totalQuantity * 100) : 0;
              const pi = PRICE_INFO[c.resourceId];
              const inRange = pi && !pi.libre && pi.min != null ? (c.pricePerUnit >= pi.min && c.pricePerUnit <= pi.max) : true;
              return <Card key={c.id}><div style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ color: C.goldLt, fontWeight: 700, fontSize: 22, fontFamily: "'Playfair Display',serif" }}>{c.buyer}</span>
                    <span style={{ padding: "5px 14px", borderRadius: 3, fontSize: 14, fontWeight: 700, background: c.status === "completed" ? "rgba(90,143,74,.2)" : "rgba(201,168,76,.15)", color: c.status === "completed" ? C.greenLt : C.gold, border: `1px solid ${c.status === "completed" ? C.green : C.goldDk}` }}>{c.status === "completed" ? "✓ COMPLÉTÉ" : "EN COURS"}</span>
                  </div>
                  <button onClick={() => rm("contracts", c.id)} style={{ ...btnD, padding: "4px 12px", fontSize: 13 }}>✕</button>
                </div>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ color: r?.color, fontSize: 20 }}>{r?.icon} {r?.name}</span>
                  <span style={{ color: C.goldLt, fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{c.deliveredQuantity} / {c.totalQuantity}</span>
                  <span style={{ color: C.muted, fontSize: 17 }}>@ <strong style={{ color: inRange ? C.gold : C.redLt }}>${c.pricePerUnit.toFixed(2)}</strong> /unité</span>
                </div>
                {/* Price range reminder */}
                <div style={{ marginTop: 12, background: "rgba(201,168,76,.06)", border: `1px solid ${C.border}`, borderRadius: 3, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: C.dark, fontSize: 15 }}>💲 Fourchette :</span>
                  {pi?.libre ? <span style={{ color: C.gold, fontWeight: 600 }}>Prix libre</span> : pi?.min != null ? <span style={{ color: C.gold, fontWeight: 700, fontSize: 17 }}>${pi.min.toFixed(2)} – ${pi.max.toFixed(2)}</span> : <span style={{ color: C.dark }}>Non défini</span>}
                  {pi?.export && <span style={{ color: C.greenLt, fontSize: 13, fontWeight: 700 }}>EXPORT</span>}
                  {!inRange && <span style={{ color: C.redLt, fontSize: 14, fontWeight: 700 }}>⚠ Hors fourchette</span>}
                </div>
                {c.notes && <div style={{ color: C.dark, fontSize: 15, marginTop: 10, fontStyle: "italic" }}>"{c.notes}"</div>}
                <div style={{ marginTop: 14, background: "rgba(0,0,0,.3)", borderRadius: 4, height: 14, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${prog}%`, background: c.status === "completed" ? `linear-gradient(90deg,${C.green},${C.greenLt})` : `linear-gradient(90deg,${C.accent},${C.accentLt})` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 16 }}>
                  <span style={{ color: C.dark }}>Livré : <strong style={{ color: C.greenLt }}>${(c.deliveredQuantity * c.pricePerUnit).toFixed(2)}</strong></span>
                  <span style={{ color: C.dark }}>Total : <strong style={{ color: C.gold }}>${(c.totalQuantity * c.pricePerUnit).toFixed(2)}</strong></span>
                </div>
              </div></Card>;
            })}
          </div>}
      </div>}

      {/* SALES */}
      {tab === "sales" && <div style={{ animation: "fadeIn .4s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}><Title icon="💰">Ventes</Title><button onClick={() => setModal("addSale")} style={btnP}>+ VENTE</button></div>
        {data.sales.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucune vente.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...data.sales].sort((a, b) => b.timestamp - a.timestamp).map(s => { const r = ALL_ITEMS.find(x => x.id === s.resourceId);
              if (editSaleId === s.id) {
                return <Card key={s.id} style={{ border: `2px solid ${C.accentLt}` }}><div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: C.gold, fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif" }}>✏️ Corriger la quantité</span>
                    <span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(s.timestamp)} — {s.buyer}</span>
                  </div>
                  <div style={{ color: C.muted, fontSize: 15, marginBottom: 8 }}>{r?.icon} {r?.name} — Quantité actuelle : <strong style={{ color: C.goldLt }}>{s.quantity}</strong> @ ${s.pricePerUnit.toFixed(2)}/u</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="number" value={editSaleQty} onChange={e => setEditSaleQty(e.target.value)} placeholder="Nouvelle quantité" style={{ ...inp, flex: 1 }} min="0" step="1" />
                    <button onClick={() => editSale(s.id)} style={{ ...btnP, padding: "12px 20px" }}>CORRIGER</button>
                    <button onClick={() => setEditSaleId(null)} style={{ ...btnS, padding: "12px 16px" }}>ANNULER</button>
                  </div>
                  {editSaleQty && <div style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Nouveau total : <strong style={{ color: C.greenLt }}>${((parseFloat(editSaleQty) || 0) * s.pricePerUnit).toFixed(2)}</strong> (diff stock : {((parseFloat(editSaleQty) || 0) - s.quantity) > 0 ? "+" : ""}{((parseFloat(editSaleQty) || 0) - s.quantity)})</div>}
                </div></Card>;
              }
              return <Row key={s.id}><div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 18 }}><span style={{ color: C.greenLt, fontWeight: 700, fontSize: 22 }}>${s.totalPrice.toFixed(2)}</span><span style={{ color: C.dark }}>—</span><span style={{ color: r?.color }}>{r?.icon} ×{s.quantity} {r?.name}</span><span style={{ color: C.muted }}>→ {s.buyer}</span></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(s.timestamp)}</span><button onClick={() => { setEditSaleId(s.id); setEditSaleQty(String(s.quantity)); }} style={{ ...btnS, padding: "4px 10px", fontSize: 13, color: C.gold, borderColor: C.goldDk }}>✏️</button><button onClick={() => rm("sales", s.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button></div></Row>;
            })}
          </div>}
      </div>}

      {/* EXPENSES */}
      {tab === "expenses" && <div style={{ animation: "fadeIn .4s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}><Title icon="🧾">Dépenses</Title><button onClick={() => setModal("addExpense")} style={btnP}>+ DÉPENSE</button></div>
        {data.expenses.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucune dépense.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...data.expenses].sort((a, b) => b.timestamp - a.timestamp).map(x => <Row key={x.id}><div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 18 }}><span style={{ color: C.redLt, fontWeight: 700, fontSize: 22 }}>-${x.amount.toFixed(2)}</span><span style={{ color: C.dark }}>—</span><span style={{ color: C.muted, fontWeight: 600 }}>{x.category}</span><span style={{ color: C.dark }}>{x.description}</span></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(x.timestamp)}</span><button onClick={() => rm("expenses", x.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button></div></Row>)}
          </div>}
      </div>}

      {/* PRICES */}
      {tab === "prices" && <div style={{ animation: "fadeIn .4s" }}>
        <Title icon="💲">Grille Tarifaire</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ALL_ITEMS.filter(i => PRICE_INFO[i.id]).map(item => { const i = PRICE_INFO[item.id]; return <Card key={item.id}><div style={{ padding: "20px 26px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 32 }}>{item.icon}</span><span style={{ color: item.color, fontWeight: 700, fontSize: 20, fontFamily: "'Playfair Display',serif" }}>{item.name}</span></div>
            <div style={{ textAlign: "right" }}>
              {i.libre ? <span style={{ color: C.muted, fontSize: 17, fontStyle: "italic" }}>Prix libre</span> : <span style={{ color: C.goldLt, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700 }}>${i.min?.toFixed(2)} – ${i.max?.toFixed(2)}</span>}
              {i.export && <div style={{ marginTop: 6 }}><span style={{ color: C.greenLt, fontSize: 14, fontWeight: 700, background: "rgba(90,143,74,.15)", padding: "4px 12px", borderRadius: 3, border: `1px solid ${C.green}` }}>Exportateur ✓</span></div>}
            </div>
          </div></Card>; })}
        </div>
      </div>}

      {/* SUMMARY */}
      {tab === "summary" && <div style={{ animation: "fadeIn .4s" }}>
        <Title icon="📊">Bilan Financier</Title>

        {/* Week navigator */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setWeekOffset(weekOffset - 1)} style={{ ...btnS, fontSize: 20, padding: "8px 18px" }}>◀</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700 }}>
                {weekOffset === 0 ? "📅 Semaine en cours" : `📅 Semaine du ${fmtShort(week.mondayDate)}`}
              </div>
              <div style={{ color: C.muted, fontSize: 15, marginTop: 4 }}>
                Lundi {fmtShort(week.mondayDate)} → Dimanche {fmtShort(week.sundayDate)}
              </div>
            </div>
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0} style={{ ...btnS, fontSize: 20, padding: "8px 18px", opacity: weekOffset >= 0 ? 0.3 : 1 }}>▶</button>
          </div>
        </Card>

        {/* Weekly totals */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 32 }}>
          <Card><div style={{ padding: 30, textAlign: "center" }}><div style={{ color: C.dark, fontSize: 17, marginBottom: 8, fontWeight: 600 }}>Recettes (semaine)</div><div style={{ color: C.greenLt, fontSize: 42, fontFamily: "'Playfair Display',serif", fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>${weekRev.toFixed(2)}</div></div></Card>
          <Card><div style={{ padding: 30, textAlign: "center" }}><div style={{ color: C.dark, fontSize: 17, marginBottom: 8, fontWeight: 600 }}>Dépenses (semaine)</div><div style={{ color: C.redLt, fontSize: 42, fontFamily: "'Playfair Display',serif", fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>${weekExp.toFixed(2)}</div></div></Card>
          <Card><div style={{ padding: 30, textAlign: "center" }}><div style={{ color: C.dark, fontSize: 17, marginBottom: 8, fontWeight: 600 }}>Bénéfice (semaine)</div><div style={{ color: weekProfit >= 0 ? C.greenLt : C.redLt, fontSize: 42, fontFamily: "'Playfair Display',serif", fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>{weekProfit >= 0 ? "+" : ""}${weekProfit.toFixed(2)}</div></div></Card>
        </div>

        {/* Weekly sales detail */}
        <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Ventes de la semaine ({weekSales.length})</h4>
        {weekSales.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17, marginBottom: 24 }}>Aucune vente cette semaine.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {weekSales.sort((a, b) => b.timestamp - a.timestamp).map(s => { const r = ALL_ITEMS.find(x => x.id === s.resourceId); return <Row key={s.id}><div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 17 }}><span style={{ color: C.greenLt, fontWeight: 700, fontSize: 20 }}>${s.totalPrice.toFixed(2)}</span><span style={{ color: C.dark }}>—</span><span style={{ color: r?.color }}>{r?.icon} ×{s.quantity} {r?.name}</span><span style={{ color: C.muted }}>→ {s.buyer}</span></div><span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(s.timestamp)}</span></Row>; })}
          </div>}

        {/* Weekly expenses detail */}
        <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Dépenses de la semaine ({weekExpenses.length})</h4>
        {weekExpenses.length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17, marginBottom: 24 }}>Aucune dépense cette semaine.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {weekExpenses.sort((a, b) => b.timestamp - a.timestamp).map(x => <Row key={x.id}><div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontSize: 17 }}><span style={{ color: C.redLt, fontWeight: 700, fontSize: 20 }}>-${x.amount.toFixed(2)}</span><span style={{ color: C.dark }}>—</span><span style={{ color: C.muted, fontWeight: 600 }}>{x.category}</span><span style={{ color: C.dark }}>{x.description}</span></div><span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(x.timestamp)}</span></Row>)}
          </div>}

        {/* Weekly expenses by category */}
        <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Dépenses par catégorie (semaine)</h4>
        {(() => { const bc = {}; weekExpenses.forEach(e => { bc[e.category] = (bc[e.category] || 0) + e.amount; }); const en = Object.entries(bc).sort((a, b) => b[1] - a[1]); if (!en.length) return <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17, marginBottom: 24 }}>Aucune.</p>; return <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>{en.map(([c, a]) => <Row key={c}><span style={{ color: C.goldLt, fontSize: 17 }}>{c}</span><span style={{ color: C.redLt, fontWeight: 700, fontSize: 18 }}>${a.toFixed(2)}</span></Row>)}</div>; })()}

        {/* Global totals */}
        <Divider />
        <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "16px 0 14px" }}>Totaux depuis l'ouverture</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, marginBottom: 24 }}>
          <Card><div style={{ padding: 20, textAlign: "center" }}><div style={{ color: C.dark, fontSize: 15, marginBottom: 4 }}>Recettes totales</div><div style={{ color: C.greenLt, fontSize: 28, fontFamily: "'Playfair Display',serif", fontWeight: 900 }}>${totalRev.toFixed(2)}</div></div></Card>
          <Card><div style={{ padding: 20, textAlign: "center" }}><div style={{ color: C.dark, fontSize: 15, marginBottom: 4 }}>Dépenses totales</div><div style={{ color: C.redLt, fontSize: 28, fontFamily: "'Playfair Display',serif", fontWeight: 900 }}>${totalExp.toFixed(2)}</div></div></Card>
          <Card><div style={{ padding: 20, textAlign: "center" }}><div style={{ color: C.dark, fontSize: 15, marginBottom: 4 }}>Bénéfice total</div><div style={{ color: profit >= 0 ? C.greenLt : C.redLt, fontSize: 28, fontFamily: "'Playfair Display',serif", fontWeight: 900 }}>{profit >= 0 ? "+" : ""}${profit.toFixed(2)}</div></div></Card>
        </div>

        <h4 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>Contrats actifs</h4>
        {data.contracts.filter(c => c.status === "active").length === 0 ? <p style={{ color: C.dark, fontStyle: "italic", fontSize: 17 }}>Aucun.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {data.contracts.filter(c => c.status === "active").map(c => { const r = ALL_ITEMS.find(x => x.id === c.resourceId); const rem = c.totalQuantity - c.deliveredQuantity; return <Row key={c.id}><div style={{ fontSize: 18 }}><span style={{ color: C.goldLt, fontWeight: 700 }}>{c.buyer}</span><span style={{ color: C.muted, marginLeft: 14 }}>reste {rem} {r?.name}</span><span style={{ color: C.greenLt, marginLeft: 14, fontWeight: 700 }}>(${(rem * c.pricePerUnit).toFixed(2)})</span></div></Row>; })}
          </div>}
      </div>}

      {/* MODALS */}
      <Modal open={modal === "addContract"} onClose={() => setModal(null)} title="Nouveau Contrat">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Acheteur")}<input value={cf.buyer} onChange={e => setCf({ ...cf, buyer: e.target.value })} placeholder="Nom" style={inp} /></div>
          <div>{lbl("Produit")}<select value={cf.resourceId} onChange={e => setCf({ ...cf, resourceId: e.target.value })} style={sel}>{sellable.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}</select><PriceReminder rid={cf.resourceId} /></div>
          <div>{lbl("Quantité")}<input type="number" value={cf.quantity} onChange={e => setCf({ ...cf, quantity: e.target.value })} placeholder="Ex: 50" style={inp} min="0" /></div>
          <div>{lbl("Prix par unité ($)")}<input type="number" value={cf.pricePerUnit} onChange={e => setCf({ ...cf, pricePerUnit: e.target.value })} placeholder="Ex: 1.50" style={inp} min="0" step="0.01" /></div>
          <div>{lbl("Notes")}<input value={cf.notes} onChange={e => setCf({ ...cf, notes: e.target.value })} placeholder="Détails" style={inp} /></div>
          <button onClick={addContract} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>CRÉER LE CONTRAT</button>
        </div>
      </Modal>

      <Modal open={modal === "addSale"} onClose={() => setModal(null)} title="Enregistrer une Vente">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Contrat")}<select value={sf.contractId} onChange={e => setSf({ ...sf, contractId: e.target.value })} style={sel}><option value="">— Sélectionner —</option>{data.contracts.filter(c => c.status === "active").map(c => { const r = ALL_ITEMS.find(x => x.id === c.resourceId); return <option key={c.id} value={c.id}>{c.buyer} — {r?.name} (reste {c.totalQuantity - c.deliveredQuantity})</option>; })}</select></div>
          <div>{lbl("Quantité livrée")}<input type="number" value={sf.quantity} onChange={e => setSf({ ...sf, quantity: e.target.value })} placeholder="Quantité" style={inp} min="0" step="1" /></div>
          {sf.contractId && (() => { const c = data.contracts.find(x => x.id === sf.contractId); const r = ALL_ITEMS.find(x => x.id === c?.resourceId); const q = parseFloat(sf.quantity) || 0; return c ? <div style={{ background: "rgba(0,0,0,.3)", padding: 18, borderRadius: 4, border: `1px solid ${C.border}` }}><div style={{ color: C.muted, fontSize: 16, marginBottom: 6 }}>Stock : <strong style={{ color: C.goldLt }}>{Math.floor(stocks[c.resourceId] || 0)} {r?.name}</strong></div><div style={{ color: C.muted, fontSize: 16 }}>Montant : <strong style={{ color: C.greenLt, fontSize: 22 }}>${(q * c.pricePerUnit).toFixed(2)}</strong></div></div> : null; })()}
          <button onClick={doSale} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>ENREGISTRER</button>
        </div>
      </Modal>

      <Modal open={modal === "addExpense"} onClose={() => setModal(null)} title="Nouvelle Dépense">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Catégorie")}<select value={ef.category} onChange={e => setEf({ ...ef, category: e.target.value })} style={sel}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div>{lbl("Montant ($)")}<input type="number" value={ef.amount} onChange={e => setEf({ ...ef, amount: e.target.value })} placeholder="Ex: 15" style={inp} min="0" step="0.01" /></div>
          <div>{lbl("Description")}<input value={ef.description} onChange={e => setEf({ ...ef, description: e.target.value })} placeholder="Ex: 3 pioches neuves" style={inp} /></div>
          <button onClick={addExp} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>AJOUTER</button>
        </div>
      </Modal>

      <Modal open={modal === "addProd"} onClose={() => setModal(null)} title="Ajouter une Extraction">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Employé")}<select value={pf.employeeName} onChange={e => setPf({ ...pf, employeeName: e.target.value })} style={sel}><option value="">— Sélectionner —</option>{data.employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
          <div>{lbl("Ressource")}<select value={pf.resourceId} onChange={e => setPf({ ...pf, resourceId: e.target.value })} style={sel}>{RAW_RESOURCES.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}</select></div>
          <div>{lbl("Quantité")}<input type="number" value={pf.quantity} onChange={e => setPf({ ...pf, quantity: e.target.value })} placeholder="Quantité" style={inp} min="0" step="1" /></div>
          <div>{lbl("Note")}<input value={pf.note} onChange={e => setPf({ ...pf, note: e.target.value })} placeholder="Optionnel" style={inp} /></div>
          <button onClick={addProd} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>AJOUTER</button>
        </div>
      </Modal>

      <Modal open={modal === "adjustStock"} onClose={() => setModal(null)} title="Ajuster un stock manuellement">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Objet")}<select value={adjItem} onChange={e => setAdjItem(e.target.value)} style={sel}>{ALL_ITEMS.map(r => { const st = stocks[r.id] || 0; return <option key={r.id} value={r.id}>{r.icon} {r.name} (stock: {Math.floor(st)})</option>; })}</select></div>
          <div style={{ background: "rgba(0,0,0,.3)", padding: 14, borderRadius: 4, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.muted, fontSize: 15 }}>Stock actuel de <strong style={{ color: C.goldLt }}>{ALL_ITEMS.find(x => x.id === adjItem)?.name}</strong> :</div>
            <div style={{ color: C.gold, fontSize: 28, fontFamily: "'Playfair Display',serif", fontWeight: 900, marginTop: 4 }}>{Math.floor(stocks[adjItem] || 0)}</div>
          </div>
          <div>{lbl("Ajustement (+ pour ajouter, - pour retirer)")}<input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="Ex: 10 ou -5" style={inp} /></div>
          {adjQty && <div style={{ color: C.muted, fontSize: 15 }}>Nouveau stock : <strong style={{ color: (Math.floor(stocks[adjItem] || 0) + (parseFloat(adjQty) || 0)) >= 0 ? C.greenLt : C.redLt, fontSize: 20 }}>{Math.floor(stocks[adjItem] || 0) + (parseFloat(adjQty) || 0)}</strong></div>}
          <div>{lbl("Raison")}<input value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Ex: Correction inventaire, Achat pioches..." style={inp} /></div>
          <button onClick={adjustStock} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>APPLIQUER L'AJUSTEMENT</button>
        </div>
      </Modal>
    </div>
  );
}

// ── MAIN ──
export default function App() {
  const [data, setData] = useState(initState());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(null);
  const [ln, setLn] = useState("");
  const [ac, setAc] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const unsubscribe = listenData((val) => {
      if (val) {
        setData({
          employees: val.employees || [],
          productions: val.productions || [],
          crafts: val.crafts || [],
          contracts: val.contracts || [],
          sales: val.sales || [],
          expenses: val.expenses || [],
          stockAdjustments: val.stockAdjustments || [],
        });
      }
      setLoading(false);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const empLogin = () => { if (!ln.trim()) { setErr("Entrez votre nom."); return; } if (!data.employees.find(e => e.name.toLowerCase() === ln.trim().toLowerCase())) { setErr("Employé non trouvé. Demandez au patron de vous ajouter."); return; } setView("employee"); setErr(""); };
  const admLogin = () => { if (ac !== ADMIN_CODE) { setErr("Code incorrect."); return; } setView("admin"); setErr(""); };
  const logout = () => { setView(null); setLn(""); setAc(""); setErr(""); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.gold, fontFamily: "'Playfair Display',serif" }}>
      <style>{CSS}</style>
      <div style={{ textAlign: "center", animation: "pulse 2s infinite" }}><div style={{ fontSize: 72, marginBottom: 16 }}>🦅</div><div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 3 }}>CHARGEMENT...</div></div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Crimson Text',serif", position: "relative" }}>
      <style>{CSS}</style>
      {/* Film grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, opacity: .035, background: "repeating-linear-gradient(0deg,rgba(0,0,0,.1) 0px,transparent 1px,transparent 2px)", animation: "grain .5s steps(1) infinite" }} />
      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998, background: "radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.55) 100%)" }} />

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg,#1A120A,${C.bg})`, borderBottom: `3px solid ${C.goldDk}`, padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", bottom: -3, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${C.gold}40,transparent)` }} />
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, letterSpacing: 4, color: C.gold, textShadow: "0 2px 8px rgba(0,0,0,.5), 0 0 30px rgba(201,168,76,.15)" }}>🦅 MINE DE L'AIGLE</h1>
          <p style={{ margin: "4px 0 0", color: C.dark, fontSize: 15, letterSpacing: 4, fontFamily: "'Playfair Display',serif", textTransform: "uppercase" }}>Gestion des Opérations Minières</p>
        </div>
        {view && <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: C.muted, fontSize: 17, fontWeight: 600 }}>{view === "admin" ? "🎩 Patron" : `🤠 ${ln}`}</span>
          <button onClick={logout} style={btnS}>Déconnexion</button>
        </div>}
      </div>

      {/* LOGIN */}
      {!view && <div style={{ maxWidth: 520, margin: "70px auto", padding: "0 24px", animation: "fadeIn .6s ease-out" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 88, marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,.5))" }}>🦅</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", color: C.gold, fontSize: 30, margin: 0, fontWeight: 900, letterSpacing: 3, textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>CONNEXION</h2>
          <Divider />
          <p style={{ color: C.dark, fontSize: 18, marginTop: 12 }}>Identifiez-vous pour accéder à la mine</p>
        </div>
        {err && <div style={{ background: "rgba(155,48,48,.15)", border: `2px solid ${C.red}`, borderRadius: 4, padding: "12px 18px", marginBottom: 20, color: C.redLt, fontSize: 17, fontWeight: 600 }}>⚠ {err}</div>}
        <Card style={{ marginBottom: 24 }}><div style={{ padding: 28 }}>
          <h3 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>🤠 Employé</h3>
          <div style={{ display: "flex", gap: 10 }}><input value={ln} onChange={e => setLn(e.target.value)} placeholder="Votre nom" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && empLogin()} /><button onClick={empLogin} style={btnP}>ENTRER</button></div>
        </div></Card>
        <div style={{ margin: "24px 0", textAlign: "center" }}><Divider /></div>
        <Card><div style={{ padding: 28 }}>
          <h3 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>🎩 Patron</h3>
          <div style={{ display: "flex", gap: 10 }}><input type="password" value={ac} onChange={e => setAc(e.target.value)} placeholder="Code d'accès" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && admLogin()} /><button onClick={admLogin} style={btnP}>ENTRER</button></div>
        </div></Card>
      </div>}

      {view === "employee" && <div style={{ maxWidth: 800, margin: "0 auto", animation: "fadeIn .4s" }}><EmployeeView name={ln.trim()} data={data} setData={setData} /></div>}
      {view === "admin" && <div style={{ maxWidth: 1050, margin: "0 auto", animation: "fadeIn .4s" }}><Admin data={data} setData={setData} /></div>}
    </div>
  );
}