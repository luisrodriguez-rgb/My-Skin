# Auditoria Tecnica, Estado de Evolucion y Roadmap Estrategico

> Proyecto: MySkin - Desktop Companion  
> Version analizada: v0.1.0  
> Stack: Tauri v2 (Rust 1.99), TypeScript, Vite, HTML5 Canvas, macOS WKWebView  
> Fecha de elaboracion: Octubre 2026  

---

## 1. Resumen Ejecutivo

MySkin fue concebido como un laboratorio de ingenieria personal para explorar desarrollo de escritorio nativo de bajo consumo, interactividad grafica a 60 FPS mediante sprites en pixel art, y un canal de asistencia visual en tiempo real para la gestion academica del semestre y la actividad de desarrollo de software (GitHub).

Este documento presenta una auditoria critica exhaustiva de la discrepancia entre la vision inicial y el estado actual, examina los aciertos de diseno y la deuda tecnica acumulada, y establece una hoja de ruta estructurada en fases para transformar el prototipo actual en un producto de escritorio robusto, desacoplado y conectado a fuentes de datos reales.

---

## 2. Matriz Comparativa: Vision Inicial vs. Estado Actual

| Dimension | Vision Inicial Planteada | Estado Actual Implementado | Brecha / Diagnostico |
| :--- | :--- | :--- | :--- |
| **Arquitectura de Ejecucion** | Proceso de escritorio ultraligero que flote sobre las ventanas sin consumir recursos perceptibles. | Tauri v2 con WKWebView nativo, consumo en reposo inferior a 15 MB de RAM y uso de CPU cercano al 0%. | **Cumplido al 100%.** Se evito la sobrecarga de Electron mediante la API nativa de Tauri. |
| **Interactividad y Click-Through** | La ventana debe permitir operar aplicaciones de fondo (IDE, navegador) sin que el espacio transparente bloquee clics. | Sistema de Hit-Testing nativo por canal Alfa en Canvas con alternancia dinamica de `set_ignore_cursor_events`. | **Cumplido al 95%.** Funciona fluidamente; requiere optimizar el sondeo IPC periodico. |
| **Manejo de Ventana y Arrastre** | Arrastre natural 1:1 con el cursor del mouse, adaptado a monitores de alta densidad (Retina) y bordes seguros. | Normalizacion a `LogicalPosition` en Tauri, captura de puntero HTML5, auto-elevacion para evitar recortes y limites de menu bar. | **Cumplido al 100%.** Se erradico la friccion de desfase por factor de escala 2.0x. |
| **Estetica e Identidad Visual** | Figuras sencillas en pixel art con siluetas claras y panel de control minimalista y sobrio, alejado de esteticas infantiles. | Motor de skins modulares por `manifest.json`, personajes espartano y Spider-Man calibrados a 60 FPS, controlador estilo terminal oscura. | **Cumplido al 90%.** Excelente coherencia visual; faltan variaciones de animacion en reposo. |
| **Comportamiento (Roaming)** | Alternancia entre patrulla autonoma sobre el Dock y modo anclado para concentracion. | FSM de patrulla horizontal con rebote, deteccion de limites de pantalla y modo anclado con doble clic. | **Cumplido al 75%.** Comportamiento lineal basico; carece de rutinas contextuales complejas (siestas, descansos). |
| **Integracion con el Semestre** | Notificaciones en vivo de entregas, parciales y tareas de la web academica del usuario. | Interfaz visual del globo de notificaciones con hit-testing integrado; activacion mediante funciones mock en consola. | **Pendiente (20%).** Falta la capa de transporte de red (WebSocket / SSE) para consumir datos reales. |
| **Integracion con GitHub** | Reacciones graficas a eventos de commits, PRs y fallos de pipelines de integracion continua. | Animacion de victoria y globos de alerta parametrizables; invocables manualmente. | **Pendiente (20%).** Requiere cliente de polling a la API de GitHub o listener de webhooks local. |

---

