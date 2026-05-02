# 环境安装步骤

## 1. 安装 Rust（必须）

访问 https://rustup.rs，下载 `rustup-init.exe` 并运行。
全部默认选项，安装完成后**重启终端**。

## 2. 安装 WebView2 运行时（Windows 11 通常已预装）

如果运行时报错找不到 WebView2，访问：
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

## 3. 安装 NSIS（打包安装程序用，可选）

https://nsis.sourceforge.io/Download

## 4. 安装项目依赖并启动开发模式

```bash
# 在项目根目录（脱敏/）运行
npm install
npm run dev
```

首次 `cargo build` 会下载所有 Rust 依赖，大约 5-10 分钟。

## 5. 打包发布版本

```bash
npm run build
```

输出文件：`src-tauri/target/release/bundle/nsis/脱敏程序_0.1.0_x64-setup.exe`

## 当前实现状态

| 功能 | 状态 |
|---|---|
| 脱敏工作台 UI | ✅ 完成（原有设计） |
| Mapping 跨会话持久化 | ✅ 阶段1完成 |
| PDF/DOCX/XLSX 解析 | ⏳ 阶段2待实现 |
| HTTPS 代理拦截 | ⏳ 阶段3待实现 |
| Windows 安装程序 | ⏳ 阶段4待实现 |
