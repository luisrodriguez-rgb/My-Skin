---
name: atomic-commits
description: Guía y asegura la creación de commits profesionales, atómicos y descriptivos siguiendo Conventional Commits. Úsalo al inspeccionar diffs, separar cambios lógicos independientes, redactar mensajes inequívocos y mantener un historial de git limpio y trazable.
---

# Atomic Commits (Commits Profesionales, Atómicos y Descriptivos)

## Propósito

Asegurar que cada commit en el repositorio represente **una única unidad lógica de cambio**, con un mensaje descriptivo, estructurado bajo Conventional Commits y sin elementos superfluos (sin emojis, sin generalidades, sin mezclar responsabilidades).

---

## Principios Fundamentales

### 1. Un commit = Un cambio lógico
Cada commit debe representar una sola modificación coherente. Nunca agrupes en un mismo commit cambios que correspondan a propósitos distintos.

Ejemplos a separar obligatoriamente:
* Corregir un bug.
* Cambiar estilos o formato.
* Renombrar variables o funciones.
* Actualizar dependencias o configuración.

### 2. Cada pequeño cambio debe quedar identificado
Antes de hacer commit, analiza el área de trabajo (`git diff`, `git status`). Si existen modificaciones independientes:
1. Identifícalas individualmente.
2. Sepáralas mediante `git add <archivo>` o `git add -p`.
3. Crea un commit independiente para cada una.

### 3. Mensajes inequívocos y descriptivos
El mensaje debe permitir entender exactamente qué se modificó y para qué, sin necesidad de abrir el diff.

* **Incorrecto:** `fix stuff`, `changes`, `update`, `adjustments`, `minor fixes`, `refactor`
* **Correcto:** `fix(auth): evitar envio del formulario cuando el email es invalido`
* **Correcto:** `feat(users): agregar paginacion a la lista de usuarios`

### 4. Estructura Conventional Commits
Formato estándar obligatorio:

```text
<tipo>(<ámbito opcional>): <descripción imperativa en minúsculas>

[cuerpo opcional explicando el porqué y contexto técnico]
```

#### Tipos autorizados:
* `feat:` Nueva funcionalidad para el usuario o sistema.
* `fix:` Corrección de un defecto o bug.
* `refactor:` Cambio estructural del código sin alterar su comportamiento externo.
* `style:` Cambios visuales, de espaciado o CSS que no alteran la lógica.
* `test:` Creación, corrección o actualización de pruebas automatizadas.
* `docs:` Cambios exclusivamente en documentación, README o manuales.
* `chore:` Mantenimiento, dependencias, scripts de construcción o herramientas auxiliares.
* `perf:` Mejoras directas de rendimiento demostrables.
* `build:` Cambios en configuración de empaquetado, bundler o dependencias nativas.
* `ci:` Cambios en flujos de trabajo de CI/CD (GitHub Actions, etc.).

### 5. Describe el cambio, no el proceso de trabajo
El commit describe el resultado técnico en el código y su propósito, no la narración temporal de lo que hiciste.
* **Evitar:** `refactor: cambiar algunas cosas del servicio que no funcionaban bien`
* **Preferir:** `refactor(auth): extraer validacion de token hacia AuthTokenValidator`

### 6. No mezclar refactorizaciones con nuevas funcionalidades
Si durante la implementación de una función detectas código que amerita limpieza:
1. Realiza y commitea primero el refactor: `refactor(api): desacoplar cliente HTTP compartido`
2. Implementa y commitea la funcionalidad: `feat(api): anadir endpoint de consulta de estado`

Esto garantiza que `git bisect`, las revisiones de código y las reversiones sean seguras e inmediatas.

---

## Flujo de Trabajo Paso a Paso

### Paso 1: Inspeccionar el diff antes de stagear
```bash
git status
git diff
```
Comprueba:
- ¿Qué archivos cambiaron?
- ¿Hay archivos no relacionados o cambios temporales/debug?
- ¿Todo el diff pertenece al mismo objetivo lógico?

### Paso 2: Stagear selectivamente
```bash
# Para archivos completos con un único propósito:
git add src/services/authService.ts

# Para archivos con múltiples cambios independientes (hunks interactivos):
git add -p src/main.ts
```

### Paso 3: Validar que no se rompe la suite
Antes de consolidar el commit, corre las verificaciones pertinentes:
```bash
# Tests unitarios
./node_modules/.bin/vitest run

# Verificación de tipos y build
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build

# Verificación nativa si aplica
~/.cargo/bin/cargo check --manifest-path src-tauri/Cargo.toml
```

### Paso 4: Redactar el commit
```bash
git commit -m "fix(calendar): preservar mensaje de error local ante ciclos de sincronizacion"
```

---

## Matriz de Decisión: ¿Uno o Dos Commits?

| Situación | Acción recomendada |
|---|---|
| Corregí un error tipográfico en el CSS y un bug en TypeScript | **Dos commits:** `style(...)` y `fix(...)` |
| Creé un endpoint y agregué sus tests unitarios específicos | **Un commit** si forman la misma unidad funcional, o **dos commits** (`feat` y luego `test`) |
| Actualicé una biblioteca y tuve que adaptar la llamada en el código | **Dos commits:** `build/chore(deps): ...` y `refactor(api): ...` |
| Renombré un componente y aproveché para agregarle un botón nuevo | **Dos commits:** `refactor(...)` y `feat(...)` |

---

## Regla de Oro
**Claridad > Cantidad de archivos por commit**  
**Atomicidad > Conveniencia rápida**  
**Precisión > Mensajes genéricos**  
**Estrictamente cero emojis** en los mensajes de commit.
