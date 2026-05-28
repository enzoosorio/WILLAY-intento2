
Universidad del Perú. Decana de América
Facultad de Ingeniería de Sistemas e Informática
Escuela Profesional de Ingeniería de Software
Willay: Sistema Inteligente de Vigilancia Comunitaria y Localización de
Personas Vulnerables para el Distrito de Puente Piedra
Integrantes
Espinoza Pacífico, Sebastián Jesús
Salazar Herrera, Óscar Miguel
Osorio Ortiz, Enzo Martín
Callupe Huamán, Germán
Docente
HUGO RAFAEL CORDERO SÁNCHEZ
LIMA – PERÚ
2026
1. INFORME TÉCNICO: PROYECTO WILLAY
1.1. Contexto Estratégico y Justificación

El distrito de Puente Piedra, con una población que supera los 400.000 habitantes y una densidad

actividad comercial en ejes como el Mercado Huamantanga y la Panamericana Norte ,

reforma desafíos críticos de seguridad. La problemática no radicalamente en la

incidencia delictiva, sino en la latencia operativa. La respuesta institucional real se ve

limitada por procesos burocráticos que consumen la "Hora Dorada" el período crítico de 60

minutos tras un incidente donde la probabilidad de éxito es máxima.

1.2. Planteamiento del Problema

La vigilancia en el distrito es mayoritariamente pasiva (cáraras de monitoreo) o

desestructurada (grupos de WhatsApp). Este género tres fallas críticas:

Ruido Informativo: La saturación de hombres no críticos en canales veterinarios
provoca desensibilización ciudadana.
Asimetría de Información: Los datos sobre delitos o desapariciones no se cruzen en
tiempo real con sistemas inteligentes de análisis.
Inacción Comunitaria: La falta de una herramienta técnica confiable impide que la
comunidad actúe como un sensor activo de seguridad.
1.3. Definición de la Solución: "Willay"

Willay (quechua: avisar/comunicar ) es una plataforma de Gobernanza Digital y Inteligente

Ciudad que integra Inteligencia Artificial (IA) para transformar la vigilancia ciudadana. El

sistema utilizado API de Géminis para el triaje automático de emergencias y Visita

Computacional para la localización de personas vulnerables, establecimiento un canal de

comunicación directo y priorizado entre el vecino y el Centro de Operaciones de Serenazgo

de Puente Piedra.

2. METODOLOGÍA DESIGN THINKING
Para el desarrollo del proyecto Willay, se aplicó la metodología Design Thinking, un enfoque

centrado en el usuario que permite comprender problemas sociales completos y enfermedades

soluciones innovadoras alineadas a las necesidades reales de la comunidad.

2.1. Fase 1: Empatizar (Investigación Centrada en el Usuario)

2.1.1 Objetivo:
Comprender profundamente las experiencias, percepciones, emociones y dificultades
de los ciudadanos de Puente Piedra frente a la inseguridad ciudadana y la desaparición
de personas vulnerables, identificando sus necesidades reales y no solo las aparentes.
2.1.2 Actores involucrados:
Durante esta fase se identificaron y analizaron los siguientes actores clave del
ecosistema:
● Vecinos del distrito de Puente Piedra, especialmente quienes transitan o
residen en zonas críticas como Zapallal y La Ensenada.
● Familiares de personas vulnerables, tales como menores, adultos mayores o
personas con discapacidad.
● Operadores del serenazgo municipal, responsables del monitoreo y atención de
alertas.
● Autoridades municipales, como actores indirectos de la gestión de seguridad
ciudadana.
2.1.3 Técnicas de investigación utilizadas:
● Entrevistas semiestructuradas a vecinos y familiares.
● Observación contextual, tanto presencial como digital (análisis de grupos
vecinales de WhatsApp).
● Análisis de los canales actuales de reporte, utilizados en la comunidad.
2.1.4 Preguntas guía para las entrevistas:
● A vecinos del distrito:
○ ¿Qué haces actualmente cuando observas una situación sospechosa?
○ ¿Confías en que tu reporte genere una acción por parte de las
autoridades?
○ ¿Has dejado de reportar incidentes por miedo, cansancio o
desconfianza?
○ ¿Qué problemas encuentras en los grupos vecinales actuales?
● A familiares de personas vulnerables
○ ¿Qué tan rápido recibiste apoyo cuando tu familiar desapareció?
○ ¿Qué dificultades encontraste al intentar difundir la alerta?
○ ¿Qué información consideras que se pierde en los canales actuales?
● A operadores de serenazgo
○ ¿Cuántos reportes reciben diariamente?
○ ¿Cuántos de estos reportes son realmente urgentes?
○ ¿Qué problemas genera la información desordenada o repetida?
2.1.5 Hallazgos principales:

