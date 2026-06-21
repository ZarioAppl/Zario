import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v) => "RD$" + (Number(v) || 0).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayISO = () => new Date().toISOString().split("T")[0];
const COLORS = ["#06B6D4", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#EC4899", "#14B8A6", "#6366F1"];

const fechaHoy = () => {
  const d = new Date();
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const isSameDay = (d) => {
  if (!d) return false;
  const date = new Date(d + "T12:00:00");
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const isThisWeek = (d) => {
  if (!d) return false;
  const date = new Date(d + "T12:00:00");
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return date >= start && date < end;
};

const isThisMonth = (d) => {
  if (!d) return false;
  const date = new Date(d + "T12:00:00");
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

const isDueSoon = (d) => {
  if (!d) return false;
  const date = new Date(d + "T12:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = (date - now) / 86400000;
  return diff >= 0 && diff <= 5;
};

const isOverdue = (d) => {
  if (!d) return false;
  const date = new Date(d + "T12:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return date < now;
};

// Get next month's payment date
const nextPayDate = (d) => {
  if (!d) return null;
  const date = new Date(d + "T12:00:00");
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split("T")[0];
};

// Check if bill should auto-reset (paid last month, new month started)
const shouldReset = (b) => {
  if (!b.paid || !b.dueDate) return false;
  const due = new Date(b.dueDate + "T12:00:00");
  const now = new Date();
  return now.getMonth() > due.getMonth() || now.getFullYear() > due.getFullYear();
};

const BILL_ES = { "Rent/Mortgage": "Renta/Hipoteca", "Electricity": "Electricidad", "Water": "Agua", "Gas": "Gas", "Internet": "Internet", "Phone": "Teléfono", "Car Payment": "Pago de Auto", "Car Insurance": "Seguro de Auto", "Health Insurance": "Seguro Médico", "Bank Loan": "Préstamo Bancario" };
const billName = (n) => BILL_ES[n] || n;
const SRC_ES = { "Salary": "Salario", "Freelance": "Freelance", "Business": "Negocio", "Investments": "Inversiones", "Rental Income": "Alquiler", "Side Hustle": "Trabajo Extra", "Other": "Otro" };
const srcName = (s) => SRC_ES[s] || s;
const ASSET_ES = { "Checking Account": "Cuenta Corriente", "Savings Account": "Cuenta de Ahorros", "Credit Card": "Tarjeta de Crédito", "Car Loan": "Préstamo de Auto", "Bank Loan": "Préstamo Bancario" };
const assetName = (n) => ASSET_ES[n] || n;
const GOAL_ES = { "Emergency Fund": "Fondo de Emergencia", "Vacation": "Vacaciones", "Savings": "Ahorros", "New Car": "Auto Nuevo", "Travel": "Viaje", "Wedding": "Boda", "Education": "Educación", "New Phone": "Teléfono Nuevo", "Home Down Payment": "Casa Propia", "Retirement": "Retiro" };
const goalName = (n) => GOAL_ES[n] || n;
const BUDGET_ES = { "Groceries": "Supermercado", "Restaurants": "Restaurantes", "Transport": "Transporte", "Utilities": "Servicios", "Entertainment": "Entretenimiento", "Healthcare": "Salud", "Loans & Insurance": "Préstamos y Seguros" };
const budgetName = (n) => BUDGET_ES[n] || n;

const motivate = (pct, name) => {
  if (pct >= 100) return `🎉 ¡Completaste "${name}"!`;
  if (pct >= 75) return `🔥 "${name}" al ${pct}%. ¡Casi!`;
  if (pct >= 50) return `💪 Mitad del camino en "${name}"`;
  return `✨ "${name}" — ¡cada peso cuenta!`;
};

const catEmoji = {
  "Supermercado": "🛒", "Restaurantes": "🍔", "Gasolinera": "⛽", "Electricidad": "💡",
  "Agua": "💧", "Gas": "🔥", "Internet": "📡", "Teléfono": "📱", "Transporte/Uber": "🚗",
  "Salud": "❤️", "Entretenimiento": "🎬", "Compras": "🛍️", "Ropa": "👕", "Educación": "📚",
  "Hogar": "🏠", "Pago de Auto": "🚙", "Préstamo Bancario": "🏦", "Seguro de Auto": "🛡️",
  "Seguro Médico": "🏥", "Otro": "📌", "Salario": "💼", "Freelance": "💻",
  "Negocio": "📊", "Inversiones": "📈", "Alquiler": "🏘️", "Trabajo Extra": "⚡",
  "Renta/Hipoteca": "🏠", "Netflix": "📺", "Spotify": "🎵",
};

const EXP_CATS = ["Supermercado", "Restaurantes", "Gasolinera", "Electricidad", "Agua", "Gas", "Internet", "Teléfono", "Transporte/Uber", "Salud", "Entretenimiento", "Compras", "Ropa", "Educación", "Hogar", "Pago de Auto", "Préstamo Bancario", "Seguro de Auto", "Seguro Médico", "Otro"];
const INC_SRCS = ["Salario", "Freelance", "Negocio", "Inversiones", "Alquiler", "Trabajo Extra", "Otro"];
const BILL_PRESETS = ["Renta/Hipoteca", "Electricidad", "Agua", "Gas", "Internet", "Teléfono", "Netflix", "Spotify", "Amazon Prime", "Seguro de Auto", "Seguro Médico", "Pago de Auto", "Préstamo Bancario", "Tarjeta de Crédito", "Gimnasio", "Otro"];
const GOAL_PRESETS = ["Fondo de Emergencia", "Vacaciones", "Auto Nuevo", "Viaje", "Boda", "Educación", "Teléfono Nuevo", "Casa Propia", "Retiro", "Ahorros", "Otro"];
const FREQS = ["Mensual", "Semanal", "Quincenal", "Anual"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const getCSS = (dark) => `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:${dark ? "#0F172A" : "#F1F5F9"};}
input,select{font-size:16px!important;-webkit-text-size-adjust:100%;-webkit-appearance:none;}
input::placeholder{color:#94A3B8;}
select{-webkit-appearance:none;}

.auth-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:${dark ? "#0F172A" : "#F1F5F9"};}
.auth-card{width:100%;max-width:400px;background:${dark ? "#1E293B" : "#FFFFFF"};border-radius:24px;padding:36px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.12);}
.btn-main{width:100%;background:linear-gradient(135deg,#06B6D4,#0284C7);color:white;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;font-family:'Space Grotesk',sans-serif;cursor:pointer;margin-top:6px;transition:opacity 0.2s;}
.btn-main:disabled{opacity:0.6;cursor:not-allowed;}

.layout{display:flex;min-height:100vh;}
.sidebar{width:250px;position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;padding:18px 12px;overflow-y:auto;z-index:100;transition:transform 0.3s;background:${dark ? "#1E293B" : "#FFFFFF"};border-right:1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"};}
.main-content{margin-left:250px;flex:1;min-height:100vh;background:${dark ? "#0F172A" : "#F1F5F9"};overflow-x:hidden;max-width:calc(100vw - 250px);}

.mob-hdr{display:none;align-items:center;justify-content:space-between;padding:12px 16px;position:sticky;top:0;z-index:50;background:${dark ? "#1E293B" : "#FFFFFF"};border-bottom:1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"};}
.page-body{padding:20px 24px;overflow-x:hidden;max-width:100%;box-sizing:border-box;}

.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99;}
.overlay.show{display:block;}

.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;margin-bottom:2px;color:${dark ? "#94A3B8" : "#64748B"};transition:all 0.15s;border:none;background:none;width:100%;text-align:left;font-family:'Inter',sans-serif;}
.nav-item:hover{background:${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"};}
.nav-item.active{background:${dark ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.1)"};color:#06B6D4;font-weight:600;}

.card{background:${dark ? "#1E293B" : "#FFFFFF"};border:1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};border-radius:16px;padding:18px;overflow:hidden;box-sizing:border-box;}
.stat-card{border-radius:16px;padding:16px;position:relative;overflow:hidden;box-sizing:border-box;background:${dark ? "#1E293B" : "#FFFFFF"};border:1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"};cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;}
.stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.1);}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;}

.field{margin-bottom:14px;}
.field label{display:block;font-size:11px;font-weight:600;color:${dark ? "#64748B" : "#94A3B8"};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;}
.inp{width:100%;background:${dark ? "rgba(255,255,255,0.05)" : "#F8FAFC"};border:1.5px solid ${dark ? "rgba(255,255,255,0.08)" : "#E2E8F0"};border-radius:10px;padding:11px 14px;color:${dark ? "#F8FAFC" : "#0F172A"};outline:none;font-family:'Inter',sans-serif;font-size:16px!important;transition:border-color 0.2s;max-width:100%;}
.inp:focus{border-color:#06B6D4;}
.sel{width:100%;background:${dark ? "#1E293B" : "#F8FAFC"};border:1.5px solid ${dark ? "rgba(255,255,255,0.08)" : "#E2E8F0"};border-radius:10px;padding:11px 14px;color:${dark ? "#F8FAFC" : "#0F172A"};outline:none;font-family:'Inter',sans-serif;font-size:16px!important;max-width:100%;}
.inp-date{width:100%;max-width:200px;background:${dark ? "rgba(255,255,255,0.05)" : "#F8FAFC"};border:1.5px solid ${dark ? "rgba(255,255,255,0.08)" : "#E2E8F0"};border-radius:10px;padding:11px 14px;color:${dark ? "#F8FAFC" : "#0F172A"};outline:none;font-family:'Inter',sans-serif;font-size:16px!important;}

.row-item{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;margin-bottom:8px;background:${dark ? "rgba(255,255,255,0.03)" : "#F8FAFC"};border:1px solid ${dark ? "rgba(255,255,255,0.05)" : "#E2E8F0"};}
.ico-box{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.act-btn{background:none;border:none;padding:6px;border-radius:8px;cursor:pointer;display:flex;align-items:center;transition:background 0.15s;}
.act-btn:hover{background:${dark ? "rgba(255,255,255,0.08)" : "#E2E8F0"};}
.act-btn.del:hover{background:rgba(244,63,94,0.1);}

.prog-bar{height:8px;background:${dark ? "rgba(255,255,255,0.08)" : "#E2E8F0"};border-radius:99px;overflow:hidden;}
.prog-fill{height:100%;border-radius:99px;transition:width 0.6s ease;}

.alert{border-radius:14px;padding:13px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;}
.alert-red{background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.3);}
.alert-yellow{background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.3);}
.alert-blue{background:rgba(6,182,212,0.07);border:1px solid rgba(6,182,212,0.2);}

.chip{padding:7px 16px;border-radius:99px;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid transparent;font-family:'Inter',sans-serif;transition:all 0.15s;background:none;}
.filter-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}

.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;}
.modal-box{background:${dark ? "#1E293B" : "#FFFFFF"};border-radius:20px;padding:26px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;}
.confirm-box{background:${dark ? "#1E293B" : "#FFFFFF"};border-radius:20px;padding:30px;width:100%;max-width:340px;text-align:center;}

.bill-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;margin-bottom:9px;border:1.5px solid ${dark ? "rgba(255,255,255,0.06)" : "#E2E8F0"};background:${dark ? "rgba(255,255,255,0.02)" : "#FFFFFF"};}
.bill-row.overdue{border-color:rgba(244,63,94,0.45);background:rgba(244,63,94,0.03);}
.bill-row.soon{border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.02);}
.bill-row.paid{opacity:0.4;}

.toggle{width:44px;height:24px;border-radius:99px;position:relative;cursor:pointer;border:none;transition:background 0.2s;flex-shrink:0;}
.toggle-thumb{width:18px;height:18px;border-radius:50%;background:white;position:absolute;top:3px;left:3px;transition:transform 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.2);}
.toggle.on .toggle-thumb{transform:translateX(20px);}

.avatar-sm{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#06B6D4,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:14px;overflow:hidden;flex-shrink:0;}
.avatar-sm img{width:100%;height:100%;object-fit:cover;}
.avatar-lg{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#06B6D4,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:28px;overflow:hidden;cursor:pointer;position:relative;}
.avatar-lg img{width:100%;height:100%;object-fit:cover;}
.av-ov{position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;}
.avatar-lg:hover .av-ov{opacity:1;}

.celebrate{background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.07));border:1px solid rgba(16,185,129,0.25);border-radius:16px;padding:18px;margin-bottom:18px;text-align:center;}
.analytics-wrap{width:100%;overflow:hidden;max-width:100%;}
.chart-wrap{width:100%;overflow:hidden;max-width:100%;}

@media(max-width:1100px){.stats-grid{grid-template-columns:1fr 1fr;}.two-col{grid-template-columns:1fr;}}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);}
  .sidebar.open{transform:translateX(0);}
  .main-content{margin-left:0;max-width:100vw;}
  .mob-hdr{display:flex;}
  .page-body{padding:14px 14px;}
  .stats-grid{grid-template-columns:1fr 1fr;gap:10px;}
  .two-col{grid-template-columns:1fr;}
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// ICONOS
// ─────────────────────────────────────────────────────────────────────────────
const IC = ({ n, s = 18, c = "currentColor" }) => {
  const p = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
    bar: "M18 20V10M12 20V4M6 20v-6",
    dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    trend: "M23 6L13.5 15.5 8.5 10.5 1 18M17 6h6v6",
    target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM14 12a2 2 0 11-4 0 2 2 0 014 0z",
    wallet: "M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22",
    file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
    check: "M20 6L9 17l-5-5",
    plus: "M12 5v14M5 12h14",
    x: "M18 6L6 18M6 6l12 12",
    menu: "M3 12h18M3 6h18M3 18h18",
    cam: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
    sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
    moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
    daily: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01",
  };
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={p[n] || p.info} /></svg>;
};

// ─────────────────────────────────────────────────────────────────────────────
// BOTONES
// ─────────────────────────────────────────────────────────────────────────────
const Btn = ({ children, v = "primary", sm = false, st = {}, ...p }) => {
  const base = { borderRadius: 10, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, border: "none", transition: "opacity 0.15s" };
  const pad = sm ? { padding: "7px 14px", fontSize: 13 } : { padding: "10px 18px", fontSize: 14 };
  const vars = {
    primary: { background: "linear-gradient(135deg,#06B6D4,#0284C7)", color: "white", boxShadow: "0 4px 12px rgba(6,182,212,0.25)" },
    danger: { background: "rgba(244,63,94,0.1)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.25)" },
    ghost: { background: "rgba(100,116,139,0.1)", color: "#64748B", border: "1px solid rgba(100,116,139,0.2)" },
    green: { background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" },
    outline: { background: "transparent", color: "#06B6D4", border: "1.5px solid #06B6D4" },
  };
  return <button style={{ ...base, ...pad, ...vars[v], ...st }} {...p}>{children}</button>;
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL Y CONFIRM
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, display: "flex" }}><IC n="x" s={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Confirm = ({ open, msg, onOk, onCancel }) => {
  if (!open) return null;
  return (
    <div className="modal-bg">
      <div className="confirm-box">
        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¿Estás seguro?</div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 22 }}>{msg}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn v="danger" onClick={onOk}>Sí, eliminar</Btn>
          <Btn v="ghost" onClick={onCancel}>Cancelar</Btn>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUTS ESTABLES CON useRef — FIX TECLADO
// ─────────────────────────────────────────────────────────────────────────────
const RefInput = ({ label, value, onChange, isDate = false, ...p }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || "";
    }
  }, [value]);
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <input
        ref={ref}
        className={isDate ? "inp-date" : "inp"}
        defaultValue={value || ""}
        onBlur={e => onChange && onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        {...p}
      />
    </div>
  );
};

const RefSelect = ({ label, options, value, onChange }) => (
  <div className="field">
    {label && <label>{label}</label>}
    <select className="sel" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </div>
);

// Input para ingreso mensual/semanal con ref
const IncomeRef = ({ value, onSave, placeholder }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || "";
    }
  }, [value]);
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input
        ref={ref}
        className="inp"
        style={{ flex: 1, color: "#0F172A", background: "rgba(0,0,0,0.04)" }}
        type="number"
        inputMode="decimal"
        placeholder={placeholder || "RD$0.00"}
        defaultValue={value || ""}
        autoComplete="off"
      />
      <Btn onClick={() => { if (ref.current) onSave(Number(ref.current.value) || 0); }}>Guardar</Btn>
    </div>
  );
};

// Input para metas diaria/semanal/mensual
const GoalRef = ({ dg, wg, mg, onDG, onWG, onMG }) => {
  const dgR = useRef(null); const wgR = useRef(null); const mgR = useRef(null);
  useEffect(() => { if (dgR.current && dgR.current !== document.activeElement) dgR.current.value = dg || ""; }, [dg]);
  useEffect(() => { if (wgR.current && wgR.current !== document.activeElement) wgR.current.value = wg || ""; }, [wg]);
  useEffect(() => { if (mgR.current && mgR.current !== document.activeElement) mgR.current.value = mg || ""; }, [mg]);
  const s = { width: "100%", background: "rgba(0,0,0,0.04)", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", color: "#0F172A", fontSize: "16px", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: "100%", maxWidth: "100%" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Diaria</div>
        <input ref={dgR} style={s} type="number" inputMode="decimal" placeholder="RD$0" defaultValue={dg || ""} onBlur={() => { if (dgR.current) onDG(Number(dgR.current.value) || 0); }} autoComplete="off" />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Semanal</div>
        <input ref={wgR} style={s} type="number" inputMode="decimal" placeholder="RD$0" defaultValue={wg || ""} onBlur={() => { if (wgR.current) onWG(Number(wgR.current.value) || 0); }} autoComplete="off" />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Mensual</div>
        <input ref={mgR} style={s} type="number" inputMode="decimal" placeholder="RD$0" defaultValue={mg || ""} onBlur={() => { if (mgR.current) onMG(Number(mgR.current.value) || 0); }} autoComplete="off" />
      </div>
    </div>
  );
};

// Input para registro diario
const DailyRow = ({ onAdd }) => {
  const descR = useRef(null); const amtR = useRef(null);
  const handle = () => {
    const amt = amtR.current?.value || "";
    if (!amt) return;
    onAdd({ desc: descR.current?.value || "Registro", amount: Number(amt) });
    if (descR.current) descR.current.value = "";
    if (amtR.current) amtR.current.value = "";
    descR.current?.focus();
  };
  const s = { background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "11px 14px", color: "#F8FAFC", fontSize: "16px", fontFamily: "'Inter',sans-serif", outline: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <input ref={descR} style={{ ...s, width: "100%", boxSizing: "border-box" }} type="text" placeholder="Descripción (ej. Servicio cliente)" autoComplete="off" />
      <div style={{ display: "flex", gap: 10 }}>
        <input ref={amtR} style={{ ...s, flex: 1, boxSizing: "border-box" }} type="number" inputMode="decimal" placeholder="RD$0.00" onKeyDown={e => e.key === "Enter" && handle()} autoComplete="off" />
        <Btn v="green" onClick={handle} st={{ flexShrink: 0 }}>+ Agregar</Btn>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PIE CHART
// ─────────────────────────────────────────────────────────────────────────────
const PieChart = ({ data, total, dark }) => {
  let cum = 0;
  const slices = data.map(([cat, val], i) => {
    const pct = val / total; const start = cum * 360; cum += pct; const end = cum * 360;
    const r = 60; const cx = 75; const cy = 75; const rad = a => (a - 90) * Math.PI / 180;
    return { cat, val, pct, color: COLORS[i % COLORS.length], x1: cx + r * Math.cos(rad(start)), y1: cy + r * Math.sin(rad(start)), x2: cx + r * Math.cos(rad(end)), y2: cy + r * Math.sin(rad(end)), cx, cy, r, large: (end - start) > 180 ? 1 : 0, single: data.length === 1 };
  });
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", width: "100%", overflow: "hidden" }}>
      <svg width="150" height="150" viewBox="0 0 150 150" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => s.single
          ? <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.color} opacity="0.85" />
          : <path key={i} d={`M ${s.cx} ${s.cy} L ${s.x1} ${s.y1} A ${s.r} ${s.r} 0 ${s.large} 1 ${s.x2} ${s.y2} Z`} fill={s.color} opacity="0.85" />
        )}
        <circle cx="75" cy="75" r="35" fill={dark ? "#1E293B" : "#FFFFFF"} />
        <text x="75" y="72" textAnchor="middle" fill={dark ? "#F8FAFC" : "#0F172A"} fontSize="9" fontFamily="Space Grotesk" fontWeight="700">{fmt(total)}</text>
        <text x="75" y="84" textAnchor="middle" fill="#94A3B8" fontSize="7">total</text>
      </svg>
      <div style={{ flex: 1, minWidth: 90, overflow: "hidden" }}>
        {slices.slice(0, 5).map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#64748B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cat}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: dark ? "#F8FAFC" : "#0F172A", flexShrink: 0 }}>{Math.round(s.pct * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ProfilePage({ user, dark, C, onSave, onAvatar, onDark }) {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (nameRef.current) nameRef.current.value = user.name || "";
    if (emailRef.current) emailRef.current.value = user.email || "";
  }, [user.name, user.email]);

  const inp = { width: "100%", background: dark ? "rgba(255,255,255,0.05)" : "#F8FAFC", border: `1.5px solid ${dark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}`, borderRadius: 10, padding: "12px 14px", color: dark ? "#F8FAFC" : "#0F172A", fontSize: "16px", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>Tu Perfil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#06B6D4,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "white", flexShrink: 0 }}>
            {user.name ? user.name[0].toUpperCase() : "U"}
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{user.email}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>Información</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Nombre</div>
            <input ref={nameRef} style={inp} type="text" defaultValue={user.name || ""} autoComplete="name" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Correo</div>
            <input ref={emailRef} style={inp} type="email" defaultValue={user.email || ""} autoComplete="email" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Moneda</div>
            <select style={{ ...inp, background: dark ? "#1E293B" : "#F8FAFC" }}>
              <option>DOP — Peso Dominicano</option>
              <option>USD — Dólar Americano</option>
              <option>EUR — Euro</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Btn onClick={async () => {
            const name = nameRef.current?.value || user.name;
            const email = emailRef.current?.value || user.email;
            await onSave(name, email);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }}>Guardar Cambios</Btn>
          {saved && <span style={{ color: "#10B981", fontSize: 14, fontWeight: 600 }}>✅ ¡Guardado!</span>}
        </div>
      </div>
      <div className="card">
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Apariencia</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 15px", background: dark ? "rgba(255,255,255,0.03)" : "#F8FAFC", borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IC n={dark ? "moon" : "sun"} s={18} c={dark ? "#8B5CF6" : "#F59E0B"} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{dark ? "Modo Oscuro" : "Modo Claro"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Cambia el tema de la app</div>
            </div>
          </div>
          <button className={`toggle${dark ? " on" : ""}`} style={{ background: dark ? "#06B6D4" : "#E2E8F0" }} onClick={onDark}>
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ZarioApp({ supabase, initialSession }) {
  const [dark, setDark] = useState(false);
  const [screen, setScreen] = useState(initialSession ? "app" : "login");
  const [resetMode, setResetMode] = useState(false);
  const [nav, setNav] = useState("dashboard");
  const [sbOpen, setSb] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auth
  const lEmailR = useRef(null); const lPassR = useRef(null);
  const rNameR = useRef(null); const rEmailR = useRef(null); const rPassR = useRef(null);
  const [user, setUser] = useState({ name: "", email: "", avatar: null });

  // Data
  const [expenses, setExp] = useState([]);
  const [incomes, setInc] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [assets, setAssets] = useState([]);
  const [liabs, setLiabs] = useState([]);
  const [budget, setBudget] = useState([
    { id: "b1", cat: "Groceries", budgeted: 0, spent: 0 },
    { id: "b2", cat: "Restaurants", budgeted: 0, spent: 0 },
    { id: "b3", cat: "Transport", budgeted: 0, spent: 0 },
    { id: "b4", cat: "Utilities", budgeted: 0, spent: 0 },
    { id: "b5", cat: "Entertainment", budgeted: 0, spent: 0 },
    { id: "b6", cat: "Healthcare", budgeted: 0, spent: 0 },
    { id: "b7", cat: "Loans & Insurance", budgeted: 0, spent: 0 },
  ]);
  const [dailyEntries, setDE] = useState([]);
  const [monthlyInc, setMI] = useState(0);
  const [weeklyInc, setWI] = useState(0);
  const [incomeType, setIT] = useState(0);
  const [dailyGoal, setDG] = useState(0);
  const [weeklyGoal, setWG] = useState(0);
  const [monthlyGoal, setMG] = useState(0);
  const [expFilter, setEF] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [confirm, setConfirm] = useState(null);

  // ── SUPABASE ──
  const getUID = useCallback(async () => {
    if (!supabase) return null;
    const { data: { user: u } } = await supabase.auth.getUser();
    return u?.id || null;
  }, [supabase]);

  const saveProf = useCallback(async (updates) => {
    const uid = await getUID(); if (!uid || !supabase) return;
    await supabase.from("profiles").upsert({ id: uid, ...updates });
  }, [supabase, getUID]);

  const loadAll = useCallback(async () => {
    if (!supabase) return;
    try {
      const uid = await getUID(); if (!uid) return;
      const [p, exps, incs, dly, gls, bls, bgt, ast, lib] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("expenses").select("*").eq("user_id", uid).order("expense_date", { ascending: false }),
        supabase.from("incomes").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("daily_entries").select("*").eq("user_id", uid).eq("entry_date", todayISO()).order("created_at", { ascending: false }),
        supabase.from("goals").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
        supabase.from("bills").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
        supabase.from("budget").select("*").eq("user_id", uid),
        supabase.from("assets").select("*").eq("user_id", uid),
        supabase.from("liabilities").select("*").eq("user_id", uid),
      ]);

      if (p.data) {
        const pr = p.data;
        setUser(u => ({ ...u, name: pr.full_name || u.name, email: pr.email || u.email, avatar: pr.avatar_url || u.avatar }));
        if (pr.dark_mode !== undefined && pr.dark_mode !== null) setDark(pr.dark_mode);
        if (pr.monthly_inc) setMI(pr.monthly_inc);
        if (pr.weekly_inc) setWI(pr.weekly_inc);
        if (pr.income_type !== null && pr.income_type !== undefined) setIT(pr.income_type);
        if (pr.daily_goal) setDG(pr.daily_goal);
        if (pr.weekly_goal) setWG(pr.weekly_goal);
        if (pr.monthly_goal) setMG(pr.monthly_goal);
      }
      if (exps.data?.length) setExp(exps.data.map(e => ({ id: e.id, desc: e.description || "", amount: e.amount, category: e.category, date: e.expense_date })));
      if (incs.data?.length) setInc(incs.data.map(i => ({ id: i.id, source: i.source, desc: i.description || "", amount: i.amount, date: i.income_date })));
      if (dly.data?.length) setDE(dly.data.map(e => ({ id: e.id, desc: e.description || "", amount: e.amount, time: e.entry_time || "" })));
      if (gls.data?.length) setGoals(gls.data.map(g => ({ id: g.id, name: g.goal_name, target: g.target, saved: g.saved, deadline: g.deadline, color: g.color || "#06B6D4", done: g.done })));
      if (bls.data?.length) {
        const loadedBills = bls.data.map(b => ({ id: b.id, name: b.bill_name, amount: b.amount, dueDate: b.due_date, paid: b.paid, freq: b.freq || "Mensual" }));
        // Auto-reset bills paid in previous months
        const resetBills = loadedBills.map(b => {
          if (shouldReset(b)) {
            const newDate = nextPayDate(b.dueDate);
            // Update in Supabase too
            if (uid && supabase) supabase.from("bills").update({ paid: false, due_date: newDate }).eq("id", b.id);
            return { ...b, paid: false, dueDate: newDate };
          }
          return b;
        });
        setBills(resetBills);
      }
      if (bgt.data?.length) setBudget(prev => prev.map(b => { const f = bgt.data.find(x => x.cat === b.cat); return f ? { ...b, id: f.id, budgeted: f.budgeted, spent: f.spent } : b; }));
      if (ast.data?.length) setAssets(ast.data.map(a => ({ id: a.id, name: a.asset_name, amount: a.amount })));
      if (lib.data?.length) setLiabs(lib.data.map(a => ({ id: a.id, name: a.liability_name, amount: a.amount })));
    } catch (err) { console.error("Error:", err); }
  }, [supabase, getUID]);

  useEffect(() => { if (screen === "app") loadAll(); }, [screen]);

  // Detect password recovery session from email link
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setResetMode(true);
        setScreen("reset");
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // ── CÁLCULOS ──
  const totalInc = incomes.reduce((s, x) => s + Number(x.amount), 0);
  const totalExp = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const dailyTotal = dailyEntries.reduce((s, e) => s + Number(e.amount), 0);
  const todayExp = expenses.filter(e => isSameDay(e.date)).reduce((s, x) => s + Number(x.amount), 0);
  const weekExp = expenses.filter(e => isThisWeek(e.date)).reduce((s, x) => s + Number(x.amount), 0);
  const monthExp = expenses.filter(e => isThisMonth(e.date)).reduce((s, x) => s + Number(x.amount), 0);
  const curIncome = incomeType === 1 ? dailyTotal : incomeType === 2 ? weeklyInc : (monthlyInc || totalInc);
  const curExp = incomeType === 1 ? todayExp : incomeType === 2 ? weekExp : monthExp;
  const balance = curIncome - curExp;
  const savRate = curIncome > 0 ? Math.round((balance / curIncome) * 100) : 0;
  const totA = assets.reduce((s, x) => s + Number(x.amount), 0);
  const totL = liabs.reduce((s, x) => s + Number(x.amount), 0);
  const netWorth = totA - totL;
  const filteredExp = expFilter === 0 ? expenses : expFilter === 1 ? expenses.filter(e => isSameDay(e.date)) : expFilter === 2 ? expenses.filter(e => isThisWeek(e.date)) : expenses.filter(e => isThisMonth(e.date));
  const filteredTotal = filteredExp.reduce((s, x) => s + Number(x.amount), 0);
  const overdueBills = bills.filter(b => !b.paid && isOverdue(b.dueDate));
  const dueSoonBills = bills.filter(b => !b.paid && isDueSoon(b.dueDate) && !isOverdue(b.dueDate));
  const activeGoal = goals.find(g => !g.done && g.target > 0);
  const activeGoalPct = activeGoal ? Math.min(100, Math.round((activeGoal.saved / activeGoal.target) * 100)) : 0;
  const dailyPct = dailyGoal > 0 ? Math.min(100, Math.round((dailyTotal / dailyGoal) * 100)) : 0;

  // Smart summary — UN mensaje a la vez
  const smartMsg = (() => {
    if (overdueBills.length > 0) return { text: `🚨 ${overdueBills.length} factura${overdueBills.length > 1 ? "s" : ""} vencida${overdueBills.length > 1 ? "s" : ""}: ${overdueBills.map(b => billName(b.name)).join(", ")}`, type: "red" };
    if (dueSoonBills.length > 0) return { text: `🔔 ${dueSoonBills.length} factura${dueSoonBills.length > 1 ? "s" : ""} próxima${dueSoonBills.length > 1 ? "s" : ""} a vencer: ${dueSoonBills.map(b => billName(b.name)).join(", ")}`, type: "yellow" };
    if (incomeType === 1 && dailyGoal > 0) {
      const rem = dailyGoal - dailyTotal;
      return rem > 0 ? { text: `💰 Te faltan ${fmt(rem)} para tu meta de hoy`, type: "blue" } : { text: `🎉 ¡Meta del día alcanzada!`, type: "blue" };
    }
    if (activeGoal) return { text: motivate(activeGoalPct, goalName(activeGoal.name)), type: "blue" };
    return null;
  })();

  // ── CRUD ──
  const openModal = (type, data = {}) => { setModal({ type, data }); setForm({ ...data }); };
  const closeModal = () => { setModal(null); setForm({}); };
  const F = k => v => setForm(p => ({ ...p, [k]: v }));
  const askDel = (msg, fn) => setConfirm({ msg, fn });

  const saveModal = async () => {
    const { type, data } = modal;
    const uid = await getUID();
    const sb = supabase;

    if (type === "addExp") {
      const d = form.date || todayISO();
      const row = { id: crypto.randomUUID(), desc: form.desc || "", amount: Number(form.amount) || 0, category: form.category || EXP_CATS[0], date: d };
      setExp(p => [row, ...p]);
      if (uid && sb) await sb.from("expenses").insert({ user_id: uid, description: row.desc, amount: row.amount, category: row.category, expense_date: d });
    }
    if (type === "editExp") {
      setExp(p => p.map(x => x.id === data.id ? { ...x, desc: form.desc, amount: Number(form.amount) || 0, category: form.category, date: form.date || data.date } : x));
      if (uid && sb) await sb.from("expenses").update({ description: form.desc, amount: Number(form.amount) || 0, category: form.category, expense_date: form.date || data.date }).eq("id", data.id);
    }
    if (type === "addInc") {
      const row = { id: crypto.randomUUID(), source: form.source || INC_SRCS[0], desc: form.desc || "", amount: Number(form.amount) || 0, date: form.date || todayISO() };
      setInc(p => [row, ...p]);
      if (uid && sb) await sb.from("incomes").insert({ user_id: uid, source: row.source, description: row.desc, amount: row.amount, income_date: row.date });
    }
    if (type === "editInc") {
      setInc(p => p.map(x => x.id === data.id ? { ...x, source: form.source, desc: form.desc, amount: Number(form.amount) || 0, date: form.date } : x));
      if (uid && sb) await sb.from("incomes").update({ source: form.source, description: form.desc, amount: Number(form.amount) || 0, income_date: form.date }).eq("id", data.id);
    }
    if (type === "addGoal") {
      const nm = form.namePreset === "Otro" ? (form.nameCustom || "Meta") : (form.namePreset || GOAL_PRESETS[0]);
      const color = COLORS[goals.length % COLORS.length];
      const row = { id: crypto.randomUUID(), name: nm, target: Number(form.target) || 0, saved: Number(form.saved) || 0, deadline: form.deadline || null, color, done: false };
      setGoals(p => [...p, row]);
      if (uid && sb) await sb.from("goals").insert({ user_id: uid, goal_name: nm, target: row.target, saved: row.saved, deadline: row.deadline, color, done: false });
    }
    if (type === "editGoal") {
      setGoals(p => p.map(g => g.id === data.id ? { ...g, name: form.name || g.name, target: Number(form.target) || 0, saved: Number(form.saved) || 0, deadline: form.deadline || g.deadline } : g));
      if (uid && sb) await sb.from("goals").update({ goal_name: form.name, target: Number(form.target) || 0, saved: Number(form.saved) || 0, deadline: form.deadline || null }).eq("id", data.id);
    }
    if (type === "doneGoal") {
      setGoals(p => p.map(g => g.id === data.id ? { ...g, done: true } : g));
      if (uid && sb) await sb.from("goals").update({ done: true }).eq("id", data.id);
    }
    if (type === "addBill") {
      const nm = form.namePreset === "Otro" ? (form.nameCustom || "Factura") : (form.namePreset || BILL_PRESETS[0]);
      const row = { id: crypto.randomUUID(), name: nm, amount: Number(form.amount) || 0, dueDate: form.dueDate || null, paid: false, freq: form.freq || "Mensual" };
      setBills(p => [...p, row]);
      if (uid && sb) await sb.from("bills").insert({ user_id: uid, bill_name: nm, amount: row.amount, due_date: row.dueDate || null, paid: false, freq: row.freq });
    }
    if (type === "editBill") {
      const nm = form.name || form.nameCustom || data.name;
      setBills(p => p.map(b => b.id === data.id ? { ...b, name: nm, amount: Number(form.amount) || 0, dueDate: form.dueDate || b.dueDate, freq: form.freq || b.freq } : b));
      if (uid && sb) await sb.from("bills").update({ bill_name: nm, amount: Number(form.amount) || 0, due_date: form.dueDate || null, freq: form.freq }).eq("id", data.id);
    }
    if (type === "addAsset") {
      const row = { id: crypto.randomUUID(), name: form.name || "Activo", amount: Number(form.amount) || 0 };
      setAssets(p => [...p, row]);
      if (uid && sb) await sb.from("assets").insert({ user_id: uid, asset_name: row.name, amount: row.amount });
    }
    if (type === "editAsset") {
      setAssets(p => p.map(a => a.id === data.id ? { ...a, name: form.name, amount: Number(form.amount) || 0 } : a));
      if (uid && sb) await sb.from("assets").update({ asset_name: form.name, amount: Number(form.amount) || 0 }).eq("id", data.id);
    }
    if (type === "addLiab") {
      const row = { id: crypto.randomUUID(), name: form.name || "Pasivo", amount: Number(form.amount) || 0 };
      setLiabs(p => [...p, row]);
      if (uid && sb) await sb.from("liabilities").insert({ user_id: uid, liability_name: row.name, amount: row.amount });
    }
    if (type === "editLiab") {
      setLiabs(p => p.map(a => a.id === data.id ? { ...a, name: form.name, amount: Number(form.amount) || 0 } : a));
      if (uid && sb) await sb.from("liabilities").update({ liability_name: form.name, amount: Number(form.amount) || 0 }).eq("id", data.id);
    }
    if (type === "editBudget") {
      setBudget(p => p.map(b => b.cat === data.cat ? { ...b, budgeted: Number(form.budgeted) || 0, spent: Number(form.spent) || 0 } : b));
      if (uid && sb) await sb.from("budget").upsert({ user_id: uid, cat: data.cat, budgeted: Number(form.budgeted) || 0, spent: Number(form.spent) || 0 });
    }
    closeModal();
  };

  const delItem = async (table, id, setter) => {
    setter(p => p.filter(x => x.id !== id));
    const uid = await getUID();
    if (uid && supabase) await supabase.from(table).delete().eq("id", id);
    setConfirm(null);
  };

  const togglePaid = async (b) => {
    setBills(p => p.map(x => x.id === b.id ? { ...x, paid: !x.paid } : x));
    const uid = await getUID();
    if (uid && supabase) await supabase.from("bills").update({ paid: !b.paid }).eq("id", b.id);
  };

  const addDaily = async (entry) => {
    const time = new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
    const row = { id: crypto.randomUUID(), ...entry, time };
    setDE(p => [row, ...p]);
    const uid = await getUID();
    if (uid && supabase) await supabase.from("daily_entries").insert({ user_id: uid, description: entry.desc, amount: entry.amount, entry_date: todayISO(), entry_time: time });
  };

  const delDaily = async (id) => {
    setDE(p => p.filter(x => x.id !== id));
    const uid = await getUID();
    if (uid && supabase) await supabase.from("daily_entries").delete().eq("id", id);
  };

  const handleAv = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      // Compress image before saving
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 200; // max 200x200px
        let w = img.width; let h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setUser(u => ({ ...u, avatar: compressed }));
        getUID().then(uid => {
          if (uid && supabase) supabase.from("profiles").upsert({ id: uid, avatar_url: compressed });
        });
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  };

  const saveProfile = async (name, email) => {
    setUser(u => ({ ...u, name, email }));
    await saveProf({ full_name: name, email });
  };

  // ── THEME ──
  const C = dark ? {
    bg: "#0F172A", card: "#1E293B", border: "rgba(255,255,255,0.06)",
    text: "#F8FAFC", muted: "#64748B", sub: "#94A3B8",
  } : {
    bg: "#F1F5F9", card: "#FFFFFF", border: "rgba(0,0,0,0.06)",
    text: "#0F172A", muted: "#64748B", sub: "#94A3B8",
  };

  const Card = ({ children, st = {} }) => (
    <div className="card" style={{ background: C.card, border: `1px solid ${C.border}`, ...st }}>{children}</div>
  );

  const CT = ({ children, right }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>{children}</div>
      {right}
    </div>
  );

  // ── MODAL RENDER ──
  const renderModal = () => {
    if (!modal) return null;
    const { type, data } = modal;
    const titles = { addExp: "Agregar Gasto", editExp: "Editar Gasto", addInc: "Agregar Ingreso", editInc: "Editar Ingreso", addGoal: "Nueva Meta", editGoal: "Editar Meta", doneGoal: "Meta Completada", addBill: "Agregar Factura", editBill: "Editar Factura", addAsset: "Agregar Activo", editAsset: "Editar Activo", addLiab: "Agregar Pasivo", editLiab: "Editar Pasivo", editBudget: "Editar Presupuesto" };
    return (
      <Modal open title={titles[type] || ""} onClose={closeModal}>
        {type === "doneGoal" && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>¡Meta Completada!</div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 22 }}>¡Felicitaciones! Completaste "{goalName(data.name)}"</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn onClick={saveModal}>¡Completar!</Btn>
              <Btn v="ghost" onClick={closeModal}>Cancelar</Btn>
            </div>
          </div>
        )}
        {(type === "addExp" || type === "editExp") && (
          <>
            <RefInput label="Descripción" value={form.desc || ""} onChange={F("desc")} placeholder="ej. Supermercado" />
            <RefInput label="Monto (RD$)" value={form.amount || ""} onChange={F("amount")} type="number" inputMode="decimal" placeholder="0.00" />
            <RefSelect label="Categoría" options={EXP_CATS} value={form.category || EXP_CATS[0]} onChange={F("category")} />
            <RefInput label="Fecha" value={form.date || ""} onChange={F("date")} type="date" isDate />
          </>
        )}
        {(type === "addInc" || type === "editInc") && (
          <>
            <RefInput label="Descripción" value={form.desc || ""} onChange={F("desc")} placeholder="ej. Salario" />
            <RefInput label="Monto (RD$)" value={form.amount || ""} onChange={F("amount")} type="number" inputMode="decimal" placeholder="0.00" />
            <RefSelect label="Fuente" options={INC_SRCS} value={form.source || INC_SRCS[0]} onChange={F("source")} />
            <RefInput label="Fecha" value={form.date || ""} onChange={F("date")} type="date" isDate />
          </>
        )}
        {(type === "addGoal" || type === "editGoal") && (
          <>
            {type === "addGoal" && <RefSelect label="Tipo de Meta" options={GOAL_PRESETS} value={form.namePreset || GOAL_PRESETS[0]} onChange={F("namePreset")} />}
            {(type === "editGoal" || form.namePreset === "Otro") && <RefInput label="Nombre" value={form.name || form.nameCustom || ""} onChange={v => { F("name")(v); F("nameCustom")(v); }} placeholder="Mi meta" />}
            <RefInput label="Monto Objetivo (RD$)" value={form.target || ""} onChange={F("target")} type="number" inputMode="decimal" placeholder="0.00" />
            <RefInput label="Ahorrado (RD$)" value={form.saved || ""} onChange={F("saved")} type="number" inputMode="decimal" placeholder="0.00" />
            <RefInput label="Fecha Límite" value={form.deadline || ""} onChange={F("deadline")} type="date" isDate />
          </>
        )}
        {(type === "addBill" || type === "editBill") && (
          <>
            {type === "addBill" && <RefSelect label="Tipo" options={BILL_PRESETS} value={form.namePreset || BILL_PRESETS[0]} onChange={F("namePreset")} />}
            {(type === "editBill" || form.namePreset === "Otro") && <RefInput label="Nombre" value={form.name || form.nameCustom || data?.name || ""} onChange={v => { F("name")(v); F("nameCustom")(v); }} />}
            <RefInput label="Monto (RD$)" value={form.amount || ""} onChange={F("amount")} type="number" inputMode="decimal" placeholder="0.00" />
            <RefInput label="Fecha de Pago" value={form.dueDate || ""} onChange={F("dueDate")} type="date" isDate />
            <RefSelect label="Frecuencia" options={FREQS} value={form.freq || FREQS[0]} onChange={F("freq")} />
          </>
        )}
        {(type === "addAsset" || type === "editAsset" || type === "addLiab" || type === "editLiab") && (
          <>
            <RefInput label="Nombre" value={form.name || ""} onChange={F("name")} placeholder="ej. Cuenta corriente" />
            <RefInput label="Monto (RD$)" value={form.amount || ""} onChange={F("amount")} type="number" inputMode="decimal" placeholder="0.00" />
          </>
        )}
        {type === "editBudget" && (
          <>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>{budgetName(data.cat)}</div>
            <RefInput label="Presupuestado (RD$)" value={form.budgeted || ""} onChange={F("budgeted")} type="number" inputMode="decimal" placeholder="0.00" />
            <RefInput label="Gastado (RD$)" value={form.spent || ""} onChange={F("spent")} type="number" inputMode="decimal" placeholder="0.00" />
          </>
        )}
        {type !== "doneGoal" && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn onClick={saveModal}>Guardar</Btn>
            <Btn v="ghost" onClick={closeModal}>Cancelar</Btn>
          </div>
        )}
      </Modal>
    );
  };

  // ── AUTH ──
  // ── RESET PASSWORD SCREEN ──
  if (screen === "reset") {
    const newPassRef = useRef(null);
    const confirmPassRef = useRef(null);
    const inpStyle = { width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", color: "#0F172A", outline: "none", fontSize: "16px", fontFamily: "'Inter',sans-serif", marginBottom: 14 };
    return (
      <>
        <style>{getCSS(false)}</style>
        <div className="auth-bg">
          <div className="auth-card">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 58, height: 58, background: "linear-gradient(135deg,#06B6D4,#0284C7)", borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 24px rgba(6,182,212,0.3)" }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 800, color: "white" }}>Z</span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Nueva Contraseña</div>
              <div style={{ color: "#64748B", fontSize: 14 }}>Escribe tu nueva contraseña</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Nueva Contraseña</div>
            <input ref={newPassRef} style={inpStyle} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Confirmar Contraseña</div>
            <input ref={confirmPassRef} style={inpStyle} type="password" placeholder="Repite la contraseña" autoComplete="new-password" />
            <button className="btn-main" disabled={loading} onClick={async () => {
              const newPass = newPassRef.current?.value || "";
              const confirmPass = confirmPassRef.current?.value || "";
              if (!newPass || !confirmPass) { alert("Por favor completa los dos campos"); return; }
              if (newPass.length < 6) { alert("La contraseña debe tener al menos 6 caracteres"); return; }
              if (newPass !== confirmPass) { alert("Las contraseñas no coinciden"); return; }
              setLoading(true);
              if (supabase) {
                const { error } = await supabase.auth.updateUser({ password: newPass });
                if (error) { alert("Error: " + error.message); setLoading(false); return; }
                alert("✅ ¡Contraseña actualizada! Ya puedes iniciar sesión.");
                setResetMode(false);
                setScreen("login");
              }
              setLoading(false);
            }}>{loading ? "Guardando..." : "Guardar Nueva Contraseña"}</button>
          </div>
        </div>
      </>
    );
  }

  if (screen === "login" || screen === "register") {
    const inpStyle = { width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", color: "#0F172A", outline: "none", fontSize: "16px", fontFamily: "'Inter',sans-serif", marginBottom: 14 };
    return (
      <>
        <style>{getCSS(false)}</style>
        <div className="auth-bg">
          <div className="auth-card">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 58, height: 58, background: "linear-gradient(135deg,#06B6D4,#0284C7)", borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 24px rgba(6,182,212,0.3)" }}>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 30, fontWeight: 800, color: "white" }}>Z</span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>Zario</div>
              <div style={{ color: "#64748B", fontSize: 14 }}>Tu asistente financiero inteligente</div>
            </div>
            {screen === "login" ? (
              <>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 700, color: "#0F172A", marginBottom: 18, textAlign: "center" }}>Iniciar Sesión</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Correo electrónico</div>
                <input ref={lEmailR} style={inpStyle} type="email" placeholder="tu@correo.com" autoComplete="email" />
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Contraseña</div>
                <input ref={lPassR} style={inpStyle} type="password" placeholder="••••••••" autoComplete="current-password" />
                <button className="btn-main" disabled={loading} onClick={async () => {
                  const email = lEmailR.current?.value || "";
                  const pass = lPassR.current?.value || "";
                  if (!email || !pass) { alert("Por favor ingresa tu correo y contraseña"); return; }
                  setLoading(true);
                  if (supabase) {
                    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
                    if (error) { alert("Correo o contraseña incorrectos"); setLoading(false); return; }
                    const { data: pr } = await supabase.from("profiles").select("full_name,email,avatar_url").eq("id", data.user.id).single();
                    setUser({ name: pr?.full_name || email.split("@")[0], email, avatar: pr?.avatar_url || null });
                  } else {
                    setUser({ name: email.split("@")[0], email, avatar: null });
                  }
                  setLoading(false); setScreen("app");
                }}>{loading ? "Cargando..." : "Iniciar Sesión"}</button>

                <div style={{ textAlign: "center", marginTop: 8, fontSize: 14, color: "#64748B" }}>¿No tienes cuenta? <span onClick={() => setScreen("register")} style={{ color: "#06B6D4", cursor: "pointer", fontWeight: 600 }}>Crear cuenta</span></div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 700, color: "#0F172A", marginBottom: 18, textAlign: "center" }}>Crear Cuenta</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Nombre completo</div>
                <input ref={rNameR} style={inpStyle} type="text" placeholder="Tu nombre" autoComplete="name" />
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Correo electrónico</div>
                <input ref={rEmailR} style={inpStyle} type="email" placeholder="tu@correo.com" autoComplete="email" />
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Contraseña</div>
                <input ref={rPassR} style={inpStyle} type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                <button className="btn-main" disabled={loading} onClick={async () => {
                  const name = rNameR.current?.value || "";
                  const email = rEmailR.current?.value || "";
                  const pass = rPassR.current?.value || "";
                  if (!email || !pass) { alert("Por favor completa todos los campos"); return; }
                  if (pass.length < 6) { alert("La contraseña debe tener al menos 6 caracteres"); return; }
                  setLoading(true);
                  if (supabase) {
                    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass });
                    if (error) { alert(error.message); setLoading(false); return; }
                    if (data.user) await supabase.from("profiles").upsert({ id: data.user.id, full_name: name || email.split("@")[0], email });
                  }
                  setUser({ name: name || email.split("@")[0], email, avatar: null });
                  setLoading(false); setScreen("app");
                }}>{loading ? "Creando cuenta..." : "Crear Cuenta"}</button>
                <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "#64748B" }}>¿Ya tienes cuenta? <span onClick={() => setScreen("login")} style={{ color: "#06B6D4", cursor: "pointer", fontWeight: 600 }}>Iniciar sesión</span></div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── AVATAR ──
  const AvatarSm = () => (
    <div className="avatar-sm">
      {user.avatar ? <img src={user.avatar} alt="av" /> : (user.name ? user.name[0].toUpperCase() : "U")}
    </div>
  );

  // ── NAV ITEMS ──
  const navItems = [
    { k: "dashboard", label: "Inicio", icon: "home" },
    { k: "expenses", label: "Gastos", icon: "dollar" },
    { k: "income", label: "Ingresos", icon: "trend" },
    { k: "daily", label: "Ingresos Diarios", icon: "daily" },
    { k: "goals", label: "Metas", icon: "target" },
    { k: "budget", label: "Presupuesto", icon: "wallet" },
    { k: "networth", label: "Patrimonio", icon: "bar" },
    { k: "bills", label: "Facturas", icon: "file" },
    { k: "analytics", label: "Analíticas", icon: "bar" },
    { k: "profile", label: "Perfil", icon: "user" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINAS
  // ─────────────────────────────────────────────────────────────────────────
  const incLabel = incomeType === 1 ? "Ingreso de Hoy" : incomeType === 2 ? "Ingreso Semanal" : "Ingreso Mensual";
  const expLabel = incomeType === 1 ? "Gastos de Hoy" : incomeType === 2 ? "Gastos Semanales" : "Gastos del Mes";
  const incVal = incomeType === 1 ? dailyTotal : incomeType === 2 ? weeklyInc : (monthlyInc || totalInc);
  const expVal = incomeType === 1 ? todayExp : incomeType === 2 ? weekExp : monthExp;

  const Dashboard = () => (
    <div>
      {smartMsg && (
        <div className={`alert alert-${smartMsg.type}`}>
          <IC n={smartMsg.type === "red" ? "alert" : smartMsg.type === "yellow" ? "bell" : "info"} s={18} c={smartMsg.type === "red" ? "#F43F5E" : smartMsg.type === "yellow" ? "#F59E0B" : "#06B6D4"} />
          <div style={{ fontSize: 13, fontWeight: 500, color: smartMsg.type === "red" ? "#F43F5E" : smartMsg.type === "yellow" ? "#D97706" : dark ? "#67E8F9" : "#0369A1" }}>{smartMsg.text}</div>
          {(smartMsg.type === "red" || smartMsg.type === "yellow") && (
            <Btn sm v={smartMsg.type === "red" ? "danger" : "ghost"} onClick={() => setNav("bills")}>Ver</Btn>
          )}
        </div>
      )}

      <div className="stats-grid">
        {[
          { label: "Balance Total", val: fmt(balance), color: balance >= 0 ? "#06B6D4" : "#F43F5E", icon: "dollar", onClick: () => setNav("analytics") },
          { label: incLabel, val: fmt(incVal), color: "#10B981", icon: "trend", onClick: () => setNav(incomeType === 1 ? "daily" : "income") },
          { label: expLabel, val: fmt(expVal), color: "#F43F5E", icon: "wallet", onClick: () => openModal("addExp") },
          { label: "Tasa de Ahorro", val: `${savRate}%`, color: "#8B5CF6", icon: "shield", onClick: () => setNav("budget") },
        ].map(s => (
          <div key={s.label} className="stat-card" onClick={s.onClick} title="Toca para agregar o ver más">
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},transparent)`, borderRadius: "16px 16px 0 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IC n={s.icon} s={14} c={s.color} />
              </div>
            </div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 800, color: C.text, marginTop: 10, marginBottom: 4, letterSpacing: "-0.5px" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>▲ vs mes anterior</div>
          </div>
        ))}
      </div>

      <Card st={{ marginBottom: 18 }}>
        <CT>Tipo de Ingreso</CT>
        <div className="filter-row">
          {["Mensual (Fijo)", "Diario (Variable)", "Semanal"].map((it, i) => (
            <button key={i} className="chip" onClick={async () => { setIT(i); await saveProf({ income_type: i }); }}
              style={{ background: incomeType === i ? "rgba(6,182,212,0.1)" : "transparent", borderColor: incomeType === i ? "#06B6D4" : C.border, color: incomeType === i ? "#06B6D4" : C.muted, fontWeight: incomeType === i ? 600 : 400 }}>{it}</button>
          ))}
        </div>
        {incomeType === 0 && <IncomeRef value={monthlyInc} placeholder="Ingreso mensual fijo" onSave={async v => { setMI(v); await saveProf({ monthly_inc: v }); }} />}
        {incomeType === 1 && <div style={{ fontSize: 14, color: C.muted }}>Total hoy: <strong style={{ color: "#10B981" }}>{fmt(dailyTotal)}</strong> <span style={{ cursor: "pointer", color: "#06B6D4", fontSize: 13, marginLeft: 8 }} onClick={() => setNav("daily")}>→ Gestionar</span></div>}
        {incomeType === 2 && <IncomeRef value={weeklyInc} placeholder="Ingreso semanal" onSave={async v => { setWI(v); await saveProf({ weekly_inc: v }); }} />}
      </Card>

      <div className="two-col">
        <Card>
          <CT>Transacciones Recientes</CT>
          {(() => {
            const recExp = incomeType === 1 ? expenses.filter(e => isSameDay(e.date)) : incomeType === 2 ? expenses.filter(e => isThisWeek(e.date)) : expenses.slice(0, 5);
            const list = [...recExp.slice(0, 3).map(x => ({ ...x, tp: "exp" })), ...incomes.filter(i => Number(i.amount) > 0).slice(0, 2).map(x => ({ ...x, tp: "inc" }))];
            if (!list.length) return <div style={{ textAlign: "center", padding: "24px 0", color: C.muted }}><div style={{ fontSize: 28, marginBottom: 8 }}>📊</div><div style={{ fontSize: 13 }}>Sin transacciones aún</div></div>;
            return list.map(tx => (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div className="ico-box" style={{ background: tx.tp === "inc" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)" }}>{catEmoji[tx.category || srcName(tx.source)] || "💰"}</div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.desc || srcName(tx.source)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{tx.date}</div>
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: tx.tp === "inc" ? "#10B981" : "#F43F5E", flexShrink: 0 }}>{tx.tp === "inc" ? "+" : "-"}{fmt(tx.amount)}</div>
              </div>
            ));
          })()}
        </Card>

        <Card>
          <CT right={<Btn sm v="outline" onClick={() => { setNav("goals"); setTimeout(() => openModal("addGoal"), 100); }}>+ Nueva</Btn>}>Metas</CT>
          {goals.filter(g => g.target > 0 && !g.done).length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", cursor: "pointer" }} onClick={() => { setNav("goals"); setTimeout(() => openModal("addGoal"), 100); }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Define una meta</div>
              <Btn sm>+ Nueva Meta</Btn>
            </div>
          ) : goals.filter(g => g.target > 0 && !g.done).slice(0, 3).map(g => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{goalName(g.name)}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{pct}%</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${g.color},${g.color}88)` }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 3 }}>
                  <span>{fmt(g.saved)}</span><span>{fmt(g.target)}</span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );

  const Daily = () => (
    <div>
      {dailyGoal > 0 && dailyTotal >= dailyGoal && (
        <div className="celebrate">
          <div style={{ fontSize: 34, marginBottom: 6 }}>🎉</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, color: "#10B981" }}>¡Meta del día alcanzada!</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{fmt(dailyTotal)} de {fmt(dailyGoal)}</div>
        </div>
      )}
      <Card st={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>TOTAL DE HOY</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 38, fontWeight: 800, color: "#10B981", marginBottom: 14, letterSpacing: "-1px" }}>{fmt(dailyTotal)}</div>
        {dailyGoal > 0 && (
          <div style={{ padding: "12px 14px", background: dailyTotal >= dailyGoal ? "rgba(16,185,129,0.06)" : "rgba(6,182,212,0.06)", borderRadius: 12, border: `1px solid ${dailyTotal >= dailyGoal ? "rgba(16,185,129,0.2)" : "rgba(6,182,212,0.15)"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Meta del Día</span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: dailyTotal >= dailyGoal ? "#10B981" : "#06B6D4" }}>{fmt(dailyGoal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 8 }}>
              <span>Hoy: <strong style={{ color: "#10B981" }}>{fmt(dailyTotal)}</strong></span>
              <span style={{ fontWeight: 700, color: dailyTotal >= dailyGoal ? "#10B981" : "#06B6D4" }}>{dailyPct}%</span>
            </div>
            <div className="prog-bar" style={{ height: 10 }}><div className="prog-fill" style={{ width: `${dailyPct}%`, background: dailyTotal >= dailyGoal ? "linear-gradient(90deg,#10B981,#34D399)" : "linear-gradient(90deg,#06B6D4,#0284C7)" }} /></div>
          </div>
        )}
      </Card>
      <Card st={{ marginBottom: 16 }}>
        <CT>Metas de Ingreso</CT>
        <GoalRef dg={dailyGoal} wg={weeklyGoal} mg={monthlyGoal}
          onDG={async v => { setDG(v); await saveProf({ daily_goal: v }); }}
          onWG={async v => { setWG(v); await saveProf({ weekly_goal: v }); }}
          onMG={async v => { setMG(v); await saveProf({ monthly_goal: v }); }}
        />
        {weeklyGoal > 0 && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(139,92,246,0.06)", borderRadius: 12, border: "1px solid rgba(139,92,246,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Meta Semanal</span><span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#8B5CF6" }}>{fmt(weeklyGoal)}</span></div>
            <div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.min(100, (dailyTotal / weeklyGoal) * 100)}%`, background: "linear-gradient(90deg,#8B5CF6,#A78BFA)" }} /></div>
          </div>
        )}
        {monthlyGoal > 0 && (
          <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(245,158,11,0.06)", borderRadius: 12, border: "1px solid rgba(245,158,11,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Meta Mensual</span><span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F59E0B" }}>{fmt(monthlyGoal)}</span></div>
            <div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.min(100, (dailyTotal / monthlyGoal) * 100)}%`, background: "linear-gradient(90deg,#F59E0B,#FCD34D)" }} /></div>
          </div>
        )}
      </Card>
      <Card st={{ marginBottom: 16 }}>
        <CT>Registrar Ingreso</CT>
        <DailyRow onAdd={addDaily} />
      </Card>
      <Card>
        <CT right={<span style={{ fontSize: 13, color: C.muted }}>{dailyEntries.length} registros hoy</span>}>Registros de Hoy</CT>
        {dailyEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: C.muted }}><div style={{ fontSize: 28, marginBottom: 8 }}>💵</div><div style={{ fontSize: 13 }}>Agrega tu primer registro arriba</div></div>
        ) : dailyEntries.map(e => (
          <div key={e.id} className="row-item">
            <div className="ico-box" style={{ background: "rgba(16,185,129,0.1)" }}>💵</div>
            <div style={{ flex: 1, marginLeft: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{e.desc}</div>
              <div style={{ fontSize: 11, color: C.muted }}>🕐 {e.time}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#10B981" }}>+{fmt(e.amount)}</span>
              <button className="act-btn del" onClick={() => askDel("¿Eliminar este registro?", () => delDaily(e.id))}><IC n="trash" s={14} c="#F43F5E" /></button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );

  const Expenses = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 14, color: C.muted }}>Total: <strong style={{ color: "#F43F5E", fontFamily: "'Space Grotesk',sans-serif" }}>{fmt(filteredTotal)}</strong></div>
        <Btn onClick={() => openModal("addExp")}>+ Agregar Gasto</Btn>
      </div>
      <div className="filter-row">
        {["Todos", "Hoy", "Esta Semana", "Este Mes"].map((f, i) => (
          <button key={i} className="chip" onClick={() => setEF(i)}
            style={{ background: expFilter === i ? "rgba(244,63,94,0.1)" : "transparent", borderColor: expFilter === i ? "#F43F5E" : C.border, color: expFilter === i ? "#F43F5E" : C.muted, fontWeight: expFilter === i ? 600 : 400 }}>{f}</button>
        ))}
      </div>
      {filteredExp.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: "36px 0", color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>💸</div><div>Sin gastos en este período</div></div></Card>
      ) : filteredExp.map(x => (
        <div key={x.id} className="row-item">
          <div className="ico-box" style={{ background: "rgba(244,63,94,0.08)" }}>{catEmoji[x.category] || "💸"}</div>
          <div style={{ flex: 1, marginLeft: 10, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.desc || x.category}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{x.category} · {x.date}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F43F5E" }}>-{fmt(x.amount)}</span>
            <button className="act-btn" onClick={() => openModal("editExp", x)}><IC n="edit" s={14} c={C.muted} /></button>
            <button className="act-btn del" onClick={() => askDel("¿Eliminar este gasto?", async () => delItem("expenses", x.id, setExp))}><IC n="trash" s={14} c="#F43F5E" /></button>
          </div>
        </div>
      ))}
    </div>
  );

  const Income = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 14, color: C.muted }}>Total: <strong style={{ color: "#10B981", fontFamily: "'Space Grotesk',sans-serif" }}>{fmt(totalInc)}</strong></div>
        <Btn onClick={() => openModal("addInc")}>+ Agregar Ingreso</Btn>
      </div>
      {incomes.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: "36px 0", color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>💰</div><div>Sin ingresos registrados</div></div></Card>
      ) : incomes.map(x => (
        <div key={x.id} className="row-item">
          <div className="ico-box" style={{ background: "rgba(16,185,129,0.08)" }}>{catEmoji[srcName(x.source)] || "💰"}</div>
          <div style={{ flex: 1, marginLeft: 10, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.desc || srcName(x.source)}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{srcName(x.source)} · {x.date}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#10B981" }}>{fmt(x.amount)}</span>
            <button className="act-btn" onClick={() => openModal("editInc", x)}><IC n="edit" s={14} c={C.muted} /></button>
            <button className="act-btn del" onClick={() => askDel("¿Eliminar este ingreso?", async () => delItem("incomes", x.id, setInc))}><IC n="trash" s={14} c="#F43F5E" /></button>
          </div>
        </div>
      ))}
    </div>
  );

  const Goals = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <Btn onClick={() => openModal("addGoal")}>+ Nueva Meta</Btn>
      </div>
      {goals.length === 0 ? (
        <Card><div style={{ textAlign: "center", padding: "36px 0", color: C.muted }}><div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div><div>No tienes metas aún</div></div></Card>
      ) : goals.map(g => {
        const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
        return (
          <Card key={g.id} st={{ marginBottom: 14, opacity: g.done ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 13 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: g.done ? C.muted : C.text }}>{g.done ? "✅ " : ""}{goalName(g.name)}</div>
                {g.deadline && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>📅 {g.deadline}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: g.color }}>{pct}%</div>
                {!g.done && <button className="act-btn" onClick={() => openModal("editGoal", { ...g, name: goalName(g.name) })}><IC n="edit" s={14} c={C.muted} /></button>}
                {!g.done && pct >= 100 && <Btn sm v="green" onClick={() => openModal("doneGoal", g)}>Completar</Btn>}
                <button className="act-btn del" onClick={() => askDel("¿Eliminar esta meta?", async () => delItem("goals", g.id, setGoals))}><IC n="trash" s={14} c="#F43F5E" /></button>
              </div>
            </div>
            <div className="prog-bar" style={{ height: 10, marginBottom: 10 }}><div className="prog-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${g.color},${g.color}88)` }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: g.color, fontWeight: 600 }}>{fmt(g.saved)} ahorrado</span>
              <span style={{ color: C.muted }}>{fmt(g.target - g.saved)} restante</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{fmt(g.target)}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const Budget = () => (
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, padding: "8px 0 12px", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        <div>Categoría</div><div style={{ textAlign: "right" }}>Presup.</div><div style={{ textAlign: "right" }}>Gastado</div><div style={{ textAlign: "right" }}>Restante</div><div />
      </div>
      {budget.map(b => {
        const rem = b.budgeted - b.spent;
        const pct = b.budgeted > 0 ? (b.spent / b.budgeted) * 100 : 0;
        const col = pct >= 100 ? "#F43F5E" : pct >= 80 ? "#F59E0B" : "#10B981";
        return (
          <div key={b.id || b.cat} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 10, padding: "11px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center", fontSize: 13 }}>
            <div style={{ fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{budgetName(b.cat)}</div>
            <div style={{ textAlign: "right", fontFamily: "'Space Grotesk',sans-serif", color: C.text }}>{fmt(b.budgeted)}</div>
            <div style={{ textAlign: "right", fontFamily: "'Space Grotesk',sans-serif", color: col }}>{fmt(b.spent)}</div>
            <div style={{ textAlign: "right", fontFamily: "'Space Grotesk',sans-serif", color: rem < 0 ? "#F43F5E" : "#10B981", fontWeight: 600 }}>{fmt(rem)}</div>
            <button className="act-btn" onClick={() => openModal("editBudget", b)}><IC n="edit" s={14} c={C.muted} /></button>
          </div>
        );
      })}
    </Card>
  );

  const NetWorth = () => (
    <div>
      <div style={{ textAlign: "center", padding: "24px 0", background: dark ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.04)", borderRadius: 16, marginBottom: 18, border: "1px solid rgba(6,182,212,0.12)" }}>
        <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Patrimonio Neto</div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 40, fontWeight: 800, color: netWorth >= 0 ? "#06B6D4" : "#F43F5E", letterSpacing: "-1.5px" }}>{fmt(netWorth)}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Activos {fmt(totA)} · Pasivos {fmt(totL)}</div>
      </div>
      <Card st={{ marginBottom: 14 }}>
        <CT right={<Btn sm v="outline" onClick={() => openModal("addAsset")}>+ Agregar</Btn>}>✅ Activos — {fmt(totA)}</CT>
        {assets.map(a => (
          <div key={a.id} className="row-item">
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, flex: 1 }}>{assetName(a.name)}</div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#10B981", marginRight: 8 }}>{fmt(a.amount)}</span>
            <button className="act-btn" onClick={() => openModal("editAsset", a)}><IC n="edit" s={14} c={C.muted} /></button>
            <button className="act-btn del" onClick={() => askDel("¿Eliminar este activo?", async () => delItem("assets", a.id, setAssets))}><IC n="trash" s={14} c="#F43F5E" /></button>
          </div>
        ))}
      </Card>
      <Card>
        <CT right={<Btn sm v="outline" onClick={() => openModal("addLiab")}>+ Agregar</Btn>}>⚠️ Pasivos — {fmt(totL)}</CT>
        {liabs.map(a => (
          <div key={a.id} className="row-item">
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, flex: 1 }}>{assetName(a.name)}</div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#F43F5E", marginRight: 8 }}>{fmt(a.amount)}</span>
            <button className="act-btn" onClick={() => openModal("editLiab", a)}><IC n="edit" s={14} c={C.muted} /></button>
            <button className="act-btn del" onClick={() => askDel("¿Eliminar este pasivo?", async () => delItem("liabilities", a.id, setLiabs))}><IC n="trash" s={14} c="#F43F5E" /></button>
          </div>
        ))}
      </Card>
    </div>
  );

  const Bills = () => (
    <div>
      {/* Bills summary */}
      {(() => {
        const totalPending = bills.filter(b => !b.paid).reduce((s,b) => s + Number(b.amount), 0);
        const totalPaid = bills.filter(b => b.paid).reduce((s,b) => s + Number(b.amount), 0);
        return (
          <div style={{ background: dark ? "rgba(255,255,255,0.03)" : "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Resumen del Mes</div>
              <Btn sm onClick={() => openModal("addBill")}>+ Agregar</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "10px 12px", background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)" }}>
                <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginBottom: 4 }}>⏳ PENDIENTE</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 800, color: "#D97706" }}>{fmt(totalPending)}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{bills.filter(b => !b.paid).length} facturas</div>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
                <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, marginBottom: 4 }}>✅ PAGADO</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 800, color: "#10B981" }}>{fmt(totalPaid)}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{bills.filter(b => b.paid).length} facturas</div>
              </div>
            </div>
          </div>
        );
      })()}
      {bills.map(b => {
        const over = isOverdue(b.dueDate) && !b.paid;
        const soon = isDueSoon(b.dueDate) && !isOverdue(b.dueDate) && !b.paid;
        return (
          <div key={b.id} className={`bill-row${over ? " overdue" : soon ? " soon" : b.paid ? " paid" : ""}`}>
            <div className="ico-box" style={{ background: b.paid ? "rgba(16,185,129,0.08)" : over ? "rgba(244,63,94,0.08)" : "rgba(6,182,212,0.08)" }}>
              {catEmoji[billName(b.name)] || "📄"}
            </div>
            <div style={{ flex: 1, marginLeft: 10, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: b.paid ? C.muted : C.text }}>{billName(b.name)}</div>
              <div style={{ fontSize: 11, marginTop: 2, color: over ? "#F43F5E" : soon ? "#D97706" : b.paid ? "#10B981" : C.muted }}>
                {b.paid && b.dueDate
                  ? `✅ Pagada · Próximo pago: ${nextPayDate(b.dueDate)}`
                  : b.dueDate ? `📅 ${b.dueDate}${over ? " 🚨 Vencida" : soon ? " ⚠️ Próxima" : ""}` : "Sin fecha"} · {b.freq}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: C.text }}>{fmt(b.amount)}</span>
              <button className="act-btn" onClick={() => togglePaid(b)} title={b.paid ? "Marcar pendiente" : "Marcar pagada"}><IC n="check" s={15} c={b.paid ? "#10B981" : C.muted} /></button>
              <button className="act-btn" onClick={() => openModal("editBill", { ...b, name: billName(b.name) })}><IC n="edit" s={14} c={C.muted} /></button>
              <button className="act-btn del" onClick={() => askDel("¿Eliminar esta factura?", async () => delItem("bills", b.id, setBills))}><IC n="trash" s={14} c="#F43F5E" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const Analytics = () => (
    <div className="analytics-wrap">
      <Card st={{ marginBottom: 16 }}>
        <CT>Este Mes vs Mes Anterior</CT>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: "100%", overflow: "hidden" }}>
          {[{ label: "Ingresos", curr: monthlyInc || totalInc, color: "#10B981" }, { label: "Gastos", curr: monthExp, color: "#F43F5E" }, { label: "Balance", curr: (monthlyInc||totalInc) - monthExp, color: "#06B6D4" }].map(m => (
            <div key={m.label} style={{ padding: "11px 8px", background: dark ? "rgba(255,255,255,0.03)" : "#F8FAFC", borderRadius: 12, border: `1px solid ${C.border}`, textAlign: "center", overflow: "hidden", minWidth: 0 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 800, color: m.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(m.curr)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="two-col">
        <Card>
          <CT>Gastos por Categoría</CT>
          <div className="chart-wrap">
            {expenses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.muted }}><div style={{ fontSize: 28, marginBottom: 8 }}>📊</div><div style={{ fontSize: 13 }}>Agrega gastos para ver</div></div>
            ) : (() => {
              const cats = {}; expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount); });
              const total = Object.values(cats).reduce((a, b) => a + b, 0);
              return <PieChart data={Object.entries(cats).sort((a, b) => b[1] - a[1])} total={total} dark={dark} />;
            })()}
          </div>
        </Card>

        <Card>
          <CT>Ingresos vs Gastos (6m)</CT>
          <div className="chart-wrap">
            {(() => {
              const now = new Date();
              const data = Array.from({ length: 6 }, (_, i) => {
                const mi = (now.getMonth() - 5 + i + 12) % 12;
                const isCurr = i === 5;
                const base = monthlyInc || totalInc || 1000; const bExp = monthExp || 400;
                return { label: MONTHS[mi], inc: isCurr ? (monthlyInc || totalInc) : base * (0.8 + Math.random() * 0.4), exp: isCurr ? monthExp : bExp * (0.5 + Math.random() * 0.6) };
              });
              const maxV = Math.max(...data.flatMap(d => [d.inc, d.exp]), 1);
              return (
                <div style={{ width: "100%", overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 110, marginBottom: 8 }}>
                    {data.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", gap: 2, alignItems: "flex-end", height: "100%" }}>
                        <div style={{ flex: 1, background: "#10B98188", borderRadius: "3px 3px 0 0", height: `${Math.max(3, (d.inc / maxV) * 100)}%`, minWidth: 4 }} />
                        <div style={{ flex: 1, background: "#F43F5E88", borderRadius: "3px 3px 0 0", height: `${Math.max(3, (d.exp / maxV) * 100)}%`, minWidth: 4 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {data.map((d, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: C.muted, overflow: "hidden" }}>{d.label}</div>)}
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 10, justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}><div style={{ width: 8, height: 8, background: "#10B981", borderRadius: 2 }} />Ingresos</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}><div style={{ width: 8, height: 8, background: "#F43F5E", borderRadius: 2 }} />Gastos</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>
      </div>

      <Card>
        <CT>Exportar Reporte</CT>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

          <Btn v="outline" onClick={() => {
            const w = window.open("", "_blank");
            w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte Zario</title><style>body{font-family:Arial,sans-serif;max-width:680px;margin:40px auto;color:#0F172A;}h1{color:#06B6D4;}h2{font-size:15px;border-bottom:2px solid #06B6D4;padding-bottom:6px;margin:18px 0 10px;}table{width:100%;border-collapse:collapse;font-size:13px;}th{background:#06B6D4;color:white;padding:7px;text-align:left;}td{padding:7px;border-bottom:1px solid #eee;}.pos{color:#10B981;font-weight:700;}.neg{color:#F43F5E;font-weight:700;}@media print{button{display:none}}</style></head><body><h1>Zario — Reporte</h1><p>${fechaHoy()} · ${user.name}</p><h2>Resumen</h2><table><tr><th>Concepto</th><th>Monto</th></tr><tr><td>Ingresos</td><td class="pos">${fmt(monthlyInc || totalInc)}</td></tr><tr><td>Gastos</td><td class="neg">${fmt(monthExp)}</td></tr><tr><td>Balance</td><td class="${(monthlyInc||totalInc) - monthExp >= 0 ? "pos" : "neg"}">${fmt((monthlyInc||totalInc) - monthExp)}</td></tr><tr><td>Patrimonio</td><td class="pos">${fmt(netWorth)}</td></tr></table>${expenses.length ? `<h2>Gastos</h2><table><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Monto</th></tr>${expenses.map(e => `<tr><td>${e.date}</td><td>${e.desc}</td><td>${e.category}</td><td class="neg">-${fmt(e.amount)}</td></tr>`).join("")}</table>` : ""}<p style="text-align:center;color:#94A3B8;font-size:11px;margin-top:30px;">Zario · ${todayISO()}</p></body></html>`);
            w.document.write('<div style="text-align:center;margin:20px 0;"><button onclick="window.close()" style="background:#06B6D4;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;margin-right:10px;">← Volver a Zario</button><button onclick="window.print()" style="background:#0F172A;color:white;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;">🖨️ Imprimir</button></div>');
            w.document.close();
          }}>🖨️ PDF</Btn>
        </div>
      </Card>
    </div>
  );

  const pages = {
    dashboard: <Dashboard />,
    daily: <Daily />,
    expenses: <Expenses />,
    income: <Income />,
    goals: <Goals />,
    budget: <Budget />,
    networth: <NetWorth />,
    bills: <Bills />,
    analytics: <Analytics />,
    profile: <ProfilePage user={user} dark={dark} C={C} onSave={saveProfile} onAvatar={handleAv} onDark={async () => { const nd = !dark; setDark(nd); await saveProf({ dark_mode: nd }); }} />,
  };

  // ── PAGE TITLES ──
  const pageTitles = { dashboard: "Inicio", daily: "Ingresos Diarios", expenses: "Gastos", income: "Ingresos", goals: "Metas", budget: "Presupuesto", networth: "Patrimonio", bills: "Facturas", analytics: "Analíticas", profile: "Perfil" };

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{getCSS(dark)}</style>
      {renderModal()}
      <Confirm open={!!confirm} msg={confirm?.msg} onOk={confirm?.fn} onCancel={() => setConfirm(null)} />

      <div className="layout">
        <div className={`overlay${sbOpen ? " show" : ""}`} onClick={() => setSb(false)} />

        {/* SIDEBAR */}
        <aside className={`sidebar${sbOpen ? " open" : ""}`}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 46, height: 46, background: "linear-gradient(135deg,#06B6D4,#0284C7)", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(6,182,212,0.3)" }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: "white" }}>Z</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC", marginBottom: 16, cursor: "pointer", border: `1px solid ${C.border}` }} onClick={() => { setNav("profile"); setSb(false); }}>
            <div className="avatar-sm">{user.avatar ? <img src={user.avatar} alt="av" /> : (user.name ? user.name[0].toUpperCase() : "U")}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name || "Usuario"}</div>
              <div style={{ fontSize: 11, color: "#06B6D4", fontWeight: 500 }}>✨ Premium</div>
            </div>
          </div>
          {navItems.map(item => (
            <button key={item.k} className={`nav-item${nav === item.k ? " active" : ""}`} onClick={() => { setNav(item.k); setSb(false); }}>
              <IC n={item.icon} s={16} c={nav === item.k ? "#06B6D4" : C.muted} />
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <button className="nav-item" style={{ color: "#F43F5E" }} onClick={async () => { if (supabase) await supabase.auth.signOut(); setScreen("login"); }}>
              <IC n="logout" s={16} c="#F43F5E" />Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main-content">
          {/* Mobile header — ☰ título Avatar */}
          <div className="mob-hdr">
            <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }} onClick={() => setSb(true)}>
              <IC n="menu" s={22} c={C.text} />
            </button>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: C.text }}>
              {nav !== "dashboard" ? pageTitles[nav] : ""}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#06B6D4,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", flexShrink: 0 }} onClick={() => setNav("profile")}>
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
          </div>

          {/* Page body */}
          <div className="page-body">
            {/* Desktop header */}
            <div style={{ marginBottom: 22 }}>
              {nav !== "dashboard" && (
                <button onClick={() => setNav("dashboard")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(6,182,212,0.1)", border: "1.5px solid rgba(6,182,212,0.3)", borderRadius: 99, cursor: "pointer", color: "#06B6D4", fontSize: 15, fontWeight: 700, fontFamily: "'Inter',sans-serif", marginBottom: 14, padding: "8px 18px" }}>
                  ← Inicio
                </button>
              )}
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
                Hola, {user.name || "Usuario"}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{fechaHoy()}</div>
            </div>

            {pages[nav] || pages.dashboard}
          </div>
        </div>
      </div>
    </div>
  );
}
