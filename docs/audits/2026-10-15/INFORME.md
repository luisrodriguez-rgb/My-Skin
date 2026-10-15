# MySkin: auditoría de producto, funcionalidades, IU y UX

**Fecha:** 15 de octubre de 2026. **Versión analizada:** `ec6e908`, rama
`feat/estabilizacion-myskin`, [PR #1](https://github.com/luisrodriguez-rgb/My-Skin/pull/1).

## Diagnóstico ejecutivo

MySkin dispone de un motor de personajes modular, un Pomodoro operativo y servicios
para calendarios y GitHub. Su principal oportunidad está en convertir esas piezas
en un circuito de trabajo visible: elegir una tarea, concentrarse, recibir un aviso
correcto y registrar el avance. Actualmente el panel organiza buena parte de la
experiencia alrededor de estados de animación y simuladores.

La estética pixel art aporta una identidad reconocible. Para hacerla más atractiva
conviene aumentar el protagonismo del personaje y vincular sus reacciones con lo que
el usuario está haciendo. La utilidad diaria debe resultar evidente desde el primer
minuto y seguir disponible sin configurar servicios externos.

**Público inicial propuesto:** estudiantes universitarios que también programan.
Es una hipótesis de enfoque, basada en las integraciones existentes; debe contrastarse
con usuarios. La promesa sugerida es: **«Tu compañero de escritorio para estudiar con
foco y llegar a tiempo».** GitHub encaja como conexión opcional para ese segmento.

## Alcance y evidencia

- Revisión de HTML, estilos, controlador, servicios, estados y configuración Tauri.
- Uso de la habilidad Codebase Memory: consulta de proyectos, estado del índice,
  búsqueda de funciones y cobertura de los diez archivos relevantes y del ámbito
  `src`. Los resultados se contrastaron con el código fuente.
- Recorridos en Chromium con ventanas separadas de personaje y controlador.
- Pruebas de inicio, foco, celebración, sincronización de dos entregas, error de URL
  vacía, fallo de carga de skin y dos avisos urgentes consecutivos.
- Capturas a 560 × 620, 390 × 700 y una comprobación adicional a 280 px. También se
  hizo una simulación de zoom CSS al 200 %, que no sustituye una prueba completa
  de zoom y accesibilidad en escritorio.
- Auditoría automática con axe sobre el controlador y sobre la propuesta visual.
- Datos de calendario, tareas y respuestas de GitHub controlados, sin cuentas reales.

Esta revisión es una evaluación experta apoyada en comprobaciones. **No es un estudio
con usuarios ni una demostración de encaje comercial.** No se realizó una sesión
visual de Tauri en macOS o Windows ni una medición de RAM, CPU o energía.

## Estado técnico confirmado

Las cuatro comprobaciones remotas del PR finalizaron correctamente:

| Comprobación | Resultado | Qué demuestra |
| --- | --- | --- |
| Web | Correcta | El pipeline de pruebas y build web pasa en CI |
| macOS ARM | Correcta | `cargo check` del target nativo pasa |
| macOS Intel | Correcta | `cargo check` del target nativo pasa |
| Windows | Correcta | `cargo check` del target nativo pasa |

[Ver la ejecución de CI](https://github.com/luisrodriguez-rgb/My-Skin/actions/runs/38772828950).
El proyecto cuenta con 24 pruebas unitarias y 5 E2E en el commit revisado. La
comprobación nativa de compilación no valida arrastre, menú, transparencia, escalado,
instalación o firma. En el recorrido adicional del controlador no aparecieron errores
JavaScript de página. El contexto de audio del navegador sí alcanzó el estado
`running`; no se considera un fallo de audio en esta auditoría.

## Funcionalidades: valor y carencias de experiencia

| Funcionalidad | Base actual | Mejora de mayor utilidad |
| --- | --- | --- |
| Compañero animado | Diez skins y estados visuales | Galería con previews, tono propio y reacciones a acciones reales |
| Pomodoro | Iniciar, pausar, continuar y reiniciar | Asociar una tarea, recordar sesión y ofrecer duraciones elegibles |
| Calendario | Importación, cantidad de eventos y alertas | Mostrar tareas, vencimientos, origen y acciones de abrir/completar |
| GitHub | Monitor y celebración | Elegir repositorio desde IU y mostrar estado de conexión |
| Avisos | Globo Canvas y sonidos | Prioridades, cola, historial y posposición |
| Preferencias | Audio binario y modo fijo/libre | Volumen, silencio temporal, reducir movimiento y ocultar compañero |
| Persistencia | Preferencias y entregas | Continuidad del foco y resumen local del progreso |
| Primer uso | Personaje y controlador accesible por interacción | Introducción breve, pistas de uso y primer foco sin cuentas |

## Hallazgos reproducidos y prioridades

P1 indica que la corrección mejora directamente la fiabilidad de la información,
la utilidad principal o la accesibilidad. P2 identifica mejoras relevantes de
claridad, descubrimiento y personalización.

### P1. El calendario no permite gestionar lo que se importó

Se sincronizaron dos tareas con títulos y cursos distintos. El panel mostró
`2 entregas · Sincronizado ahora`, pero no mostró ninguno de los títulos. Tampoco
ofrece acciones para abrirlas o marcarlas como completadas. El servicio ya dispone
de `getDeadlines()` y `markCompleted()`, pero `AppState` sólo publica metadatos del
calendario y un contador.

**Impacto:** el usuario debe ir a otra aplicación para entender qué merece su
atención, incluso después de conectar su calendario.

**Acción:** una lista «Lo próximo» con título, curso, fecha/hora, tiempo restante y
acciones. Priorizar las siguientes entregas, separar vencidas y completadas y
permitir una tarea manual. «Abrir» necesita un enlace válido; si el origen no lo
proporciona, ofrecer el detalle en lugar de un botón que no conduce a ninguna parte.

Fuentes: [AppState](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/appState.ts),
[publicación del estado](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/main.ts#L632),
[servicio académico](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/syncService.ts).

### P1. Los avisos pueden reemplazarse antes de leerse

Dos tareas urgentes dispararon callbacks consecutivos y escribieron sobre el mismo
globo. Una celebración de GitHub sustituyó después una alerta académica de 15 minutos.
El estado actual no incorpora una cola ni una política de prioridad de avisos.

**Impacto:** una entrega urgente puede dejar de estar visible; el historial de
notificaciones deduplicadas puede impedir que vuelva a aparecer durante la sesión.

**Acción:** política explícita, por ejemplo interacción manual > entrega inminente >
fin de sesión > actividad GitHub > diálogo ambiental. La política debe poder ajustarse
según pruebas; no es una regla ya implementada. Conservar avisos pendientes, permitir
verlos en el panel y recuperar el contexto del Pomodoro al terminar una celebración.

Fuentes: [setPetState](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/main.ts#L140),
[consumidores de servicios](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/main.ts#L559),
[comprobación de entregas](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/syncService.ts#L222).

### P1. El texto de personalidad contradice los datos

Se observó un título `ENTREGA: 15M` junto al diálogo `¡A las armas! Tienes 1 hora...`.
El diálogo del skin reemplaza el título de la tarea y se corta a 36 caracteres.

**Impacto:** pierde precisión y obliga a interpretar un aviso sin saber qué entregar.

**Acción:** plantillas basadas en datos: «Bases de datos · Informe de índices · 15 min».
La personalidad puede añadir una frase breve de apoyo. El panel debe conservar el
contenido completo y el enlace. Esto puede resolverse localmente, sin añadir un
modelo de lenguaje ni servicios nuevos.

Fuente: [alerta académica](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/main.ts#L560).

### P1. Contraste y legibilidad insuficientes

Axe detectó **un tipo de infracción de contraste en 14 elementos**, no 14 tipos de
infracción. Ejemplos medidos:

- Texto secundario `#62728b` sobre `#181d29`: aproximadamente **3,44:1**.
- Texto blanco sobre el coral de los botones principales: aproximadamente **3:1**.
- El texto pequeño necesita al menos 4,5:1 en estos casos para WCAG AA.
- Controles de audio y modo: **18 px** de alto, con tipografía de **7 px**.
- Botones de Pomodoro: **22 px** de alto, texto de **9 px**.

**Acción:** mantener la paleta, ajustar contraste y usar texto normal de 14–16 px,
etiquetas de 12 px y controles de aproximadamente 40–44 px para uso cómodo. Reservar
la fuente pixel para identidad y acentos. La altura por sí sola no acredita un fallo
WCAG de tamaño de objetivo: existen excepciones por separación y deben revisarse.

Los avisos se dibujan en Canvas sin equivalente de texto vivo en el DOM. Añadir una
alternativa accesible y comprobar teclado y lector de pantalla. No anunciar cada
fotograma ni cada segundo del reloj.

Fuentes: [estilos](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/styles.css),
[datos y resultados de axe](evidence.json).

### P1. Un error desaparece antes de poder resolverlo

Tras pulsar sincronizar con URL vacía, aparece `Ingresa una URL de calendario.`.
A los pocos segundos, la siguiente actualización del estado lo reemplaza por
`0 entregas · Sin sincronizar`. Al simular un error 404 del skin, la selección vuelve
al personaje anterior sin explicación visible en el panel.

**Acción:** separar errores locales del formulario, estado de conexión y resultado
de la última operación. Mantener el error hasta editar/reintentar o resolverlo.
Mostrar el fallo de skin con reintento y conservar el personaje anterior.

Fuente: [render y validación del formulario](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/controller.ts#L53).

### P2. Dos acciones distintas parecen iniciar concentración

Pulsar `FOCUS` produce `Estado: FOCUS`, pero el Pomodoro sigue `En reposo`. Después
de iniciar un Pomodoro y dejar terminar una celebración, se observó `Estado: IDLE`
mientras el reloj seguía `Concentración activa`.

**Acción:** una sola acción de producto «Concentrarme». Trasladar los estados de
animación al apartado avanzado de pruebas y derivar la pose del contexto real:
foco, pausa, descanso y aviso temporal. Separar claramente el estado productivo de
la animación transitoria.

Fuentes: [botones FSM](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/controller.ts#L87),
[máquina visual](https://github.com/luisrodriguez-rgb/My-Skin/blob/ec6e908/src/main.ts#L140), [evidencia](evidence.json).

### P2. Primer uso con pocas pistas

La pantalla del personaje contiene el canvas; el controlador permanece oculto al
arranque nativo. Doble clic y atajos existen, pero la primera experiencia no explica
la utilidad ni guía a la primera acción.

**Acción:** introducción de tres pasos, omisible: elegir compañero, escribir una
tarea y comenzar el foco. Mostrar una pista breve para arrastrar/abrir el panel.
Ofrecer calendario y GitHub después del primer valor, como opciones.

### P2. Conectar servicios exige conocimiento previo

El calendario comienza con un campo «URL de suscripción (.ics / webcal://)» sin
instrucciones por proveedor. GitHub dispone de `setTargetRepo()` pero carece de
configuración visible; una instalación nueva utiliza por defecto este repositorio.

**Acción:** asistente breve «Canvas / Moodle / Otro», explicación de dónde obtener
la URL, resultado visible y posibilidad de cambiar o desconectar el origen. Añadir
la elección de repositorio y un indicador claro de conexión. Mantener el uso básico
sin cuentas externas.

### P2. La selección de personaje desaprovecha el contenido

La miniatura se presenta a unos 40 px y el catálogo en un select. Texto como
`Skin pixel · 64 × 64`, los números de estados y `FSM` ocupa espacio que podría
mostrar qué hará el compañero por la persona.

**Acción:** galería visual con selección, vista previa y una frase de personalidad.
Usar nombres breves, un indicador de selección y opciones sencillas de intensidad
visual. Favorecer personajes propios reconocibles como Capibara, Dev Fantasma y el
avatar para construir una identidad del producto consistente.

### P2. Falta control sobre cuánto acompaña y cuánto interrumpe

Hay audio encendido/apagado y modo fijo/libre. No hay controles de silencio por un
rato, volumen o reducción de movimiento en el panel. El controlador se configura
siempre encima de otras ventanas.

**Acción:** «Silenciar 1 h», «Ocultar hasta que termine la sesión», volumen y
preferencias de movimiento. Al empezar el foco, ofrecer plegar el panel y mantener
una señal pequeña del progreso. La detección de presentaciones puede explorarse
más adelante; primero basta un control manual fiable.

### P2. Desbordamiento horizontal innecesario

Con una ventana de 560 px se midió un documento de 576 px; con 390 px, de 406 px.
El CSS combina `100vw` en html/body con padding aplicado a ambos. La simulación de
zoom también muestra el problema, pero no se usa como prueba normativa completa.

**Acción:** un contenedor con ancho disponible, padding en un único nivel, reflujo
y tamaño mínimo de ventana definido. Verificar también texto grande y navegación
por teclado.

## Propuesta de organización

| Sección | Contenido y objetivo |
| --- | --- |
| **Hoy** | Acción principal de foco, tarea elegida, próximas entregas, avance local y avisos |
| **Compañeros** | Galería, personaje activo, personalidad y vista previa |
| **Ajustes** | Calendario, GitHub, sonido, movimiento, atajos y preferencias de interrupción |
| **Avanzado** | Simuladores, estados FSM y diagnóstico; acceso secundario |

El espacio de «Hoy» debe permitir entender qué hacer ahora. El progreso puede
mostrar sesiones completadas y tareas terminadas, con datos locales y criterios
claros. Su utilidad debe validarse; no existe todavía ese historial en la app.

## Cómo darle más atractivo

1. **Un personaje protagonista:** preview mayor en el panel, expresiones legibles y
   reacciones breves al empezar, pausar, terminar o cumplir una tarea.
2. **Personalidad útil:** texto específico del contexto, tono elegible y variedad;
   datos correctos antes que un diálogo largo.
3. **Jerarquía clara:** un CTA principal, menos códigos técnicos y más aire entre
   acciones. Mantener el estilo oscuro y pixel art con tipografía de lectura cómoda.
4. **Pequeños resultados visibles:** sesión terminada, tarea completada y resumen
   local del día. Progresión cosmética opcional asociada a metas elegidas.
5. **Una demostración breve:** enseñar elección de compañero, foco y una entrega
   realista en un recorrido de 20–30 segundos. Es una propuesta de comunicación,
   no una prueba de que el producto ya resulte atractivo a su público.

La recomendación es conservar la mascota de escritorio como centro emocional y
unificar las herramientas alrededor del estudio. Importación comunitaria, editor
completo y autoactualizador pueden seguir su roadmap después de estabilizar el
circuito diario y validar la experiencia nativa.

## Prototipo visual entregado

- [Interfaz actual, captura](controller-default.png).
- [Propuesta: Hoy, captura](propuesta-hoy.png).
- [Propuesta: Compañeros, captura](propuesta-companeros.png).
- [Prototipo navegable autónomo](propuesta.html).
- [Propuesta a 390 px](propuesta-390.png).

La propuesta reutiliza los sprites actuales. Permite cambiar compañero, navegar,
probar inicio/pausa/reinicio, añadir/completar una tarea de ejemplo y cambiar un
estado de silencio de demostración. Las cifras, tareas y conexiones están
identificadas como ejemplos; el prototipo no modifica MySkin ni GitHub.

En la pantalla inicial de la propuesta, axe no detectó infracciones de las reglas
seleccionadas y a 390 px no hubo desbordamiento horizontal. Pasaron las comprobaciones
de las interacciones descritas y no hubo errores JavaScript. **Esto no demuestra
conformidad integral WCAG ni sustituye pruebas de usuarios o de todas las pantallas.**

## Roadmap de producto recomendado

Estimaciones orientativas para una persona con acceso al entorno nativo. Las
fases se cierran por sus criterios de aceptación.

| Orden | Alcance | Estimación | Criterio de aceptación |
| --- | --- | --- | --- |
| 1 | Avisos correctos y legibilidad | 3–5 días | Ninguna alerta urgente se pierde en las secuencias probadas; texto temporal coherente; errores persistentes y contraste corregido |
| 2 | Circuito diario «Hoy» | 1–2 semanas | Crear/elegir tarea, concentrarse, pausar, completar y volver al contexto correcto; conservar información necesaria al reabrir |
| 3 | Primera experiencia y conexiones | 3–5 días | Inicio útil sin cuenta, instrucciones de calendario, elección de repositorio, errores y recuperación comprensibles |
| 4 | Personalización y acabado visual | 1 semana | Galería, previews, textos y controles de tranquilidad coherentes; ajustes accesibles con teclado |
| 5 | Validación con usuarios y escritorio | 1 semana inicial | Resolver problemas observados en pruebas formativas y completar interacciones nativas, escalado e instaladores |

## Qué medir con usuarios

Probar primero con cinco personas del público propuesto; es una ronda formativa,
no una muestra representativa del mercado. Plantear estas tareas sin explicar la IU:

- Entrar por primera vez y empezar una sesión sobre una tarea propia.
- Encontrar qué vence antes y abrir o completar esa entrega.
- Pausar, cerrar el controlador, reabrir y continuar.
- Entender y resolver un error de calendario.
- Recibir dos avisos y recuperar el contexto de trabajo.
- Silenciar el compañero para una llamada.

Registrar éxito sin ayuda, tiempo, dudas, errores, recuperación y percepción de
interrupción. Como metas iniciales propuestas: primer foco en menos de un minuto,
al menos cuatro de cinco personas completando los flujos esenciales sin asistencia,
y ninguna pérdida de avisos en las secuencias automatizadas. Ajustar estas metas
con la primera ronda; no son resultados ya obtenidos.

La señal de utilidad a medio plazo sería que las personas vuelvan para completar
sesiones vinculadas a sus tareas y consulten sus próximas entregas. El tiempo con
la aplicación abierta no demuestra por sí solo que ayude a estudiar.

## Entrega y límites

Durante la auditoría se conservó el código de la aplicación. Los documentos,
capturas y prototipo se prepararon fuera del checkout y después se añadieron a
esta carpeta para poder consultarlos directamente en GitHub. Las propuestas
son trabajo pendiente para una siguiente iteración. La distribución firmada,
interacciones nativas, fiabilidad con proveedores reales y mediciones de recursos
conservan los límites ya documentados en el proyecto.
