mod commands;
mod models;
mod utils;

#[cfg(test)]
#[path = "e2e_smoke.rs"]
mod e2e_smoke;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::edit_file,
            commands::fs::list_directory,
            commands::fs::create_directory,
            commands::fs::delete_path,
            commands::fs::move_path,
            commands::fs::file_info,
            commands::search::glob_search,
            commands::search::grep_search,
            commands::shell::execute_command,
            commands::shell::execute_command_streaming,
            commands::shell::kill_process,
            commands::process_pipe::piped_spawn,
            commands::process_pipe::piped_write_frame,
            commands::process_pipe::piped_kill,
            commands::system::get_system_info,
            commands::system::open_folder,
            commands::system::launch_cloudflare_one,
            commands::screenshot::take_screenshot,
            commands::http::probe_api,
            commands::http::llm_http,
            commands::http::http_get_text,
            commands::http::llm_chat_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
