pub mod models;
pub mod security;
pub mod services;
pub mod commands;

use commands::AppState;
use commands::security::{scan_all_installed_skills, get_scan_results, scan_skill_archive};
use services::{Database, SkillManager};
use std::sync::Arc;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState};
use tokio::sync::Mutex;

const MAIN_WINDOW_LABEL: &str = "main";

fn handle_tray_event(tray: &tauri::tray::TrayIcon<tauri::Wry>, event: tauri::tray::TrayIconEvent) {
    if let tauri::tray::TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        log::debug!("托盘图标被点击");
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
            match window.is_visible() {
                Ok(true) => {
                    if let Err(e) = window.hide() {
                        log::warn!("隐藏窗口失败: {}", e);
                    }
                }
                Ok(false) => {
                    if let Err(e) = window.show() {
                        log::warn!("显示窗口失败: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        log::warn!("设置窗口焦点失败: {}", e);
                    }
                }
                Err(e) => {
                    log::error!("检查窗口可见性失败: {}", e);
                }
            }
        } else {
            log::error!("无法获取主窗口");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 获取应用数据目录
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");

            std::fs::create_dir_all(&app_dir)
                .expect("Failed to create app data directory");

            let db_path = app_dir.join("agent-skills.db");

            // 初始化数据库
            let db = Database::new(db_path)
                .expect("Failed to initialize database");

            let db = Arc::new(db);

            // 初始化 SkillManager
            let skill_manager = SkillManager::new(Arc::clone(&db));
            let skill_manager = Arc::new(Mutex::new(skill_manager));

            // 初始化 GitHub 服务
            let github = Arc::new(services::GitHubService::new());

            // 设置应用状态
            app.manage(AppState {
                db,
                skill_manager,
                github,
            });

            // 初始化系统托盘
            let icon = app.default_window_icon()
                .ok_or("无法获取默认窗口图标")?
                .clone();

            let tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Agent Skills Guard")
                .on_tray_icon_event(handle_tray_event)
                .build(app)?;

            // 存储托盘实例到 app state
            app.manage(tray);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_repository,
            commands::get_repositories,
            commands::delete_repository,
            commands::scan_repository,
            commands::get_skills,
            commands::get_installed_skills,
            commands::install_skill,
            commands::uninstall_skill,
            commands::delete_skill,
            commands::scan_local_skills,
            commands::clear_repository_cache,
            commands::refresh_repository_cache,
            commands::get_cache_stats,
            scan_all_installed_skills,
            get_scan_results,
            scan_skill_archive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
