// Tab1 - 脱敏工作台
const { useState, useRef, useEffect, useMemo, useCallback, createContext, useContext } = React;

// === Type definitions for sensitive entities ===
const TYPES = [
  { id: "name",     label: "姓名",    en: "Name",       prefix: "姓名",  enPrefix: "Name",  color: "var(--type-name)",     ink: "var(--type-name-ink)",     hotkey: "1" },
  { id: "phone",    label: "电话",    en: "Phone",      prefix: "电话",  enPrefix: "Phone", color: "var(--type-phone)",    ink: "var(--type-phone-ink)",    hotkey: "2" },
  { id: "company",  label: "公司",    en: "Company",    prefix: "公司",  enPrefix: "Org",   color: "var(--type-company)",  ink: "var(--type-company-ink)",  hotkey: "3" },
  { id: "addr",     label: "地址",    en: "Address",    prefix: "地址",  enPrefix: "Addr",  color: "var(--type-addr)",     ink: "var(--type-addr-ink)",     hotkey: "4" },
  { id: "id",       label: "证件号",  en: "ID/Case",    prefix: "证件",  enPrefix: "ID",    color: "var(--type-id)",       ink: "var(--type-id-ink)",       hotkey: "5" },
  { id: "email",    label: "邮箱",    en: "Email",      prefix: "邮箱",  enPrefix: "Email", color: "var(--type-email)",    ink: "var(--type-email-ink)",    hotkey: "6" },
  { id: "bank",     label: "银行账号", en: "Bank Acct", prefix: "账号",  enPrefix: "Bank",  color: "var(--type-bank)",     ink: "var(--type-bank-ink)",     hotkey: "7" },
  { id: "ip",       label: "IP 地址", en: "IP Address", prefix: "IP",    enPrefix: "IP",    color: "var(--type-ip)",       ink: "var(--type-ip-ink)",       hotkey: "8" },
  { id: "hostname", label: "主机名",  en: "Hostname",   prefix: "主机",  enPrefix: "Host",  color: "var(--type-hostname)", ink: "var(--type-hostname-ink)" },
  { id: "path",     label: "路径",    en: "Path",       prefix: "路径",  enPrefix: "Path",  color: "var(--type-path)",     ink: "var(--type-path-ink)" },
  { id: "key",      label: "密钥",    en: "Key/Secret", prefix: "密钥",  enPrefix: "Key",   color: "var(--type-key)",      ink: "var(--type-key-ink)" },
];
const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]));

// === Role definitions ===
const ROLES = [
  { id: "general",  label: { zh: "通用",       en: "General"  }, icon: "🌐", desc: { zh: "通用文档",            en: "General documents" } },
  { id: "lawyer",   label: { zh: "律师/法务",   en: "Lawyer"   }, icon: "⚖️", desc: { zh: "合同、诉状、法律文书", en: "Contracts & legal docs" } },
  { id: "engineer", label: { zh: "软件工程师",  en: "Engineer" }, icon: "💻", desc: { zh: "技术文档、配置、日志", en: "Tech docs, configs, logs" } },
];

// === Helpers ===
function typeLabel(t, lang) { return lang === "en" ? (t.en || t.label) : t.label; }
function typePrefix(t, lang) { return lang === "en" ? (t.enPrefix || t.prefix) : t.prefix; }

