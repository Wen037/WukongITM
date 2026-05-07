// === Tab2 AI Proxy — full design ===
const { useState: useSP, useMemo: useMP, useRef: useRP } = React;

const AI_SERVICES = [
  { id: "chatgpt",  name: "ChatGPT",   url: "chat.openai.com",   color: "#10A37F", letter: "G", desc: "OpenAI" },
  { id: "claude",   name: "Claude",    url: "claude.ai",         color: "#D97757", letter: "C", desc: "Anthropic" },
  { id: "gemini",   name: "Gemini",    url: "gemini.google.com", color: "#4285F4", letter: "✦", desc: "Google" },
  { id: "doubao",   name: "豆包",       url: "doubao.com",        color: "#3B7AFF", letter: "豆", desc: "字节跳动" },
  { id: "qwen",     name: "通义千问",   url: "tongyi.aliyun.com", color: "#615CED", letter: "通", desc: "阿里云" },
  { id: "kimi",     name: "Kimi",      url: "kimi.moonshot.cn",  color: "#1A1A1A", letter: "K", desc: "月之暗面" },
  { id: "deepseek", name: "DeepSeek",  url: "chat.deepseek.com", color: "#4D6BFE", letter: "D", desc: "深度求索" },
  { id: "yuanbao",  name: "腾讯元宝",   url: "yuanbao.tencent.com", color: "#0052D9", letter: "元", desc: "腾讯" },
  { id: "perplexity", name: "Perplexity", url: "perplexity.ai",  color: "#20B8CD", letter: "P", desc: "搜索增强" },
  { id: "copilot",  name: "Copilot",   url: "copilot.microsoft.com", color: "#0078D4", letter: "M", desc: "Microsoft" },
];

