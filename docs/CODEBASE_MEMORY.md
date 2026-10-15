# Codebase Memory en el entorno cloud

Se utiliza [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp),
versión **0.11.0**, mediante su CLI oficial. No requiere claves ni envía el código
a un servicio de análisis. La habilidad del instalador oficial se encuentra en
[SKILL.md](../.agents/skills/codebase-memory/SKILL.md), con una nota de acceso local.
El contenido original procede de `src/cli/cli.c`, tag v0.11.0, bajo licencia MIT.

La carpeta `.codebase-memory` que ya tenía el repositorio era un artefacto de un
índice anterior. No incluía el ejecutable ni una habilidad. En esta tarea se
instaló el binario en `/workspace/tools/codebase-memory` y se creó un índice del
checkout cloud actual. No se sustituyó la configuración global de otros agentes.

## Instalación repetible

```bash
cd /workspace/My-Skin
bash scripts/setup-codebase-memory.sh
/workspace/tools/codebase-memory/cbm cli index_repository --repo-path /workspace/My-Skin
```

El script descarga el archivo de la release oficial y verifica su SHA-256 contra
`checksums.txt` de esa misma release antes de instalar. Conserva un ejecutable
idéntico y rechaza sobrescribir uno diferente. `CBM_INSTALL_ROOT` permite elegir
otra ubicación. La caché está junto al ejecutable; el wrapper limita las lecturas
al proyecto por defecto y utiliza dos workers.

## Uso en esta sesión y sesiones futuras

```bash
/workspace/tools/codebase-memory/cbm cli list_projects
/workspace/tools/codebase-memory/cbm cli search_graph --project workspace-My-Skin --name-pattern '.*Pomodoro.*'
/workspace/tools/codebase-memory/cbm cli trace_path --project workspace-My-Skin --function-name getNextUrgentDeadline --direction both
```

Para argumentos que contienen arrays, pasar JSON por stdin:

```bash
/workspace/tools/codebase-memory/cbm cli check_index_coverage <<'JSON'
{"project":"workspace-My-Skin","paths":["src/main.ts","src/controller.ts","src/syncService.ts"]}
JSON
```

Consultar `list_projects` para confirmar el nombre si cambia la ruta. Reindexar
tras cambios: las invocaciones CLI no mantienen un watcher activo. Leer el código
exacto cuando haya límites de cobertura; un grafo sin huecos registrados no prueba
que el análisis sea exhaustivo. `manage_adr` conserva las decisiones en el índice local. Se mantiene también una
exportación versionada en `.codebase-memory/adr.md` para futuros checkouts.

La CLI ejecuta las herramientas del servidor MCP. Su instalación no registra
herramientas nuevas dinámicamente en la lista de esta conversación; no requiere
reiniciar la sesión para usar la CLI.
