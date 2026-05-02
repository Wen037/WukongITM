// === Main App ===
const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR, useCallback: useCB } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "selectionMode": "bubble",
  "sidebarPos": "right",
  "darkMode": false,
  "fontSize": 14,
  "showCandidatesByDefault": true,
  "language": "zh"
}/*EDITMODE-END*/;

const STR = {
  zh: {
    appName: "WukongITM",
    appSub: "v0.1 · 完全本地",
    nav: { workbench: "脱敏工作台", proxy: "AI 接入", mapping: "脱敏库", settings: "设置" },
    localOnly: "完全本地运行",
    title: "WukongITM",
    upload: {
      h: "把文件拖进来开始脱敏",
      p: "所有处理在你电脑上完成，不会上传到任何服务器。",
      browse: "选择文件",
      demo: "或者",
      demoLink: "加载一份示例合同",
      banner: "无服务器 · 无上传 · 无遥测",
      roleLabel: "检测模式",
    },
    toolbar: { manual: "手动标记", auto: "自动识别", reset: "重新开始" },
    scanning: (n) => `检测到 ${n} 处可能的敏感词，请逐项确认`,
    alreadyMarked: "该词已被标记",
    markIgnored: "已忽略",
    confirmed: (n) => `已确认 ${n} 项`,
    loaded: (name) => `已载入 ${name}`,
    loadFailed: (err) => `载入失败：${err}`,
    demoLoaded: "已加载示例合同",
    cleared: "已清空标记",
    exported: (n, file, map) => `已完成脱敏 · ${n} 项${file ? "，文件已保存" : ""}${map ? "，mapping 已入库" : ""}`,
  },
  en: {
    appName: "WukongITM",
    appSub: "v0.1 · 100% Local",
    nav: { workbench: "Workbench", proxy: "AI Connect", mapping: "Redaction Library", settings: "Settings" },
    localOnly: "Fully local",
    title: "WukongITM",
    upload: {
      h: "Drop a file here to start redaction",
      p: "All processing happens on your machine. Nothing is uploaded.",
      browse: "Choose file",
      demo: "or",
      demoLink: "Load a sample contract",
      banner: "No server · No upload · No telemetry",
      roleLabel: "Detection profile",
    },
    toolbar: { manual: "Manual", auto: "Auto-detect", reset: "Start over" },
    scanning: (n) => `Detected ${n} potential sensitive items — please review`,
    alreadyMarked: "Already marked",
    markIgnored: "Ignored",
    confirmed: (n) => `Confirmed ${n} items`,
    loaded: (name) => `Loaded ${name}`,
    loadFailed: (err) => `Load failed: ${err}`,
    demoLoaded: "Sample contract loaded",
    cleared: "Cleared all marks",
    exported: (n, file, map) => `Redaction complete · ${n} items${file ? ", file saved" : ""}${map ? ", mapping saved" : ""}`,
  },
};

