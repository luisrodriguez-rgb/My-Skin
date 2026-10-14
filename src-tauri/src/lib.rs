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
                // 1. Iniciamos la app dejando pasar todos los clics por defecto
                let _ = main_window.set_ignore_cursor_events(true);

                // 2. Forzar siempre encima a nivel de API Tauri
                let _ = main_window.set_always_on_top(true);

                // 3. Visible en todos los escritorios virtuales (Spaces)
                let _ = main_window.set_visible_on_all_workspaces(true);

                // 4. Configuración nativa de macOS para flotar sobre todas las aplicaciones
                #[cfg(target_os = "macos")]
                {
                    use std::ffi::c_void;

                    #[link(name = "AppKit", kind = "framework")]
                    extern "C" {
                        fn sel_registerName(name: *const std::os::raw::c_char) -> *mut c_void;
                    }

                    // En macOS arm64/x86_64 podemos usar msgSend con transmute seguro
                    extern "C" {
                        fn objc_msgSend();
                    }

                    if let Ok(ns_win_ptr) = main_window.ns_window() {
                        unsafe {
                            let set_level_sel = sel_registerName(b"setLevel:\0".as_ptr() as *const _);
                            let set_collection_sel = sel_registerName(b"setCollectionBehavior:\0".as_ptr() as *const _);
                            let get_collection_sel = sel_registerName(b"collectionBehavior\0".as_ptr() as *const _);

                            // NSFloatingWindowLevel = 3, NSStatusWindowLevel = 25, NSPopUpMenuWindowLevel = 101
                            // Usamos 25 (NSStatusWindowLevel) para garantizar que flote sobre navegadores, IDEs y apps de pantalla completa
                            type SetLevelFn = unsafe extern "C" fn(*mut c_void, *mut c_void, isize);
                            let set_level: SetLevelFn = std::mem::transmute(objc_msgSend as *const ());
                            set_level(ns_win_ptr, set_level_sel, 25);

                            // NSWindowCollectionBehaviorCanJoinAllSpaces (1 << 0 = 1)
                            // NSWindowCollectionBehaviorFullScreenAuxiliary (1 << 8 = 256)
                            type GetCollectionFn = unsafe extern "C" fn(*mut c_void, *mut c_void) -> usize;
                            type SetCollectionFn = unsafe extern "C" fn(*mut c_void, *mut c_void, usize);
                            let get_collection: GetCollectionFn = std::mem::transmute(objc_msgSend as *const ());
                            let set_collection: SetCollectionFn = std::mem::transmute(objc_msgSend as *const ());

                            let current_behavior = get_collection(ns_win_ptr, get_collection_sel);
                            let new_behavior = current_behavior | 1 | 256;
                            set_collection(ns_win_ptr, set_collection_sel, new_behavior);
                        }
                    }
                }
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
