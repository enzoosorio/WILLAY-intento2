# Guía Android — Probar Google Sign-In en tu dispositivo

> Para: compañero/a con teléfono Android  
> Tiempo estimado: 20–30 minutos (incluye el build en la nube ~15 min)

---

## Requisitos previos

- Android 8.0 o superior
- Node.js 18+ instalado en tu PC
- Cuenta de Google (para iniciar sesión en Expo)
- El archivo `google-services.json` (pedírselo a Enzo por WhatsApp/correo — él lo descarga de Firebase Console)

---

## Paso 1 — Clonar y preparar el proyecto

```bash
git clone https://github.com/TU_ORG/WILLAY-intento2.git
cd WILLAY-intento2/willay-app
npm install
```

---

## Paso 2 — Colocar el archivo de Firebase

Pedir a Enzo el archivo `google-services.json` y colocarlo en:

```
WILLAY-intento2/willay-app/google-services.json
```

> Este archivo no está en el repo (está en `.gitignore`) porque contiene config del proyecto Firebase.

---

## Paso 3 — Instalar EAS CLI y loguearse

```bash
npm install -g eas-cli
eas login
```

Usar la cuenta de Expo del equipo (pedirle las credenciales a Enzo) **o** crear una cuenta gratuita propia en [expo.dev](https://expo.dev).

> Si creás cuenta propia: avisarle a Enzo para que te agregue como colaborador al proyecto en [expo.dev/accounts/enzoosorio/projects/willay-app](https://expo.dev/accounts/enzoosorio/projects/willay-app).

---

## Paso 4 — Crear el `.env` local

```bash
cp .env.example .env
```

Pedirle a Enzo los valores de estas variables y completarlas en `.env`:

```env
FIREBASE_API_KEY=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
USE_EMULATORS=false
USE_FACENET=false
EAS_PROJECT_ID=d44ceb36-5717-4f12-844a-d4ef94eab75d
```

> `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID` y `FIREBASE_STORAGE_BUCKET` ya están en el `.env.example`.

---

## Paso 5 — Obtener el SHA-1 de EAS (solo la primera vez)

EAS firma el APK con su propio keystore. Necesitamos ese SHA-1 para que Google Sign-In funcione.

```bash
eas credentials --platform android
```

Seleccionar:
- **Keystore** → si te pregunta, elegir "Generate new keystore"
- Anotar el valor de **SHA1** que aparece en pantalla

Enviarle ese SHA-1 a Enzo para que lo agregue a Firebase Console (→ Project Settings → Android app → SHA certificate fingerprints). Una vez que Enzo lo agregue y descargue el `google-services.json` actualizado, te lo manda de nuevo.

> **Este paso solo se hace una vez por proyecto.** El SHA-1 de EAS es fijo para el proyecto.

---

## Paso 6 — Buildear el APK en la nube

```bash
eas build --profile development --platform android
```

- El build tarda aproximadamente **15 minutos** en los servidores de Expo.
- Al terminar, el terminal muestra un **link para descargar el APK** o un **QR**.
- También podés verlo en [expo.dev](https://expo.dev) bajo tu proyecto.

---

## Paso 7 — Instalar el APK en tu Android

1. Descargar el APK desde el link del paso anterior.
2. En el teléfono: **Ajustes → Seguridad → Instalar apps de origen desconocido** (activar para el navegador que usaste para descargar).
3. Abrir el archivo APK descargado → Instalar.

---

## Paso 8 — Probar Google Sign-In

1. Abrir la app **Willay** en el teléfono.
2. Tocar **"Continuar con Google"**.
3. Seleccionar tu cuenta de Google.
4. Debería entrar a la app y pedirte elegir zona en el onboarding.

---

## Si algo falla

| Problema | Causa probable | Solución |
|---|---|---|
| `DEVELOPER_ERROR` al hacer sign-in | SHA-1 de EAS no registrado en Firebase | Repetir paso 5 y avisar a Enzo |
| `google-services.json not found` | El archivo no está en la ubicación correcta | Verificar que esté en `willay-app/google-services.json` |
| Build falla con error de credenciales | No tenés acceso al proyecto EAS | Pedirle a Enzo que te agregue como colaborador |
| La app no abre / crash al iniciar | Versión Android incompatible | Necesitás Android 8.0+ |

---

## Para desarrollo local (Expo Go, sin build)

Si querés probar el resto de las funcionalidades sin hacer el build:

```bash
npx expo start --clear
```

Escanear el QR con la cámara → se abre en **Expo Go**.  
En Expo Go el botón de Google muestra un aviso explicativo; usá **"Entrar como invitado"** para acceder a todas las demás pantallas.