## 3. Auditoria Critica de Arquitectura y Deuda Tecnica

### 3.1. Aciertos de Ingenieria

1. **Eficiencia de Recursos mediante Tauri v2:**  
   La eleccion de Rust y la API de ventanas de Tauri permitio reducir el consumo en dos ordenes de magnitud frente a proyectos basados en Chromium empaquetado.

2. **Hit-Testing por Buffer de Píxeles en Tiempo Real:**  
   La lectura O(1) de `ctx.getImageData(x, y, 1, 1).data[3]` permite que el sistema operativo sepa con precision milimetrica si el cursor apunta a la lanza del espartano o al escritorio de fondo. Esto garantiza transparencia interactiva real.

3. **Arquitectura Modular de Skins:**  
   El motor `skinEngine.ts` desacopla completamente los metadatos graficos del codigo fuente. Cualquier personaje nuevo se integra depositando un directorio en `public/skins/` con su respectivo `manifest.json` y `spritesheet.png`, sin requerir recompilacion.

4. **Correccion de Desfase en Pantallas Retina:**  
   La transicion de `PhysicalPosition` a `LogicalPosition` en la manipulacion de ventanas soluciono de raiz el problema de arrastre lento en monitores macOS de densidad x2.

---

### 3.2. Fricciones y Limitaciones Criticas

#### A. Monolito de Ventana Unica (Acoplamiento de Canvas y Controlador)
* **Problema:** El personaje pixelado y el panel de control (`debugPanel`) coexisten dentro del mismo contenedor `WebviewWindow` de Tauri.
* **Impacto:** Para mostrar el panel de control, la ventana debe redimensionarse dinamicamente de 240px a 580px de altura. Si el personaje se encuentra cerca del borde inferior de la pantalla (zona comun sobre el Dock), el panel se desborda fuera de la pantalla. Aunque se introdujo la funcion de auto-elevacion `shiftWindowUpForController`, redimensionar una ventana transparente en caliente puede generar parpadeos en controladores graficos antiguos.
* **Resolucion recomendada:** Desacoplar la arquitectura en **dos ventanas nativas**:
  - `pet-overlay`: Ventana transparente, sin bordes, siempre visible, tamano fijo (240x240 px), enfocada exclusivamente en el renderizado del sprite.
  - `pet-controller`: Ventana estandar flotante o menu desplegable en la barra de menus (macOS Menu Bar / System Tray), abierta unicamente cuando el usuario requiere configurar parametros.

#### B. Sobrecarga de Sondeo IPC (`get_cursor_rel_pos`)
* **Problema:** Cuando la ventana tiene activado `set_ignore_cursor_events(true)`, el motor WebKit de macOS no emite eventos `mousemove`. Para saber si el cursor entra a la silueta del personaje, se ejecuta un sondeo IPC (`invoke`) cada 50 milisegundos hacia Rust.
* **Impacto:** Aunque 20 llamadas por segundo representan una carga minima, sigue siendo un bucle de consulta activo en el bus IPC.
* **Resolucion recomendada:** Utilizar un hook nativo global de raton en Rust (a traves del subsistema `rdev` o un `CGEventTap` en macOS) que notifique unicamente transiciones de entrada y salida (*bounding box crossing*), eliminando el sondeo continuo desde JavaScript.

#### C. Ausencia de Capa de Transporte de Datos
* **Problema:** Toda la logica de notificaciones actual se basa en disparadores manuales (`window.testAlert()`).
* **Impacto:** El producto actual se comporta como un juguete interactivo pero todavia no cumple su proposito central: ser un monitor pasivo del progreso academico y de desarrollo.
* **Resolucion recomendada:** Implementar un cliente WebSocket / Server-Sent Events (SSE) en el backend de Rust o en el frontend de TypeScript que mantenga una conexion persistente con la API de la aplicacion universitaria del usuario.

---

## 4. Hoja de Ruta Estratégica (Roadmap)

