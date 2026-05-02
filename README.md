# WukongITM

**本地隐私脱敏工具 · Local Privacy Redaction Tool**

> 在把文件或对话发给 AI 之前，先在本机把敏感词替换成占位符 — 全程离线，零上传，零遥测。  
> Redact sensitive data from documents and AI prompts — 100% local, no server, no telemetry.

---

## 功能 · Features

| | 中文 | English |
|---|---|---|
| 📄 | 解析 PDF · DOCX · XLSX · TXT | Parse PDF, DOCX, XLSX, TXT |
| 🔍 | 离线正则自动识别敏感词 | Offline regex auto-detection |
| 👤 | 按职业角色切换检测规则 | Role-based detection profiles |
| 🔡 | 大小写不敏感匹配 | Case-insensitive matching |
| 💾 | Mapping 跨会话持久化 | Cross-session mapping persistence |
| 🌐 | 中英双语界面 | Bilingual UI (Chinese / English) |
| 🔒 | 无网络请求，可审计开源 | No network, open source & auditable |

### 检测角色 · Detection Profiles

| 角色 / Role | 识别内容 / Detects |
|---|---|
| 🌐 通用 General | 邮箱、手机、身份证、公司名 / Email, phone, national ID, company |
| ⚖️ 律师 Lawyer | 上述 + 案号、银行账号、法院、大额金额 / Above + case numbers, bank accts, courts, amounts |
| 💻 工程师 Engineer | IP、主机名、路径、API Key、数据库名、Git Remote / IP, hostname, path, API key, DB name, git remote |

---

## 快速上手 · Quick Start

### 使用 / Use

1. 下载 [Releases](../../releases) 中的 `.exe` 安装包，双击安装
2. 打开 app → 选择角色（律师 / 工程师 / 通用）
3. 拖入文件或加载示例合同
4. 点「自动识别」，审阅候选词，确认后进入预览
5. 确认 mapping → 导出脱敏文件

---

1. Download the `.exe` installer from [Releases](../../releases) and run it
2. Open the app → choose your detection profile
3. Drag in a file or load the sample contract
4. Click **Auto-detect**, review candidates, confirm
5. Preview replacements → export redacted file

### 开发 · Development

```bash
# 安装依赖 / Install deps
npm install

# 开发模式 (热重载 + Tauri 窗口) / Dev mode (hot-reload + Tauri window)
npm run tauri dev

# 生产构建 / Production build
npm run tauri build
```

**环境要求 / Requirements**: Node 18+, Rust 1.77+, Visual Studio Build Tools 2022

---

## 工作原理 · How It Works

```
文件 ──► 本地解析 ──► 正则检测 ──► 用户审阅 ──► 占位符替换 ──► 导出
File    Local parse   Regex detect  User review  Placeholder    Export
```

脱敏映射（`张三` → `[Name_01]`）保存在本机 AppData，可在 **Mapping 管理** 标签复用。  
Redaction mappings (`Jane Doe` → `[Name_01]`) are saved locally in AppData and reusable from the **Mappings** tab.

---

## 路线图 · Roadmap

- [x] 阶段1 — Tauri 脚手架 + Mapping 持久化
- [x] 阶段2 — PDF / DOCX / XLSX 解析 + 导出
- [ ] 阶段3 — HTTPS MitM 代理（浏览器端实时脱敏）
- [ ] macOS 支持
- [ ] Firefox 证书库支持
- [ ] OCR 图片支持

---

## 许可 · License

MIT © 2025 WukongITM Contributors
