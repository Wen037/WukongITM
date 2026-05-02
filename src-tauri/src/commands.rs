use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::storage::mappings;

// ── Phase 1: Mapping persistence ─────────────────────────────────────────────

#[tauri::command]
pub async fn load_mappings(app: AppHandle) -> Result<Vec<Value>, String> {
    mappings::load(&app).await
}

#[tauri::command]
pub async fn save_mappings(app: AppHandle, mappings: Vec<Value>) -> Result<(), String> {
    mappings::save(&app, &mappings).await
}

// ── Phase 2: File parsing ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Paragraph {
    #[serde(rename = "type")]
    pub para_type: String,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedDoc {
    pub filename: String,
    pub size: String,
    pub paragraphs: Vec<Paragraph>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub text: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    #[serde(rename = "customLabel", skip_serializing_if = "Option::is_none")]
    pub custom_label: Option<String>,
}

#[tauri::command]
pub async fn parse_file(path: String) -> Result<ParsedDoc, String> {
    let path_ref = std::path::Path::new(&path);
    let filename = path_ref
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let ext = path_ref
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    // spawn_blocking because zip/xml/pdf parsing is CPU-bound
    tokio::task::spawn_blocking(move || match ext.as_str() {
        "txt" | "md" | "csv" => parse_text_sync(&path, filename),
        "docx"               => parse_docx_sync(&path, filename),
        "xlsx" | "xls"       => parse_xlsx_sync(&path, filename),
        "pdf"                => parse_pdf_sync(&path, filename),
        _                    => parse_text_sync(&path, filename),
    })
    .await
    .map_err(|e| e.to_string())?
}

fn file_size_str(path: &str) -> String {
    std::fs::metadata(path)
        .map(|m| format!("{:.1} KB", m.len() as f64 / 1024.0))
        .unwrap_or_default()
}

fn lines_to_paragraphs(lines: Vec<String>) -> Vec<Paragraph> {
    lines
        .into_iter()
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(i, text)| Paragraph {
            para_type: if i == 0 { "h2" } else { "p" }.to_string(),
            text,
        })
        .collect()
}

// ── Plain text ────────────────────────────────────────────────────────────────

fn parse_text_sync(path: &str, filename: String) -> Result<ParsedDoc, String> {
    let contents = std::fs::read_to_string(path)
        .map_err(|e| format!("无法读取文件: {e}"))?;
    let size = file_size_str(path);
    let paragraphs = lines_to_paragraphs(
        contents.lines().map(|l| l.to_string()).collect(),
    );
    Ok(ParsedDoc { filename, size, paragraphs })
}

// ── DOCX ──────────────────────────────────────────────────────────────────────
// DOCX is a ZIP archive. We unzip word/document.xml and extract <w:t> text nodes.

fn parse_docx_sync(path: &str, filename: String) -> Result<ParsedDoc, String> {
    use std::io::Read;

    let file = std::fs::File::open(path).map_err(|e| format!("无法打开文件: {e}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|_| "不是有效的 DOCX 文件（ZIP 解析失败）".to_string())?;

    let mut xml = String::new();
    archive
        .by_name("word/document.xml")
        .map_err(|_| "找不到 word/document.xml，可能不是标准 DOCX".to_string())?
        .read_to_string(&mut xml)
        .map_err(|e| format!("读取 document.xml 失败: {e}"))?;

    let paragraphs = lines_to_paragraphs(extract_docx_paragraphs(&xml));
    Ok(ParsedDoc { filename, size: file_size_str(path), paragraphs })
}

fn extract_docx_paragraphs(xml: &str) -> Vec<String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut paragraphs: Vec<String> = Vec::new();
    let mut current: String = String::new();
    let mut in_text = false;

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                match e.name().as_ref() {
                    b"w:p"  => current.clear(),
                    b"w:t"  => in_text = true,
                    b"w:br" | b"w:cr" => current.push(' '),
                    _ => {}
                }
            }
            Ok(Event::End(ref e)) => match e.name().as_ref() {
                b"w:p" => {
                    let s = current.trim().to_string();
                    if !s.is_empty() { paragraphs.push(s); }
                    current.clear();
                }
                b"w:t" => in_text = false,
                _ => {}
            },
            Ok(Event::Text(e)) if in_text => {
                if let Ok(t) = e.unescape() { current.push_str(&t); }
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
    }
    paragraphs
}

// ── XLSX ──────────────────────────────────────────────────────────────────────

