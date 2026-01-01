use chrono::prelude::*;
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_notification::NotificationExt;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct Zekr {
    id: String,
    text: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct AppData {
    azkar: Vec<Zekr>,
    interval_seconds: u64,
    daily_count: u64,
    last_reset_date: String,
    last_notification_time: u64,
    is_paused: bool,
    last_zekr_id: Option<String>,
}

impl Default for AppData {
    fn default() -> Self {
        Self {
            azkar: vec![
                Zekr {
                    id: "1".into(),
                    text: "سبحان الله".into(),
                },
                Zekr {
                    id: "2".into(),
                    text: "الحمد لله".into(),
                },
                Zekr {
                    id: "3".into(),
                    text: "الله أكبر".into(),
                },
                Zekr {
                    id: "4".into(),
                    text: "لا إله إلا الله".into(),
                },
                Zekr {
                    id: "5".into(),
                    text: "أستغفر الله".into(),
                },
                Zekr {
                    id: "6".into(),
                    text: "لا حول ولا قوة إلا بالله".into(),
                },
            ],
            interval_seconds: 60, // 1 minute default
            daily_count: 0,
            last_reset_date: Local::now().format("%Y-%m-%d").to_string(),
            last_notification_time: 0,
            is_paused: false,
            last_zekr_id: None,
        }
    }
}

struct AppState {
    data: Mutex<AppData>,
    file_path: std::path::PathBuf,
}

impl AppState {
    fn save(&self) {
        let data = self.data.lock().unwrap();
        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = fs::write(&self.file_path, json);
        }
    }
}

#[tauri::command]
fn get_data(state: State<AppState>) -> AppData {
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn add_zekr(state: State<AppState>, text: String) -> AppData {
    let mut data = state.data.lock().unwrap();
    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos()
        .to_string();
    data.azkar.push(Zekr { id, text });
    drop(data);
    state.save();
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn remove_zekr(state: State<AppState>, id: String) -> AppData {
    let mut data = state.data.lock().unwrap();
    data.azkar.retain(|z| z.id != id);
    drop(data);
    state.save();
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn update_zekr(state: State<AppState>, id: String, text: String) -> AppData {
    let mut data = state.data.lock().unwrap();
    if let Some(zekr) = data.azkar.iter_mut().find(|z| z.id == id) {
        zekr.text = text;
    }
    drop(data);
    state.save();
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn set_interval(state: State<AppState>, seconds: u64) -> AppData {
    let mut data = state.data.lock().unwrap();
    data.interval_seconds = seconds;
    drop(data);
    state.save();
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn toggle_pause(state: State<AppState>) -> AppData {
    let mut data = state.data.lock().unwrap();
    data.is_paused = !data.is_paused;
    drop(data);
    state.save();
    state.data.lock().unwrap().clone()
}

#[tauri::command]
fn get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    let manager = app.autolaunch();
    manager.is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    let manager = app.autolaunch();
    if enable {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_data_dir = app.path().app_data_dir().unwrap();
            fs::create_dir_all(&app_data_dir).unwrap();
            let file_path = app_data_dir.join("azkar_data.json");

            let mut initial_data = AppData::default();
            if file_path.exists() {
                if let Ok(content) = fs::read_to_string(&file_path) {
                    if let Ok(parsed) = serde_json::from_str(&content) {
                        initial_data = parsed;
                    }
                }
            }

            app.manage(AppState {
                data: Mutex::new(initial_data),
                file_path,
            });

            // System Tray Setup
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            std::thread::spawn(move || loop {
                thread::sleep(Duration::from_secs(1));
                let state = app_handle.state::<AppState>();

                let mut data = state.data.lock().unwrap();
                let now = Local::now();
                let today = now.format("%Y-%m-%d").to_string();

                if data.last_reset_date != today {
                    data.daily_count = 0;
                    data.last_reset_date = today;
                }

                if data.is_paused {
                    continue;
                }

                let current_ts = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                let interval_secs = data.interval_seconds;

                if current_ts >= data.last_notification_time + interval_secs
                    && !data.azkar.is_empty()
                {
                    let last_id = data.last_zekr_id.clone();
                    let available_azkar: Vec<_> = data
                        .azkar
                        .iter()
                        .filter(|z| Some(z.id.clone()) != last_id)
                        .cloned()
                        .collect();

                    let zekr_to_show = if available_azkar.is_empty() {
                        data.azkar.choose(&mut rand::thread_rng()).cloned()
                    } else {
                        available_azkar.choose(&mut rand::thread_rng()).cloned()
                    };

                    if let Some(zekr) = zekr_to_show {
                        let _ = app_handle.notification().builder().title(&zekr.text).show();

                        data.daily_count += 1;
                        data.last_notification_time = current_ts;
                        data.last_zekr_id = Some(zekr.id.clone());

                        drop(data);
                        state.save();
                        let _ = app_handle.emit("data-updated", ());
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_data,
            add_zekr,
            remove_zekr,
            update_zekr,
            set_interval,
            get_autostart,
            set_autostart,
            toggle_pause
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