● Existencia de fatiga de reporte: los ciudadanos sienten que sus avisos no
generan una acción concreta.
● Ruido informativo elevado en grupos vecinales, dificultando la identificación
de emergencias reales.
● Temor a represalias al momento de reportar hechos sospechosos.
● Alta disposición de los vecinos para colaborar, siempre que exista un
mecanismo seguro y efectivo.
2.1.6 Mapa de empatía (síntesis):

Aspecto Observación
Piensa “Reportar no sirve de nada”
Siente Miedo, frustración, ansiedad
Dice “Nadie responde”
Hace Ignora o reenvía mensajes
Necesita Rapidez, anonimato y respuesta efectiva
2.2. Fase 2: Definir (Punto de vista - POV)

Arquetipo de
Usuario
Necesidad Crítica (Needs) Revelación / Insight
"Ricardo"
(Vecino
Vigilante)
Reportar situaciones
sospechosas de manera
inmediata y discreta.
Bajo situaciones de estrés o peligro, la
capacidad de redactar textos largos
disminuye drásticamente; se requiere
comunicación técnica y simplificada.
"Milagros"
(Familiar en
Crisis)
Movilizar de forma masiva
y automática la búsqueda
de un familiar
desaparecido.
Las redes sociales son caóticas; el éxito en
la localización depende de aprovechar la
"Hora Dorada" mediante el análisis técnico
de cada cámara disponible.
Operador de
Serenazgo
Filtrar el "ruido
informativo" para atender
emergencias reales.
La saturación de mensajes no críticos en
canales desestructurados genera inacción y
desensibilización institucional.
2.2.1. Definición del problema (POV)
“Los ciudadanos de Puente Piedra necesitan una forma estructurada, rápida y
confiable de reportar emergencias y desapariciones, ya que los medios actuales
basados en redes sociales generan saturación de información, ansiedad colectiva y
retrasos críticos en la atención de incidentes.”
2.3. Fase 3: Idear (Funciones Rompedoras)

2.3.1. Proceso de ideación
Se realizaron sesiones de lluvia de ideas y análisis de soluciones, priorizando aquellas
que:
● Redujeran la latencia de respuesta.
● Disminuyeran el ruido informativo.
● Empoderaran a la comunidad sin exponerla a riesgos.
2.3.2. Soluciones propuestas (Pilares del sistema Willay)
1. Botón de Pánico Inteligente

Permite al ciudadano generar una alerta inmediata, georreferenciada y
prioritaria, eliminando la necesidad de redactar mensajes extensos bajo estrés.
2. Sistema Comunitario de Identificación Facial

Utiliza inteligencia artificial para analizar imágenes de avistamientos y
contrastarlas automáticamente con una base de datos de personas vulnerables
desaparecidas.
3. Filtrado Semánico mediante Inteligencia Artificial

Aplica procesamiento de lenguaje natural para clasificar los reportes según su
nivel de urgencia, descartando información irrelevante y evitando la saturación
del serenazgo.
3. INGENIERA DE REQUISITOS
3.1. Requisitos Funcionales (RF)

ID Requerimiento Descripción Técnica
RF-01 Registro e inicio de
sesión con número de
teléfono
El usuario se registra únicamente con su número de
celular. Firebase Auth envía un SMS con código de
verificación. Sin contraseñas, sin formularios largos. El
perfil guarda solo nombre de usuario y zona del
distrito.
RF-02 Botón de pánico con
ubicación automática
Con una pulsación larga de 2 segundos, el ciudadano
envía una alerta de emergencia que incluye su
coordenada GPS actual. No necesita escribir nada. El
sistema la clasifica automáticamente como Prioridad 1
y la envía al operador.
RF-03 Informe por texto con

clasificación IA
El ciudadano describe brevemente lo que ve (texto
libre, máx. 280 caracteres). Gemini API clasifica el
reporte como P1, P2 o P3 según urgencia. Solo los P1 y
P2 llegan a la bandeja activa del operador.
RF-04 Registro de ficha de

persona desaparecida
El familiar sube una foto y completa un formulario
básico: nombre, edad, descripción y última zona vista.
La ficha queda activa y visible para todos los usuarios
del distrito. No requiere moderación manual previa.
RF-05 Avistamiento con

comparación facial
Un vecino puede subir una foto de alguien que le
parece sospechoso o buscado. El microservicio en
FastAPI compara la foto contra las fichas activas. Si el
match supera el 85%, se notifica automáticamente al
familiar que registró la ficha.
RF-06 Vista del operador:

bandeja de alertas
El operador de serenazgo usa la misma app con un rol
diferente. Ve una lista simple de alertas activas
ordenadas por prioridad, con ubicación en mapa y
descripción. Puede marcar cada alerta como
"Atendida" o "Descartada" con un tap.
RF-07 Notificación push a

