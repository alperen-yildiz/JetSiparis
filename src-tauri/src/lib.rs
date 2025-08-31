use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serialport::SerialPort;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

// Caller ID verisi için struct
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CallerIdData {
    phone_number: String,
    timestamp: String,
}

// Global durum değişkenleri
static COM_PORT_CONNECTION: Lazy<Mutex<Option<Box<dyn SerialPort + Send>>>> =
    Lazy::new(|| Mutex::new(None));
static IS_LISTENING: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));
static READ_BUFFER: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_com_ports() -> Result<Vec<String>, String> {
    match serialport::available_ports() {
        Ok(ports) => {
            let port_names: Vec<String> = ports.into_iter().map(|port| port.port_name).collect();
            Ok(port_names)
        }
        Err(e) => Err(format!("COM portları alınamadı: {}", e)),
    }
}

#[tauri::command]
fn connect_com_port(port_name: String) -> Result<String, String> {
    let mut connection = COM_PORT_CONNECTION.lock().unwrap();

    // Eğer zaten bağlantı varsa kapat
    if connection.is_some() {
        *connection = None;
    }

    match serialport::new(&port_name, 9600)
        .timeout(Duration::from_millis(200))
        .open()
    {
        Ok(mut port) => {
            // Caller ID açmayı dene (bazı cihazlarda gerekli)
            if let Err(e) = port.write_all(b"AT+VCID=1\r") {
                println!("AT+VCID=1 gönderilemedi (önemsiz): {}", e);
            } else {
                println!("AT+VCID=1 komutu gönderildi (desteklenmiyorsa görmezden gelinecek).");
            }

            *connection = Some(port);
            Ok(format!("{} portuna bağlandı", port_name))
        }
        Err(e) => Err(format!("Port bağlantısı başarısız: {}", e)),
    }
}

#[tauri::command]
fn disconnect_com_port() -> Result<String, String> {
    let mut connection = COM_PORT_CONNECTION.lock().unwrap();
    let mut listening = IS_LISTENING.lock().unwrap();

    *listening = false;
    *connection = None;

    let mut buffer = READ_BUFFER.lock().unwrap();
    buffer.clear();

    Ok("COM port bağlantısı kesildi".to_string())
}

#[tauri::command]
fn start_caller_id_listening(app_handle: AppHandle) -> Result<String, String> {
    let mut listening = IS_LISTENING.lock().unwrap();

    if *listening {
        return Err("Dinleme zaten aktif".to_string());
    }
    *listening = true;

    let app = app_handle.clone();

    thread::spawn(move || {
        let mut byte_buffer = [0u8; 1024];

        loop {
            {
                let listening_status = IS_LISTENING.lock().unwrap();
                if !*listening_status {
                    break;
                }
            }

            let read_result = {
                let mut connection = COM_PORT_CONNECTION.lock().unwrap();
                if let Some(ref mut port) = *connection {
                    port.read(&mut byte_buffer)
                } else {
                    Err(std::io::Error::new(
                        std::io::ErrorKind::NotConnected,
                        "Port bağlı değil",
                    ))
                }
            };

            match read_result {
                Ok(bytes_read) if bytes_read > 0 => {
                    let data = String::from_utf8_lossy(&byte_buffer[..bytes_read]);

                    {
                        let mut buffer = READ_BUFFER.lock().unwrap();
                        buffer.push_str(&data);

                        while let Some(line_end) = buffer.find('\n') {
                            let line = buffer[..line_end].trim().to_string();
                            buffer.drain(..=line_end);

                            if !line.is_empty() {
                                if let Some(phone_number) = parse_caller_id(&line) {
                                    let caller_data = CallerIdData {
                                        phone_number: phone_number.clone(),
                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                    };
                                    let _ = app.emit("caller-id-received", &caller_data);
                                    println!("Caller ID alındı: {}", phone_number);

                                    // Windows bildirimi gönder
                                    show_caller_notification(&app, &phone_number);
                                } else {
                                    println!("Bilinmeyen satır: {}", line);
                                }
                            }
                        }
                    }
                }
                Ok(_) => thread::sleep(Duration::from_millis(20)),
                Err(e) => match e.kind() {
                    std::io::ErrorKind::TimedOut => thread::sleep(Duration::from_millis(20)),
                    std::io::ErrorKind::NotConnected => {
                        let _ = app.emit("caller-id-error", "COM port bağlantısı yok".to_string());
                        thread::sleep(Duration::from_millis(500));
                    }
                    _ => {
                        let _ = app.emit("caller-id-error", format!("Veri okuma hatası: {}", e));
                        thread::sleep(Duration::from_millis(100));
                    }
                },
            }
        }

        println!("Caller ID dinleme durduruldu");
    });

    Ok("Caller ID dinleme başlatıldı".to_string())
}

