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
        return window.__TAURI__.core.invoke('parse_file', { path: filePath });
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
    async exportFile(doc, entities, format) {
      if (isTauri) {
        return window.__TAURI__.core.invoke('export_file', { doc, entities, format });
      }
      const lines = doc.paragraphs.map((p) => p.text);
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = doc.filename.replace(/\.[^.]+$/, '') + '_desensitized.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
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
