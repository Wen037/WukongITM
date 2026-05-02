# WukongITM — Test Plan

## Why JMeter / Postman don't apply

WukongITM is a Tauri desktop app. All backend logic is exposed through **Tauri IPC commands** (`invoke()`), not HTTP endpoints. JMeter and Postman test HTTP/REST APIs — there is no HTTP server to hit. The correct testing approach is:

- **Rust unit tests** for pure functions (parsers, replacer)  
- **Manual end-to-end tests** following the scripts below

---

## 1 — Unit Tests (Rust)

Run with: `cd src-tauri && cargo test`

### 1.1 Plain-text parser

```rust
#[test]
fn parse_text_basic() {
    // write a temp file, call parse_text_sync, assert paragraph count
}
```

### 1.2 Case-insensitive replacer

```rust
#[test]
fn replace_ci_same_case() {
    let r = replace_case_insensitive(
        "Hello World".to_string(),
        &[("world".to_string(), "[Name_01]".to_string())],
    );
    assert_eq!(r, "Hello [Name_01]");
}

#[test]
fn replace_ci_upper() {
    let r = replace_case_insensitive(
        "ENTIIS PTE LTD hired us".to_string(),
        &[("entiis pte ltd".to_string(), "[Org_01]".to_string())],
    );
    assert_eq!(r, "[Org_01] hired us");
}

#[test]
fn replace_ci_longest_first() {
    // "John Smith" must replace before "John" to avoid partial match
    let mut reps = vec![
        ("john".to_string(), "[Name_01]".to_string()),
        ("john smith".to_string(), "[Name_02]".to_string()),
    ];
    reps.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
    let r = replace_case_insensitive("John Smith signed".to_string(), &reps);
    assert_eq!(r, "[Name_02] signed");
}
```

### 1.3 Mapping persistence

```rust
#[tokio::test]
async fn save_load_round_trip() {
    // use a temp AppData dir, save a mapping, load it back, assert equality
}
```

---

## 2 — Manual End-to-End Tests

### 2.1 Language switching

| # | Steps | Expected |
|---|---|---|
| 1 | Open Tweaks panel → Language → English | Nav labels change to English |
| 2 | Go to step 1 | Upload card shows "Detection profile" and English role pills |
| 3 | Switch back to 中文 | All labels revert |

### 2.2 Role-based auto-detect

| # | Role | Load file | Expected detections |
|---|---|---|---|
| 1 | 通用 | Sample contract (demo) | Names, phones, companies |
| 2 | 律师 | Same contract | Above + case numbers, bank accounts, courts |
| 3 | 工程师 | `test_fixtures/engineer_doc.txt` (see below) | IP, hostname, path, API key, company (Pte Ltd) |

**engineer_doc.txt content (create manually):**
```
Server: db-prod-01.internal:5432
IP: 192.168.1.100
Path: /var/app/config/secrets.yml
Key: sk-abcdefghijklmnopqrstuvwxyz123456
Client: Entiis Pte Ltd
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
```

### 2.3 Case-insensitive marking

| # | Steps | Expected |
|---|---|---|
| 1 | Load engineer_doc | Auto-detect finds "Entiis Pte Ltd" |
| 2 | Manually type "entiis pte ltd" (lower) in selection or confirm candidate | Entity added |
| 3 | Observe doc view | Both "Entiis Pte Ltd" AND any other-cased occurrences are highlighted |
| 4 | Export | `_redacted.txt` — all occurrences replaced with `[Org_01]` |

### 2.4 Mapping persistence across sessions

| # | Steps | Expected |
|---|---|---|
| 1 | Run full flow on demo contract, complete export | Mapping saved |
| 2 | Fully close and reopen app | Mapping Management tab shows saved mapping |
| 3 | Count of items matches what was exported | ✓ |

### 2.5 File format support

| # | Format | Steps | Expected |
|---|---|---|---|
| 1 | TXT | Drag in any .txt | Paragraphs displayed |
| 2 | DOCX | Drag in a .docx contract | Paragraphs displayed, no garbled chars |
| 3 | XLSX | Drag in a .xlsx spreadsheet | Rows displayed tab-separated |
| 4 | PDF (text) | Drag in a text-based PDF | Lines extracted |
| 5 | PDF (scan) | Drag in a scanned PDF | Error: "PDF 没有可提取的文本" |

### 2.6 Export output

| # | Steps | Expected |
|---|---|---|
| 1 | Mark "张三" as name, confirm, export | Download folder contains `<name>_redacted.txt` |
| 2 | Open file | "张三" replaced with `[Name_01]`; "ZHANG SAN" (if present) also replaced |

---

## 3 — Regression Checklist (pre-release)

- [ ] App opens without console errors
- [ ] Dark mode toggle works
- [ ] Font size slider works
- [ ] Demo contract loads in < 1s
- [ ] Auto-detect completes in < 3s on demo contract
- [ ] Candidates modal checkbox select/deselect works
- [ ] Edit type inside candidates modal works
- [ ] Step 3 preview toggle (original ↔ redacted) works
- [ ] Export saves file to Downloads
- [ ] Mapping Management tab shows, edit, delete mapping
- [ ] AI Proxy tab renders (stub state is fine)