function ProxyTab({ globalMappings, proxyEnabled, setProxyEnabled, lang = "zh" }) {
  const [enabled, setEnabled] = [proxyEnabled || {}, (fn) => setProxyEnabled(s => typeof fn === "function" ? fn(s) : fn)];
  const [confirmFor, setConfirmFor] = useSP(null);
  const [customs, setCustoms] = useSP([]);
  const [customInput, setCustomInput] = useSP("");

  const onCount = useMP(() => Object.values(enabled).filter(Boolean).length, [enabled]);
  const mappingCount = globalMappings?.length || 0;

  function tryToggle(id) {
    if (enabled[id]) {
      setEnabled(s => ({ ...s, [id]: false }));
    } else {
      setConfirmFor(id);
    }
  }
  function confirmEnable() {
    setEnabled(s => ({ ...s, [confirmFor]: true }));
    setConfirmFor(null);
  }
  function addCustom() {
    const v = customInput.trim();
    if (!v) return;
    const url = v.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const id = `custom_${Date.now()}`;
    setCustoms(s => [...s, { id, name: url, url, color: "#7A6F62", letter: "·", desc: "自定义" }]);
    setCustomInput("");
  }
  function removeCustom(id) {
    setCustoms(s => s.filter(c => c.id !== id));
    setEnabled(s => {
      const n = { ...s }; delete n[id]; return n;
    });
  }

  const allServices = [...AI_SERVICES, ...customs];
  const confirmService = confirmFor ? allServices.find(s => s.id === confirmFor) : null;

  return (
    <div className="proxy-tab">
      <div className="proxy-head">
        <div>
          <h1>{lang === "en" ? "AI Connect" : "AI 接入"}</h1>
          <p>{lang === "en"
            ? "Local proxy intercepts requests to AI services, auto-applies the redaction library to replace sensitive words, and restores placeholders on response. You will review once before enabling."
            : "本地代理拦截发往 AI 的请求，自动应用脱敏库替换敏感词，收到响应后还原占位符。开启前会让你审一次。"}</p>
        </div>
        <div className="proxy-status">
          <div className="status-pill">
            <span className={`status-dot ${onCount > 0 ? "on" : ""}`} />
            <span>{onCount > 0
              ? (lang === "en" ? `${onCount} proxy running` : `${onCount} 个代理运行中`)
              : (lang === "en" ? "Proxy stopped" : "代理未启动")}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
            <Icon name="lock" size={10} /> {lang === "en" ? "Traffic stays on device · Port 127.0.0.1:7891" : "流量仅在本机经过 · 端口 127.0.0.1:7891"}
          </div>
        </div>
      </div>

      <div className="proxy-mapping-state">
        <Icon name="database" size={14} />
        <span>{lang === "en" ? "Using mapping:" : "使用 mapping："}</span>
        <strong>{mappingCount > 0
          ? (lang === "en" ? `${mappingCount} redaction ${mappingCount === 1 ? "library" : "libraries"} enabled` : `当前 ${mappingCount} 条脱敏库已启用`)
          : (lang === "en" ? "Library empty — redact a file first" : "脱敏库为空，请先在工作台脱敏一份文件")}</strong>
        <span style={{ flex: 1 }} />
        <button className="btn sm ghost">{lang === "en" ? "Manage Mapping" : "管理 mapping"}</button>
      </div>

      <div className="proxy-grid">
        {allServices.map(s => (
          <div key={s.id} className={`ai-card ${enabled[s.id] ? "on" : ""}`}>
            <div className="ai-card-head">
              <div className="ai-logo" style={{ background: s.color }}>{s.letter}</div>
              <div className="ai-info">
                <div className="ai-name">{s.name}</div>
                <div className="ai-url">{s.url}</div>
              </div>
              <label className="switch" title={enabled[s.id] ? (lang === "en" ? "Disable" : "停用") : (lang === "en" ? "Enable" : "开启")}>
                <input
                  type="checkbox"
                  checked={!!enabled[s.id]}
                  onChange={() => tryToggle(s.id)}
                  disabled={mappingCount === 0}
                />
                <span className="slider" />
              </label>
            </div>
            <div className="ai-card-foot">
              <span className="ai-desc">{s.desc}</span>
              {enabled[s.id] && (
                <span className="ai-stat">
                  <span className="live-dot" />
                  {lang === "en" ? "Proxying" : "代理中"}
                </span>
              )}
              {s.id.startsWith("custom_") && (
                <button className="del-custom" onClick={() => removeCustom(s.id)} title="删除">
                  <Icon name="x" size={11} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="ai-card add-card">
          <div className="ai-card-head" style={{ width: "100%" }}>
            <div className="ai-logo" style={{ background: "var(--bg-sunk)", color: "var(--ink-3)", border: "1px dashed var(--line-2)" }}>
              <Icon name="plus" size={16} />
            </div>
            <div className="ai-info" style={{ flex: 1 }}>
              <div className="ai-name" style={{ color: "var(--ink-2)" }}>{lang === "en" ? "Add Custom AI" : "添加自定义 AI"}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <input
                  className="custom-input"
                  placeholder={lang === "en" ? "e.g. your-internal-ai.com" : "例如 你的内网AI网址.com"}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustom()}
                />
                <button className="btn sm" onClick={addCustom} disabled={!customInput.trim()}>
                  <Icon name="plus" size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmService && (
        <div className="modal-backdrop" onClick={() => setConfirmFor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{lang === "en" ? `Confirm mapping before enabling ${confirmService.name}` : `开启 ${confirmService.name} 代理前请确认 mapping`}</h3>
              <p>{lang === "en" ? `The following ${mappingCount} ${mappingCount === 1 ? "mapping" : "mappings"} will replace sensitive words in outgoing requests.` : `以下 ${mappingCount} 条 mapping 将被用于替换发出去的敏感词。`}</p>
            </div>
            <div className="modal-body">
              {mappingCount === 0 ? (
                <div style={{ textAlign: "center", padding: 24, color: "var(--ink-3)" }}>
                  {lang === "en" ? "No mappings yet. Redact a file in the Workbench first." : "尚未生成 mapping。请先在工作台脱敏一份文件。"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {globalMappings.map(m => (
                    <div key={m.id} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: "var(--bg-sunk)", border: "1px solid var(--line)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.entries.length} {lang === "en" ? "entries" : "条词条"} · {m.source}</div>
                      </div>
                      <input type="checkbox" defaultChecked style={{ accentColor: "var(--accent)" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <div style={{ flex: 1, fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="alert" size={11} /> {lang === "en" ? "Enabling proxy will modify system proxy settings" : "代理启动后会修改系统代理设置"}
              </div>
              <button className="btn" onClick={() => setConfirmFor(null)}>{lang === "en" ? "Cancel" : "取消"}</button>
              <button className="btn accent" onClick={confirmEnable} disabled={mappingCount === 0}>
                <Icon name="check" size={13} /> {lang === "en" ? "Enable" : "确认开启"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderTab({ icon, title, desc, items }) {
  return (
    <div className="placeholder-tab">
      <div className="card">
        <div className="icon-big"><Icon name={icon} size={24} /></div>
        <h2>{title}</h2>
        <p>{desc}</p>
        <ul className="preview-list" style={{ listStyle: "none", padding: 0 }}>
          {items.map((it, i) => <li key={i}>· {it}</li>)}
        </ul>
        <div style={{ marginTop: 18, fontSize: 11, color: "var(--ink-4)" }}>
          即将推出 · 当前版本聚焦 Tab1 工作台
        </div>
      </div>
    </div>
  );
}

function MappingTab({ globalMappings, setGlobalMappings, toast, lang = "zh" }) {
  const [expandedId, setExpandedId] = useSP(null);
  const [editingMapId, setEditingMapId] = useSP(null);
  const [editingMapName, setEditingMapName] = useSP("");
  const [confirmDelete, setConfirmDelete] = useSP(null);
  const fileInputRef = useRP(null);

  function toggleEnabled(id) {
    setGlobalMappings(s => s.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  }
  function deleteMapping(id) {
    setGlobalMappings(s => s.filter(m => m.id !== id));
    setConfirmDelete(null);
    toast(lang === "en" ? "Mapping deleted" : "已删除 mapping", "ok");
  }
  function startEditName(m) { setEditingMapId(m.id); setEditingMapName(m.name); }
  function saveEditName() {
    setGlobalMappings(s => s.map(m => m.id === editingMapId ? { ...m, name: editingMapName.trim() || m.name } : m));
    setEditingMapId(null);
  }
  function deleteEntry(mapId, entId) {
    setGlobalMappings(s => s.map(m => m.id === mapId ? { ...m, entries: m.entries.filter(e => e.id !== entId) } : m));
  }

  function addManual() {
    const id = `m_${Date.now()}`;
    const name = lang === "en" ? `Manual Library ${globalMappings.length + 1}` : `手动脱敏库 ${globalMappings.length + 1}`;
    setGlobalMappings(s => [...s, {
      id, name,
      entries: [], createdAt: new Date().toISOString(),
      source: lang === "en" ? "manual" : "手动添加", enabled: true,
    }]);
    setExpandedId(id);
    setEditingMapId(id);
    setEditingMapName(name);
    toast(lang === "en" ? "New empty library created — add entries below" : "已新建空脱敏库，可在下方添加词条", "ok");
  }

  function scanFile() {
    fileInputRef.current?.click();
  }
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const paras = text.split(/\n+/).map(line => ({ type: "p", text: line }));
      const hits = window.autoDetect(paras);
      const id = `m_${Date.now()}`;
      const entries = hits.map((h, i) => ({
        id: `ent_${id}_${i}`, text: h.text, type: h.type,
      }));
      setGlobalMappings(s => [...s, {
        id, name: file.name.replace(/\.[^.]+$/, ""),
        entries, createdAt: new Date().toISOString(),
        source: lang === "en" ? `Scanned from ${file.name}` : `扫描自 ${file.name}`, enabled: true,
      }]);
      setExpandedId(id);
      toast(lang === "en" ? `Scan complete · ${entries.length} entries added` : `扫描完成 · ${entries.length} 个词条已加入 mapping`, "ok");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="mapping-tab">
      <div className="mapping-tab-head">
        <div>
          <h2><Icon name="database" size={18} /> {lang === "en" ? "Redaction Library" : "脱敏库"}</h2>
          <p>{lang === "en"
            ? <>Total <strong>{globalMappings.length}</strong> {globalMappings.length === 1 ? "library" : "libraries"} · Enabled <strong>{globalMappings.filter(m => m.enabled).length}</strong> · Enabled libraries are auto-applied when intercepting requests</>
            : <>共 <strong>{globalMappings.length}</strong> 个脱敏库 · 启用 <strong>{globalMappings.filter(m => m.enabled).length}</strong> · 已启用的脱敏库会在本地拦截请求时自动应用</>
          }</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={scanFile}>
            <Icon name="scan" size={13} /> {lang === "en" ? "Scan & Add" : "扫描文件添加"}
          </button>
          <button className="btn accent" onClick={addManual}>
            <Icon name="plus" size={13} /> {lang === "en" ? "Add Manual" : "手动添加"}
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv" style={{ display: "none" }} onChange={handleFile} />
        </div>
      </div>

      {globalMappings.length === 0 ? (
        <div className="mapping-empty">
          <div className="mapping-empty-card">
            <div className="empty-icon"><Icon name="database" size={28} /></div>
            <h3>{lang === "en" ? "Library Empty" : "脱敏库为空"}</h3>
            <p>{lang === "en"
              ? <><button className="link" onClick={addManual}>Add manually</button> or <button className="link" onClick={scanFile}>scan a file</button>, or redact a document in the Workbench and save it.</>
              : <>到工作台脱敏一份文档并保存，或直接 <button className="link" onClick={addManual}>手动添加</button> / <button className="link" onClick={scanFile}>扫描文件</button>。</>
            }</p>
          </div>
        </div>
      ) : (
        <div className="mapping-list-tab">
          {globalMappings.map(m => {
            const isOpen = expandedId === m.id;
            const isEditing = editingMapId === m.id;
            const typeCount = {};
            for (const e of m.entries) typeCount[e.type || "other"] = (typeCount[e.type || "other"] || 0) + 1;
            return (
              <div key={m.id} className={`map-card ${m.enabled ? "" : "disabled"} ${isOpen ? "open" : ""}`}>
                <div className="map-card-head">
                  <button
                    className="map-toggle-arrow"
                    onClick={() => setExpandedId(isOpen ? null : m.id)}
                    title={isOpen ? "收起" : "展开"}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
                      <path d="M3 1l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="map-name-block">
                    {isEditing ? (
                      <input
                        value={editingMapName}
                        onChange={e => setEditingMapName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEditName(); if (e.key === "Escape") setEditingMapId(null); }}
                        onBlur={saveEditName}
                        autoFocus
                        className="map-name-edit"
                      />
                    ) : (
                      <div className="map-name" onDoubleClick={() => startEditName(m)}>{m.name}</div>
                    )}
                    <div className="map-meta">
                      <span>{m.entries.length} {lang === "en" ? "entries" : "个词条"}</span>
                      <span className="dot" />
                      <span>{m.source}</span>
                      <span className="dot" />
                      <span>{new Date(m.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <div className="map-type-pills">
                    {window.TYPES.filter(t => typeCount[t.id]).map(t => (
                      <span key={t.id} className="type-pill" style={{ background: t.color, color: t.ink }}>
                        {lang === "en" ? (t.en || t.label) : t.label} {typeCount[t.id]}
                      </span>
                    ))}
                    {typeCount.other && (
                      <span className="type-pill" style={{ background: "var(--type-other)" }}>{lang === "en" ? "Other" : "其他"} {typeCount.other}</span>
                    )}
                  </div>
                  <div className="map-actions">
                    <button
                      className={`apply-toggle ${m.enabled ? "on" : "off"}`}
                      onClick={() => toggleEnabled(m.id)}
                      title={m.enabled
                        ? (lang === "en" ? "Enabled · click to disable" : "已启用 · 点击停用")
                        : (lang === "en" ? "Disabled · click to enable" : "已停用 · 点击启用")}
                    >
                      <span className="apply-dot" />
                      {m.enabled ? (lang === "en" ? "Enabled" : "启用") : (lang === "en" ? "Disabled" : "停用")}
                    </button>
                    <button className="icon-btn" onClick={() => startEditName(m)} title={lang === "en" ? "Rename" : "重命名"}>
                      <Icon name="edit" size={13} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setConfirmDelete(m.id)} title={lang === "en" ? "Delete mapping" : "删除 mapping"}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="map-card-body">
                    {m.entries.length === 0 ? (
                      <div className="map-empty-entries">{lang === "en" ? "This mapping has no entries yet. Add one below ↓" : "这个 mapping 还没有词条。在下方添加 ↓"}</div>
                    ) : (
                      <div className="map-entries">
                        {m.entries.map((ent, i) => {
                          const t = window.TYPE_BY_ID[ent.type] || { prefix: ent.customLabel || "其他", color: "var(--type-other)", ink: "var(--type-other-ink)", label: "其他" };
                          const sameTypeBefore = m.entries.slice(0, i).filter(e => e.type === ent.type).length;
                          const placeholder = `[${ent.customLabel || t.prefix}_${String(sameTypeBefore + 1).padStart(2, "0")}]`;
                          return (
                            <div key={ent.id} className="map-entry">
                              <span className="entry-text" style={{ background: t.color, color: t.ink }}>{ent.text}</span>
                              <span className="entry-arrow">→</span>
                              <span className="entry-placeholder">{placeholder}</span>
                              <span className="entry-type">{lang === "en" ? (t.en || t.label) : t.label}</span>
                              <span style={{ flex: 1 }} />
                              <button className="icon-btn danger" onClick={() => deleteEntry(m.id, ent.id)} title={lang === "en" ? "Remove entry" : "移除词条"}>
                                <Icon name="x" size={11} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <AddEntriesForm
                      lang={lang}
                      mapId={m.id}
                      onAdd={(rows) => {
                        setGlobalMappings(s => s.map(mm => mm.id === m.id ? {
                          ...mm,
                          entries: [...mm.entries, ...rows.map((r, i) => ({
                            id: `ent_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
                            text: r.text,
                            type: r.type,
                          }))],
                        } : mm));
                        toast(lang === "en" ? `Added ${rows.length} ${rows.length === 1 ? "entry" : "entries"}` : `已添加 ${rows.length} 个词条`, "ok");
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{lang === "en" ? "Confirm Delete?" : "确认删除？"}</h3>
              <p>{lang === "en" ? "This mapping and all its entries will be permanently removed and cannot be recovered." : "该 mapping 及其所有词条将被永久移除，无法恢复。"}</p>
            </div>
            <div style={{ padding: "16px 22px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirmDelete(null)}>{lang === "en" ? "Cancel" : "取消"}</button>
              <button className="btn danger" onClick={() => deleteMapping(confirmDelete)}>
                <Icon name="trash" size={12} /> {lang === "en" ? "Confirm Delete" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ALIAS_POOLS = {
  zh: {
    name:     ["甲方代表", "联系人甲", "乙方人员", "当事人A", "某某先生", "某某女士"],
    phone:    ["138****0000", "150****1111", "186****2222", "139****3333"],
    company:  ["某甲公司", "XX科技有限公司", "乙方单位", "丙方机构"],
    id:       ["XXXX**XXXXXXXX", "证件号已脱敏"],
    email:    ["redacted@example.com", "hidden@mail.com"],
    bank:     ["**** **** **** 0000", "账号已脱敏"],
    ip:       ["192.168.x.x", "10.x.x.x", "172.x.x.x"],
    hostname: ["server-redacted", "host-hidden", "node-xxx"],
    path:     ["/path/redacted", "C:\\redacted\\path"],
    key:      ["[KEY_REDACTED]", "[TOKEN_REMOVED]"],
    other:    ["已脱敏", "REDACTED"],
  },
  en: {
    name:     ["Person A", "Colleague B", "Contact C", "User D", "Individual E"],
    phone:    ["+X-XXX-XXX-0000", "phone-redacted", "+44-XX-XXXX-0000"],
    company:  ["Org A", "Vendor B", "Company C", "Client D", "Partner E"],
    id:       ["ID-REDACTED", "XX-XXXX-XXXX-XX"],
    email:    ["redacted@example.com", "hidden@mail.com"],
    bank:     ["**** **** **** 0000", "acct-redacted"],
    ip:       ["x.x.x.x", "192.168.x.x", "some-internal-ip"],
    hostname: ["server-redacted", "host-removed", "internal-node"],
    path:     ["/path/redacted", "C:\\path\\removed"],
    key:      ["[KEY_REDACTED]", "[TOKEN_REMOVED]", "[SECRET_REMOVED]"],
    other:    ["REDACTED", "REMOVED"],
  },
};
function randomAlias(type, lang = "zh") {
  const pool = (ALIAS_POOLS[lang] || ALIAS_POOLS.zh)[type] || ALIAS_POOLS.zh.other;
  return pool[Math.floor(Math.random() * pool.length)];
}

function SettingsTab({ tweaks, setTweak, lang = "zh" }) {
  const [rulesOpen,  setRulesOpen]  = useSP(true);
  const [prefOpen,   setPrefOpen]   = useSP(false);
  const [storeOpen,  setStoreOpen]  = useSP(false);
  const [aboutOpen,  setAboutOpen]  = useSP(false);

  // Library/set-based global rules
  const [ruleSets, setRuleSets] = useSP(() => {
    try {
      const sets = JSON.parse(localStorage.getItem("tuomin_rule_sets_v1") || "null");
      if (Array.isArray(sets)) return sets;
      // migrate from old flat list
      const old = JSON.parse(localStorage.getItem("tuomin_global_rules_v2") || "[]");
      if (Array.isArray(old) && old.length > 0) {
        return [{ id: "set_migrate", name: "默认规则", entries: old }];
      }
      return [];
    } catch { return []; }
  });
  const [openSetIds, setOpenSetIds] = useSP({});
  const [newSetName, setNewSetName] = useSP("");
  const [addingSet, setAddingSet] = useSP(false);
  // per-set entry forms: { [setId]: { text, type, alias } }
  const [entryForms, setEntryForms] = useSP({});
  const [editEntry, setEditEntry] = useSP(null); // { setId, entryId, alias }

  const types = window.TYPES || [];
  const totalEntries = ruleSets.reduce((s, set) => s + set.entries.length, 0);

  function saveSets(next) {
    setRuleSets(next);
    localStorage.setItem("tuomin_rule_sets_v1", JSON.stringify(next));
  }
  function addSet() {
    const name = newSetName.trim() || (lang === "en" ? "New Set" : "新建脱敏库");
    const id = `set_${Date.now()}`;
    saveSets([...ruleSets, { id, name, entries: [] }]);
    setOpenSetIds(s => ({ ...s, [id]: true }));
    setNewSetName(""); setAddingSet(false);
  }
  function deleteSet(id) {
    if (!window.confirm(lang === "en" ? "Delete this set?" : "确认删除此脱敏库？")) return;
    saveSets(ruleSets.filter(s => s.id !== id));
  }
  function renameSet(id, name) {
    saveSets(ruleSets.map(s => s.id === id ? { ...s, name } : s));
  }
  function addEntry(setId) {
    const form = entryForms[setId] || {};
    const text = (form.text || "").trim();
    if (!text) return;
    const type = form.type || "name";
    const alias = (form.alias || "").trim() || randomAlias(type, lang);
    const entry = { id: `e_${Date.now()}`, type, text, alias, autoAlias: !(form.alias || "").trim() };
    saveSets(ruleSets.map(s => s.id === setId ? { ...s, entries: [...s.entries, entry] } : s));
    setEntryForms(f => ({ ...f, [setId]: { type, text: "", alias: "" } }));
  }
  function deleteEntry(setId, entryId) {
    saveSets(ruleSets.map(s => s.id === setId ? { ...s, entries: s.entries.filter(e => e.id !== entryId) } : s));
  }
  function startEditEntry(setId, entry) {
    setEditEntry({ setId, entryId: entry.id, alias: entry.autoAlias ? "" : entry.alias });
  }
  function saveEditEntry() {
    if (!editEntry) return;
    const { setId, entryId, alias } = editEntry;
    saveSets(ruleSets.map(s => s.id === setId ? {
      ...s,
      entries: s.entries.map(e => e.id === entryId
        ? { ...e, alias: alias.trim() || randomAlias(e.type, lang), autoAlias: !alias.trim() }
        : e
      )
    } : s));
    setEditEntry(null);
  }

  return (
    <div className="settings-tab">

      {/* ── 语言切换 ──────────────────────────────────── */}
      <div className="lang-switch-bar">
        <span className="lang-switch-label">
          {lang === "en" ? "Language / 语言" : "语言 / Language"}
        </span>
        <div className="lang-switch-btns">
          <button
            className={`lang-btn ${lang !== "en" ? "active" : ""}`}
            onClick={() => setTweak("language", "zh")}
          >
            🇨🇳 中文
          </button>
          <button
            className={`lang-btn ${lang === "en" ? "active" : ""}`}
            onClick={() => setTweak("language", "en")}
          >
            🇺🇸 English
          </button>
        </div>
      </div>

      {/* ── 个人全局规则 ─────────────────────────────── */}
      <section className="settings-section">
        <button className="settings-section-head collapsible" onClick={() => setRulesOpen(v => !v)}>
          <Icon name="shield" size={15} />
          <h3>{lang === "en" ? "Personal Rules" : "个人全局规则"}</h3>
          <span className="section-badge">{totalEntries > 0 ? `${ruleSets.length} ${lang === "en" ? "sets" : "库"} · ${totalEntries} ${lang === "en" ? "entries" : "条"}` : (lang === "en" ? "empty" : "空")}</span>
          <span style={{ flex: 1 }} />
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: rulesOpen ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {!rulesOpen && (
          <p style={{ margin: "0 0 0 2px", fontSize: 12, color: "var(--ink-3)", padding: "6px 0 2px" }}>
            {lang === "en" ? "Your personal info (name, phone, company, email). Click to expand." : "常用脱敏信息，比如用户本人 名字、电话、公司、邮箱。点击展开。"}
          </p>
        )}
        {rulesOpen && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ink-3)" }}>
              {lang === "en" ? "Frequently redacted info such as your name, phone, company, email. Auto-applied when importing documents." : "常用脱敏信息，比如用户本人 名字、电话、公司、邮箱。导入文档后自动预填，免去每次手动标记。"}
            </p>
            {/* rule sets */}
            <div className="rule-sets-list">
              {ruleSets.map(set => {
                const isOpen = !!openSetIds[set.id];
                const form = entryForms[set.id] || {};
                return (
                  <div key={set.id} className="rule-set-card">
                    <div className="rule-set-head" onClick={() => setOpenSetIds(s => ({ ...s, [set.id]: !s[set.id] }))}>
                      <svg className={`rule-set-toggle ${isOpen ? "open" : ""}`} width="12" height="12" viewBox="0 0 12 12">
                        <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="rule-set-name">{set.name}</span>
                      <span className="rule-set-count">{set.entries.length} {lang === "en" ? "entries" : "条"}</span>
                      <button
                        className="icon-btn danger"
                        style={{ marginLeft: 4 }}
                        onClick={e => { e.stopPropagation(); deleteSet(set.id); }}
                        title={lang === "en" ? "Delete this set" : "删除此库"}
                      ><Icon name="trash" size={12} /></button>
                    </div>
                    {isOpen && (
                      <div className="rule-set-body">
                        {/* entries */}
                        {set.entries.length > 0 && (
                          <div className="global-rules-table">
                            {set.entries.map(entry => {
                              const tp = window.TYPE_BY_ID?.[entry.type] || { label: "其他", color: "var(--type-other)", ink: "var(--ink-1)", prefix: "其他" };
                              const isEditing = editEntry?.setId === set.id && editEntry?.entryId === entry.id;
                              return (
                                <div key={entry.id} className="global-rule-row">
                                  <span className="rule-type-badge" style={{ background: tp.color, color: tp.ink }}>{lang === "en" ? (tp.en || tp.label) : tp.label}</span>
                                  <span className="rule-original">{entry.text}</span>
                                  <span className="rule-arrow">→</span>
                                  {isEditing ? (
                                    <>
                                      <input
                                        className="rule-alias-input"
                                        value={editEntry.alias}
                                        placeholder={lang === "en" ? "blank = random" : "空=随机"}
                                        onChange={e => setEditEntry(v => ({ ...v, alias: e.target.value }))}
                                        onKeyDown={e => { if (e.key === "Enter") saveEditEntry(); if (e.key === "Escape") setEditEntry(null); }}
                                        autoFocus
                                      />
                                      <button className="btn sm accent" style={{ padding: "2px 8px" }} onClick={saveEditEntry}>{lang === "en" ? "Save" : "保存"}</button>
                                      <button className="btn sm ghost" style={{ padding: "2px 8px" }} onClick={() => setEditEntry(null)}>{lang === "en" ? "Cancel" : "取消"}</button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="rule-alias" style={{ opacity: entry.autoAlias ? 0.6 : 1 }}>
                                        {entry.alias}
                                        {entry.autoAlias && <span style={{ fontSize: 10, marginLeft: 4, color: "var(--ink-4)" }}>{lang === "en" ? "auto" : "自动"}</span>}
                                      </span>
                                      <button className="icon-btn" onClick={() => startEditEntry(set.id, entry)} title={lang === "en" ? "Edit alias" : "编辑替换词"}><Icon name="edit" size={12} /></button>
                                      <button className="icon-btn danger" onClick={() => deleteEntry(set.id, entry.id)} title={lang === "en" ? "Delete" : "删除"}><Icon name="trash" size={12} /></button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* add entry form */}
                        <div className="rule-set-add-form">
                          <select
                            value={form.type || "name"}
                            onChange={e => setEntryForms(f => ({ ...f, [set.id]: { ...f[set.id], type: e.target.value } }))}
                            className="add-entry-select"
                            style={{ flex: "0 0 auto" }}
                          >
                            {types.map(tp => <option key={tp.id} value={tp.id}>{lang === "en" ? (tp.en || tp.label) : tp.label}</option>)}
                          </select>
                          <input
                            className="add-entry-input"
                            placeholder={lang === "en" ? "Original term" : "原词"}
                            value={form.text || ""}
                            onChange={e => setEntryForms(f => ({ ...f, [set.id]: { ...f[set.id], text: e.target.value } }))}
                            onKeyDown={e => e.key === "Enter" && addEntry(set.id)}
                            style={{ flex: "1 1 0", minWidth: 0 }}
                          />
                          <span className="rule-arrow">→</span>
                          <input
                            className="add-entry-input"
                            placeholder={lang === "en" ? "Replace with (blank = random)" : "替换为（空=随机）"}
                            value={form.alias || ""}
                            onChange={e => setEntryForms(f => ({ ...f, [set.id]: { ...f[set.id], alias: e.target.value } }))}
                            onKeyDown={e => e.key === "Enter" && addEntry(set.id)}
                            style={{ flex: "1 1 0", minWidth: 0 }}
                          />
                          <button className="btn sm accent" onClick={() => addEntry(set.id)} disabled={!(form.text || "").trim()}>
                            <Icon name="plus" size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* add new set */}
            {addingSet ? (
              <div className="add-set-row" style={{ marginTop: 10 }}>
                <input
                  className="add-set-input"
                  placeholder={lang === "en" ? "Set name (e.g. My Info)" : "库名称（如：我的个人信息）"}
                  value={newSetName}
                  onChange={e => setNewSetName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addSet(); if (e.key === "Escape") setAddingSet(false); }}
                  autoFocus
                />
                <button className="btn sm accent" onClick={addSet}>{lang === "en" ? "Add" : "添加"}</button>
                <button className="btn sm ghost" onClick={() => setAddingSet(false)}>{lang === "en" ? "Cancel" : "取消"}</button>
              </div>
            ) : (
              <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => setAddingSet(true)}>
                <Icon name="plus" size={12} /> {lang === "en" ? "Add Library" : "添加脱敏库"}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── 界面偏好 ──────────────────────────────────── */}
      <section className="settings-section">
        <button className="settings-section-head collapsible" onClick={() => setPrefOpen(v => !v)}>
          <Icon name="eye" size={15} />
          <h3>{lang === "en" ? "Preferences" : "界面偏好"}</h3>
          <span style={{ flex: 1 }} />
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: prefOpen ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {!prefOpen && <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)" }}>{lang === "en" ? "Dark/light · Font size · Mark mode" : "深色/浅色 · 字体大小 · 标记模式"}</p>}
        {prefOpen && <div className="settings-rows">
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Dark mode" : "深色模式"}</label>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!tweaks?.darkMode}
                onChange={e => setTweak("darkMode", e.target.checked)}
              />
              <span className="slider" />
            </label>
            <span className="settings-hint">{tweaks?.darkMode ? (lang === "en" ? "Dark" : "深色") : (lang === "en" ? "Light" : "浅色")}</span>
          </div>
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Font size" : "字体大小"}</label>
            <div className="font-size-row">
              {[12, 13, 14, 15, 16].map(sz => (
                <button
                  key={sz}
                  className={`font-size-btn ${tweaks?.fontSize === sz ? "active" : ""}`}
                  onClick={() => setTweak("fontSize", sz)}
                >
                  {sz}
                </button>
              ))}
            </div>
            <span className="settings-hint">{tweaks?.fontSize || 14}px</span>
          </div>
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Show candidates by default" : "候选词默认展开"}</label>
            <label className="switch">
              <input
                type="checkbox"
                checked={tweaks?.showCandidatesByDefault !== false}
                onChange={e => setTweak("showCandidatesByDefault", e.target.checked)}
              />
              <span className="slider" />
            </label>
            <span className="settings-hint">{lang === "en" ? "Auto-show candidate panel on file import" : "导入文档后自动显示候选词栏"}</span>
          </div>
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Default mark mode" : "标记模式默认"}</label>
            <select
              className="settings-select"
              value={tweaks?.selectionMode || "bubble"}
              onChange={e => setTweak("selectionMode", e.target.value)}
            >
              <option value="bubble">{lang === "en" ? "Bubble — pick type" : "气泡选择类型"}</option>
              <option value="direct">{lang === "en" ? "Direct — mark on drag" : "直接标记（拖即标）"}</option>
              <option value="auto-confirm">{lang === "en" ? "Auto-detect · await confirm" : "自动识别·等待确认"}</option>
            </select>
          </div>
        </div>}
      </section>

      {/* ── 存储 ──────────────────────────────────────── */}
      <section className="settings-section">
        <button className="settings-section-head collapsible" onClick={() => setStoreOpen(v => !v)}>
          <Icon name="save" size={15} />
          <h3>{lang === "en" ? "Storage" : "存储"}</h3>
          <span style={{ flex: 1 }} />
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: storeOpen ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {!storeOpen && <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)" }}>{lang === "en" ? "All data is stored locally and never leaves your computer." : "所有数据仅存储在本机，不会离开你的电脑。"}</p>}
        {storeOpen && <div className="settings-rows">
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Library file" : "脱敏库文件"}</label>
            <span className="settings-path">%APPDATA%\com.wukong.itm\mappings.json</span>
          </div>
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Global rules" : "全局规则"}</label>
            <span className="settings-path">{lang === "en" ? "Browser localStorage (device-only)" : "浏览器 localStorage（本机隔离）"}</span>
          </div>
          <div className="settings-row">
            <label className="settings-label">{lang === "en" ? "Clear library" : "清空脱敏库"}</label>
            <button
              className="btn danger sm"
              onClick={() => {
                if (window.confirm(lang === "en" ? "Clear all redaction library data? This cannot be undone." : "确认清空所有脱敏库数据？此操作无法撤销。")) {
                  window.Bridge?.saveMappings([]);
                  window.location.reload();
                }
              }}
            >
              <Icon name="trash" size={12} /> {lang === "en" ? "Clear" : "清空"}
            </button>
          </div>
        </div>}
      </section>

      {/* ── 关于 ──────────────────────────────────────── */}
      <section className="settings-section">
        <button className="settings-section-head collapsible" onClick={() => setAboutOpen(v => !v)}>
          <Icon name="info" size={15} />
          <h3>{lang === "en" ? "About WukongITM" : "关于 WukongITM"}</h3>
          <span style={{ flex: 1 }} />
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: aboutOpen ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }}>
            <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {aboutOpen && <div className="about-card">
          <div className="about-brand">
            <img src="WukongITM_1.png" alt="WukongITM" className="about-mark" />
            <div>
              <div className="about-name">WukongITM</div>
              <div className="about-ver">v0.1.0 · 2026</div>
            </div>
          </div>
          <div className="about-pledges">
            {(lang === "en" ? [
              ["lock",     "100% Local",        "All text processing and mapping replacement happens on your device"],
              ["shield",   "Zero server",       "The app contains no network requests or telemetry code"],
              ["eye-off",  "No data upload",    "Your files and mappings never leave this machine"],
              ["database", "Open & auditable",  "Source code is public — compile and verify yourself"],
            ] : [
              ["lock",     "完全本地运行",     "所有文本处理和 mapping 替换在你的设备上完成"],
              ["shield",   "零服务器",         "程序不包含任何网络请求或遥测代码"],
              ["eye-off",  "无数据上传",        "你的文件和 mapping 永远不会离开本机"],
              ["database", "开源可审计",        "源代码公开，可自行编译验证"],
            ]).map(([icon, title, desc]) => (
              <div key={icon} className="pledge-row">
                <span className="pledge-icon"><Icon name={icon} size={14} /></span>
                <div>
                  <div className="pledge-title">{title}</div>
                  <div className="pledge-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>}
      </section>

    </div>
  );
}

// ── AddEntriesForm: inline form to add new entries to a mapping ──────────────
function AddEntriesForm({ onAdd, lang = "zh" }) {
  const [text, setText] = useSP("");
  const [type, setType] = useSP("name");
  const types = window.TYPES || [];

  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd([{ text: t, type }]);
    setText("");
  }

  return (
    <div className="add-entry-form">
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        className="add-entry-select"
      >
        {types.map(tp => <option key={tp.id} value={tp.id}>{lang === "en" ? (tp.en || tp.label) : tp.label}</option>)}
      </select>
      <input
        className="add-entry-input"
        placeholder={lang === "en" ? "Enter term (Enter to confirm)" : "输入词条（回车确认）"}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
      />
      <button className="btn sm accent" onClick={submit} disabled={!text.trim()}>
        <Icon name="plus" size={12} /> {lang === "en" ? "Add" : "添加"}
      </button>
    </div>
  );
}

window.ProxyTab = ProxyTab;
window.MappingTab = MappingTab;
window.SettingsTab = SettingsTab;
