use std::path::PathBuf;
use serde_json::Value;
use tauri::Manager;

pub fn mappings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("mappings.json"))
        .map_err(|e| e.to_string())
}

pub async fn load(app: &tauri::AppHandle) -> Result<Vec<Value>, String> {
    let path = mappings_path(app)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let contents = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

pub async fn save(app: &tauri::AppHandle, mappings: &[Value]) -> Result<(), String> {
    let path = mappings_path(app)?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(mappings).map_err(|e| e.to_string())?;
    tokio::fs::write(&path, json)
        .await
        .map_err(|e| e.to_string())
}
