use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::io::{Read, Write};
use serialport::SerialPort;
use tauri::{AppHandle, Manager, Emitter};
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;

// Caller ID verisi için struct
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CallerIdData {
    phone_number: String,
    timestamp: String,
}

// Global durum değişkenleri
static COM_PORT_CONNECTION: Lazy<Mutex<Option<Box<dyn SerialPort + Send>>>> = Lazy::new(|| Mutex::new(None));
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
        Err(e) => Err(format!("COM portları alınamadı: {}", e))
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
        .open() {
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
        Err(e) => Err(format!("Port bağlantısı başarısız: {}", e))
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
                    Err(std::io::Error::new(std::io::ErrorKind::NotConnected, "Port bağlı değil"))
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
                }
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

// Caller ID verisini parse eden fonksiyon
fn parse_caller_id(data: &str) -> Option<String> {
    let data_upper = data.to_uppercase();

    if let Some(start) = data_upper.find("NMBR=") {
        let number_part = &data[start + 5..];
        let digits: String = number_part.chars().take_while(|c| c.is_ascii_digit()).collect();
        if digits.len() >= 10 {
            return Some(digits);
        }
    }

    if let Some(start) = data_upper.find("NUMBER=") {
        let number_part = &data[start + 7..];
        let digits: String = number_part.chars().take_while(|c| c.is_ascii_digit()).collect();
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
        .plugin(tauri_plugin_opener::init())
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
