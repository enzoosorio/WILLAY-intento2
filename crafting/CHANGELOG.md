# Changelog — Willay

Registro de cambios significativos por iteración. Orden cronológico inverso.

---

## [2026-06-09] — Auth: Migración Google OAuth → Email/Password

### Motivación
Google Sign-In no funciona en el entorno actual (emulador Android sin SHA keys registradas, Expo Go). El MVP universitario necesita autenticación funcional y desplegable para la demo en aula. Ver **ADR-011** en `03-tech-decisions.md`.

### Archivos eliminados
| Archivo | Razón |
|---|---|
| `willay-app/lib/google-sign-in.ts` | Reemplazado por auth email/password; sin importadores |
| `willay-app/lib/google-sign-in.native.ts` | Mismo motivo |

### Archivos modificados
| Archivo | Qué cambió |
|---|---|
| `willay-app/lib/auth.ts` | Eliminado `useGoogleAuth()` y `expo-auth-session`. Agregadas `signInWithEmail()` y `registerWithEmail()` |
| `willay-app/lib/env.ts` | Eliminados `GoogleAuthExtra`, campo `googleAuth` y función `hasGoogleAuth()` |
| `willay-app/types/models.ts` | Agregado `phone?: string` a `UserDoc` |
| `willay-app/app/_layout.tsx` | Eliminado import y call a `configureGoogleSignIn()` |
| `willay-app/app/(auth)/sign-in.tsx` | Reescrito: formulario email/contraseña + link a registro + botón "Acceso demo (Administrador)" |
| `willay-app/app/(auth)/role-select.tsx` | Renombrado a "Acceso demo rápido"; card Administrador va primero y queda seleccionado por default |

### Archivos creados
| Archivo | Descripción |
|---|---|
| `willay-app/app/(auth)/register.tsx` | Registro multi-paso: Paso 1 selección de rol, Paso 2 formulario (nombre, correo, teléfono, contraseña, código de operador si aplica) |
| `crafting/CHANGELOG.md` | Este archivo |

### Flujo de navegación resultante
```
sign-in.tsx
 ├─ [Iniciar sesión]        → Firebase signInWithEmailAndPassword → /(auth)/onboarding → /(tabs)
 ├─ [Crear cuenta]          → register.tsx (Paso 1: rol → Paso 2: form) → /(auth)/onboarding → /(tabs)
 └─ [Acceso demo Admin]     → role-select.tsx → signInAnonymously → /(tabs) (sin onboarding)
```

### Setup requerido en Firebase Console
> **IMPORTANTE:** Antes de probar en dispositivo real o emulador sin emuladores locales:
1. Ir a **Firebase Console → Authentication → Sign-in methods**
2. Habilitar el proveedor **Email/Password**
3. (Opcional) Habilitar **Email link** si se quiere login sin contraseña en el futuro
4. No se requiere ninguna configuración OAuth ni SHA keys

### Código de acceso para operadores
```
serenazgo2026
```
Hardcodeado en `app/(auth)/register.tsx` (constante `OPERATOR_ACCESS_CODE`). Cambiar antes de producción real.

### ADR de referencia
- **ADR-011** en `crafting/03-tech-decisions.md` — supercede ADR-007

---

## [Anteriores]

*Commits anteriores documentados en git log. Este CHANGELOG registra cambios desde la iteración de demo en aula (2026-06-09).*