fn parse_xlsx_sync(path: &str, filename: String) -> Result<ParsedDoc, String> {
    use calamine::{open_workbook_auto, Reader};

    let mut wb = open_workbook_auto(path)
        .map_err(|e| format!("无法打开 Excel 文件: {e}"))?;

    let sheet_names: Vec<String> = wb.sheet_names().to_vec();
    let first = sheet_names.first().ok_or("Excel 文件没有工作表")?;

    let range = wb
        .worksheet_range(first)
        .map_err(|e| format!("读取工作表失败: {e}"))?;

    let mut lines: Vec<String> = Vec::new();
    for row in range.rows() {
        let cells: Vec<String> = row
            .iter()
            .map(|c| {
                use calamine::Data;
                match c {
                    Data::String(s) => s.clone(),
                    Data::Float(f)  => f.to_string(),
                    Data::Int(i)    => i.to_string(),
                    Data::Bool(b)   => b.to_string(),
                    Data::DateTime(d) => d.to_string(),
                    Data::Empty     => String::new(),
                    _ => String::new(),
                }
            })
            .collect();
        let row_str = cells.join("\t");
        if !row_str.trim().is_empty() { lines.push(row_str); }
    }

    Ok(ParsedDoc {
        filename,
        size: file_size_str(path),
        paragraphs: lines_to_paragraphs(lines),
    })
}

// ── PDF ───────────────────────────────────────────────────────────────────────

fn parse_pdf_sync(path: &str, filename: String) -> Result<ParsedDoc, String> {
    let doc = lopdf::Document::load(path)
        .map_err(|e| format!("无法打开 PDF: {e}"))?;

    let mut lines: Vec<String> = Vec::new();
    let pages: Vec<u32> = doc.get_pages().keys().cloned().collect();

    for page_num in pages {
        match doc.extract_text(&[page_num]) {
            Ok(text) => {
                for line in text.lines() {
                    let s = line.trim().to_string();
                    if !s.is_empty() { lines.push(s); }
                }
            }
            Err(_) => continue,
        }
    }

    if lines.is_empty() {
        return Err("PDF 没有可提取的文本（可能是扫描件或图片 PDF）".to_string());
    }

    Ok(ParsedDoc {
        filename,
        size: file_size_str(path),
        paragraphs: lines_to_paragraphs(lines),
    })
}

/// Replace all case-insensitive occurrences of each `(original, placeholder)` pair in `line`.
/// Replacements must already be sorted longest-first to avoid partial-match shadowing.
fn replace_case_insensitive(mut line: String, replacements: &[(String, String)]) -> String {
    for (original, placeholder) in replacements {
        let lower_line = line.to_lowercase();
        let lower_orig = original.to_lowercase();
        let orig_len = original.len();
        if orig_len == 0 { continue; }
        let mut result = String::with_capacity(line.len());
        let mut i = 0;
        while i < line.len() {
            if let Some(pos) = lower_line[i..].find(lower_orig.as_str()) {
                let abs = i + pos;
                result.push_str(&line[i..abs]);
                result.push_str(placeholder);
                i = abs + orig_len;
            } else {
                result.push_str(&line[i..]);
                break;
            }
        }
        if !result.is_empty() { line = result; }
    }
    line
}

#[tauri::command]
pub async fn export_file(
    app: AppHandle,
    doc: Value,
    entities: Vec<Entity>,
    _format: String,
) -> Result<String, String> {
    let filename = doc["filename"]
        .as_str()
        .unwrap_or("output")
        .to_string();

    let paragraphs = doc["paragraphs"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|p| p["text"].as_str().map(|s| s.to_string()))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    // Build placeholder map (longest-first to prevent partial matches)
    let type_prefixes = [
        ("name",     "Name"),  ("phone",    "Phone"),  ("company",  "Org"),
        ("addr",     "Addr"),  ("id",       "ID"),     ("email",    "Email"),
        ("bank",     "Bank"),  ("ip",       "IP"),     ("hostname", "Host"),
        ("path",     "Path"),  ("key",      "Key"),    ("other",    "Other"),
    ];
    let prefix_map: std::collections::HashMap<&str, &str> = type_prefixes.iter().cloned().collect();

    let mut counter: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut replacements: Vec<(String, String)> = entities
        .iter()
        .map(|e| {
            let prefix = prefix_map.get(e.entity_type.as_str())
                .copied()
                .unwrap_or("Other");
            let prefix = e.custom_label.as_deref().unwrap_or(prefix);
            let n = counter.entry(prefix.to_string()).or_insert(0);
            *n += 1;
            let placeholder = format!("[{prefix}_{:02}]", n);
            (e.text.clone(), placeholder)
        })
        .collect();

    // Sort by text length descending to prevent partial matches
    replacements.sort_by(|a, b| b.0.len().cmp(&a.0.len()));

    let output: Vec<String> = paragraphs
        .into_iter()
        .map(|line| replace_case_insensitive(line, &replacements))
        .collect();

    let stem = std::path::Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let out_filename = format!("{stem}_redacted.txt");

    let out_path = app.path()
        .download_dir()
        .map(|d| d.join(&out_filename))
        .map_err(|e| e.to_string())?;

    tokio::fs::write(&out_path, output.join("\n"))
        .await
        .map_err(|e| e.to_string())?;

    Ok(out_path.to_string_lossy().to_string())
}

