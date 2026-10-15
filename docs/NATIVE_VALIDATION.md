# Matriz de validación nativa

Estado: pendiente de ejecución en equipos de escritorio. Esta tarea en Linux no
acredita el comportamiento de Tauri en macOS o Windows.

## Preparación

Instalar Node indicado en `.node-version`, pnpm indicado en `package.json`, Rust
estable y los prerrequisitos oficiales de Tauri para la plataforma. Usar el
checkout existente; no crear worktrees para tareas de configuración.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run build
cargo check --locked --manifest-path src-tauri/Cargo.toml
pnpm tauri dev
```

CI ejecutará cargo check para macOS ARM, macOS Intel y Windows en pull requests.
Eso comprueba compilación y configuración, no las interacciones de ventanas.

## Casos que deben registrarse por plataforma

| Caso | Comportamiento esperado | Resultado |
| --- | --- | --- |
| Inicio limpio | Sprite visible, sin alertas académicas ficticias | Pendiente |
| Área transparente | Los clics llegan a la aplicación inferior | Pendiente |
| Área sólida y globo | El personaje y el globo reciben clics | Pendiente |
| Arrastre | Sigue al cursor y termina sin quedarse bloqueado | Pendiente |
| Escalado 100/150/200 % | Posición e interacción coinciden con el dibujo | Pendiente |
| Varios monitores | Sin saltos de escala ni ventanas inaccesibles | Pendiente |
| Escritorios virtuales | Comportamiento de superposición consistente | Pendiente |
| Controlador | Abre, oculta y reabre; Escape sólo lo oculta | Pendiente |
| Menú nativo | Skin, pin, audio y Pomodoro actualizan el panel | Pendiente |
| Pomodoro | Pausa/reanuda; reapertura conserva estado; suspensión corrige reloj | Pendiente |
| Calendario real | Descarga, zona horaria, urgencia y errores correctos | Pendiente |
| Entregas | Completar localmente, persistir al resincronizar y abrir HTTP(S) en el navegador del sistema; error visible si falla | Pendiente |
| Prioridad de avisos | Dos entregas urgentes mantienen su orden ante merge y fin de Pomodoro; descartar avanza al siguiente aviso | Pendiente |
| Desconexión y rate limit | No bloquea interfaz ni borra tareas | Pendiente |
| Instalador | Instalación, arranque y desinstalación en equipo limpio | Pendiente |

Adjuntar OS y versión, arquitectura, escala, commit, pasos, resultado y evidencia.
No usar tokens ni feeds privados en capturas o registros compartidos.

## Medición de recursos

Medir una compilación release con las mismas condiciones: reposo anclado,
animación libre, controlador abierto, calendario sincronizando y recuperación
tras suspensión. Registrar duración, CPU promedio/picos, memoria del conjunto de
procesos WebView y aplicación, y herramienta utilizada. Comparar con una línea
base del mismo equipo. No extrapolar cifras entre plataformas.

## Requisitos para distribución

Definir identidad y credenciales de firma en el almacén de secretos de CI; probar
notarización macOS y firma Windows según la política de distribución elegida.
No introducir claves en el repositorio. El workflow de releases existente no
acredita por sí solo firma, notarización ni validación del instalador.