### Fase 1: Desacoplamiento Arquitectonico y Experiencia de Entrada (v0.2.0)
*Objetivo: Lograr estabilidad absoluta en el manejo de ventanas y pulir la interaccion del usuario.*

1. **Arquitectura Multi-Ventana en Tauri:**
   - Mantener la ventana principal exclusivamente para el sprite transparente (tamano estatico 240x240 px).
   - Crear una segunda ventana nativa para el panel de ajustes o convertir el controlador en un icono interactivo en la barra de menus de macOS (Menu Bar / System Tray) utilizando `tauri-plugin-tray`.
2. **Optimizacion del Motor de Eventos:**
   - Implementar un filtro de proximidad rectangular antes de solicitar lectura de canal alfa a nivel de SO.
3. **Ampliacion de Estados de Animacion (FSM):**
   - Incorporar estados de reposo extendido: `STUDY` (el personaje lee o se sienta cuando hay actividad sostenida de teclado), `SLEEP` (inactividad prolongada del usuario) y `ALERT` (atencion a eventos criticos).
4. **Soporte de Efectos de Sonido Opcionales (Audio FX):**
   - Efectos sutiles en 8-bits sintetizados via Web Audio API (pasos, campana discreta de alerta, celebracion).

---

### Fase 2: Integracion con Plataforma Universitaria y GitHub (v0.3.0)
*Objetivo: Dotar al companero de utilidad practica conectandolo a las fuentes de datos del estudiante.*

1. **Cliente de Sincronizacion Universitaria:**
   - Conexion via WebSocket o SSE hacia el backend de gestion del semestre.
   - Procesamiento de eventos en tiempo real:
     - Recordatorio de inicio de clase (15 minutos antes).
     - Proximidad de entrega de proyectos o parciales (24h, 6h, 1h).
     - Registro de notas y retroalimentacion.
2. **Monitor Ligero de GitHub:**
   - Polling inteligente a la API GraphQL de GitHub con intervalo dinamico (configurable entre 2 y 10 minutos).
   - Eventos soportados:
     - Pull Request aprobada o mezclada (desencadena estado `WIN`).
     - Fallo en pipeline de CI/CD (desencadena estado de preocupacion / alerta).
     - Recordatorio de racha de commits diarios.
3. **Persistencia Local de Preferencias:**
   - Guardado de configuracion (skin activa, modo fijo/libre, volumen de audio, tokens de API) mediante `tauri-plugin-store`.

---

### Fase 3: Inteligencia Contextual y Personalidad (v0.4.0)
*Objetivo: Dotar al companero de dinamismo organico y mensajes personalizados segun el contexto.*

1. **Adaptacion al Contexto de Trabajo:**
   - Deteccion de modo concentracion (cuando el usuario tiene el IDE o procesador de texto en pantalla completa).
   - Auto-anclaje silencioso durante sesiones de estudio prolongadas (tecnica Pomodoro: 25 minutos quieto, 5 minutos de caminata y estiramiento sugerido).
2. **Generador de Dialogos Breves:**
   - Formateo de los mensajes de las alertas segun el campo `personalityPrompt` del skin activo.
   - Respuestas generadas localmente o mediante llamada ultrarrapida a API de modelos compactos para variar las frases de felicitacion y animo.

---

### Fase 4: Distribucion, Empaquetado y Ecosistema (v1.0.0)
*Objetivo: Convertir el proyecto en una aplicacion instalable, actualizable y abierta a la comunidad.*

1. **Pipeline de Integracion y Despliegue Continuo (CI/CD):**
   - GitHub Actions para compilar automaticamente paquetes `.dmg` firmados para macOS (Apple Silicon y x86_64) e instaladores `.msi` para Windows.
2. **Auto-actualizacion Nativa:**
   - Configuracion de `tauri-plugin-updater` para distribuir nuevas versiones de forma transparente.
3. **Instalador de Paquetes de Skins (.skin / .zip):**
   - Posibilidad de arrastrar un archivo comprimido sobre la aplicacion para importar automaticamente nuevos personajes a `public/skins/`.