vecinos cercanos
Cuando se confirma una alerta P1, el sistema envía una
notificación push a los usuarios registrados en un radio
de 500 metros. El mensaje es breve: tipo de incidente y
zona. Sin detalles que puedan generar pánico
innecesario.
RF-08 Seguimiento del
estado del reporte
El ciudadano puede ver en la app el estado de su
reporte: Recibido, En atención o Cerrado. El estado lo
actualiza el operador. No hay chat ni comunicación
bidireccional, solo trazabilidad básica para reducir la
"fatiga de reporte".
3.2. Requisitos Sin Funcionales (RNF)

ID Requerimiento Estándar / Métrica
RNF-01 Latencia de
Respuesta
Desde que el ciudadano activa el botón de pánico hasta
que el operador recibe la notificación, el tiempo total
no debe superar 3 segundos. Cubre el análisis de
Gemini, escritura en Firestore y disparo del push.
RNF-02 Funcional en
conexión 3G
Las funciones críticas (botón de pánico, reporte de
texto) deben operar correctamente con una conexión
mínima de 3G. La app debe tener un peso ligero y no
depender de recursos externos pesados para su flujo
principal.
RNF-03 3 pasos para
acciones críticas
El botón de pánico y el reporte rápido deben poder
completarse con no más de 3 interacciones desde que
se abre la app. El diseño debe contemplar uso con una
sola mano y bajo condiciones de estrés.
RNF-04 Cifrado de datos y
cumplimiento Ley
29733
Todos los datos personales (fotos, ubicación, número
de teléfono) viajan cifrados con TLS 1.3. El
almacenamiento de fotos biométricas requiere
consentimiento explícito del usuario. Cumplimiento
con la Ley N° 29733 de Protección de Datos Personales
del Perú.
RNF-05 Escalabilidad con
infraestructura
serverless
La arquitectura sobre Firebase (Firestore + Cloud
Functions) debe escalar automáticamente ante picos de
uso sin intervención manual. El objetivo es soportar
hasta 10,000 usuarios activos sin configuración de
servidores propios.
4. DEFINICIÓN DE HISTORIAS DE USUARIO (HU)
HU-01 Alerta
silenciosa
en
paradero
Como vecino que acaba de presenciar un
robo en el paradero "Fundición",
quiero activar una alerta rápida sin que el
agresor note que estoy reportando,
para que el serenazgo reciba mi ubicación y
actúe dentro de la hora dorada.
Ricardo - Vecino en
situación de riesgo
Criterios de aceptación
● La app vibra para confirmar el envío sin emitir sonido.
● La ubicación GPS se registra con error menor a 10 metros.
● El operador recibe la alerta en menos de 3 segundos.
HU-02 Reporte
rápido
por texto
Como comerciante que vio a una persona
sospechosa merodeando el mercado,
quiero describirlo brevemente en la app sin
necesidad de llamar a nadie,
para que la IA lo clasifique y llegue al
operador solo si realmente es relevante.
Vecino - Comerciante
del Mercado
Huamantanga
Criterios de aceptación
● El campo de texto acepta hasta 280 caracteres.
● Gemini devuelve la clasificación en menos de 2 segundos.
● El ciudadano ve la prioridad asignada tras enviar.
Registrador HU-03
ficha de
familiar
desaparec
ido

Como familiar de un adulto mayor que
desapareció en Zapallal,
quiero subir su foto y datos básicos en
menos de 2 minutos,
para que los vecinos del distrito la vean y
la IA analice cualquier avistamiento
automáticamente.
Milagros - Familiar en
crisis
Criterios de aceptación
● El formulario pide: foto, nombre, edad, descripción y zona.
● La ficha aparece activa en el feed comunitario al instante.
● El familiar puede desactivar la ficha cuando se encuentra a la
persona.
HU-04 Subir foto
de
avistamie
nto

Como vecino que vio a alguien que podría
ser una persona buscada,
quiero subir una foto desde la app,
para que el sistema la compare contra las
fichas activas y avise al familiar si hay
coincidencia.
Vecino - Colaborador
Criterios de aceptación
● El análisis facial devuelve resultado en menos de 5 segundos.
● Si no hay match, la foto no se almacena en el sistema.
● El vecino recibe confirmación de que la imagen fue procesada.
Asistente HU-05
alertas
desde la
app
(operador
)

Como operador de turno con muchos
reportes entrantes,
quiero ver solo las alertas P1 y P
ordenadas por urgencia con su ubicación en
mapa,
para despachar unidades rápido sin perder
tiempo filtrando ruido.
Operador - Serenazgo
de Puente Piedra
Criterios de aceptación
● La vista muestra P1 y P2 por defecto, con opción de ver todos.
● Puede marcar cada alerta como "Atendida" o "Descartada" con un
tap.
● Usa la misma app que el ciudadano, solo con rol diferente
HU-06 Ver estado
de mi
reportaje

