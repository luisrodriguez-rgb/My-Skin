use tauri::{Manager, WebviewWindow};

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
                // Iniciamos la app dejando pasar todos los clics por defecto
                let _ = main_window.set_ignore_cursor_events(true);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor,
            get_cursor_rel_pos
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
