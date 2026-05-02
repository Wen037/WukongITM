mod commands;
mod storage;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_mappings,
            commands::save_mappings,
            commands::parse_file,
            commands::export_file,
            commands::start_proxy,
            commands::stop_proxy,
            commands::get_proxy_status,
            commands::install_ca_cert,
            commands::get_cert_status,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Phase 3: restore system proxy settings on exit
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
