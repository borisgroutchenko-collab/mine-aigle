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
  { id: "amas_soufre", name: "Soufre", unit: "unité", icon: "💛", color: "#DAA520" },
  { id: "tete_outil", name: "Tête d'outil", unit: "unité", icon: "🔨", color: "#CD853F" },
  { id: "clous", name: "Clous", unit: "unité", icon: "📌", color: "#808080" },
  { id: "jarres", name: "Jarres vides", unit: "unité", icon: "🏺", color: "#C4A882" },
  { id: "pioches", name: "Pioches", unit: "unité", icon: "⛏️", color: "#8B6914" },
  { id: "divers", name: "Produits divers", unit: "unité", icon: "📦", color: "#A0896B" },
];

const ALL_ITEMS = [...RAW_RESOURCES, ...CRAFTED_PRODUCTS];

const RECIPES = [
  { id: "craft_lingot_fer", inputs: [{ itemId: "minerai_fer", qty: 5 }], outputs: [{ itemId: "lingot_fer", qty: 1 }], description: "5 minerais de fer → 1 lingot de fer" },
  { id: "craft_lingot_acier", inputs: [{ itemId: "minerai_acier", qty: 5 }], outputs: [{ itemId: "lingot_acier", qty: 1 }], description: "5 minerais d'acier → 1 lingot d'acier" },
  { id: "craft_amas_soufre", inputs: [{ itemId: "minerai_soufre", qty: 5 }], outputs: [{ itemId: "amas_soufre", qty: 1 }], description: "5 minerais de soufre → 1 soufre" },
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
  divers: { min: null, max: null, export: false, libre: true },
};

const BBL_PRICES = {
  charbon: 0.385,
  amas_soufre: 0.485,
  lingot_acier: 0.685,
  lingot_fer: 0.635,
};

const SALARY_RATES = {
  charbon: { rate: 0.485, label: "Charbon" },
  minerai_fer: { rate: 0.127, label: "Minerai de fer" },
  minerai_acier: { rate: 0.137, label: "Minerai d'acier" },
  minerai_soufre: { rate: 0.097, label: "Minerai de soufre" },
};

const WORK_CONTRACT = {
  pay: 150,
  duration: "1 heure / jour",
  requirements: [
    { resourceId: "minerai_fer", minQty: 2500, label: "Minerai de fer" },
    { resourceId: "minerai_acier", minQty: 2500, label: "Minerai d'acier" },
  ],
};

const EXPENSE_CATEGORIES = ["Pioches & Outils","Dynamite & Explosifs","Bois de soutènement","Équipement de sécurité","Transport & Chariots","Salaires","Nourriture & Provisions","Matériel divers","Taxes"];