Como vecino que reportó un incidente hace
unos minutos,
quiero ver si el serenazgo lo está
atendiendo o fue descartado,
para no quedarme con la duda ni tener que
llamar para preguntar.
Ciudadano -
Post-reporte
Criterios de aceptación
● El reporte muestra tres estados: Recibido, En atención, Cerrado.
● El ciudadano recibe una notificación push al cambiar el estado.
● Puede ver el historial de sus reportes anteriores desde su perfil.
HU-07 Registro
rápido con
teléfono
Como residente nuevo que quiere unirse a
la red de vigilancia,
quiero registrarme solo con mi número de
teléfono sin trámites complicados,
para empezar a usar la app en menos de 3
minutos.
Nuevo vecino
Criterios de aceptación
● El registro requiere solo número de teléfono + código SMS.
● El usuario elige su zona del distrito al completar el perfil.
● El proceso completo toma menos de 3 minutos.
HU-08 Recibir
alerta de
emergenci
a cercana
Como vecino en la zona donde ocurrió un
incidente P1,
quiero recibir una notificación push que me
avise brevemente de lo que ocurrió cerca,
para tomar precauciones o colaborar si
puedo, sin esperar enterarme por
WhatsApp.
Vecino - En radio de
incidente activo
Criterios de aceptación
● La notificación llega a usuarios en radio de 500 metros del incidente.
● El mensaje indica solo tipo de incidente y zona, sin datos personales.
● Se envía solo para alertas P1 confirmadas por el operador.
5. ARQUITECTURA DE LA SOLUCIÓN
El enfermedad técnica implementa una Arquitectura de Microservicios Desacoplados para

garantizar alta disponibilidad y proceso de IA asíncrona.

5.1. Pila Tecnológica

● Frontend: Flutter. Permite un desarrollo ágil para aplicaciones móviles
(Android/iOS) y una interfaz web administrativa, compartiendo una única base de
código.
● Backend & Data: Firebase.
○ Cloud Firestore: Base de datos NoSQL en tiempo real para la sincronización
de alertas.
○ Firebase Authentication: Gestión segura de la identidad de los vecinos.
○ Cloud Storage: Almacenamiento de evidencias fotográficas y fichas de
búsqueda.
○ Firestore Geopoints para la geolocalización
● Entorno de IA (Microservicios):
○ Cloud Functions: Sin cold start si se mantiene caliente; reemplaza “ Python +
FastAPI” para tareas livianas.
○ Scripts de Visión Computacional: Implementación de librerías para el
emparejamiento facial: Google ML Kit (Face Detection) + TensorFlow Lite con
un modelo liviano (MobileFaceNet).
○ Escala determinística/ probabilística: Integración de reglas simples basadas
en palabras clave (ej. "arma", "niño", "secuestro" → prioridad 1). Uso de IA
como fallback (casos más complejos) para el análisis de texto y procesamiento
de lenguaje natural (NLP) para clasificar y priorizar reportes automáticamente.
● Control de Versiones: GitHub (Repositorio centralizado con flujo de trabajo
GitFlow).
5.2 Arquitectura de la Solución y Componentes Técnicos
Usuario A abre la app, ve el mapa. Las alertas cercanas se carga desde Firestore
(cada 10 segundos o pull-to-refresh).
Usuario B reporta desesperación con foto.
La foto se sube a Almacenamiento en la nube.
Función en la nube extrae el incrustado facial usando ML Kit (Node.js puede
usar @google-cloud/vision? No, ML Kit no está en Node. Entonces mejor: el
cliente móvil extrae el embedding y lo sube directamente a Firestore. Esto es
clave para ahorrar servidor).
Se guarda en missing_people con incrustación, ubicación, marca de tiempo.
Usuario C (otro vecino) abre la cámara a una persona extraviada en la calle.
La aplicación extrae incrustada en el móvil.
Busca en Firestore los desaparecidos en una radio de 10km (trae todos,
compara localmente). Si hay match (similitud de coseno > umbral), muestra
alerta.
Botón de pánico:
Enviía ubicación a Firestore → Cloud Function dispara FCM a todos los
usuarios en radio 500m (lista se obtiene de otra colección users con
geolocalización).
6. IMPACTO Y PROMOCIÓN MUNICIPAL
Optimización de Recursos: Reducción del 40% en el despacho de unidades a "falsas
alarmas" mediante el filtrado de Gemini.
Reducción de Latencia: Desminución del tiempo de alerta comunitaria de minutos a
segundos, atacando la "Hora Dorada".
Modernización Institucional: Puente Piedra se posiciona como el primer distrito en
Lima Norte con una infraestructura de protección ciudadana basada en IA
Generativa y Visión Computacional.