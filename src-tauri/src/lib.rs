use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindow,
};

#[derive(serde::Serialize)]
struct CursorRelPos {
    x: f64,
    y: f64,
    inside: bool,
}

// 1. Comando para activar/desactivar que los clics atraviesen la ventana
#[tauri::command]
fn set_ignore_cursor(window: WebviewWindow, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}

// 2. Comando para obtener la posición del mouse a nivel de SO
// (Necesario porque cuando ignore = true, el WebView deja de recibir mousemove)
#[tauri::command]
fn get_cursor_rel_pos(window: WebviewWindow) -> Result<CursorRelPos, String> {
    let cursor = window.cursor_position().map_err(|e| e.to_string())?;
    let win_pos = window.outer_position().map_err(|e| e.to_string())?;
    let win_size = window.outer_size().map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;

    // Convertimos de píxeles físicos (Retina) a píxeles lógicos del Canvas CSS
    let rel_x = (cursor.x - win_pos.x as f64) / scale;
    let rel_y = (cursor.y - win_pos.y as f64) / scale;
    let width = (win_size.width as f64) / scale;
    let height = (win_size.height as f64) / scale;

    let inside = rel_x >= 0.0 && rel_x < width && rel_y >= 0.0 && rel_y < height;

    Ok(CursorRelPos {
        x: rel_x,
        y: rel_y,
        inside,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                // 1. Iniciamos la app dejando pasar todos los clics por defecto
                let _ = main_window.set_ignore_cursor_events(true);

                // 2. Forzar siempre encima a nivel nativo de sistema operativo (NSFloatingWindowLevel)
                let _ = main_window.set_always_on_top(true);

                // 3. Visible en todos los escritorios virtuales (Spaces) y sobre otras apps
                let _ = main_window.set_visible_on_all_workspaces(true);
            }

            // 4. Configurar System Tray nativo en la barra de menú de macOS
            let item_ctrl = MenuItemBuilder::new("Abrir / Cerrar Controlador")
                .id("toggle_controller")
                .build(app)?;
            let item_roam = MenuItemBuilder::new("Alternar Modo Fijo / Libre")
                .id("toggle_roam")
                .build(app)?;
            let item_pomodoro = MenuItemBuilder::new("Iniciar Pomodoro (25m Foco)")
                .id("start_pomodoro")
                .build(app)?;
            let item_audio = MenuItemBuilder::new("Alternar Efectos de Audio")
                .id("toggle_audio")
                .build(app)?;
            let item_quit = MenuItemBuilder::new("Salir de MySkin")
                .id("quit")
                .build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&item_ctrl)
                .item(&item_roam)
                .item(&item_pomodoro)
                .item(&item_audio)
                .separator()
                .item(&item_quit)
                .build()?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    let id = event.id().as_ref();
                    if id == "quit" {
                        app.exit(0);
                    } else {
                        let _ = app.emit("tray-action", id);
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _ = tray_builder.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor,
            get_cursor_rel_pos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
