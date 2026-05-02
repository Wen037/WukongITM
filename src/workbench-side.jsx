// Side panel: mapping list + summary + export
const { useState: useState2, useMemo: useMemo2 } = React;

function MappingSidePane({ entities, onRemove, exportOpts, setExportOpts, onExport, onSelect, selectedId, previewOriginal, setPreviewOriginal }) {
  const grouped = useMemo2(() => {
    const g = {};
    let counter = {};
    for (const ent of entities) {
      const t = ent.type || "other";
      g[t] = g[t] || [];
      counter[t] = (counter[t] || 0) + 1;
      g[t].push({ ...ent, num: counter[t] });
    }
    return g;
  }, [entities]);

  const total = entities.length;
  const types = Object.keys(grouped).length;
  const safe = total >= 4 ? "good" : total > 0 ? "ok" : "none";

  return (
    <aside className="side-pane">
      <div className="side-head">
        <h3 style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="database" size={14} /> 脱敏 Mapping
        </h3>
        <p>每条记录都会保存到本地 mapping 库，可在 Mapping 管理 中复用。</p>
      </div>
      <div className="summary-row">
        <div className="cell">
          <div className="n">{total}</div>
          <div className="l">条目</div>
        </div>
        <div className="cell">
          <div className="n">{types}</div>
          <div className="l">类别</div>
        </div>
        <div className={`cell ${safe === "good" ? "safe" : safe === "ok" ? "warn" : ""}`}>
          <div className="n">{safe === "good" ? "✓" : safe === "ok" ? "·" : "—"}</div>
          <div className="l">{safe === "good" ? "覆盖良好" : safe === "ok" ? "可继续" : "未开始"}</div>
        </div>
      </div>

      <div style={{ padding: "8px 12px 4px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 6 }}>
        <button
          className="btn sm ghost"
          onClick={() => setPreviewOriginal(!previewOriginal)}
          title="切换显示原文/占位符"
          style={{ fontSize: 11 }}
        >
          <Icon name={previewOriginal ? "eye" : "eye-off"} size={12} />
          {previewOriginal ? "显示原文" : "显示占位符"}
        </button>
      </div>

      <div className="mapping-list">
        {total === 0 && (
          <div className="mapping-empty">
            <Icon name="shield" size={28} />
            <div style={{ marginTop: 12 }}>还没有标记任何敏感词</div>
            <div style={{ marginTop: 4, color: "var(--ink-4)" }}>在文档中框选文字开始标记</div>
          </div>
        )}
        {TYPES.filter(t => grouped[t.id]).map(t => (
          <div key={t.id} className="mapping-group">
            <div className="mapping-group-head">
              <span className="swatch" style={{ background: t.color }} />
              <span>{t.label}</span>
              <span className="count">{grouped[t.id].length}</span>
            </div>
            {grouped[t.id].map(ent => (
              <MappingItem
                key={ent.id}
                ent={ent}
                t={t}
                isSelected={selectedId === ent.id}
                onRemove={() => onRemove(ent.id)}
                onSelect={() => onSelect(ent.id)}
              />
            ))}
          </div>
        ))}
        {grouped.other && (
          <div className="mapping-group">
            <div className="mapping-group-head">
              <span className="swatch" style={{ background: "var(--type-other)" }} />
              <span>其他</span>
              <span className="count">{grouped.other.length}</span>
            </div>
            {grouped.other.map(ent => (
              <MappingItem
                key={ent.id}
                ent={ent}
                t={{ prefix: ent.customLabel || "其他", color: "var(--type-other)" }}
                isSelected={selectedId === ent.id}
                onRemove={() => onRemove(ent.id)}
                onSelect={() => onSelect(ent.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="side-actions">
        <div className="export-opts" style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", padding: "0 6px" }}>
            标记完成后点工具栏「下一步」预览 mapping
          </div>
        </div>
      </div>
    </aside>
  );
}

function MappingItem({ ent, t, isSelected, onRemove, onSelect }) {
  const placeholder = `[${ent.customLabel || t.prefix}_${String(ent.num).padStart(2, "0")}]`;
  return (
    <div
      className="mapping-item"
      onMouseEnter={onSelect}
      onMouseLeave={() => onSelect(null)}
      style={isSelected ? { background: "var(--bg-sunk)" } : null}
    >
      <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span className="map-orig" title={ent.text}>{ent.text}</span>
        <span className="map-arrow">→</span>
        <span className="map-place" style={{ background: t.color, color: t.ink || "var(--ink-2)" }}>
          {placeholder}
        </span>
      </div>
      <button className="del" onClick={onRemove} title="移除">
        <Icon name="x" size={12} />
      </button>
    </div>
  );
}

window.MappingSidePane = MappingSidePane;
