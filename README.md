#  Wukong itM (悟空脱敏)

![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)
![Rust](https://img.shields.io/badge/Core-Rust-orange.svg)
![Tauri](https://img.shields.io/badge/Framework-Tauri_2.0-yellow.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-informational.svg)

<p align="center">
  <img src="WukongITM_icon.png" alt="WukongITM" width="160" />
</p>

> *一款基于"最坏情况防御原则"的本地隐私保护盾。在你的数据被喂给云端 AI 之前，为其戴上隐形面具。*

🌍 **Read this in other languages:** [English](#-origin--philosophy)

---

### 🇨🇳 缘起：免费AI工具的盛世幻境

在除夕夜的狂欢里，巨头们用天价的春晚广告，变出了一个名为"完全免费"的 AI 盛世。

就像《西游记》里白骨精化作村姑送上香喷喷的斋饭，普通人因为对技术的无知，欣然接受了这份免费的馈赠。
但作为一个悟空，能看清楚这些"免费"背后的系统调用与商业逻辑：他们变作高效的工具、聪明的助手，引诱你输入个人的商业合同、核心代码、家庭信息。
最终，在云端的服务器里，你的隐私数据化作了他们闭源模型的养料。

**免费的代价，是你成为了产品本身。**

面对铺天盖地的 AI 营销，各行各业的精英（医生、律师）就像肉眼凡胎的**唐僧**——他们拥有极高的专业技能，却缺乏在赛博世界保护自己的"魔法"。
悟空不能普度众生，但愿为那些想保护自己数据主权的人画一个金圈。

### 🇨🇳 命名：反向劫持的黑客

**Wukong (悟空):**
在《西游记》中，孙悟空是唯一能看穿白骨精伪装的人。他用金箍棒在地上画了一个圈，只要唐僧待在圈内，就能免受妖魔侵害。
本软件的使命与悟空的侠义精神如出一辙：在你的本地电脑上画一个绝对安全的结界，把个人数据拦在圈内。

**ITM (In-The-Middle):**
在黑客技术中，MITM（Man-in-the-Middle，中间人攻击）是恶的流量窃听手段。我们反其道而行之，利用这项黑客技术创造正向价值。

现在，这中间人是悟空，
它作为你本地专属的守护者，坐在你的电脑与互联网之间，反向劫持并保护你的数据。

---

### 🇬🇧 Origin & Philosophy

The rise of "free" AI tools is one of the great illusions of our era. Cloud AI companies offer powerful assistants at zero cost — yet the true price is paid in the data you feed them: contracts, source code, medical records, private correspondence. Most users simply don't know what happens to that data once it leaves their machine.

WukongITM was built for the professionals who need AI the most — lawyers drafting sensitive agreements, engineers working with proprietary systems, doctors handling patient data — but who lack the technical means to protect themselves. The tool operates on a simple principle: **the safest data is the data that never leaves your device in recognisable form.**

### 🇬🇧 Naming & Core Concept

**Wukong (The Monkey King):**
In *Journey to the West*, Sun Wukong is the only one who can see through the White Bone Demon's disguise. He draws a protective circle on the ground — anyone inside is safe from evil. WukongITM draws that circle around your local machine: your sensitive data stays inside, and only masked placeholders cross the boundary.

**ITM (In-The-Middle):**
MITM (Man-in-the-Middle) is a notorious hacker technique for intercepting network traffic. WukongITM turns that weapon around. The "Man" in the middle is now your own guardian — sitting between your keyboard and the internet, silently swapping real names and secrets for placeholders before any request leaves your machine, then restoring them in the response.

---

## 核心特性 · Features

| | 中文 | English |
|---|---|---|
| **火眼金睛** | 解析 PDF · DOCX · XLSX · TXT，精准提取敏感实体 | Parse PDF, DOCX, XLSX, TXT with accurate entity extraction |
| **七十二变** | 确定性脱敏（`张三` → `[姓名_01]`），保留逻辑拓扑 | Deterministic masking (`Jane Doe` → `[Name_01]`), context preserved |
| **角色切换** | 按职业角色切换检测规则（通用 / 律师 / 工程师） | Role-based detection profiles (General / Lawyer / Engineer) |
| **画地为牢** | *开发中*：本地 HTTPS MitM 代理，实时拦截发往 AI 的请求 | *In progress*: Local HTTPS MitM proxy, real-time interception |
| **跨会话记忆** | Mapping 自动持久化，导入新文件时自动预填已知词条 | Mappings persist across sessions and auto-fill on new documents |
| **双语界面** | 中英文一键切换，别名库同步切换 | One-click Chinese / English UI with localised alias pools |
| **极致轻量** | Tauri 2.0 + Rust，安装包 ~15 MB，零遥测，可离线运行 | Tauri 2.0 + Rust, ~15 MB installer, zero telemetry, fully offline |

### 检测角色 · Detection Profiles

| 角色 / Role | 识别内容 / Detects |
|---|---|
| 通用 General | 邮箱、手机、身份证、公司名 · Email, phone, national ID, company name |
| 律师 Lawyer | 上述 + 案号、银行账号、法院名、大额金额 · Above + case numbers, bank accounts, court names, monetary amounts |
| 工程师 Engineer | IP、主机名、文件路径、API Key、数据库名、Git Remote · IP, hostname, file paths, API keys, DB names, git remotes |

---

## 🚀 快速上手 · Quick Start

### 使用 · Use

**中文**
1. 下载 [Releases](../../releases) 中的 `.exe` 安装包，双击安装
2. 打开 app → 选择检测角色（通用 / 律师 / 工程师）
3. 拖入文件或加载示例合同
4. 点击「自动识别」，审阅候选词，逐项确认或忽略
5. 在预览页核对占位符替换关系 → 确认完成 → 导出脱敏文件

**English**
1. Download the `.exe` installer from [Releases](../../releases) and run it
2. Open the app → choose your detection profile (General / Lawyer / Engineer)
3. Drag in a file or load the sample contract
4. Click **Auto-detect**, review candidates, confirm or dismiss each one
5. Preview all replacements → confirm → export the redacted file

### 开发 · Development

```bash
# 安装依赖 / Install deps
npm install

# 开发模式 — 热重载 + Tauri 窗口 / Dev mode — hot-reload + Tauri window
npm run tauri dev

# 生产构建 / Production build
npm run tauri build
```

**环境要求 · Requirements**

| | 最低版本 / Minimum |
|---|---|
| Node.js | 18+ |
| Rust | 1.77+ |
| Visual Studio Build Tools | 2022 (MSVC, Windows SDK) |

---

## 工作原理 · How It Works

```
文件 ──► 本地解析 ──► 正则检测 ──► 用户审阅 ──► 占位符替换 ──► 导出
File    Local parse   Regex detect  User review  Placeholder    Export
```

脱敏映射（`张三` → `[姓名_01]`）保存在本机 AppData，可在 **脱敏库** 标签跨会话复用。  
Redaction mappings (`Jane Doe` → `[Name_01]`) are saved locally in AppData and reusable from the **Redaction Library** tab.

### 技术栈 · Tech Stack

| 层次 / Layer | 技术 / Technology | 用途 / Purpose |
|---|---|---|
| 应用壳 / App shell | Tauri 2.x | 原生窗口，~15 MB 安装包 · Native window, ~15 MB installer |
| 后端 / Backend | Rust + Tokio | 文件解析、脱敏引擎、代理服务器 · Parsing, masking engine, proxy |
| 前端 / Frontend | React 18 (no build step) | 无编译步骤，Babel standalone · No compile step, Babel standalone |
| 文件解析 / Parsing | lopdf · quick-xml · calamine | PDF · DOCX · XLSX 纯 Rust 实现 · Pure Rust parsers |
| 持久化 / Persistence | JSON → AppData | Mapping 跨会话存储 · Cross-session mapping storage |
| 代理 TLS (Phase 3) | rustls + rcgen | 纯 Rust TLS，无 OpenSSL 依赖 · Pure Rust TLS, no OpenSSL |

---

## 路线图 · Roadmap

- [x] 阶段 1 — Tauri 脚手架 + Mapping 跨会话持久化
- [x] 阶段 2 — PDF / DOCX / XLSX 本地解析 + 脱敏导出
- [ ] 阶段 3 — HTTPS MitM 代理（浏览器端实时脱敏，PAC 自动路由）
- [ ] macOS 支持（`networksetup` + `security` 证书库）
- [ ] Firefox 独立证书库支持（`certutil`）
- [ ] SSE 流式响应实时还原
- [ ] OCR 图片支持
- [ ] 代码签名 EV 证书（消除 SmartScreen 警告）

---

## 许可 · License

Apache 2.0 © 2026 [Wen037](https://github.com/Wen037)

See [LICENSE](LICENSE) for full terms.
