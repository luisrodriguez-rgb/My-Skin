use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
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

// 3. Comando para abrir o cerrar la ventana independiente del controlador
#[tauri::command]
fn toggle_controller_window(app: tauri::AppHandle, visible: Option<bool>) -> Result<(), String> {
    let window = app.get_webview_window("controller").ok_or("No existe la ventana del controlador")?;
    let show = match visible {
        Some(value) => value,
        None => !window.is_visible().map_err(|error| error.to_string())?,
    };
    if show {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    } else {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "controller" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
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

            let skin_spartan = MenuItemBuilder::new("01. Leónidas (Espartano)").id("skin_spartan").build(app)?;
            let skin_spiderman = MenuItemBuilder::new("02. Spider-Hero (Trepamuros)").id("skin_spiderman").build(app)?;
            let skin_dev_avatar = MenuItemBuilder::new("03. Mi Avatar Pixelado").id("skin_dev-avatar").build(app)?;
            let skin_ghost_dev = MenuItemBuilder::new("04. El Dev Fantasma").id("skin_ghost-dev").build(app)?;
            let skin_football_10 = MenuItemBuilder::new("05. El Futbolista 10").id("skin_football-10").build(app)?;
            let skin_capybara = MenuItemBuilder::new("06. Capibara Chill").id("skin_capybara").build(app)?;
            let skin_cyber_ninja = MenuItemBuilder::new("07. Cyber Ninja").id("skin_cyber-ninja").build(app)?;
            let skin_fantasy_wizard = MenuItemBuilder::new("08. Mago de Fantasía").id("skin_fantasy-wizard").build(app)?;
            let skin_game_slime = MenuItemBuilder::new("09. Slime de Videojuego").id("skin_game-slime").build(app)?;
            let skin_astro_lost = MenuItemBuilder::new("10. Astronauta Perdido").id("skin_astro-lost").build(app)?;

            let skins_submenu = SubmenuBuilder::new(app, "Personajes")
                .item(&skin_spartan)
                .item(&skin_spiderman)
                .item(&skin_dev_avatar)
                .item(&skin_ghost_dev)
                .separator()
                .item(&skin_football_10)
                .item(&skin_capybara)
                .item(&skin_cyber_ninja)
                .separator()
                .item(&skin_fantasy_wizard)
                .item(&skin_game_slime)
                .item(&skin_astro_lost)
                .build()?;

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
                .item(&skins_submenu)
                .separator()
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
                    } else if id == "toggle_controller" {
                        if let Some(ctrl_win) = app.get_webview_window("controller") {
                            if ctrl_win.is_visible().unwrap_or(false) {
                                let _ = ctrl_win.hide();
                            } else {
                                let _ = ctrl_win.show();
                                let _ = ctrl_win.set_focus();
                            }
                        }
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
            get_cursor_rel_pos,
            toggle_controller_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
