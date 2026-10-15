# <img src="../public/brand/myskin-mark-128.png" alt="" width="32" height="32" /> Identidad visual de MySkin

La marca utiliza un compañero pixel verde con un pequeño brote, sobre una base
carbón. El símbolo acompaña las vistas Hoy, Compañeros y Ajustes y funciona sin
texto en el favicon, el menú y los iconos del sistema.

<p align="center"><img src="../public/brand/myskin-mark-512.png" alt="Nuevo símbolo de MySkin" width="256" height="256" /></p>

## Paleta de referencia

| Color | Valor | Uso |
| --- | --- | --- |
| Verde salvia | `#C0E798` | Marca y acción principal. |
| Verde secundario | `#97C66D` | Profundidad del símbolo. |
| Carbón | `#111A20` | Fondo de la interfaz y base del icono. |
| Tinta | `#172416` | Detalles oscuros y texto sobre verde. |
| Marfil | `#EFF5F1` | Texto claro y reflejo del símbolo. |

## Archivos y uso

- [Original PNG con transparencia](../public/brand/myskin-mark.png).
- [Logo de 512 px](../public/brand/myskin-mark-512.png) para documentación.
- [Versión de 128 px](../public/brand/myskin-mark-128.png) para el encabezado del panel y títulos.
- Versiones de 16/32 px para favicon y de 180/192 px para accesos web.
- [Iconos nativos](../src-tauri/icons/): PNG, ICO, ICNS y variantes existentes de plataforma.

El texto «MySkin» se mantiene como texto junto al símbolo en la interfaz. En ese
encabezado, el icono es decorativo para evitar duplicar su nombre al leer con un
lector de pantalla. Las imágenes que presentan el logo por sí solo incluyen una
descripción alternativa.

El original se generó con ImageGen tomando como referencia la nueva UI. Las
exportaciones de tamaño y los contenedores de iconos se producen con la CLI de
Tauri, sin modificar los sprites de los compañeros. Para regenerarlas:

```bash
bash scripts/generate-brand-icons.sh
```

Las capturas históricas de la auditoría conservan la identidad que existía al
realizarse. Las capturas actuales del README muestran la nueva marca.
