// tauri-bridge.js
// Glue layer between the React UI and the Tauri/Rust backend.
// Works in two modes:
//   - Tauri mode  (window.__TAURI__ exists): calls Rust commands via invoke()
//   - Browser mode (no __TAURI__)          : uses localStorage + FileReader fallbacks

(function () {
  const isTauri = typeof window.__TAURI__ !== 'undefined';

  // ── Drag-drop path cache ──────────────────────────────────────────────────
  // Tauri 2.x intercepts OS file-drop events and fires its own event with
  // real file paths. We cache those paths (keyed by filename) so that when
  // the HTML5 ondrop handler fires a moment later, parseFile() can look up
  // the real path by filename.
  const dropPathCache = {};

  if (isTauri) {
    window.addEventListener('load', () => {
      try {
        const webview = window.__TAURI__?.webview?.getCurrentWebview?.();
        if (webview) {
          webview.onDragDropEvent((event) => {
            if (event.payload.type === 'drop') {
              for (const p of (event.payload.paths || [])) {
                const name = p.replace(/\\/g, '/').split('/').pop();
                dropPathCache[name] = p;
              }
            }
          });
        }
      } catch (e) {
        console.warn('[Bridge] drag-drop listener failed:', e);
      }
    });
  }

  // ── PDF / font ligature normalizer ──────────────────────────────────────
  // Many PDFs use typographic ligature glyphs. PDF extractors that lack a
  // font ToUnicode map emit them as U+FFFD (replacement character ◆).
  // This normalizes the standard Unicode Alphabetic Presentation Forms block
  // (U+FB00–FB06) and strips stray replacement characters.
  function normalizePdfText(text) {
    if (!text) return text;
    return text
      .replace(/�/g, '')    // unknown glyph → remove (better than garble)
      .replace(/ﬀ/g, 'ff')  // ﬀ
      .replace(/ﬁ/g, 'fi')  // ﬁ
      .replace(/ﬂ/g, 'fl')  // ﬂ
      .replace(/ﬃ/g, 'ffi') // ﬃ
      .replace(/ﬄ/g, 'ffl') // ﬄ
      .replace(/ﬅ/g, 'ft')  // ﬅ
      .replace(/ﬆ/g, 'st'); // ﬆ
  }

  // Merge short orphaned fragments caused by ligature glyph splitting.
  // e.g. ["Confiden", "ti", "al"] → ["Confidential"]
  // Only merges if both adjacent paragraphs look like word fragments
  // (no spaces inside, ends/starts with letters).
  function mergeFragments(paragraphs) {
    const out = [];
    for (const para of paragraphs) {
      const text = normalizePdfText(para.text || '');
      if (!text) continue; // drop paragraphs that were only ligature chars

      const prev = out[out.length - 1];
      const isFragment = (t) => t.length <= 8 && !/\s/.test(t) && /^[a-z]/.test(t);
      const prevEndsLetter = prev && /[a-zA-Z]$/.test(prev.text);

      if (prev && prevEndsLetter && isFragment(text)) {
        // Looks like a mid-word continuation — merge into previous
        out[out.length - 1] = { ...prev, text: prev.text + text };
      } else {
        out.push({ ...para, text });
      }
    }
    return out;
  }

  window.Bridge = {

    // ── File picker (native OS dialog) ──────────────────────────────────────
    // Returns { name, path } or null if cancelled.
    // Falls back to null in browser mode (caller should use <input type="file">).
    async openFilePicker() {
      if (!isTauri) return null;
      try {
        const selected = await window.__TAURI__.dialog.open({
          multiple: false,
          filters: [
            {
              name: '支持的文件',
              extensions: ['txt', 'md', 'csv', 'docx', 'xlsx', 'xls', 'pdf'],
            },
            { name: '所有文件', extensions: ['*'] },
          ],
        });
        if (!selected) return null;
        const filePath = typeof selected === 'string' ? selected : selected[0];
        const name = filePath.replace(/\\/g, '/').split('/').pop();
        return { name, path: filePath };
      } catch (e) {
        console.warn('[Bridge] openFilePicker failed:', e);
        return null;
      }
    },

    // ── File parsing ─────────────────────────────────────────────────────────
    // In Tauri: sends the real file path to Rust (handles PDF/DOCX/XLSX).
    // In browser: reads as text (txt/md/csv only).
    async parseFile(file) {
      // Resolve the real path: from file.path, Tauri drop cache, or undefined
      let filePath = file.path || dropPathCache[file.name];
      if (dropPathCache[file.name]) delete dropPathCache[file.name];

      if (isTauri && filePath) {
        const result = await window.__TAURI__.core.invoke('parse_file', { path: filePath });
        // Post-process: fix ligature glyphs that the PDF extractor couldn't map
        if (result && result.paragraphs) {
          result.paragraphs = mergeFragments(result.paragraphs);
        }
        return result;
      }

      // Browser fallback — only works for plain text formats
      const ext = (file.name || '').split('.').pop().toLowerCase();
      const binaryFormats = ['docx', 'doc', 'pdf', 'xlsx', 'xls'];
      if (binaryFormats.includes(ext)) {
        throw new Error(
          isTauri
            ? `请用「选择文件」按钮选择 ${ext.toUpperCase()}，拖放路径获取失败`
            : `浏览器模式不支持 ${ext.toUpperCase()}，请在桌面应用中使用`
        );
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = String(ev.target.result || '');
          resolve({
            filename: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            paragraphs: text
              .split(/\n+/)
              .filter(Boolean)
              .map((line, i) => ({ type: i === 0 ? 'h2' : 'p', text: line })),
          });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    },

    // ── File export ──────────────────────────────────────────────────────────
    // Generates redacted plain-text content in JS (substituting entities),
    // then saves it to a user-chosen path.
    // - Tauri: shows a native save dialog (suggesting original filename+ext),
    //          writes via fs plugin → returns the saved path.
    // - Browser: triggers a browser download → returns null.
    //
    // NOTE: For binary formats (PDF, DOCX) the content is plain text inside
    // the original extension. Full format preservation needs a future Rust
    // backend update (re-encode the source binary with substitutions applied).
    async exportFile(doc, entities, format) {
      // ── Build redacted text content ─────────────────────────────────────
      const TYPE_MAP = window.TYPE_BY_ID || {};
      const counters = {}, index = {};
      for (const ent of entities) {
        const t = ent.type || 'other';
        counters[t] = (counters[t] || 0) + 1;
        index[ent.id] = counters[t];
      }
      const substitute = (text) => {
        const sorted = [...entities].sort((a, b) => b.text.length - a.text.length);
        let out = text;
        for (const ent of sorted) {
          const td = TYPE_MAP[ent.type] || {};
          const pfx = ent.customLabel || td.prefix || ent.type || 'other';
          const ph = `[${pfx}_${String(index[ent.id]).padStart(2, '0')}]`;
          out = out.split(ent.text).join(ph);
        }
        return out;
      };
      const content = doc.paragraphs.map((p) => substitute(p.text || '')).join('\n');
      const ext = (format || 'txt').replace(/^\./, '');
      const suggestedName = doc.filename.replace(/(\.[^.]+)?$/, `_脱敏.${ext}`) || `redacted_脱敏.${ext}`;

      // ── Tauri: delegate to Rust command (shows native save dialog,
      //          writes the file, returns the chosen path or throws "cancelled")
      if (isTauri) {
        try {
          const result = await window.__TAURI__.core.invoke('export_file', {
            doc, entities, format: ext,
          });
          return result; // path string
        } catch (e) {
          if (e === 'cancelled' || String(e).includes('cancelled')) return null;
          throw e;
        }
      }

      // ── Browser: download ───────────────────────────────────────────────
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      return null;
    },

    // ── Open folder in OS file manager ───────────────────────────────────────
    async openFolder(folderPath) {
      if (!isTauri) return;
      try {
        await window.__TAURI__.core.invoke('open_folder', { path: folderPath });
      } catch (e) {
        console.warn('[Bridge] open_folder invoke failed:', e);
        // Fallback: shell.open
        try {
          if (window.__TAURI__?.shell?.open) {
            await window.__TAURI__.shell.open(folderPath);
          }
        } catch (e2) {
          console.warn('[Bridge] shell.open also failed:', e2);
        }
      }
    },

    // ── Mapping persistence ──────────────────────────────────────────────────
    async loadMappings() {
      if (isTauri) return window.__TAURI__.core.invoke('load_mappings');
      try { return JSON.parse(localStorage.getItem('wukong_mappings') || '[]'); }
      catch { return []; }
    },

    async saveMappings(mappings) {
      if (isTauri) return window.__TAURI__.core.invoke('save_mappings', { mappings });
      try { localStorage.setItem('wukong_mappings', JSON.stringify(mappings)); }
      catch (e) { console.warn('[Bridge] saveMappings failed:', e); }
    },

    // ── Proxy control (Phase 3 stubs) ────────────────────────────────────────
    async startProxy(domains, mappings) {
      if (isTauri) return window.__TAURI__.core.invoke('start_proxy', { domains, mappings });
      return { success: false, error: '仅桌面应用可用' };
    },
    async stopProxy() {
      if (isTauri) return window.__TAURI__.core.invoke('stop_proxy');
    },
    async getProxyStatus() {
      if (isTauri) return window.__TAURI__.core.invoke('get_proxy_status');
      return { running: false, interceptedCount: 0 };
    },
    async installCACert() {
      if (isTauri) return window.__TAURI__.core.invoke('install_ca_cert');
      return { success: false, error: '仅桌面应用可用' };
    },
    async getCertStatus() {
      if (isTauri) return window.__TAURI__.core.invoke('get_cert_status');
      return { installed: false };
    },
  };
})();
