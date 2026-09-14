# FarmaSys para Android

App Android (Capacitor) que abre el servidor FarmaSys de la farmacia como aplicación instalable.
No lleva base de datos propia: los datos, usuarios y la licencia están en el servidor (web o Docker).

## Compilar

Requisitos: Node 22, Java 21 y Android SDK (o simplemente usa el workflow `release.yml`, que
publica `FarmaSys.apk` en GitHub Releases).

```bash
cd mobile
npm install
npx cap add android            # genera la carpeta android/ (no se versiona)
npm run assets                 # iconos y splash desde assets/
FARMASYS_URL=https://farmacia.midominio.com npx cap sync android   # opcional: fija el servidor
cd android && ./gradlew assembleRelease
```

Sin `FARMASYS_URL`, la app muestra una pantalla donde el usuario escribe la dirección del servidor
una sola vez (queda guardada en el teléfono; para cambiarla, abre la app con `?cambiar=1` o borra sus datos).

Alternativa sin APK: abrir la web en Chrome y elegir "Instalar aplicación" (PWA).