#[tauri::command]
fn stop_caller_id_listening() -> Result<String, String> {
    let mut listening = IS_LISTENING.lock().unwrap();
    *listening = false;
    Ok("Caller ID dinleme durduruldu".to_string())
}

#[tauri::command]
fn get_listening_status() -> bool {
    let listening = IS_LISTENING.lock().unwrap();
    *listening
}

#[tauri::command]
fn get_connection_status() -> bool {
    let connection = COM_PORT_CONNECTION.lock().unwrap();
    connection.is_some()
}

// Windows bildirimi gönderen fonksiyon
fn show_caller_notification(app: &AppHandle, phone_number: &str) {
    let notification_result = app
        .notification()
        .builder()
        .title("Gelen Arama")
        .body(&format!(
            "Arayan: {} - Arayan Dashboard'u açmak için sistem tepsisini kullanın",
            phone_number
        ))
        .icon("icons/32x32.png")
        .show();

    if let Err(e) = notification_result {
        println!("Bildirim gönderilemedi: {}", e);
    }
}

// Sistem tepsisi menüsünü oluşturan fonksiyon
fn create_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let show_item = MenuItem::with_id(app, "show", "Uygulamayı Göster", true, None::<&str>)?;
    let arayan_item = MenuItem::with_id(app, "arayan", "Arayan Dashboard", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;

    Menu::with_items(app, &[&show_item, &arayan_item, &quit_item])
}

// Caller ID verisini parse eden fonksiyon
fn parse_caller_id(data: &str) -> Option<String> {
    let data_upper = data.to_uppercase();

    if let Some(start) = data_upper.find("NMBR=") {
        let number_part = &data[start + 5..];
        let digits: String = number_part
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect();
        if digits.len() >= 10 {
            return Some(digits);
        }
    }

    if let Some(start) = data_upper.find("NUMBER=") {
        let number_part = &data[start + 7..];
        let digits: String = number_part
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect();
        if digits.len() >= 10 {
            return Some(digits);
        }
    }

    let digits_only: String = data.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits_only.len() >= 10 && digits_only.len() <= 15 {
        return Some(digits_only);
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_version,
            get_com_ports,
            connect_com_port,
            disconnect_com_port,
            start_caller_id_listening,
            stop_caller_id_listening,
            get_listening_status,
            get_connection_status
        ])
        .setup(|app| {
            // Sistem tepsisi menüsünü oluştur
            let menu = create_tray_menu(&app.handle())?;

            // Sistem tepsisi ikonunu oluştur
            let _tray = TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("JetSiparış - Arka planda çalışıyor")
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "arayan" => {
                            // arayanDashboard.html dosyasını aç - dinamik yol kullanarak
                            match app.path().app_local_data_dir() {
                                Ok(app_dir) => {
                                    // Uygulamanın bulunduğu dizinin parent'ını al ve src klasörüne git
                                    let mut arayan_path = app_dir;
                                    arayan_path.pop(); // app_local_data_dir'den çık
                                    arayan_path.pop(); // bir üst dizine çık
                                    arayan_path.push("src");
                                    arayan_path.push("arayanDashboard.html");

                                    if arayan_path.exists() {
                                        if let Err(e) = app.opener().open_url(
                                            arayan_path.to_string_lossy().as_ref(),
                                            None::<String>,
                                        ) {
                                            println!("Arayan Dashboard açılamadı: {}", e);
                                        }
                                    } else {
                                        // Alternatif yol: resource dizininden relative path
                                        if let Ok(resource_dir) = app.path().resource_dir() {
                                            let mut alt_path = resource_dir;
                                            alt_path.push("..");
                                            alt_path.push("src");
                                            alt_path.push("arayanDashboard.html");

                                            if let Ok(canonical_path) = alt_path.canonicalize() {
                                                if let Err(e) = app.opener().open_url(
                                                    canonical_path.to_string_lossy().as_ref(),
                                                    None::<String>,
                                                ) {
                                                    println!("Arayan Dashboard açılamadı: {}", e);
                                                }
                                            } else {
                                                println!("Arayan Dashboard dosyası bulunamadı");
                                            }
                                        } else {
                                            println!("Resource dizini alınamadı");
                                        }
                                    }
                                }
                                Err(e) => {
                                    println!("Uygulama dizini alınamadı: {}", e);
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        if let Some(app) = tray.app_handle().get_webview_window("main") {
                            let _ = app.show();
                            let _ = app.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Bildirim tıklama olayları on_action ile işleniyor

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
