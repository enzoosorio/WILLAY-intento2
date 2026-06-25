# Guía de Prueba — Reconocimiento Facial WILLAY

**Para:** compañero de clase que prueba el APK en Android físico  
**Tiempo estimado:** 30–45 minutos  
**Necesitas:** celular Android con el APK instalado + 2 personas para las fotos (o fotos de galería)

---

## ¿Qué vas a probar?

WILLAY tiene un módulo de reconocimiento facial on-device. Cuando un vecino reporta un "avistamiento" de una persona sospechosa, la app compara la foto tomada en el momento contra las fichas de personas desaparecidas almacenadas en Firestore — todo en el celular, sin subir datos a ningún servidor de IA externo.

Lo que queremos medir: **¿el modelo identifica correctamente a la misma persona con distintas fotos? ¿Distingue bien entre personas diferentes?**

---

## Antes de empezar

- [ ] APK instalado en el celular (link en el mensaje de tu compañero)
- [ ] WiFi activado (la primera vez descarga el modelo de IA, ~13 MB)
- [ ] Tener a mano 2 personas distintas para las fotos, o al menos 3–4 fotos distintas de cada persona (puede ser desde la galería)
- [ ] Buen nivel de batería

---

## Paso 1 — Verificar que el modelo está activo

Al abrir la app por primera vez después de instalar el APK:

1. Abre la app
2. Inicia sesión (si no tienes cuenta, regístrate — elige rol **Operador** cuando te lo pregunte)
3. La primera vez que entres a "Escanear avistamiento", la app descargará el modelo (~13 MB). Espera a que cargue.

**¿Cómo sé que está usando el modelo real y no el modo demo?**
No hay un indicador visual en pantalla, pero el modelo real tarda unos 2–5 segundos en la primera inferencia. Si es instantáneo siempre, probablemente está en modo demo (mock) — avisa a tu compañero desarrollador.

---

## Paso 2 — Crear fichas de personas desaparecidas

> ⚠️ **Importante:** Debes crear las fichas desde la app (NO desde el panel admin ni con datos de prueba). El embedding facial tiene que generarse con el mismo modelo que va a comparar.

1. Ir al menú → **Personas desaparecidas** → botón **"+"** o "Nueva ficha"
2. Llenar los datos:
   - Nombre: puede ser ficticio (ej: "Persona A")
   - Edad: cualquier número
   - Descripción: breve
3. **Foto:** tomar una foto de frente de la **Persona A**
   - Buena iluminación
   - Cara centrada, mirando a la cámara
   - Fondo simple si es posible
4. Guardar la ficha → la app procesa la foto y guarda el embedding en la nube
5. Repetir para crear **una segunda ficha de Persona B** (persona distinta)

Mínimo necesitas: **1 ficha de Persona A** y **1 ficha de Persona B**.

---

## Paso 3 — Registrar avistamientos y anotar similitudes

Ir a **"Escanear avistamiento"** (puede estar en el menú principal o en una pestaña).

### Pares POSITIVOS (misma persona → debería dar match)

Toma 10–20 fotos de la **Persona A** en diferentes momentos/ángulos y compara cada una contra la ficha de Persona A:

1. Pulsa "Tomar foto" → toma la foto
2. Pulsa "Comparar"
3. Espera el resultado (~2–5 segundos)
4. **Anota el número de similitud** que aparece en pantalla

Ejemplo de tabla de anotación (usar papel o el bloc de notas del celular):

| # | Foto de | Compara contra ficha | Similitud | ¿Dice "match"? |
|---|---------|----------------------|-----------|----------------|
| 1 | Persona A | Persona A | 0.XXX | Sí / No |
| 2 | Persona A | Persona A | 0.XXX | Sí / No |
| 3 | Persona A | Persona A | 0.XXX | Sí / No |
| ... | ... | ... | ... | ... |

Hacer al menos **20 pares positivos** (20 fotos distintas de Persona A comparadas contra su ficha).

### Pares NEGATIVOS (personas distintas → NO debería dar match)

Toma fotos de **Persona B** y compáralas contra la ficha de **Persona A**:

| # | Foto de | Compara contra ficha | Similitud | ¿Dice "match"? |
|---|---------|----------------------|-----------|----------------|
| 21 | Persona B | Persona A | 0.XXX | Sí / No |
| 22 | Persona B | Persona A | 0.XXX | Sí / No |
| ... | ... | ... | ... | ... |

Hacer al menos **20 pares negativos**.

---

## Paso 4 — Qué significa cada resultado

| Similitud | Significado |
|-----------|-------------|
| ≥ 0.60 | Coincidencia muy probable — la app la reporta como match |
| 0.40 – 0.60 | Zona gris — puede o no ser la misma persona |
| < 0.40 | Sin coincidencia — la app dice "Sin coincidencias" |

El umbral actual es **0.40**. Si ves que muchos pares positivos dan menos de 0.40, o que pares negativos dan más de 0.40, anótalo: eso nos dirá si hay que ajustar el umbral.

---

## Paso 5 — Tabla final que necesitamos

Al terminar todas las pruebas, completa estas dos tablas y envíaselas (foto de pantalla, nota de voz, lo que sea) a tu compañero desarrollador:

### Tabla de pares POSITIVOS (misma persona)

| # | Similitud |
|---|-----------|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
| 6 | |
| 7 | |
| 8 | |
| 9 | |
| 10 | |
| 11 | |
| 12 | |
| 13 | |
| 14 | |
| 15 | |
| 16 | |
| 17 | |
| 18 | |
| 19 | |
| 20 | |

### Tabla de pares NEGATIVOS (persona distinta)

| # | Similitud |
|---|-----------|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| 5 | |
| 6 | |
| 7 | |
| 8 | |
| 9 | |
| 10 | |
| 11 | |
| 12 | |
| 13 | |
| 14 | |
| 15 | |
| 16 | |
| 17 | |
| 18 | |
| 19 | |
| 20 | |

---

## Si algo no funciona

**La app se demora mucho en "Comparar" (>30 segundos):**  
Normal la primera vez que descarga el modelo. Si pasa siempre, avisa.

**Aparece "Sin coincidencias" aunque sea la misma persona:**  
Anota la similitud igual (ej: 0.25). El umbral puede necesitar ajuste. Esto no es un error, es parte de la calibración.

**La app crashea:**  
Toma un screenshot del error si puedes. Cierra y vuelve a abrir. Si persiste, desinstala y vuelve a instalar el APK.

**El resultado aparece sin número de similitud:**  
Probablemente está en modo demo (mock). Avisa a tu compañero que revise los logs.

**No hay opción "Escanear avistamiento" en el menú:**  
Verifica que iniciaste sesión como rol **Vecino** (el rol Operador tiene otro panel). O busca en las pestañas del menú principal.

---

## Datos a reportar al compañero desarrollador

Una vez terminadas las pruebas, pasar esta info:

1. Las dos tablas de similitudes (40 valores en total)
2. Modelo de celular y versión de Android
3. Si hubo algún error o comportamiento raro, describir cuándo pasó
4. Latencia aproximada de la comparación (cuántos segundos tardaba en promedio)
