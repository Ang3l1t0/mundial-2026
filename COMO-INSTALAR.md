# Mundial 2026 — App para celular (PWA offline)

Versión **100% autónoma**: corre entera en el celular, **sin servidor** ni cómputo tuyo.
Trae **horneados los resultados reales** (fase de grupos completa + los 16avos ya jugados,
capturados el 2026-06-29). Lo oficial queda bloqueado; vos seguís editando los KO y
partidos futuros a mano. Todo se guarda en el propio celular (`localStorage`).

> La app web original (carpeta de arriba, con Docker + `server.js`) **no se tocó**.
> Esto es una app nueva e independiente en `pwa/`.

## Probarla en el PC (opcional)

```bash
cd pwa
python3 -m http.server 8099    # o:  npx serve .
# abrir http://localhost:8099
```

La primera carga necesita internet (banderas de flagcdn + fuentes de Google). El service
worker las cachea y a partir de ahí funciona **sin conexión**.

## Opción A — Instalarla como app sin generar APK (lo más rápido)

Es una PWA: se instala desde el navegador del celular y queda con ícono propio, pantalla
completa y offline. Solo hay que servir estos archivos estáticos desde una URL pública
**gratis y siempre encendida** (no es un servidor con cómputo, es hosting estático).

### Subir a GitHub Pages (cuenta personal "angelito")

```bash
cd pwa
git init
git config user.name  "Ang3l1t0"
git config user.email "aepalma4712@gmail.com"
git add .
git commit -m "Mundial 2026 PWA offline"
git branch -M main
# crear el repo en la cuenta personal angelito (Ang3l1t0) y luego:
git remote add origin git@github.com:Ang3l1t0/mundial-2026.git
git push -u origin main
```

Después: repo → **Settings → Pages → Source: `main` / root** → guardar.
Queda en `https://ang3l1t0.github.io/mundial-2026/`.

### Instalarla en el celular

1. Abrir esa URL en Chrome (Android) o Safari (iPhone), **con internet**.
2. Android: menú ⋮ → **«Instalar app»** / «Agregar a pantalla de inicio».
   iPhone: botón compartir → **«Agregar a inicio»**.
3. Listo: ícono propio, abre a pantalla completa y **funciona sin internet**.

## Opción B — Generar un `.apk` instalable de verdad

Con la URL de GitHub Pages ya publicada, usar **PWABuilder** (gratis, sin instalar nada):

1. Entrar a <https://www.pwabuilder.com> y pegar la URL.
2. Pestaña **Android** → **Generate Package**.
3. Descarga un `.aab` (para Play Store) y un `.apk` (para instalar directo).
4. Pasar el `.apk` al celular e instalarlo (hay que permitir «orígenes desconocidos»).

> No se pudo compilar el APK acá porque este entorno no tiene Java ni Android SDK.
> PWABuilder lo hace en la nube a partir de la PWA — por eso primero va la Opción A.

## Actualizar los resultados reales más adelante

Los datos viven en `seed.js` (`window.SEED = {group, ko, real}`). Para refrescarlos con lo
que tenga la app web, levantá el contenedor original y regenerá la semilla:

```bash
# desde la carpeta de arriba, con el contenedor mundial2026 corriendo:
curl -s http://localhost:8080/api/state > /tmp/state.json
node -e 'const s=require("/tmp/state.json");const fs=require("fs");fs.writeFileSync("pwa/seed.js",
`window.SEED = ${JSON.stringify({group:s.group,ko:s.ko,real:s.real})};
if (typeof module!=="undefined"&&module.exports) module.exports=window.SEED;`)'
```

Luego subí el cambio (git push). En el celular, al reabrir con internet el service worker
toma la versión nueva (bump `CACHE` en `sw.js` si querés forzarlo).