// === Auto-detect heuristics (offline regex, role-aware) ===
function autoDetect(paragraphs, role = "general") {
  const hits = [];
  const seen = new Set();
  const add = (raw, type) => {
    const text = (raw || "").trim();
    if (!text || text.length < 2) return;
    const key = `${type}::${text.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ text, type });
  };

  const fullText = paragraphs.map(p => p.text || "").join("\n");

  // ── Universal (all roles) ───────────────────────���────────────────────────
  for (const m of fullText.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) add(m[0], "email");

  // ── Chinese document patterns (general + lawyer) ─────────────────────────
  if (role === "general" || role === "lawyer") {
    // Mobile phones
    for (const m of fullText.matchAll(/(?<!\d)1[3-9]\d{9}(?!\d)/g)) add(m[0], "phone");
    // Landline phones
    for (const m of fullText.matchAll(/0\d{2,3}[-\s]\d{7,8}/g)) add(m[0], "phone");
    // 18-digit national ID
    for (const m of fullText.matchAll(/\b\d{17}[\dXx]\b/g)) add(m[0], "id");
    // Unified social credit codes
    for (const m of fullText.matchAll(/\b9[1-9]\d{2}[A-Z0-9]{14}\b/g)) add(m[0], "id");
    // Bank account numbers (16-19 digits)
    for (const m of fullText.matchAll(/(?<!\d)\d{16,19}(?!\d)/g)) add(m[0], "bank");
    // Chinese company names
    for (const m of fullText.matchAll(/[一-龥]{2,15}(?:科技|信息|数据|咨询|集团|商贸|实业|制造|建设|投资|置业|律师事务所)?(?:有限公司|股份公司|集团有限公司|集团股份|律师事务所)/g)) add(m[0], "company");
    // Person names in context
    for (const m of fullText.matchAll(/(?:法定代表人|项目负责人|联系人|备用联系人|负责人|签字代表|股东|董事|监事)[：:\s]*([一-龥]{2,4})/g)) {
      const n = m[1]; if (n && /^[一-龥]{2,4}$/.test(n) && !/公司|集团|科技|数据/.test(n)) add(n, "name");
    }
    for (const m of fullText.matchAll(/([一-龥]{2,3})(?:\s*先生|\s*女士|\s*律师|\s*法官)/g)) add(m[1], "name");
    for (const m of fullText.matchAll(/([一-龥]{2,3})\s*[，,。]?\s*联系电话/g)) add(m[1], "name");
    // Addresses
    for (const m of fullText.matchAll(/[一-龥]{2,6}(?:省|市)[一-龥]{0,6}(?:区|县|市)[一-龥]{0,10}(?:路|街道|大道|号|里|弄|巷)\d{0,6}号?(?:[一-龥A-Z0-9]{0,20})?/g)) {
      if (m[0].length > 6) add(m[0], "addr");
    }
  }

  // ── Lawyer-specific ──────────────────────────────────────────────────────
  if (role === "lawyer") {
    // Case numbers e.g. (2024)粤01民初123号
    for (const m of fullText.matchAll(/[（(]\d{4}[）)][一-龥]{1,6}\d+[一-龥]{1,8}\d+号/g)) add(m[0], "id");
    // Contract reference codes
    for (const m of fullText.matchAll(/(?:合同|协议|委托|诉状|备案)[编号码]?[：:\s]+([A-Z0-9\-（()）]{4,30})/g)) { if (m[1]) add(m[1], "id"); }
    // Parties (plaintiff/defendant)
    for (const m of fullText.matchAll(/(?:原告|被告|申请人|被申请人|委托人|当事人|代理人)[：:\s]*([一-龥]{2,8})/g)) {
      const n = m[1]; if (/^[一-龥]{2,8}$/.test(n)) {
        add(n, /有限公司|律师事务所|集团/.test(n) ? "company" : "name");
      }
    }
    // Courts and arbitration bodies
    for (const m of fullText.matchAll(/[一-龥]{2,12}(?:人民法院|高级法院|中级法院|基层法院|仲裁委员会|仲裁院|司法局|公证处)/g)) add(m[0], "company");
    // Large monetary amounts (诉讼标的)
    for (const m of fullText.matchAll(/(?:人民币|RMB\s?)?[¥￥]?\d{1,3}(?:[,，]\d{3})*(?:\.\d{2})?(?:\s*元)/g)) {
      if (/\d{5,}/.test(m[0])) add(m[0], "other");
    }
    // Bank accounts in legal context
    for (const m of fullText.matchAll(/(?:账号|户号|账户|卡号)[：:\s]*(\d{16,19})/g)) { if (m[1]) add(m[1], "bank"); }
  }

  // ── Software Engineer-specific ───────────────────────────────────────────
  if (role === "engineer") {
    // IPv4
    for (const m of fullText.matchAll(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g)) {
      if (m[0] !== "0.0.0.0" && !m[0].startsWith("255.")) add(m[0], "ip");
    }
    // IPv6
    for (const m of fullText.matchAll(/\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g)) add(m[0], "ip");
    // CIDR
    for (const m of fullText.matchAll(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}\b/g)) add(m[0], "ip");
    // Internal server / service hostnames
    for (const m of fullText.matchAll(/\b(?:srv|server|web|db|database|app|api|prod|dev|staging|test|qa|ci|cd|build|deploy|node|worker|cache|proxy|lb|loadbalancer|bastion|jump|vpn|dc|k8s|kube|docker|redis|mysql|postgres|pg|mongo|rabbit|kafka|es|elastic|jenkins|gitlab|nexus|sonar|harbor|grafana|kibana)[-_]?[\w.-]*\b/gi)) {
      if (m[0].length > 3) add(m[0], "hostname");
    }
    // Internal domain names (.internal, .local, .corp …)
    for (const m of fullText.matchAll(/\b[\w-]+\.(?:internal|local|corp|intranet|lan|dev|staging|nonprod|svc|cluster\.local)\b/gi)) add(m[0], "hostname");
    // Unix paths
    for (const m of fullText.matchAll(/(?:^|\s)(\/(?:home|usr|var|etc|opt|data|mnt|srv|app|log|tmp)\/[\w./-]+)/gm)) add(m[1], "path");
    // Windows paths
    for (const m of fullText.matchAll(/[A-Z]:\\(?:Users|Program Files|Windows|AppData|ProgramData|inetpub|workspace|projects|dev)\\[\w\\. -]+/g)) add(m[0], "path");
    // Generic deep paths (3+ segments)
    for (const m of fullText.matchAll(/(?:\/[\w.-]+){3,}/g)) add(m[0], "path");
    // API keys / tokens / secrets
    for (const m of fullText.matchAll(/\b(?:sk|pk|rk|api_?key|access_?key|secret_?key|token|bearer|pat|ghp|glpat)[-_]?[a-zA-Z0-9+/]{20,}\b/gi)) add(m[0], "key");
    // AWS key IDs
    for (const m of fullText.matchAll(/\b(?:AKIA|ASIA|AROA|AIDA|ANPA|ANVA)[A-Z0-9]{16}\b/g)) add(m[0], "key");
    // Env vars with values
    for (const m of fullText.matchAll(/(?:AWS_|GCP_|AZURE_|DB_|DATABASE_|API_|SECRET_|TOKEN_|PASSWORD_|PASSWD_|KEY_|PRIVATE_)[A-Z_]+=\S+/g)) add(m[0], "key");
    // Credentials embedded in URLs
    for (const m of fullText.matchAll(/(?:https?|ftp|ssh|postgres|mysql|redis):\/\/[\w.%+-]+:[\w.%+!@#$^&*()-]+@[\w.-]+/g)) add(m[0], "key");
    // SSH key fingerprints
    for (const m of fullText.matchAll(/(?:SHA256|MD5):[a-zA-Z0-9+/=]{20,}/g)) add(m[0], "key");
    // English company names (Pte Ltd, Ltd, Inc, Corp, LLC, GmbH, PLC, LLP …)
    for (const m of fullText.matchAll(/[A-Z][a-zA-Z&'. ]{1,35}(?:\bPte\.?\s*Ltd\.?|\bLtd\.?|\bInc\.?|\bCorp\.?|\bLLC\.?|\bGmbH\b|\bPLC\b|\bLLP\b)/g)) add(m[0].trim(), "company");
    // Git SSH remotes
    for (const m of fullText.matchAll(/git@[\w.-]+:[\w./-]+\.git/g)) add(m[0], "hostname");
    // DB/schema names in config context
    for (const m of fullText.matchAll(/(?:database|db|schema|catalog)\s*[=:]\s*["']?([\w_-]{3,40})["']?/gi)) { if (m[1]) add(m[1], "hostname"); }
    // host:port combos (must contain a dot to filter pure numbers)
    for (const m of fullText.matchAll(/[\w-]+\.[\w.-]+:\d{2,5}(?:\/[\w./-]*)?/g)) add(m[0], "hostname");
  }

  return hits;
}

// === Tokenize a paragraph against marked entities (case-insensitive) ===
function tokenize(paragraph, entities) {
  if (!entities.length) return [{ kind: "text", text: paragraph }];
  const sorted = [...entities].sort((a, b) => b.text.length - a.text.length);
  let parts = [{ kind: "text", text: paragraph }];
  for (const ent of sorted) {
    const entLower = ent.text.toLowerCase();
    const next = [];
    for (const p of parts) {
      if (p.kind !== "text") { next.push(p); continue; }
      const t = p.text;
      const tLower = t.toLowerCase();
      let i = 0;
      while (i < t.length) {
        const idx = tLower.indexOf(entLower, i);
        if (idx === -1) { next.push({ kind: "text", text: t.slice(i) }); break; }
        if (idx > i) next.push({ kind: "text", text: t.slice(i, idx) });
        // keep original casing from the document
        next.push({ kind: "ent", entId: ent.id, text: t.slice(idx, idx + ent.text.length) });
        i = idx + ent.text.length;
      }
    }
    parts = next;
  }
  return parts;
}

// === Selection bubble ===
function SelectionBubble({ selection, onPick, onClose, lang }) {
  const [custom, setCustom] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      const t = TYPES.find(t => t.hotkey === e.key);
      if (t) { e.preventDefault(); onPick(t.id); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onPick, onClose]);

  const charWord = lang === "en" ? "chars" : "字";
  const customPlaceholder = lang === "en" ? "Custom type, e.g. Project ID" : "自定义类型，如「项目编号」";
  const addLabel = lang === "en" ? "Add" : "添加";

  return (
    <div
      ref={ref}
      className="bubble"
      style={{ left: selection.x, top: selection.y }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="bubble-header">
        <span className="selected-text" title={selection.text}>"{selection.text}"</span>
        <span style={{ color: "var(--ink-4)" }}>{selection.text.length} {charWord}</span>
      </div>
      {TYPES.filter(t => t.hotkey).map(t => (
        <button key={t.id} className="bubble-row" onClick={() => onPick(t.id)}>
          <span className="swatch" style={{ background: t.color, boxShadow: `inset 0 0 0 1px ${t.ink}` }} />
          <span>{typeLabel(t, lang)}</span>
          <kbd>{t.hotkey}</kbd>
        </button>
      ))}
      <div className="bubble-custom">
        <input
          autoFocus
          placeholder={customPlaceholder}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && custom.trim()) {
              onPick({ custom: custom.trim() });
            }
          }}
        />
        <button className="btn sm" onClick={() => custom.trim() && onPick({ custom: custom.trim() })}>{addLabel}</button>
      </div>
    </div>
  );
}

// === Document renderer with token marking ===
function DocumentView({ doc, entities, onAddEntity, onRemoveEntity, mode, candidates, onAcceptCandidate, onRejectCandidate, previewOriginal, sidebarSelectedEntityId, onReset, lang }) {
  const scrollRef = useRef(null);
  const pageRef = useRef(null);
  const [bubble, setBubble] = useState(null);

  const entityIndex = useMemo(() => {
    const map = {};
    const counters = {};
    for (const ent of entities) {
      const t = ent.type || "_other";
      counters[t] = (counters[t] || 0) + 1;
      map[ent.id] = counters[t];
    }
    return map;
  }, [entities]);

  function handleMouseUp(e) {
    if (mode === "auto-confirm") return;
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return setBubble(null);
      const text = sel.toString().trim();
      if (!text || text.length > 60) return setBubble(null);
      const range = sel.getRangeAt(0);
      if (!pageRef.current.contains(range.commonAncestorContainer)) return setBubble(null);
      const rect = range.getBoundingClientRect();
      const wrap = scrollRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - wrap.left + scrollRef.current.scrollLeft;
      const y = rect.top - wrap.top + scrollRef.current.scrollTop + 8;
      if (mode === "direct") {
        onAddEntity({ text, type: "other" });
        sel.removeAllRanges();
        return;
      }
      setBubble({ x, y, text });
    }, 10);
  }

  function pickType(typeOrCustom) {
    if (!bubble) return;
    if (typeof typeOrCustom === "string") {
      onAddEntity({ text: bubble.text, type: typeOrCustom });
    } else if (typeOrCustom.custom) {
      onAddEntity({ text: bubble.text, type: "other", customLabel: typeOrCustom.custom });
    }
    setBubble(null);
    window.getSelection()?.removeAllRanges();
  }

  const renderPara = (text, paraIdx) => {
    const allEnts = [...entities];
    for (const c of candidates) {
      if (!allEnts.find(e => e.text.toLowerCase() === c.text.toLowerCase())) {
        allEnts.push({ ...c, id: `cand_${c.text}`, _candidate: true });
      }
    }
    const parts = tokenize(text, allEnts);
    return parts.map((p, i) => {
      if (p.kind === "text") return <React.Fragment key={i}>{p.text}</React.Fragment>;
      const ent = allEnts.find(e => e.id === p.entId);
      if (!ent) return p.text;
      if (ent._candidate) {
        const t = TYPE_BY_ID[ent.type];
        const lbl = typeLabel(t, lang) || (lang === "en" ? "sensitive" : "敏感");
        return (
          <span
            key={i}
            className="tok candidate"
            title={lang === "en" ? `Detected ${lbl}, click to confirm` : `检测到${lbl}词，点击确认`}
            onClick={() => onAcceptCandidate(ent.text, ent.type)}
            onContextMenu={e => { e.preventDefault(); onRejectCandidate(ent.text); }}
          >{p.text}</span>
        );
      }
      const idx = entityIndex[ent.id];
      const t = TYPE_BY_ID[ent.type];
      const prefix = ent.customLabel || typePrefix(t, lang) || (lang === "en" ? "Other" : "其他");
      const placeholder = `[${prefix}_${String(idx).padStart(2, "0")}]`;
      const showPlaceholder = previewOriginal === false;
      const isHighlighted = sidebarSelectedEntityId === ent.id;
      return (
        <span
          key={i}
          className={`tok t-${ent.type || "other"} ${showPlaceholder ? "placeholder" : "marked"} ${isHighlighted ? "preview-orig" : ""}`}
          title={`${prefix} → ${placeholder}\n${lang === "en" ? "double-click to remove" : "双击移除"}`}
          onDoubleClick={() => onRemoveEntity(ent.id)}
        >
          {showPlaceholder ? placeholder : p.text}
          {showPlaceholder && <span className="ph-orig">{p.text}</span>}
        </span>
      );
    });
  };

  const modeStr = lang === "en"
    ? { bubble: "Bubble select type", "auto-confirm": "Auto-detect · confirm", sidebar: "Sidebar edit", direct: "Direct mark · drag" }
    : { bubble: "气泡选择类型", "auto-confirm": "自动识别 · 等待确认", sidebar: "侧栏统一编辑", direct: "直接标记 · 拖即标" };

  return (
    <div className="doc-pane">
      <div className="doc-subbar">
        <span className="mode-pill">
          <Icon name={mode === "auto-confirm" ? "scan" : mode === "direct" ? "wand" : "shield"} size={12} />
          {modeStr[mode] || mode}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
          {lang === "en"
            ? <><strong style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>{entities.length}</strong> marked · double-click to remove</>
            : <>已标记 <strong style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>{entities.length}</strong> 项 · 双击可移除</>
          }
        </span>
        <span className="subbar-sep" />
        <button className="subbar-btn" title={lang === "en" ? "Close file" : "关闭当前文件，重新导入"} onClick={onReset}>
          <Icon name="trash" size={12} stroke={1.5} /> {lang === "en" ? "Remove" : "删除文件"}
        </button>
        <button className="subbar-btn" title={lang === "en" ? "Re-import a file" : "重新选择文件"} onClick={onReset}>
          <Icon name="upload" size={12} stroke={1.5} /> {lang === "en" ? "Re-import" : "重新导入"}
        </button>
      </div>
      <div className="doc-scroll" ref={scrollRef} onMouseUp={handleMouseUp}>
        <div className="doc-page" ref={pageRef}>
          {doc.paragraphs.map((para, i) => {
            if (para.type === "h2") return <h2 key={i}>{renderPara(para.text, i)}</h2>;
            if (para.type === "h3") return <p key={i} style={{ fontWeight: 600, marginTop: 22, marginBottom: 6 }}>{renderPara(para.text, i)}</p>;
            if (para.type === "meta") return <p key={i} className="doc-meta">{renderPara(para.text, i)}</p>;
            if (para.type === "sig") {
              return (
                <div key={i} className="signature">
                  <div>
                    <div style={{ color: "var(--ink-3)", marginBottom: 4 }}>{para.left.label}</div>
                    <div>{lang === "en" ? "Contact:" : "负责人："}{renderPara(para.left.name, i)}</div>
                    <div style={{ color: "var(--ink-3)", marginTop: 8 }}>{para.left.date}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--ink-3)", marginBottom: 4 }}>{para.right.label}</div>
                    <div>{lang === "en" ? "Contact:" : "负责人："}{renderPara(para.right.name, i)}</div>
                    <div style={{ color: "var(--ink-3)", marginTop: 8 }}>{para.right.date}</div>
                  </div>
                </div>
              );
            }
            return <p key={i} className="clause">{renderPara(para.text, i)}</p>;
          })}
        </div>
        {bubble && (
          <SelectionBubble
            selection={bubble}
            onPick={pickType}
            onClose={() => setBubble(null)}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}

window.DocumentView = DocumentView;
window.TYPES = TYPES;
window.TYPE_BY_ID = TYPE_BY_ID;
window.ROLES = ROLES;
window.autoDetect = autoDetect;
