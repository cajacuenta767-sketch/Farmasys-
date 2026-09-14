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

La app pide la dirección del servidor y el **código de verificación** `CTL-…` de la licencia de la
farmacia; lo comprueba contra `POST /api/licencia/verificar` del servidor, que registra la huella del
teléfono. Ambos quedan guardados en el teléfono; en cada apertura se vuelve a verificar (con 7 días de
gracia sin red). Para cambiarlos, abre la app con `?cambiar=1`, o el administrador desvincula el
dispositivo desde la pantalla Licencia. Con `FARMASYS_URL` definida al compilar, la app abre esa web
directamente (sin pantalla previa), útil cuando el control de acceso ya lo hace la web.

Alternativa sin APK: abrir la web en Chrome y elegir "Instalar aplicación" (PWA).