const initState = () => ({ employees: [], productions: [], crafts: [], contracts: [], sales: [], expenses: [], stockAdjustments: [] });
function gid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function num(v) { return num(String(v).replace(",", ".")); }
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
  const bbl = BBL_PRICES[rid];
  return (
    <div style={{ background: "rgba(201,168,76,.06)", border: `1px solid ${C.goldDk}`, borderRadius: 3, padding: "10px 14px", marginTop: 8 }}>
      <div><span style={{ color: C.muted, fontSize: 15 }}>💲 Fourchette pour <strong style={{ color: C.goldLt }}>{it?.name}</strong> : </span>
      {i.libre ? <span style={{ color: C.gold, fontWeight: 700 }}>Prix libre</span> : <span style={{ color: C.gold, fontWeight: 700, fontSize: 17 }}>${i.min?.toFixed(2)} – ${i.max?.toFixed(2)}</span>}
      {i.export && <span style={{ color: C.greenLt, marginLeft: 8, fontSize: 12, fontWeight: 700 }}>(Exportateur ✓)</span>}</div>
      {bbl && <div style={{ marginTop: 6 }}><span style={{ color: C.muted, fontSize: 14 }}>📦 Rachat BBL : </span><span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 16 }}>${bbl.toFixed(3)}</span></div>}
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
  const [editConId, setEditConId] = useState(null);
  const [editCon, setEditCon] = useState({ buyer: "", items: [], notes: "" });
  const [editProdId, setEditProdId] = useState(null);
  const [editProd, setEditProd] = useState({ employeeName: "", resourceId: "", quantity: "", note: "" });
  const [cf, setCf] = useState({ buyer: "", items: [{ resourceId: "minerai_soufre", quantity: "", pricePerUnit: "" }], notes: "" });
  const [sf, setSf] = useState({ contractId: "", itemId: "", quantity: "" });
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
    const a = num(salaryAmount) || WORK_CONTRACT.pay;
    if (!a || a <= 0) return;
    const emp = data.employees.find(e => e.id === empId);
    const note = salaryNote || (num(salaryAmount) ? "" : "Contrat journalier");
    const expense = { id: gid(), category: "Salaires", amount: a, description: `Salaire — ${emp?.name}${note ? ` (${note})` : ""}`, employeeId: empId, timestamp: Date.now() };
    const u = { ...data, expenses: [...data.expenses, expense] };
    setData(u); await saveData(u); setSalaryEmpId(null); setSalaryAmount(""); setSalaryNote("");
  };

  const editSale = async (saleId) => {
    const newQty = num(editSaleQty); if (!newQty || newQty <= 0) return;
    const sale = data.sales.find(s => s.id === saleId); if (!sale) return;
    const diff = newQty - sale.quantity;
    const updatedSales = data.sales.map(s => s.id === saleId ? { ...s, quantity: newQty, totalPrice: newQty * s.pricePerUnit } : s);
    const updatedContracts = data.contracts.map(c => {
      if (c.id === sale.contractId) {
        // Multi-item: update the specific item line
        if (c.items) {
          const updItems = c.items.map(i => i.id === sale.itemLineId ? { ...i, deliveredQuantity: (i.deliveredQuantity || 0) + diff } : i);
          const allDone = updItems.every(i => (i.deliveredQuantity || 0) >= i.totalQuantity);
          return { ...c, items: updItems, status: allDone ? "completed" : "active" };
        }
        // Legacy single-item fallback
        const newDel = (c.deliveredQuantity || 0) + diff;
        return { ...c, deliveredQuantity: newDel, status: newDel >= c.totalQuantity ? "completed" : "active" };
      }
      return c;
    });
    const u = { ...data, sales: updatedSales, contracts: updatedContracts };
    setData(u); await saveData(u); setEditSaleId(null); setEditSaleQty("");
  };

  const addContract = async () => {
    if (!cf.buyer.trim()) return;
    const items = cf.items.filter(i => num(i.quantity) > 0 && num(i.pricePerUnit) > 0).map(i => ({
      id: gid(), resourceId: i.resourceId, totalQuantity: num(i.quantity), deliveredQuantity: 0, pricePerUnit: num(i.pricePerUnit)
    }));
    if (items.length === 0) return;
    const contract = { id: gid(), buyer: cf.buyer.trim(), items, notes: cf.notes.trim(), status: "active", createdAt: Date.now() };
    const u = { ...data, contracts: [...data.contracts, contract] };
    setData(u); await saveData(u); setCf({ buyer: "", items: [{ resourceId: "minerai_soufre", quantity: "", pricePerUnit: "" }], notes: "" }); setModal(null);
  };

  const doSale = async () => {
    const q = num(sf.quantity); if (!sf.contractId || !sf.itemId || !q || q <= 0) return;
    const con = data.contracts.find(c => c.id === sf.contractId); if (!con) return;
    const item = (con.items || []).find(i => i.id === sf.itemId); if (!item) return;
    if (item.resourceId !== "divers" && (stocks[item.resourceId] || 0) < q) { alert("Stock insuffisant !"); return; }
    const rem = item.totalQuantity - item.deliveredQuantity; if (q > rem) { alert(`Reste ${rem} sur cette ligne`); return; }
    const sale = { id: gid(), contractId: con.id, itemLineId: item.id, resourceId: item.resourceId, quantity: q, pricePerUnit: item.pricePerUnit, totalPrice: q * item.pricePerUnit, buyer: con.buyer, timestamp: Date.now() };
    const updatedItems = con.items.map(i => i.id === item.id ? { ...i, deliveredQuantity: i.deliveredQuantity + q } : i);
    const allDone = updatedItems.every(i => i.deliveredQuantity >= i.totalQuantity);
    const uc = data.contracts.map(c => c.id === con.id ? { ...c, items: updatedItems, status: allDone ? "completed" : "active" } : c);
    const u = { ...data, sales: [...data.sales, sale], contracts: uc }; setData(u); await saveData(u); setSf({ contractId: "", itemId: "", quantity: "" }); setModal(null);
  };

  const addExp = async () => {
    const a = num(ef.amount); if (!a || !ef.description.trim()) return;
    const u = { ...data, expenses: [...data.expenses, { id: gid(), category: ef.category, amount: a, description: ef.description.trim(), timestamp: Date.now() }] };
    setData(u); await saveData(u); setEf({ category: EXPENSE_CATEGORIES[0], amount: "", description: "" }); setModal(null);
  };

  const addProd = async () => { const q = num(pf.quantity); if (!pf.employeeName || !q || q <= 0) return; const u = { ...data, productions: [...data.productions, { id: gid(), employeeName: pf.employeeName, resourceId: pf.resourceId, quantity: q, note: pf.note.trim() || "Ajouté par le patron", timestamp: Date.now() }] }; setData(u); await saveData(u); setPf({ employeeName: "", resourceId: RAW_RESOURCES[0].id, quantity: "", note: "" }); setModal(null); };

  const saveProd = async () => {
    const delta = num(editProd.correction); if (isNaN(delta) || delta === 0) return;
    const prod = data.productions.find(p => p.id === editProdId); if (!prod) return;
    const newQty = prod.quantity + delta;
    if (newQty <= 0) { alert("La quantité ne peut pas être négative ou nulle."); return; }
    const u = { ...data, productions: data.productions.map(p => p.id === editProdId ? { ...p, quantity: newQty } : p) };
    setData(u); await saveData(u); setEditProdId(null);
  };

  const doCraft = async () => {
    const recipe = RECIPES.find(r => r.id === cr); const mult = parseInt(cm) || 1;
    if (!recipe || mult < 1) return;
    for (const i of recipe.inputs) { if ((stocks[i.itemId] || 0) < i.qty * mult) { const it = ALL_ITEMS.find(x => x.id === i.itemId); alert(`Stock insuffisant de ${it?.name} : besoin de ${i.qty * mult}, stock ${Math.floor(stocks[i.itemId] || 0)}`); return; } }
    const u = { ...data, crafts: [...(data.crafts || []), { id: gid(), recipeId: recipe.id, multiplier: mult, timestamp: Date.now() }] };
    setData(u); await saveData(u); setCm("1");
  };

  const adjustStock = async () => {
    const target = num(adjQty); if (isNaN(target) || target < 0) return;
    const current = stocks[adjItem] || 0;
    const diff = target - current;
    if (diff === 0) { setModal(null); return; }
    const adj = { id: gid(), itemId: adjItem, quantity: diff, note: adjNote.trim() || `Correction stock → ${target}`, timestamp: Date.now() };
    const u = { ...data, stockAdjustments: [...(data.stockAdjustments || []), adj] };
    setData(u); await saveData(u); setAdjQty(""); setAdjNote(""); setModal(null);
  };

  const saveContract = async () => {
    if (!editCon.buyer.trim()) return;
    const items = editCon.items.filter(i => num(i.totalQuantity) > 0 && num(i.pricePerUnit) > 0).map(i => ({
      ...i, totalQuantity: num(i.totalQuantity), pricePerUnit: num(i.pricePerUnit), deliveredQuantity: i.deliveredQuantity || 0
    }));
    if (items.length === 0) return;
    const allDone = items.every(i => i.deliveredQuantity >= i.totalQuantity);
    const u = { ...data, contracts: data.contracts.map(c => c.id === editConId ? { ...c, buyer: editCon.buyer.trim(), items, notes: editCon.notes.trim(), status: allDone ? "completed" : "active" } : c) };
    setData(u); await saveData(u); setEditConId(null);
  };

  const totalRev = data.sales.reduce((s, x) => s + x.totalPrice, 0);
  const totalExp = data.expenses.reduce((s, x) => s + x.amount, 0);
  const profit = totalRev - totalExp;
  const selRecipe = RECIPES.find(r => r.id === cr);
  const cMult = parseInt(cm) || 1;
  const sellable = ALL_ITEMS.filter(i => PRICE_INFO[i.id] && i.id !== "minerai_fer" && i.id !== "minerai_acier");

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
          <button onClick={() => setModal("adjustStock")} style={btnP}>CORRIGER UN STOCK</button>
        </div>
        <Title icon="⛏️">Matières Premières</Title>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 32 }}>
          {RAW_RESOURCES.map(r => <Card key={r.id}><div style={{ padding: 28, textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 8 }}>{r.icon}</div><div style={{ color: r.color, fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700 }}>{r.name}</div><div style={{ color: C.goldLt, fontSize: 44, fontFamily: "'Playfair Display',serif", fontWeight: 900, marginTop: 10, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>{Math.floor(stocks[r.id] || 0)}</div><div style={{ marginTop: 8 }}><PTag id={r.id} big /></div></div></Card>)}
        </div>
        <Title icon="🔨">Produits Fabriqués</Title>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 32 }}>
          {CRAFTED_PRODUCTS.map(r => <Card key={r.id}><div style={{ padding: 28, textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 8 }}>{r.icon}</div><div style={{ color: r.color, fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700 }}>{r.name}</div><div style={{ color: C.goldLt, fontSize: 44, fontFamily: "'Playfair Display',serif", fontWeight: 900, marginTop: 10, textShadow: "0 2px 8px rgba(0,0,0,.3)" }}>{Math.floor(stocks[r.id] || 0)}</div><div style={{ marginTop: 8 }}><PTag id={r.id} big /></div></div></Card>)}
        </div>
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
                    <div style={{ marginTop: 12, padding: "14px", background: "rgba(0,0,0,.2)", borderRadius: 4, border: `1px solid ${C.border}` }}>
                      <div style={{ color: C.gold, fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif", marginBottom: 8 }}>📋 Contrat de travail — {WORK_CONTRACT.duration}</div>
                      <div style={{ color: C.muted, fontSize: 14, marginBottom: 10 }}>Paye : <strong style={{ color: C.greenLt }}>${WORK_CONTRACT.pay.toFixed(2)}</strong> / jour — Conditions :</div>

                      {/* Check today's production against requirements */}
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayStart = today.getTime();
                        const todayEnd = todayStart + 86400000;
                        const todayProds = data.productions.filter(p => p.employeeName.toLowerCase() === emp.name.toLowerCase() && p.timestamp >= todayStart && p.timestamp < todayEnd);
                        const todayTots = {};
                        todayProds.forEach(p => { todayTots[p.resourceId] = (todayTots[p.resourceId] || 0) + p.quantity; });

                        const allMet = WORK_CONTRACT.requirements.every(r => (todayTots[r.resourceId] || 0) >= r.minQty);

                        return <>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {WORK_CONTRACT.requirements.map(req => {
                              const got = todayTots[req.resourceId] || 0;
                              const met = got >= req.minQty;
                              const item = ALL_ITEMS.find(x => x.id === req.resourceId);
                              return <div key={req.resourceId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: met ? "rgba(90,143,74,.1)" : "rgba(155,48,48,.1)", borderRadius: 3, border: `1px solid ${met ? C.green : C.red}` }}>
                                <span style={{ color: item?.color, fontSize: 15 }}>{item?.icon} {req.label}</span>
                                <span style={{ color: met ? C.greenLt : C.redLt, fontWeight: 700, fontSize: 15 }}>{Math.floor(got)} / {req.minQty} {met ? "✓" : "✗"}</span>
                              </div>;
                            })}
                          </div>
                          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: allMet ? C.greenLt : C.redLt, fontWeight: 700, fontSize: 15 }}>{allMet ? "✓ Quotas atteints aujourd'hui" : "✗ Quotas non atteints"}</span>
                            <button onClick={() => paySalary(emp.id)} disabled={!allMet} style={{ ...btnP, padding: "8px 18px", fontSize: 13, opacity: allMet ? 1 : 0.4, cursor: allMet ? "pointer" : "not-allowed" }}>VALIDER LA PAYE ${WORK_CONTRACT.pay}</button>
                          </div>
                        </>;
                      })()}

                      {/* Salary history + manual salary */}
                      <Divider />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ color: C.muted, fontSize: 15 }}>💰 Total versé : <strong style={{ color: C.gold, fontSize: 18 }}>${totalSalary.toFixed(2)}</strong></span>
                        <button onClick={() => { setSalaryEmpId(salaryEmpId === emp.id ? null : emp.id); setSalaryAmount(""); setSalaryNote(""); }} style={{ ...btnS, padding: "4px 12px", fontSize: 12 }}>{salaryEmpId === emp.id ? "Annuler" : "+ Salaire libre"}</button>
                      </div>
                      {salaryEmpId === emp.id && (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          <input type="text" inputMode="decimal" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} placeholder="Montant ($)" style={inp} min="0" step="0.01" />
                          <input value={salaryNote} onChange={e => setSalaryNote(e.target.value)} placeholder="Note (optionnel)" style={inp} />
                          <button onClick={() => paySalary(emp.id)} style={{ ...btnP, padding: "8px 16px" }}>VERSER</button>
                        </div>
                      )}
                      {empSalaries.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          {empSalaries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).map(s => (
                            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                              <span style={{ color: C.muted }}>{fmtDT(s.timestamp)} — <strong style={{ color: C.redLt }}>${s.amount.toFixed(2)}</strong>{s.description.includes("(") && <span style={{ color: C.dark }}> {s.description.split("(").slice(1).join("(").replace(")", "")}</span>}</span>
                              <button onClick={() => rm("expenses", s.id)} style={{ ...btnD, padding: "2px 6px", fontSize: 11 }}>✕</button>
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
            {[...data.productions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50).map(p => { const r = ALL_ITEMS.find(x => x.id === p.resourceId);

              if (editProdId === p.id) {
                const delta = num(editProd.correction) || 0;
                const newQty = p.quantity + delta;
                return <Card key={p.id} style={{ border: `2px solid ${C.accentLt}` }}><div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: C.gold, fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif" }}>✏️ Corriger cette extraction</span>
                    <span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(p.timestamp)}</span>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(0,0,0,.2)", borderRadius: 4, border: `1px solid ${C.border}` }}>
                      <span style={{ color: C.muted, fontSize: 16 }}>{p.employeeName} — {r?.icon} {r?.name}</span>
                      <span style={{ color: C.goldLt, fontWeight: 700, fontSize: 20 }}>Actuel : {p.quantity}</span>
                    </div>
                    <div>{lbl("Correction (ex: 50 pour ajouter, -20 pour retirer)")}<input type="number" value={editProd.correction} onChange={e => setEditProd({ ...editProd, correction: e.target.value })} placeholder="Ex: 50 ou -20" style={inp} /></div>
                    {editProd.correction !== "" && <div style={{ padding: "10px 14px", background: "rgba(0,0,0,.2)", borderRadius: 4, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: C.muted, fontSize: 15 }}>Nouveau total :</span>
                      <span style={{ color: newQty > 0 ? C.greenLt : C.redLt, fontWeight: 700, fontSize: 22 }}>{newQty}</span>
                    </div>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={saveProd} style={{ ...btnP, flex: 1, padding: "12px 20px" }}>CORRIGER</button>
                      <button onClick={() => setEditProdId(null)} style={{ ...btnS, flex: 1, padding: "12px 20px" }}>ANNULER</button>
                    </div>
                  </div>
                </div></Card>;
              }

              return (
              <Row key={p.id}>
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: C.gold, fontWeight: 700, fontSize: 18, minWidth: 120, fontFamily: "'Playfair Display',serif" }}>{p.employeeName}</span>
                  <span style={{ color: r?.color, fontSize: 17 }}>{r?.icon} ×{p.quantity} {r?.name}</span>
                  {p.note && <span style={{ color: C.dark, fontSize: 14 }}>({p.note})</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.dark, fontSize: 13 }}>{fmtDT(p.timestamp)}</span>
                  <button onClick={() => { setEditProdId(p.id); setEditProd({ correction: "" }); }} style={{ ...btnS, padding: "4px 10px", fontSize: 13, color: C.gold, borderColor: C.goldDk }}>✏️</button>
                  <button onClick={() => rm("productions", p.id)} style={{ ...btnD, padding: "4px 10px", fontSize: 13 }}>✕</button>
                </div>
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
              // Support both legacy single-item and new multi-item contracts
              const items = c.items || [{ id: c.id + "_legacy", resourceId: c.resourceId, totalQuantity: c.totalQuantity, deliveredQuantity: c.deliveredQuantity || 0, pricePerUnit: c.pricePerUnit }];
              const totalVal = items.reduce((s, i) => s + i.totalQuantity * i.pricePerUnit, 0);
              const totalDeliveredVal = items.reduce((s, i) => s + (i.deliveredQuantity || 0) * i.pricePerUnit, 0);
              const allDone = items.every(i => (i.deliveredQuantity || 0) >= i.totalQuantity);
              const anyStarted = items.some(i => (i.deliveredQuantity || 0) > 0);

              if (editConId === c.id) {
                return <Card key={c.id} style={{ border: `2px solid ${C.accentLt}` }}><div style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ color: C.gold, fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display',serif" }}>✏️ Modifier le contrat</span>
                    <button onClick={() => setEditConId(null)} style={{ ...btnS, padding: "6px 14px", fontSize: 13 }}>ANNULER</button>
                  </div>
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>{lbl("Acheteur")}<input value={editCon.buyer} onChange={e => setEditCon({ ...editCon, buyer: e.target.value })} style={inp} /></div>
                    <div>{lbl("Produits du contrat")}</div>
                    {editCon.items.map((item, idx) => {
                      const ecPi = PRICE_INFO[item.resourceId];
                      return <div key={idx} style={{ background: "rgba(0,0,0,.2)", padding: 14, borderRadius: 4, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ color: C.muted, fontSize: 14 }}>Produit {idx + 1}</span>
                          {editCon.items.length > 1 && <button onClick={() => setEditCon({ ...editCon, items: editCon.items.filter((_, j) => j !== idx) })} style={{ ...btnD, padding: "2px 8px", fontSize: 11 }}>✕</button>}
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <select value={item.resourceId} onChange={e => { const ni = [...editCon.items]; ni[idx] = { ...ni[idx], resourceId: e.target.value }; setEditCon({ ...editCon, items: ni }); }} style={sel}>{sellable.map(r2 => <option key={r2.id} value={r2.id}>{r2.icon} {r2.name}</option>)}</select>
                          {ecPi && !ecPi.libre && ecPi.min != null && <span style={{ color: C.goldDk, fontSize: 13 }}>💲 {ecPi.min.toFixed(2)} – {ecPi.max.toFixed(2)} $</span>}
                          {BBL_PRICES[item.resourceId] && <span style={{ color: "#C9A84C", fontSize: 13, marginLeft: 8 }}>📦 BBL : ${BBL_PRICES[item.resourceId].toFixed(3)}</span>}
                          <div style={{ display: "flex", gap: 8 }}>
                            <input type="number" value={item.totalQuantity} onChange={e => { const ni = [...editCon.items]; ni[idx] = { ...ni[idx], totalQuantity: e.target.value }; setEditCon({ ...editCon, items: ni }); }} placeholder="Qté" style={{ ...inp, flex: 1 }} min="0" />
                            <input type="text" inputMode="decimal" value={item.pricePerUnit} onChange={e => { const ni = [...editCon.items]; ni[idx] = { ...ni[idx], pricePerUnit: e.target.value }; setEditCon({ ...editCon, items: ni }); }} placeholder="Prix/u" style={{ ...inp, flex: 1 }} min="0" step="0.01" />
                          </div>
                        </div>
                      </div>;
                    })}
                    <button onClick={() => setEditCon({ ...editCon, items: [...editCon.items, { id: gid(), resourceId: sellable[0]?.id || "minerai_soufre", totalQuantity: "", pricePerUnit: "", deliveredQuantity: 0 }] })} style={{ ...btnS, padding: "10px 16px" }}>+ Ajouter un produit</button>
                    <div>{lbl("Notes")}<input value={editCon.notes} onChange={e => setEditCon({ ...editCon, notes: e.target.value })} style={inp} /></div>
                    <button onClick={saveContract} style={{ ...btnP, padding: "14px 24px" }}>SAUVEGARDER</button>
                  </div>
                </div></Card>;
              }

              return <Card key={c.id}><div style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ color: C.goldLt, fontWeight: 700, fontSize: 22, fontFamily: "'Playfair Display',serif" }}>{c.buyer}</span>
                    <span style={{ padding: "5px 14px", borderRadius: 3, fontSize: 14, fontWeight: 700, background: allDone ? "rgba(90,143,74,.2)" : "rgba(201,168,76,.15)", color: allDone ? C.greenLt : C.gold, border: `1px solid ${allDone ? C.green : C.goldDk}` }}>{allDone ? "✓ COMPLÉTÉ" : anyStarted ? "EN COURS" : "EN ATTENTE"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditConId(c.id); setEditCon({ buyer: c.buyer, items: items.map(i => ({ ...i, totalQuantity: String(i.totalQuantity), pricePerUnit: String(i.pricePerUnit) })), notes: c.notes || "" }); }} style={{ ...btnS, padding: "4px 10px", fontSize: 13, color: C.gold, borderColor: C.goldDk }}>✏️</button>
                    <button onClick={() => rm("contracts", c.id)} style={{ ...btnD, padding: "4px 12px", fontSize: 13 }}>✕</button>
                  </div>
                </div>
                {/* Product lines */}
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map(item => {
                    const ir = ALL_ITEMS.find(x => x.id === item.resourceId);
                    const iPi = PRICE_INFO[item.resourceId];
                    const iRange = iPi && !iPi.libre && iPi.min != null ? (item.pricePerUnit >= iPi.min && item.pricePerUnit <= iPi.max) : true;
                    const iProg = item.totalQuantity > 0 ? ((item.deliveredQuantity || 0) / item.totalQuantity * 100) : 0;
                    return <div key={item.id} style={{ background: "rgba(0,0,0,.15)", padding: "12px 16px", borderRadius: 4, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        <span style={{ color: ir?.color, fontSize: 18 }}>{ir?.icon} {ir?.name}</span>
                        <span style={{ color: C.goldLt, fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{item.deliveredQuantity || 0} / {item.totalQuantity}</span>
                        <span style={{ color: C.muted, fontSize: 15 }}>@ <strong style={{ color: iRange ? C.gold : C.redLt }}>${item.pricePerUnit.toFixed ? item.pricePerUnit.toFixed(2) : item.pricePerUnit}</strong> /u</span>
                        <span style={{ color: C.gold, fontSize: 14 }}>= ${(item.totalQuantity * item.pricePerUnit).toFixed(2)}</span>
                      </div>
                      <div style={{ marginTop: 8, background: "rgba(0,0,0,.3)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${iProg}%`, background: iProg >= 100 ? `linear-gradient(90deg,${C.green},${C.greenLt})` : `linear-gradient(90deg,${C.accent},${C.accentLt})` }} />
                      </div>
                    </div>;
                  })}
                </div>
                {c.notes && <div style={{ color: C.dark, fontSize: 15, marginTop: 10, fontStyle: "italic" }}>"{c.notes}"</div>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 16 }}>
                  <span style={{ color: C.dark }}>Livré : <strong style={{ color: C.greenLt }}>${totalDeliveredVal.toFixed(2)}</strong></span>
                  <span style={{ color: C.dark }}>Total : <strong style={{ color: C.gold }}>${totalVal.toFixed(2)}</strong></span>
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
                  {editSaleQty && <div style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Nouveau total : <strong style={{ color: C.greenLt }}>${((num(editSaleQty) || 0) * s.pricePerUnit).toFixed(2)}</strong> (diff stock : {((num(editSaleQty) || 0) - s.quantity) > 0 ? "+" : ""}{((num(editSaleQty) || 0) - s.quantity)})</div>}
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
          {ALL_ITEMS.filter(i => PRICE_INFO[i.id]).map(item => { const i = PRICE_INFO[item.id]; const bbl = BBL_PRICES[item.id]; return <Card key={item.id}><div style={{ padding: "20px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 32 }}>{item.icon}</span><span style={{ color: item.color, fontWeight: 700, fontSize: 20, fontFamily: "'Playfair Display',serif" }}>{item.name}</span></div>
            <div style={{ textAlign: "right" }}>
              {i.libre ? <span style={{ color: C.muted, fontSize: 17, fontStyle: "italic" }}>Prix libre</span> : <span style={{ color: C.goldLt, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700 }}>${i.min?.toFixed(2)} – ${i.max?.toFixed(2)}</span>}
              {bbl && <div style={{ marginTop: 4 }}><span style={{ color: "#C9A84C", fontSize: 14, fontWeight: 700, background: "rgba(201,168,76,.1)", padding: "3px 10px", borderRadius: 3, border: `1px solid ${C.goldDk}` }}>BBL : ${bbl.toFixed(3)}</span></div>}
              {i.export && <div style={{ marginTop: 4 }}><span style={{ color: C.greenLt, fontSize: 14, fontWeight: 700, background: "rgba(90,143,74,.15)", padding: "4px 12px", borderRadius: 3, border: `1px solid ${C.green}` }}>Exportateur ✓</span></div>}
            </div>
          </div></Card>; })}
        </div>

        <div style={{ marginTop: 32 }}>
          <Title icon="💰">Grille salariale (par unité extraite)</Title>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(SALARY_RATES).map(([id, info]) => {
              const item = ALL_ITEMS.find(x => x.id === id);
              return <Card key={id}><div style={{ padding: "20px 26px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}><span style={{ fontSize: 32 }}>{item?.icon}</span><span style={{ color: item?.color, fontWeight: 700, fontSize: 20, fontFamily: "'Playfair Display',serif" }}>{info.label}</span></div>
                <span style={{ color: C.greenLt, fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700 }}>${info.rate.toFixed(3)} /u</span>
              </div></Card>;
            })}
          </div>
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
            {data.contracts.filter(c => c.status === "active").map(c => {
              const items = c.items || [{ resourceId: c.resourceId, totalQuantity: c.totalQuantity, deliveredQuantity: c.deliveredQuantity || 0, pricePerUnit: c.pricePerUnit }];
              const remVal = items.reduce((s, i) => s + (i.totalQuantity - (i.deliveredQuantity || 0)) * i.pricePerUnit, 0);
              return <Row key={c.id}><div style={{ fontSize: 17 }}>
                <span style={{ color: C.goldLt, fontWeight: 700 }}>{c.buyer}</span>
                <span style={{ color: C.muted, marginLeft: 14 }}>{items.map(i => { const ir = ALL_ITEMS.find(x => x.id === i.resourceId); return `${i.totalQuantity - (i.deliveredQuantity || 0)} ${ir?.name || "?"}`; }).join(", ")}</span>
                <span style={{ color: C.greenLt, marginLeft: 14, fontWeight: 700 }}>(${remVal.toFixed(2)} restant)</span>
              </div></Row>;
            })}
          </div>}
      </div>}

      {/* MODALS */}
      <Modal open={modal === "addContract"} onClose={() => setModal(null)} title="Nouveau Contrat">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Acheteur")}<input value={cf.buyer} onChange={e => setCf({ ...cf, buyer: e.target.value })} placeholder="Nom" style={inp} /></div>
          <div>{lbl("Produits")}</div>
          {cf.items.map((item, idx) => {
            const cfPi = PRICE_INFO[item.resourceId];
            return <div key={idx} style={{ background: "rgba(0,0,0,.2)", padding: 14, borderRadius: 4, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: C.muted, fontSize: 14 }}>Produit {idx + 1}</span>
                {cf.items.length > 1 && <button onClick={() => setCf({ ...cf, items: cf.items.filter((_, j) => j !== idx) })} style={{ ...btnD, padding: "2px 8px", fontSize: 11 }}>✕</button>}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <select value={item.resourceId} onChange={e => { const ni = [...cf.items]; ni[idx] = { ...ni[idx], resourceId: e.target.value }; setCf({ ...cf, items: ni }); }} style={sel}>{sellable.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}</select>
                {cfPi && !cfPi.libre && cfPi.min != null && <span style={{ color: C.goldDk, fontSize: 13 }}>💲 Fourchette : {cfPi.min.toFixed(2)} – {cfPi.max.toFixed(2)} ${cfPi.export ? " (Export)" : ""}</span>}
                {BBL_PRICES[item.resourceId] && <div style={{ marginTop: 2 }}><span style={{ color: "#C9A84C", fontSize: 13 }}>📦 Rachat BBL : ${BBL_PRICES[item.resourceId].toFixed(3)}</span></div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={item.quantity} onChange={e => { const ni = [...cf.items]; ni[idx] = { ...ni[idx], quantity: e.target.value }; setCf({ ...cf, items: ni }); }} placeholder="Quantité" style={{ ...inp, flex: 1 }} min="0" />
                  <input type="text" inputMode="decimal" value={item.pricePerUnit} onChange={e => { const ni = [...cf.items]; ni[idx] = { ...ni[idx], pricePerUnit: e.target.value }; setCf({ ...cf, items: ni }); }} placeholder="Prix/unité ($)" style={{ ...inp, flex: 1 }} min="0" step="0.01" />
                </div>
              </div>
            </div>;
          })}
          <button onClick={() => setCf({ ...cf, items: [...cf.items, { resourceId: sellable[0]?.id || "minerai_soufre", quantity: "", pricePerUnit: "" }] })} style={{ ...btnS, padding: "10px 16px" }}>+ Ajouter un produit</button>
          <div>{lbl("Notes")}<input value={cf.notes} onChange={e => setCf({ ...cf, notes: e.target.value })} placeholder="Détails" style={inp} /></div>
          <button onClick={addContract} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>CRÉER LE CONTRAT</button>
        </div>
      </Modal>

      <Modal open={modal === "addSale"} onClose={() => setModal(null)} title="Enregistrer une Vente">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Contrat")}<select value={sf.contractId} onChange={e => setSf({ ...sf, contractId: e.target.value, itemId: "" })} style={sel}><option value="">— Sélectionner un contrat —</option>{data.contracts.filter(c => c.status === "active").map(c => <option key={c.id} value={c.id}>{c.buyer} ({(c.items || []).length} produit{(c.items || []).length > 1 ? "s" : ""})</option>)}</select></div>
          {sf.contractId && (() => {
            const con = data.contracts.find(x => x.id === sf.contractId);
            if (!con) return null;
            const items = con.items || [{ id: con.id + "_legacy", resourceId: con.resourceId, totalQuantity: con.totalQuantity, deliveredQuantity: con.deliveredQuantity || 0, pricePerUnit: con.pricePerUnit }];
            const activeItems = items.filter(i => (i.deliveredQuantity || 0) < i.totalQuantity);
            return <>
              <div>{lbl("Produit")}<select value={sf.itemId} onChange={e => setSf({ ...sf, itemId: e.target.value })} style={sel}><option value="">— Sélectionner un produit —</option>{activeItems.map(i => { const ir = ALL_ITEMS.find(x => x.id === i.resourceId); return <option key={i.id} value={i.id}>{ir?.icon} {ir?.name} (reste {i.totalQuantity - (i.deliveredQuantity || 0)})</option>; })}</select></div>
              {sf.itemId && (() => {
                const item = items.find(i => i.id === sf.itemId);
                if (!item) return null;
                const ir = ALL_ITEMS.find(x => x.id === item.resourceId);
                const q = num(sf.quantity) || 0;
                return <>
                  <div style={{ background: "rgba(0,0,0,.3)", padding: 14, borderRadius: 4, border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.muted, fontSize: 15, marginBottom: 4 }}>Stock : <strong style={{ color: C.goldLt }}>{Math.floor(stocks[item.resourceId] || 0)} {ir?.name}</strong></div>
                    <div style={{ color: C.muted, fontSize: 15 }}>Reste à livrer : <strong style={{ color: C.gold }}>{item.totalQuantity - (item.deliveredQuantity || 0)}</strong> @ ${item.pricePerUnit}/u</div>
                  </div>
                  <div>{lbl("Quantité livrée")}<input type="number" value={sf.quantity} onChange={e => setSf({ ...sf, quantity: e.target.value })} placeholder="Quantité" style={inp} min="0" step="1" /></div>
                  {q > 0 && <div style={{ color: C.muted, fontSize: 15 }}>Montant : <strong style={{ color: C.greenLt, fontSize: 22 }}>${(q * item.pricePerUnit).toFixed(2)}</strong></div>}
                </>;
              })()}
            </>;
          })()}
          <button onClick={doSale} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>ENREGISTRER</button>
        </div>
      </Modal>

      <Modal open={modal === "addExpense"} onClose={() => setModal(null)} title="Nouvelle Dépense">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Catégorie")}<select value={ef.category} onChange={e => setEf({ ...ef, category: e.target.value })} style={sel}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div>{lbl("Montant ($)")}<input type="text" inputMode="decimal" value={ef.amount} onChange={e => setEf({ ...ef, amount: e.target.value })} placeholder="Ex: 15" style={inp} min="0" step="0.01" /></div>
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

      <Modal open={modal === "adjustStock"} onClose={() => setModal(null)} title="Corriger un stock">
        <div style={{ display: "grid", gap: 16 }}>
          <div>{lbl("Objet")}<select value={adjItem} onChange={e => setAdjItem(e.target.value)} style={sel}>{ALL_ITEMS.map(r => { const st = stocks[r.id] || 0; return <option key={r.id} value={r.id}>{r.icon} {r.name} (stock: {Math.floor(st)})</option>; })}</select></div>
          <div style={{ background: "rgba(0,0,0,.3)", padding: 14, borderRadius: 4, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.muted, fontSize: 15 }}>Stock actuel de <strong style={{ color: C.goldLt }}>{ALL_ITEMS.find(x => x.id === adjItem)?.name}</strong> :</div>
            <div style={{ color: C.gold, fontSize: 28, fontFamily: "'Playfair Display',serif", fontWeight: 900, marginTop: 4 }}>{Math.floor(stocks[adjItem] || 0)}</div>
          </div>
          <div>{lbl("Stock réel (le chiffre que vous constatez)")}<input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="Ex: 42" style={inp} min="0" step="1" /></div>
          {adjQty !== "" && <div style={{ color: C.muted, fontSize: 15 }}>Différence appliquée : <strong style={{ color: ((num(adjQty) || 0) - Math.floor(stocks[adjItem] || 0)) >= 0 ? C.greenLt : C.redLt, fontSize: 20 }}>{((num(adjQty) || 0) - Math.floor(stocks[adjItem] || 0)) >= 0 ? "+" : ""}{(num(adjQty) || 0) - Math.floor(stocks[adjItem] || 0)}</strong></div>}
          <div>{lbl("Raison (optionnel)")}<input value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Ex: Correction après inventaire" style={inp} /></div>
          <button onClick={adjustStock} style={{ ...btnP, fontSize: 16, padding: "16px 32px" }}>CORRIGER LE STOCK</button>
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
  const [ac, setAc] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const toArr = (v) => { if (!v) return []; if (Array.isArray(v)) return v.filter(Boolean); return Object.values(v).filter(Boolean); };
    const unsubscribe = listenData((val) => {
      if (val) {
        setData({
          employees: toArr(val.employees),
          productions: toArr(val.productions),
          crafts: toArr(val.crafts),
          contracts: toArr(val.contracts),
          sales: toArr(val.sales),
          expenses: toArr(val.expenses),
          stockAdjustments: toArr(val.stockAdjustments),
        });
      }
      setLoading(false);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const empLogin = null;
  const admLogin = () => { if (ac !== ADMIN_CODE) { setErr("Code incorrect."); return; } setView("admin"); setErr(""); };
  const logout = () => { setView(null); setAc(""); setErr(""); };

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
          <span style={{ color: C.muted, fontSize: 17, fontWeight: 600 }}>🎩 Patron</span>
          <button onClick={logout} style={btnS}>Déconnexion</button>
        </div>}
      </div>

      {/* LOGIN */}
      {!view && <div style={{ maxWidth: 520, margin: "70px auto", padding: "0 24px", animation: "fadeIn .6s ease-out" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 88, marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,.5))" }}>🦅</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", color: C.gold, fontSize: 30, margin: 0, fontWeight: 900, letterSpacing: 3, textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>CONNEXION</h2>
          <Divider />
          <p style={{ color: C.dark, fontSize: 18, marginTop: 12 }}>Accès réservé à la direction</p>
        </div>
        {err && <div style={{ background: "rgba(155,48,48,.15)", border: `2px solid ${C.red}`, borderRadius: 4, padding: "12px 18px", marginBottom: 20, color: C.redLt, fontSize: 17, fontWeight: 600 }}>⚠ {err}</div>}
        <Card><div style={{ padding: 28 }}>
          <h3 style={{ color: C.gold, fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>🎩 Patron</h3>
          <div style={{ display: "flex", gap: 10 }}><input type="password" value={ac} onChange={e => setAc(e.target.value)} placeholder="Code d'accès" style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && admLogin()} /><button onClick={admLogin} style={btnP}>ENTRER</button></div>
        </div></Card>
      </div>}

      {view === "admin" && <div style={{ maxWidth: 1050, margin: "0 auto", animation: "fadeIn .4s" }}><Admin data={data} setData={setData} /></div>}
    </div>
  );
}