// ── Phase 3: Proxy control (stubs — implemented in Phase 3) ──────────────────

#[derive(Debug, Serialize)]
pub struct ProxyStatus {
    pub running: bool,
    pub intercepted_count: usize,
}

#[tauri::command]
pub async fn start_proxy(
    _domains: Vec<String>,
    _mappings: Vec<Value>,
) -> Result<ProxyStatus, String> {
    Err("代理功能将在阶段3实现".to_string())
}

#[tauri::command]
pub async fn stop_proxy() -> Result<(), String> {
    Err("代理功能将在阶段3实现".to_string())
}

#[tauri::command]
pub async fn get_proxy_status() -> Result<ProxyStatus, String> {
    Ok(ProxyStatus { running: false, intercepted_count: 0 })
}

// ── Phase 3: Certificate management (stubs) ───────────────────────────────────

#[derive(Debug, Serialize)]
pub struct CertStatus {
    pub installed: bool,
}

#[tauri::command]
pub async fn install_ca_cert() -> Result<CertStatus, String> {
    Err("证书管理将在阶段3实现".to_string())
}

#[tauri::command]
pub async fn get_cert_status() -> Result<CertStatus, String> {
    Ok(CertStatus { installed: false })
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::replace_case_insensitive;

    fn reps(pairs: &[(&str, &str)]) -> Vec<(String, String)> {
        pairs.iter().map(|(a, b)| (a.to_string(), b.to_string())).collect()
    }

    #[test]
    fn exact_match() {
        let r = replace_case_insensitive("Hello World".to_string(), &reps(&[("World", "[Name_01]")]));
        assert_eq!(r, "Hello [Name_01]");
    }

    #[test]
    fn uppercase_source() {
        let r = replace_case_insensitive(
            "ENTIIS PTE LTD hired us".to_string(),
            &reps(&[("entiis pte ltd", "[Org_01]")]),
        );
        assert_eq!(r, "[Org_01] hired us");
    }

    #[test]
    fn mixed_case_source() {
        let r = replace_case_insensitive(
            "Entiis Pte Ltd is great".to_string(),
            &reps(&[("entiis pte ltd", "[Org_01]")]),
        );
        assert_eq!(r, "[Org_01] is great");
    }

    #[test]
    fn multiple_occurrences() {
        let r = replace_case_insensitive(
            "alice and ALICE and Alice".to_string(),
            &reps(&[("alice", "[Name_01]")]),
        );
        assert_eq!(r, "[Name_01] and [Name_01] and [Name_01]");
    }

    #[test]
    fn longest_first_no_partial_shadowing() {
        let mut pairs = reps(&[("john", "[Name_01]"), ("john smith", "[Name_02]")]);
        pairs.sort_by(|a, b| b.0.len().cmp(&a.0.len()));
        let r = replace_case_insensitive("John Smith and John".to_string(), &pairs);
        assert_eq!(r, "[Name_02] and [Name_01]");
    }

    #[test]
    fn no_match_unchanged() {
        let r = replace_case_insensitive("nothing here".to_string(), &reps(&[("xyz", "[X_01]")]));
        assert_eq!(r, "nothing here");
    }

    #[test]
    fn parse_text_basic() {
        use std::io::Write;
        let mut f = tempfile::NamedTempFile::new().unwrap();
        writeln!(f, "Title Line").unwrap();
        writeln!(f, "Second paragraph").unwrap();
        let path = f.path().to_str().unwrap().to_string();
        let doc = super::parse_text_sync(&path, "test.txt".to_string()).unwrap();
        assert_eq!(doc.paragraphs.len(), 2);
        assert_eq!(doc.paragraphs[0].para_type, "h2");
        assert_eq!(doc.paragraphs[1].para_type, "p");
    }
}
