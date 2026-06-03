   # Willay — Guía de Configuración Completa

   > **Estado actual (2026-06-02):** El proyecto Firebase `willay-tas` ya existe (el dominio y project ID están hardcodeados en el repo), pero ningún secreto está configurado localmente. No hay `.env`, no hay `google-services.json` ni `GoogleService-Info.plist`. La app solo puede correr hoy con login anónimo contra emuladores locales.

   ---

   ## 0. Antes de empezar — verificar acceso al proyecto Firebase

   Lo primero es saber si tienes acceso al proyecto `willay-tas` o necesitas que tu colega te agregue.

   **Pasos:**
   1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
   2. Ver si aparece el proyecto **willay-tas** en el listado.
      - **Sí aparece →** puedes saltarte la creación del proyecto y partir del Paso 1.
      - **No aparece →** pedirle a quien lo creó que te agregue como editor: Firebase Console → `willay-tas` → Configuración del proyecto (⚙️) → Usuarios y permisos → Agregar miembro → tu email (`enval776@gmail.com`) con rol **Editor**.

   ---

   ## 1. Credenciales Firebase (SDK Web)

   Estas son las variables que necesita la app para conectarse a Firestore, Auth y Storage.

   **Dónde conseguirlas:**
   1. Firebase Console → proyecto `willay-tas`
   2. Configuración del proyecto (⚙️ en el sidebar) → pestaña **General**
   3. Bajar hasta "Tus apps" → buscar la app web (ícono `</>`). Si no existe, crear una con el nombre "willay-web".
   4. Copiar los valores del objeto `firebaseConfig`.

   **Qué copiar:**

   | Variable en `.env` | Campo en Firebase Console |
   |---|---|
   | `FIREBASE_API_KEY` | `apiKey` |
   | `FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `FIREBASE_APP_ID` | `appId` |

   > `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID` y `FIREBASE_STORAGE_BUCKET` ya están hardcodeados en `.env.example` con los valores correctos de `willay-tas`.

   **Crear el archivo `.env`:**
   ```bash
   # Desde la carpeta willay-app/
   cp .env.example .env
   # Luego abrir .env y rellenar las 3 variables de arriba
   ```

   **El `.env` final debe verse así:**
   ```env
   FIREBASE_API_KEY=AIzaSy...         ← pegar desde Firebase Console
   FIREBASE_AUTH_DOMAIN=willay-tas.firebaseapp.com
   FIREBASE_PROJECT_ID=willay-tas
   FIREBASE_STORAGE_BUCKET=willay-tas.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=123456789...  ← pegar desde Firebase Console
   FIREBASE_APP_ID=1:123456789:web:abc123...  ← pegar desde Firebase Console

   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=          ← se completa en el Paso 3
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=      ← se completa en el Paso 3

   USE_EMULATORS=false                        ← cambiar a false para prod
   EMULATOR_HOST=localhost

   USE_FACENET=false
   EAS_PROJECT_ID=
   ```

   ---

   ## 2. Habilitar Google Sign-In en Firebase Authentication

   El código ya existe en la app. Solo falta activar el proveedor en la consola.

   **Pasos:**
   1. Firebase Console → `willay-tas` → **Authentication** (sidebar izquierdo)
   2. Pestaña **Sign-in method**
   3. Click en **Google** → habilitar el toggle → guardar.
   4. **Importante:** En la misma pantalla, expandir "Configuración del SDK web" y anotar el **Web client ID** — lo necesitas en el Paso 3.

   ---

   ## 3. Google OAuth Client IDs

   `useGoogleAuth()` en `lib/auth.ts` soporta tres client IDs. **Solo necesitas los de tu plataforma.** Con el Web Client ID solo ya funciona el flujo básico en Expo Go.

   ---

   ### ✅ 3a. Web Client ID — obligatorio, ya lo tienes

   Se genera automáticamente al activar Google en Firebase Auth (Paso 2). Para recuperarlo:

   1. [console.cloud.google.com](https://console.cloud.google.com) → proyecto `willay-tas`
   2. **APIs & Services → Credentials**
   3. En la lista de OAuth 2.0 Client IDs buscar el que dice **"Web client (auto created by Google Service)"**
   4. Copiar el Client ID (termina en `.apps.googleusercontent.com`).
   5. Pegar en `.env`:
      ```env
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-xxxxxxxx.apps.googleusercontent.com
      ```

   ---

   ### 🍎 3b. iOS Client ID — para testear en iPhone (sin SHA-1, solo Bundle ID)

   > **No necesitas keytool, SHA-1 ni ninguna huella digital.** Solo el Bundle ID de la app.

   1. [console.cloud.google.com](https://console.cloud.google.com) → proyecto `willay-tas`
   2. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   3. Application type: **iOS**
   4. Name: `willay-ios-debug` (o cualquier nombre)
   5. Bundle ID: `pe.upc.willay`
   6. Crear → copiar el **Client ID** generado (termina en `.apps.googleusercontent.com`)
   7. Pegar en tu `.env` local:
      ```env
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-zzzzzzzz.apps.googleusercontent.com
      ```

   Con este Client ID, `expo-auth-session` usa el flujo nativo de iOS (abre el selector de cuenta de Google directamente, sin webview).

   > Este Client ID es tuyo — no hace falta compartirlo al repo, vive solo en tu `.env` local.

   ---

   ### 🤖 3c. Android Client ID — para colegas con Android (requiere SHA-1)

   > Este paso lo hace **cada colega con Android en su propia máquina**. El SHA-1 es por máquina/keystore.

   **Paso 1: Obtener el SHA-1 del debug keystore**

   En Windows (PowerShell — requiere JDK instalado):
   ```powershell
   keytool -list -v `
     -keystore "$env:USERPROFILE\.android\debug.keystore" `
     -alias androiddebugkey `
     -storepass android `
     -keypass android
   ```
   Si el comando falla porque no existe el directorio `.android/`, ejecutar primero `npx expo run:android` una vez para que Android Studio genere el debug keystore.

   Copiar la línea `SHA1: AA:BB:CC:...`

   **Paso 2: Crear el Android OAuth Client ID**
   1. Google Cloud Console → `willay-tas` → APIs & Services → Credentials
   2. **+ Create Credentials → OAuth client ID**
   3. Application type: **Android**
   4. Package name: `pe.upc.willay`
   5. SHA-1: pegar el valor obtenido
   6. Crear → copiar el Client ID generado.
   7. Pegar en su `.env` local:
      ```env
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-yyyyyyyy.apps.googleusercontent.com
      ```

   > Si son varios colegas con Android, cada uno crea su propio Client ID con su SHA-1 — se pueden crear múltiples IDs Android para el mismo proyecto sin problema.

   ---

   ## 4. Archivos de configuración nativos de Firebase

   Estos archivos son necesarios para **builds nativos** (`expo run:android` / `expo run:ios` o EAS). En desarrollo con **Expo Go** no son estrictamente necesarios porque la app usa el SDK JS. Aun así, lo más limpio es tenerlos.

   ### 🍎 iOS → `GoogleService-Info.plist`

   1. Firebase Console → `willay-tas` → ⚙️ Configuración del proyecto → **General**
   2. Bajar a "Tus apps" → buscar la app iOS con Bundle ID `pe.upc.willay`.
      - Si no existe: **Agregar app → Apple (iOS)** → Bundle ID: `pe.upc.willay` → Apodo: "willay-ios" → registrar.
   3. Descargar **GoogleService-Info.plist**
   4. Colocarlo en `willay-app/GoogleService-Info.plist` (está en `.gitignore`, no se sube al repo).

   > Ya referenciado en `app.json`: `"ios": "./GoogleService-Info.plist"` dentro del plugin de Firebase.

   ### 🤖 Android → `google-services.json`

   1. Mismo lugar: Firebase Console → `willay-tas` → ⚙️ → **General**
   2. Bajar a "Tus apps" → buscar la app Android con package `pe.upc.willay`.
      - Si no existe: **Agregar app → Android** → package: `pe.upc.willay` → registrar.
   3. Descargar **google-services.json**
   4. Colocarlo en `willay-app/google-services.json` (está en `.gitignore`).

   > Ya referenciado en `app.json`: `"googleServicesFile": "./google-services.json"`.

   ---

   ## 5. Authentication: habilitar login anónimo

   El flujo "Entrar como invitado" (que funciona hoy para demo) usa Firebase Anonymous Auth. Verificar que está activado:

   1. Firebase Console → Authentication → Sign-in method
   2. Buscar **Anónimo** → habilitar → guardar.

   ---

   ## 6. Firestore: crear base de datos

   Si la base de datos de Firestore no existe aún:

   1. Firebase Console → **Firestore Database** → Crear base de datos
   2. Modo de producción → Siguiente
   3. Región: **`southamerica-east1`** (ya configurada en el código)
   4. Listo.

   **Subir las reglas de seguridad:**
   ```bash
   # Desde la raíz del repo (donde está firebase.json)
   firebase deploy --only firestore:rules
   ```

   **Subir los índices:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

   ---

   ## 7. Cloud Storage: habilitar

   1. Firebase Console → **Storage** → Comenzar
   2. Modo de producción → Siguiente
   3. Región: `southamerica-east1` → Listo.

   **Subir las reglas:**
   ```bash
   firebase deploy --only storage
   ```

   ---

   ## 8. Cloud Functions: configurar y desplegar (opcional para demo)

   Las funciones Python en `functions/` son opcionales para la demo inicial — sin ellas el triaje de Gemini no opera, pero el botón de pánico y los reportes siguen funcionando.

   **Si se quiere desplegar:**

   ```bash
   # Instalar Firebase CLI si no está
   npm install -g firebase-tools

   # Login
   firebase login

   # Desde la raíz del repo
   firebase deploy --only functions
   ```

   **Variables de entorno para las functions (Gemini):**
   ```bash
   # Crear functions/.env (no commitear)
   cp functions/.env.example functions/.env
   # Agregar la Gemini API Key en functions/.env:
   # GEMINI_API_KEY=AIza...
   ```

   ---

   ## 9. Verificar que todo funciona

   Después de completar los pasos anteriores, probar en orden:

   ```bash
   # En willay-app/
   npx expo start --clear
   ```

   | Prueba | Esperado |
   |---|---|
   | Abrir la app | Pantalla de Sign-In con logo Willay |
   | Botón "Entrar como invitado" | Selección de rol → tabs de la app |
   | Botón "Continuar con Google" | Abre navegador OAuth de Google → vuelve autenticado |
   | Crear reporte de texto | Aparece en Firestore Console |
   | Vista operador | Listado de reportes con prioridad |

   ---

   ## 10. Para desarrollo local con emuladores (sin credenciales reales)

   Si quieres iterar sin configurar Firebase real, la app ya está preparada:

   ```bash
   # Terminal 1 — desde la raíz del repo
   firebase emulators:start

   # Terminal 2 — desde willay-app/
   # Asegurarse que .env tiene USE_EMULATORS=true
   npx expo start --clear
   ```

   Con emuladores, el login anónimo funciona sin ninguna credencial. Los datos se resetean al parar los emuladores.

   ---

   ## Resumen de archivos a crear / completar

   | Archivo | Acción | Quién lo consigue |
   |---|---|---|
   | `willay-app/.env` | Crear desde `.env.example` y rellenar | Firebase Console |
   | `willay-app/google-services.json` | Descargar desde Firebase Console → Android app | Firebase Console |
   | `willay-app/GoogleService-Info.plist` | Descargar desde Firebase Console → iOS app (solo si se testea en iOS) | Firebase Console |
   | `functions/.env` | Crear desde `functions/.env.example` y agregar Gemini key | Google AI Studio |

   > Ninguno de estos archivos se sube al repositorio — todos están en `.gitignore`.

   ---

   ## Problemas comunes

   **"Google Sign-In no configurado" (botón gris)**
   → Verificar que `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` está en `.env` con el valor correcto y que reiniciaste `expo start`.

   **Error "app not authorized" al hacer OAuth**
   → El SHA-1 del Android Client ID no coincide con el de tu keystore. Repetir Paso 3b.

   **Error de Firestore "permission-denied"**
   → Las reglas de seguridad no están subidas. Ejecutar `firebase deploy --only firestore:rules`.

   **"google-services.json not found" en build**
   → Descargar y colocar el archivo según Paso 4.