function App() {
  // tweaks state via host protocol
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  const [tab, setTab] = useS("workbench");
  const [step, setStep] = useS(1); // 1=导入 2=标记 3=确认
  const [doc, setDoc] = useS(null);
  const [entities, setEntities] = useS([]); // {id, text, type, customLabel?}
  const [candidates, setCandidates] = useS([]);
  const [scanning, setScanning] = useS(false);
  const [drag, setDrag] = useS(false);
  const [exportOpts, setExportOpts] = useS({ exportFile: false, saveMapping: true });
  const [previewOriginal, setPreviewOriginal] = useS(true);
  const [hoverEntId, setHoverEntId] = useS(null);
  const [confirmModal, setConfirmModal] = useS(null);
  const [toasts, setToasts] = useS([]);
  const [globalMappings, setGlobalMappings] = useS([]); // accumulated across exports

  const lang = tweaks.language || "zh";
  const t = STR[lang] || STR.zh;

  const [role, setRole] = useS(() => {
    try { return localStorage.getItem("wukong_role") || "general"; } catch { return "general"; }
  });
  useE(() => { try { localStorage.setItem("wukong_role", role); } catch {} }, [role]);

  // Persist which AI services are enabled for quick-start
  const [proxyEnabled, setProxyEnabled] = useS(() => {
    try { return JSON.parse(localStorage.getItem("wukong_proxy_enabled") || "{}"); } catch { return {}; }
  });
  useE(() => { try { localStorage.setItem("wukong_proxy_enabled", JSON.stringify(proxyEnabled)); } catch {} }, [proxyEnabled]);

  const fileInputRef = useR(null);

  // theme
  useE(() => {
    document.documentElement.dataset.theme = tweaks.darkMode ? "dark" : "light";
    document.documentElement.style.fontSize = `${tweaks.fontSize}px`;
  }, [tweaks.darkMode, tweaks.fontSize]);

  // load persisted mappings on startup
  const mappingsLoadedRef = useR(false);
  useE(() => {
    window.Bridge.loadMappings().then(saved => {
      if (saved && saved.length > 0) setGlobalMappings(saved);
      mappingsLoadedRef.current = true;
    }).catch(() => { mappingsLoadedRef.current = true; });
  }, []);

  // auto-save mappings whenever they change (after initial load)
  useE(() => {
    if (!mappingsLoadedRef.current) return;
    window.Bridge.saveMappings(globalMappings);
  }, [globalMappings]);

  // auto-scan when entering step 2 for the first time on a fresh doc
  const scannedDocRef = useR(null);
  useE(() => {
    if (step !== 2 || !doc) return;
    if (scannedDocRef.current === doc) return;
    if (entities.length > 0 || candidates.length > 0 || scanning) return;
    scannedDocRef.current = doc;
    setTimeout(() => startAutoDetect(), 250);
  }, [step, doc]);

  function toast(msg, kind = "ok") {
    const id = Math.random().toString(36).slice(2);
    setToasts(s => [...s, { id, msg, kind }]);
    setTimeout(() => setToasts(s => s.filter(x => x.id !== id)), 3200);
  }

  function loadDemo() {
    setDoc(window.DEMO_CONTRACT);
    setEntities([]);
    setCandidates([]);
    setStep(2);
    toast(t.demoLoaded, "ok");
  }

  function handleFile(file) {
    if (!file) return;
    window.Bridge.parseFile(file).then(parsed => {
      setDoc(parsed);
      setEntities([]);
      setCandidates([]);
      setStep(2);
      toast(t.loaded(file.name), "ok");
    }).catch(err => {
      toast(t.loadFailed(err), "err");
    });
  }

  function startAutoDetect() {
    if (!doc) return;
    setScanning(true);
    setTimeout(() => {
      const hits = window.autoDetect(doc.paragraphs, role);
      setCandidates(hits);
      setScanning(false);
      toast(t.scanning(hits.length), "ok");
    }, 1600);
  }

  function addEntity({ text, type, customLabel }) {
    if (entities.find(e => e.text.toLowerCase() === text.toLowerCase())) {
      toast(t.alreadyMarked, "warn");
      return;
    }
    const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setEntities(s => [...s, { id, text, type: type || "other", customLabel }]);
  }
  function removeEntity(id) {
    setEntities(s => s.filter(e => e.id !== id));
  }
  function acceptCandidate(text, type) {
    addEntity({ text, type });
    setCandidates(s => s.filter(c => c.text !== text));
  }
  function rejectCandidate(text) {
    setCandidates(s => s.filter(c => c.text !== text));
    toast(t.markIgnored, "ok");
  }
  function acceptAllCandidates() {
    const newOnes = candidates.filter(c => !entities.find(e => e.text === c.text));
    const ids = newOnes.map(c => ({
      id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: c.text, type: c.type,
    }));
    setEntities(s => [...s, ...ids]);
    setCandidates([]);
    toast(t.confirmed(newOnes.length), "ok");
  }

  function handleExport() {
    setStep(3);
  }

  function doExport() {
    const count = entities.length;
    if (exportOpts.saveMapping) {
      setGlobalMappings(s => [...s, {
        id: `m_${Date.now()}`,
        name: doc.filename.replace(/\.[^.]+$/, ""),
        entries: entities,
        createdAt: new Date().toISOString(),
        source: doc.filename,
        enabled: true,
      }]);
    }
    setConfirmModal(null);
    toast(t.exported(count, exportOpts.exportFile, exportOpts.saveMapping), "ok");
    // reset to step 1 after success
    setDoc(null);
    setEntities([]);
    setCandidates([]);
    setStep(1);
  }

  function resetAll() {
    setDoc(null);
    setEntities([]);
    setCandidates([]);
    setStep(1);
  }

  // === Drag & drop ===
  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  // === Render ===
  const navItems = [
    { id: "workbench", label: t.nav.workbench, icon: "shield-check", badge: entities.length || null },
    { id: "proxy",     label: t.nav.proxy,     icon: "globe" },
    { id: "mapping",   label: t.nav.mapping,   icon: "database", badge: globalMappings.length || null },
    { id: "settings",  label: t.nav.settings,  icon: "settings" },
  ];

  return (
    <div className="app-shell">
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-title" data-tauri-drag-region>
          <img src="WukongITM_1.png" alt="logo" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }} />
          {t.title} — {doc ? doc.filename : (lang === "en" ? "No file open" : "未打开文件")}
          {doc && (
            <button
              className="title-close-file"
              onClick={resetAll}
              title="关闭文件，重新导入"
            >
              <Icon name="x" size={10} stroke={1.6} />
            </button>
          )}
        </div>
        <button
          className={`titlebar-qs-btn${!(Object.values(proxyEnabled || {}).some(v => v) && globalMappings.length > 0) ? " dim" : ""}`}
          onClick={() => {
            const hasSession = Object.values(proxyEnabled || {}).some(v => v) && globalMappings.length > 0;
            if (hasSession) {
              toast(lang === "en" ? "Proxy re-enabled with last settings" : "已用上次设置重新开启脱敏代理", "ok");
            }
            setTab("proxy");
          }}
          title={lang === "en" ? "Quick-start proxy with last session settings" : "用上次设置一键开启脱敏代理"}
        >
          <Icon name="shield-check" size={11} />
          {lang === "en" ? "Quick Start" : "一键脱敏"}
        </button>
        <WinControls />
      </div>

      <div className="body">
        <nav className="nav">
          <div className="nav-brand">
            <img src="WukongITM_1.png" alt="WukongITM" className="nav-brand-mark" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />
            <div className="nav-brand-text">
              <div className="t">{t.appName}</div>
              <div className="s">{t.appSub}</div>
            </div>
          </div>
          {navItems.map(n => (
            <button
              key={n.id}
              className="nav-item"
              aria-current={tab === n.id}
              onClick={() => setTab(n.id)}
            >
              <Icon name={n.icon} size={16} className="icon" />
              <span>{n.label}</span>
              {n.badge ? <span className="badge">{n.badge}</span> : <span />}
            </button>
          ))}
          <div className="nav-spacer" />
          <div className="nav-footer">
            <span className="live-dot" />
            <span>{t.localOnly}</span>
          </div>
        </nav>

        <main className="main">
          {tab === "workbench" && (
            <div className="wizard">
              <Stepper
                step={step}
                onStep={(s) => {
                  if (s === 1) { /* allow back to import only via reset */ return; }
                  if (s === 2 && doc) setStep(2);
                  if (s === 3 && doc && entities.length > 0) setStep(3);
                }}
                doc={doc}
                entityCount={entities.length}
              />
              <div className="wizard-body">
                {step === 1 && (
                  <UploadEmpty
                    drag={drag}
                    setDrag={setDrag}
                    onDrop={onDrop}
                    onPick={async () => {
                      const result = await window.Bridge.openFilePicker();
                      if (result) handleFile(result);
                      else fileInputRef.current?.click();
                    }}
                    onDemo={loadDemo}
                    fileInputRef={fileInputRef}
                    onFile={handleFile}
                    t={t}
                    lang={lang}
                    role={role}
                    onRoleChange={setRole}
                  />
                )}
                {step === 2 && doc && (
                  <div className="workbench" style={{ position: "relative" }}>
                    <div className="workbench-body sidebar-none">
                      <DocumentView
                        doc={doc}
                        entities={entities}
                        candidates={candidates}
                        onAddEntity={addEntity}
                        onRemoveEntity={removeEntity}
                        onAcceptCandidate={acceptCandidate}
                        onRejectCandidate={rejectCandidate}
                        mode={tweaks.selectionMode}
                        previewOriginal={previewOriginal}
                        sidebarSelectedEntityId={hoverEntId}
                        onReset={resetAll}
                        lang={lang}
                        role={role}
                      />
                    </div>
                    <div className="workbench-fab">
                      <button className="btn ghost sm" onClick={startAutoDetect} disabled={scanning} title="重新扫描">
                        <Icon name="scan" size={13} /> 重新扫描
                      </button>
                      {entities.length > 0 && (
                        <button className="btn ghost sm" onClick={() => { setEntities([]); setCandidates([]); toast(t.cleared, "ok"); }} title="清空所有标记">
                          <Icon name="trash" size={12} /> 清空
                        </button>
                      )}
                      {candidates.length > 0 && (
                        <button className="btn primary" onClick={() => setConfirmModal({ kind: "candidates" })}>
                          <Icon name="check" size={13} /> 查看 {candidates.length} 项候选
                        </button>
                      )}
                    </div>
                    {scanning && (
                      <div className="scan-overlay">
                        <div className="scan-card">
                          <div className="pulse"><Icon name="scan" size={22} /></div>
                          <h3>正在本地扫描敏感信息</h3>
                          <p>使用离线规则识别人名、电话、公司、地址等。无网络请求。</p>
                          <div className="scan-progress"><div className="bar" /></div>
                        </div>
                      </div>
                    )}
                    {confirmModal && confirmModal.kind === "candidates" && (
                      <CandidatesModal
                        candidates={candidates}
                        existingEntities={entities}
                        onClose={() => setConfirmModal(null)}
                        onConfirm={(accepted) => {
                          const newEnts = accepted.map(c => ({
                            id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${c.text}`,
                            text: c.text, type: c.type,
                          }));
                          const total = entities.length + newEnts.length;
                          setEntities(s => [...s, ...newEnts]);
                          setCandidates([]);
                          setConfirmModal(null);
                          toast(t.confirmed(accepted.length), "ok");
                          if (total > 0) setTimeout(() => setStep(3), 350);
                        }}
                      />
                    )}
                  </div>
                )}
                {step === 3 && doc && (
                  <ReviewStep
                    doc={doc}
                    entities={entities}
                    exportOpts={exportOpts}
                    setExportOpts={setExportOpts}
                    onBack={() => setStep(2)}
                    onConfirm={doExport}
                  />
                )}
              </div>
            </div>
          )}
          {tab === "proxy" && <ProxyTab globalMappings={globalMappings} proxyEnabled={proxyEnabled} setProxyEnabled={setProxyEnabled} />}
          {tab === "mapping" && <MappingTab globalMappings={globalMappings} setGlobalMappings={setGlobalMappings} toast={toast} />}
          {tab === "settings" && <SettingsTab tweaks={tweaks} setTweak={setTweak} lang={lang} />}
        </main>
      </div>

      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span className="ic"><Icon name="check" size={14} /></span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      <TweaksUI tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

function WinControls() {
  const [maximized, setMaximized] = useS(false);
  const win = () => window.__TAURI__?.window?.getCurrentWindow();
  useE(() => {
    const w = win();
    if (!w) return;
    w.isMaximized().then(v => setMaximized(v)).catch(() => {});
    const unlisten = w.onResized?.(() => {
      w.isMaximized().then(v => setMaximized(v)).catch(() => {});
    });
    return () => { unlisten?.then?.(fn => fn()); };
  }, []);
  function toggle() {
    const w = win();
    if (!w) return;
    w.toggleMaximize().then(() => w.isMaximized().then(v => setMaximized(v)));
  }
  return (
    <div className="win-controls">
      <button className="win-btn" tabIndex={-1} title="最小化" onClick={() => win()?.minimize()}>
        <Icon name="minimize" size={11} stroke={1.5} />
      </button>
      <button className="win-btn" tabIndex={-1} title={maximized ? "还原" : "最大化"} onClick={toggle}>
        <Icon name={maximized ? "restore" : "maximize"} size={11} stroke={1.4} />
      </button>
      <button className="win-btn close" tabIndex={-1} title="关闭" onClick={() => win()?.close()}>
        <Icon name="x" size={11} stroke={1.8} />
      </button>
    </div>
  );
}

const ROLE_DETECT = {
  zh: {
    general:  "人名、电话、证件号、公司名、邮箱",
    lawyer:   "人名、公司名、律所名、账户号、案件号、法院名、合同编号、金额",
    engineer: "IP 地址、主机名、文件夹路径、文件名、域名、API Key、数据库名、Git Remote",
  },
  en: {
    general:  "Name, phone, ID, company, email",
    lawyer:   "Name, company, law firm, account no., case no., court, contract ID, amounts",
    engineer: "IP, hostname, folder path, filename, domain, API key, DB name, git remote",
  },
};

function UploadEmpty({ drag, setDrag, onDrop, onPick, onDemo, fileInputRef, onFile, t, lang, role, onRoleChange }) {
  const roles = window.ROLES || [];

  return (
    <div className="empty">
      <div
        className={`upload-card ${drag ? "drag" : ""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <div className="icon-big"><Icon name="upload" size={28} /></div>
        <h2>{t.upload.h}</h2>
        <p>{t.upload.p}</p>

        {/* Role selector — dropdown with inline description */}
        {roles.length > 0 && (
          <div className="role-selector">
            <label className="role-selector-label">{t.upload.roleLabel}</label>
            <div className="role-selector-row">
              <select
                className="role-select"
                value={role}
                onChange={e => onRoleChange(e.target.value)}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.icon} {r.label[lang] || r.label.zh}
                  </option>
                ))}
              </select>
            </div>
            <p className="role-detect-hint">
              {ROLE_DETECT[lang]?.[role] || ROLE_DETECT.zh[role] || ""}
            </p>
          </div>
        )}

        <div className="upload-actions">
          <button className="btn primary" onClick={onPick}>
            <Icon name="file" size={13} /> {t.upload.browse}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.pdf,.docx,.xlsx"
            style={{ display: "none" }}
            onChange={e => onFile(e.target.files?.[0])}
          />
        </div>
        <div className="demo-row">
          <span>{t.upload.demo}</span>
          <button className="link" onClick={onDemo}>{t.upload.demoLink}</button>
        </div>
        <div className="file-types">
          <span>PDF</span><span>DOCX</span><span>XLSX</span><span>TXT</span><span>MD</span><span>OCR 图片</span>
        </div>
        <div className="privacy-banner">
          <span className="dot" />
          <Icon name="shield-check" size={13} />
          <span>{t.upload.banner}</span>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ data, exportOpts, doc, onClose, onConfirm }) {
  const grouped = useM(() => {
    const g = {};
    let counter = {};
    for (const ent of data.entities) {
      const t = ent.type || "other";
      g[t] = g[t] || [];
      counter[t] = (counter[t] || 0) + 1;
      g[t].push({ ...ent, num: counter[t] });
    }
    return g;
  }, [data.entities]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>确认完成脱敏</h3>
          <p>{doc.filename} · 共 {data.entities.length} 项替换</p>
        </div>
        <div className="modal-body">
          {TYPES.filter(t => grouped[t.id]).map(t => (
            <div key={t.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
                {t.label} · {grouped[t.id].length}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {grouped[t.id].map(ent => (
                  <span key={ent.id} style={{
                    fontSize: 12, padding: "3px 8px", borderRadius: 6,
                    background: t.color, color: t.ink, fontFamily: "var(--font-mono)",
                  }}>
                    {ent.text} → [{t.prefix}_{String(ent.num).padStart(2, "0")}]
                  </span>
                ))}
              </div>
            </div>
          ))}
          {grouped.other && (
            <div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
                其他 · {grouped.other.length}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {grouped.other.map(ent => (
                  <span key={ent.id} style={{
                    fontSize: 12, padding: "3px 8px", borderRadius: 6,
                    background: "var(--type-other)", fontFamily: "var(--font-mono)",
                  }}>{ent.text} → [{ent.customLabel || "其他"}_{String(ent.num).padStart(2, "0")}]</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="lock" size={11} /> 所有处理仅在本机完成
          </div>
          <button className="btn" onClick={onClose}>返回继续编辑</button>
          <button className="btn accent" onClick={onConfirm}>
            <Icon name="check" size={13} /> 确认完成
          </button>
        </div>
      </div>
    </div>
  );
}

function TweaksUI({ tweaks, setTweak }) {
  const { TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSlider, TweakSelect } = window;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Tab1 框选交互">
        <TweakRadio
          label="标记方式"
          value={tweaks.selectionMode}
          options={[
            { value: "bubble", label: "气泡选类型" },
            { value: "auto-confirm", label: "自动识别+确认" },
            { value: "sidebar", label: "侧栏统一编辑" },
            { value: "direct", label: "直接标记" },
          ]}
          onChange={v => setTweak("selectionMode", v)}
        />
        <div style={{ fontSize: 11, color: "var(--ink-3)", padding: "4px 0 0", lineHeight: 1.5 }}>
          {tweaks.selectionMode === "bubble" && "框选文字 → 气泡弹出 → 选类型/快捷键 1-6"}
          {tweaks.selectionMode === "auto-confirm" && "工具栏点「自动识别」→ 候选词虚线高亮 → 单击确认 / 右键忽略"}
          {tweaks.selectionMode === "sidebar" && "框选即标为「其他」→ 在右侧 mapping 改类型"}
          {tweaks.selectionMode === "direct" && "框选立即标记，无中间步骤；类型默认为「其他」"}
        </div>
      </TweakSection>
      <TweakSection title="布局">
        <TweakRadio
          label="Mapping 侧栏"
          value={tweaks.sidebarPos}
          options={[
            { value: "left", label: "左侧" },
            { value: "right", label: "右侧" },
            { value: "none", label: "隐藏" },
          ]}
          onChange={v => setTweak("sidebarPos", v)}
        />
        <TweakSlider
          label="字体大小"
          value={tweaks.fontSize}
          min={12} max={18} step={1}
          onChange={v => setTweak("fontSize", v)}
        />
      </TweakSection>
      <TweakSection title="外观">
        <TweakToggle
          label="深色模式"
          value={tweaks.darkMode}
          onChange={v => setTweak("darkMode", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

function CandidatesModal({ candidates, existingEntities, onClose, onConfirm }) {
  const initialFresh = useM(() => candidates.filter(c => !existingEntities.find(e => e.text === c.text)), [candidates, existingEntities]);
  const [items, setItems] = useS(() => initialFresh.map((c, i) => ({ ...c, _id: `cand_${i}` })));
  const fresh = items;
  const [included, setIncluded] = useS(() => Object.fromEntries(initialFresh.map((c, i) => [`cand_${i}`, true])));
  const [editingId, setEditingId] = useS(null);
  const [editType, setEditType] = useS(null);
  const [editText, setEditText] = useS("");

  function deleteItem(id) {
    setItems(arr => arr.filter(it => it._id !== id));
    setIncluded(s => { const n = { ...s }; delete n[id]; return n; });
  }
  function startEdit(it) {
    setEditingId(it._id);
    setEditType(it.type);
    setEditText(it.text);
  }
  function saveEdit() {
    setItems(arr => arr.map(it => it._id === editingId ? { ...it, type: editType, text: editText } : it));
    setEditingId(null);
  }

  const grouped = useM(() => {
    const g = {};
    let counter = {};
    for (const c of fresh) {
      const t = c.type || "other";
      g[t] = g[t] || [];
      counter[t] = (counter[t] || 0) + 1;
      g[t].push({ ...c, num: counter[t] });
    }
    return g;
  }, [fresh]);

  const includedCount = Object.values(included).filter(Boolean).length;

  function toggle(id) { setIncluded(s => ({ ...s, [id]: !s[id] })); }
  function toggleType(typeId, val) {
    const next = { ...included };
    for (const c of fresh) if (c.type === typeId) next[c._id] = val;
    setIncluded(next);
  }
  function setAll(v) { setIncluded(Object.fromEntries(fresh.map(c => [c._id, v]))); }
  function doConfirm() { onConfirm(fresh.filter(c => included[c._id]).map(({ _id, ...rest }) => rest)); }

  const visibleTypes = TYPES.filter(t => grouped[t.id]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: "min(680px, 92%)" }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>预览自动识别结果</h3>
          <p>共 {fresh.length} 项候选 · 当前选中 <strong style={{ color: "var(--accent-ink)" }}>{includedCount}</strong> 项 · 取消勾选不会被脱敏</p>
        </div>
        <div style={{ padding: "8px 22px", display: "flex", gap: 6, alignItems: "center", borderBottom: "1px solid var(--line)" }}>
          <button className="btn sm ghost" onClick={() => setAll(true)}>全选</button>
          <button className="btn sm ghost" onClick={() => setAll(false)}>全不选</button>
          <span style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: 8 }}>提示：勾选 = 替换为占位符</span>
        </div>
        <div className="modal-body">
          {visibleTypes.map(t => {
            const items = grouped[t.id];
            const allOn = items.every(it => included[`${t.id}::${it.text}`]);
            return (
              <div key={t.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginBottom: 6, borderBottom: "1px solid var(--line)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color }} />
                  <strong style={{ fontSize: 12 }}>{t.label}</strong>
                  <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                    {items.filter(it => included[`${t.id}::${it.text}`]).length}/{items.length}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button className="btn sm ghost" style={{ fontSize: 11, padding: "2px 8px" }} onClick={() => toggleType(t.id, !allOn)}>
                    {allOn ? "全部取消" : "全部选上"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map(it => {
                    const on = included[it._id];
                    const placeholder = `[${t.prefix}_${String(it.num).padStart(2, "0")}]`;
                    const isEditing = editingId === it._id;
                    if (isEditing) {
                      const editTypeObj = TYPE_BY_ID[editType] || t;
                      return (
                        <div key={it._id} style={{
                          display: "grid", gridTemplateColumns: "auto 1fr auto auto",
                          gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 6,
                          background: "var(--bg-sunk)", border: "1px solid var(--accent)",
                        }}>
                          <select value={editType} onChange={e => setEditType(e.target.value)} style={{
                            fontSize: 12, padding: "4px 6px", borderRadius: 4,
                            border: "1px solid var(--line)", background: "var(--bg-elev)",
                          }}>
                            {TYPES.map(t2 => <option key={t2.id} value={t2.id}>{t2.label}</option>)}
                          </select>
                          <input
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                            autoFocus
                            style={{
                              fontSize: 13, padding: "4px 8px", borderRadius: 4,
                              border: "1px solid var(--line)", background: "var(--bg-elev)",
                            }}
                          />
                          <button className="btn sm accent" onClick={saveEdit} style={{ padding: "3px 10px" }}>保存</button>
                          <button className="btn sm ghost" onClick={() => setEditingId(null)} style={{ padding: "3px 10px" }}>取消</button>
                        </div>
                      );
                    }
                    return (
                      <div key={it._id} className="cand-row" style={{
                        display: "grid", gridTemplateColumns: "auto 1fr auto 1fr auto",
                        gap: 10, alignItems: "center", padding: "6px 8px", borderRadius: 6,
                        background: on ? "var(--bg)" : "transparent",
                        opacity: on ? 1 : 0.5,
                      }}>
                        <input
                          type="checkbox" checked={!!on}
                          onChange={() => toggle(it._id)}
                          style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                        />
                        <span style={{
                          fontSize: 13, padding: "2px 6px", borderRadius: 4,
                          background: t.color, color: t.ink,
                          textDecoration: on ? "none" : "line-through",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          cursor: "pointer",
                        }} onClick={() => toggle(it._id)}>{it.text}</span>
                        <span style={{ color: "var(--ink-4)" }}>→</span>
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)",
                          background: "var(--bg-sunk)", padding: "2px 8px", borderRadius: 4, width: "fit-content",
                        }}>{placeholder}</span>
                        <span className="cand-actions" style={{ display: "flex", gap: 2 }}>
                          <button
                            className="icon-btn"
                            onClick={() => startEdit(it)}
                            title="编辑类型或文本"
                            style={{
                              width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center",
                              borderRadius: 4, border: "none", background: "transparent",
                              color: "var(--ink-3)", cursor: "pointer",
                            }}
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => deleteItem(it._id)}
                            title="从候选中移除"
                            style={{
                              width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center",
                              borderRadius: 4, border: "none", background: "transparent",
                              color: "var(--ink-3)", cursor: "pointer",
                            }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {fresh.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--ink-3)" }}>没有新的候选词。</div>
          )}
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={11} /> 离线规则识别 · 误判可在此过滤
          </div>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn accent" onClick={doConfirm} disabled={includedCount === 0}>
            <Icon name="check" size={13} /> 确认 {includedCount} 项
          </button>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, onStep, doc, entityCount }) {
  const steps = [
    { n: 1, label: "导入文件", sub: doc ? doc.filename : "选择 PDF / Word / 图片" },
    { n: 2, label: "标记敏感词", sub: entityCount > 0 ? `已标记 ${entityCount} 项` : "框选或自动识别" },
    { n: 3, label: "一键脱敏", sub: "启用上次设置快速开启脱敏" },
  ];
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const state = step > s.n ? "done" : step === s.n ? "active" : "todo";
        const clickable = (s.n === 2 && doc) || (s.n === 3 && doc && entityCount > 0) || s.n < step;
        return (
          <React.Fragment key={s.n}>
            <button
              className={`step-item ${state}`}
              onClick={() => clickable && onStep(s.n)}
              disabled={!clickable}
            >
              <span className="step-num">
                {state === "done" ? <Icon name="check" size={12} /> : s.n}
              </span>
              <span className="step-text">
                <span className="step-label">{s.label}</span>
                <span className="step-sub">{s.sub}</span>
              </span>
            </button>
            {i < steps.length - 1 && <span className={`step-line ${step > s.n ? "done" : ""}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ReviewStep({ doc, entities, exportOpts, setExportOpts, onBack, onConfirm }) {
  const [showOriginal, setShowOriginal] = useS(false);
  const entityIndex = useM(() => {
    const map = {};
    const counters = {};
    for (const ent of entities) {
      const t = ent.type || "other";
      counters[t] = (counters[t] || 0) + 1;
      map[ent.id] = counters[t];
    }
    return map;
  }, [entities]);

  const groupCounts = useM(() => {
    const g = {};
    for (const ent of entities) {
      const t = ent.type || "other";
      g[t] = (g[t] || 0) + 1;
    }
    return g;
  }, [entities]);

  function tokens(text) {
    if (!entities.length) return [{ kind: "text", text }];
    const sorted = [...entities].sort((a, b) => b.text.length - a.text.length);
    let parts = [{ kind: "text", text }];
    for (const ent of sorted) {
      const next = [];
      for (const p of parts) {
        if (p.kind !== "text") { next.push(p); continue; }
        const t = p.text;
        let i = 0;
        while (i < t.length) {
          const idx = t.indexOf(ent.text, i);
          if (idx === -1) { next.push({ kind: "text", text: t.slice(i) }); break; }
          if (idx > i) next.push({ kind: "text", text: t.slice(i, idx) });
          next.push({ kind: "ent", entId: ent.id });
          i = idx + ent.text.length;
        }
      }
      parts = next;
    }
    return parts;
  }

  function renderTok(text, key) {
    return tokens(text).map((p, i) => {
      if (p.kind === "text") return <React.Fragment key={`${key}_${i}`}>{p.text}</React.Fragment>;
      const ent = entities.find(e => e.id === p.entId);
      if (!ent) return null;
      const t = TYPE_BY_ID[ent.type] || { prefix: ent.customLabel || "其他", color: "var(--type-other)", ink: "var(--type-other-ink)" };
      const idx = entityIndex[ent.id];
      const placeholder = `[${ent.customLabel || t.prefix}_${String(idx).padStart(2, "0")}]`;
      return (
        <span
          key={`${key}_${i}`}
          className={`tok t-${ent.type || "other"} ${showOriginal ? "marked" : "placeholder"}`}
          title={`${ent.text} → ${placeholder}`}
        >
          {showOriginal ? ent.text : placeholder}
        </span>
      );
    });
  }

  return (
    <div className="review-step v2 no-head">
      <div className="review-doc-scroll">
        <div className="doc-page">
          <div className="doc-meta-bar">
            <span>共 <strong>{entities.length}</strong> 项替换 ·{" "}
              {TYPES.filter(t => groupCounts[t.id]).map(t => (
                <span key={t.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  marginRight: 8, fontSize: 11,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: t.color, display: "inline-block" }} />
                  {t.label} {groupCounts[t.id]}
                </span>
              ))}
              {groupCounts.other && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8, fontSize: 11 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--type-other)", display: "inline-block" }} />
                  其他 {groupCounts.other}
                </span>
              )}
            </span>
            <button className="btn sm ghost" onClick={() => setShowOriginal(!showOriginal)}>
              <Icon name={showOriginal ? "eye-off" : "eye"} size={12} />
              {showOriginal ? "切回脱敏后" : "对比原文"}
            </button>
          </div>
          {doc.paragraphs.map((para, i) => {
            if (para.type === "h2") return <h2 key={i}>{renderTok(para.text, `p${i}`)}</h2>;
            if (para.type === "h3") return <p key={i} style={{ fontWeight: 600, marginTop: 22, marginBottom: 6 }}>{renderTok(para.text, `p${i}`)}</p>;
            if (para.type === "meta") return <p key={i} className="doc-meta">{renderTok(para.text, `p${i}`)}</p>;
            if (para.type === "sig") {
              return (
                <div key={i} className="signature">
                  <div>
                    <div style={{ color: "var(--ink-3)", marginBottom: 4 }}>{para.left.label}</div>
                    <div>负责人：{renderTok(para.left.name, `p${i}_l`)}</div>
                    <div style={{ color: "var(--ink-3)", marginTop: 8 }}>{para.left.date}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--ink-3)", marginBottom: 4 }}>{para.right.label}</div>
                    <div>负责人：{renderTok(para.right.name, `p${i}_r`)}</div>
                    <div style={{ color: "var(--ink-3)", marginTop: 8 }}>{para.right.date}</div>
                  </div>
                </div>
              );
            }
            return <p key={i} className="clause">{renderTok(para.text, `p${i}`)}</p>;
          })}
        </div>
      </div>

      <div className="review-foot">
        <div className="export-opts" style={{ flex: 1, flexDirection: "row", display: "flex", gap: 8 }}>
          <label style={{ flex: 1 }}>
            <input type="checkbox" checked={exportOpts.exportFile} onChange={e => setExportOpts({ ...exportOpts, exportFile: e.target.checked })} />
            <div>
              <div className="lbl-title">保存脱敏后文件</div>
              <div className="lbl-sub">{doc.filename.replace(/(\.[^.]+)?$/, "_脱敏$1")}</div>
            </div>
          </label>
          <label style={{ flex: 1 }}>
            <input type="checkbox" checked={exportOpts.saveMapping} onChange={e => setExportOpts({ ...exportOpts, saveMapping: e.target.checked })} />
            <div>
              <div className="lbl-title">保存为 Mapping 供后续复用</div>
              <div className="lbl-sub">将出现在 Mapping 管理中</div>
            </div>
          </label>
        </div>
        <button className="btn accent lg" onClick={onConfirm} disabled={!exportOpts.exportFile && !exportOpts.saveMapping} style={{ alignSelf: "stretch", padding: "0 24px" }}>
          <Icon name="check" size={14} /> 确认完成
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
