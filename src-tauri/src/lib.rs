// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Uygulama versiyon bilgisini döndüren command
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// COM portlarını listeleyen command
#[tauri::command]
fn get_com_ports() -> Result<Vec<String>, String> {
    match serialport::available_ports() {
        Ok(ports) => {
            let port_names: Vec<String> = ports
                .into_iter()
                .map(|port| port.port_name)
                .collect();
            Ok(port_names)
        }
        Err(e) => Err(format!("COM portları alınamadı: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_app_version, get_com_ports])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
