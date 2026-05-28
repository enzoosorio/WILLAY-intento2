Universidad Nacional Mayor de San Marcos
Universidad del Perú. Decana de América
Facultad de Ingeniería de Sistemas e Informática
Escuela Profesional de Ingeniería de Software
Sistema Inteligente de Vigilancia Comunitaria y Localización de Personas
Vulnerables
Integrantes
Espinoza Pacífico Sebastián Jesús
Salazar Herrera Óscar Miguel
Osorio Ortiz, Enzo Martín
Docente
HUGO RAFAEL CORDERO SÁNCHEZ
LIMA – PERÚ
2026
1. Definición del Problema
1.1. Contexto de la Seguridad Ciudadana y Criminalidad
En los últimos años, el Perú ha experimentado un incremento crítico en los
índices de criminalidad, manifestado en un aumento de robos, extorsiones y
desapariciones forzadas. Según recientes informes técnicos del Instituto
Nacional de Estadística e Informática (INEI), la percepción de inseguridad
ciudadana supera el 85% en las principales zonas urbanas del país. Asimismo,
los reportes anuales de la Defensoría del Pueblo alertan sobre miles de notas de
desaparición, de las cuales un porcentaje alarmante corresponde a población
vulnerable (menores de edad y adultos mayores). Esta situación ha
sobrepasado en muchos casos la capacidad de respuesta de las instituciones
tradicionales. La Policía Nacional del Perú (PNP) enfrenta barreras
burocráticas y limitaciones logísticas que derivan en procesos de denuncia
lentos o, en situaciones críticas, en la omisión del procesamiento oportuno de
estas emergencias.
1.2. La Brecha de la "Hora Dorada"
En el ámbito de la criminología y la búsqueda de personas, los primeros
minutos y horas tras un incidente —conocidos como el periodo crítico— son
determinantes para el éxito de la resolución del caso.
● Personas Desaparecidas : La falta de un sistema de alerta temprana
impide recopilar de forma inmediata testimonios o registros visuales de
los últimos paraderos, reduciendo drásticamente las probabilidades de
hallazgo.
● Delitos Patrimoniales (Robos) : La carencia de un registro inmediato
sobre los medios de huida o rutas empleadas permite que los
perpetradores se alejen de la zona del crimen antes de que se active
cualquier cerco policial.
1.3. Justificación del Problema Social
El problema central radica en la asimetría de información y la desconexión
comunitaria. Mientras la información sobre un delito fluye de manera
desordenada en redes sociales, no existe una plataforma técnica que centralice
estos datos de forma estructurada para generar un vínculo social de protección.
Esto genera una sensación de vulnerabilidad e impunidad en la comunidad,
afectando directamente la equidad y el acceso a la justicia y seguridad.
2. Propuesta de Valor: Proyecto "Willay"
Willay (del quechua: avisar/comunicar) es una plataforma integral de seguridad
ciudadana que transforma la vigilancia pasiva en una red de respuesta activa y
colaborativa. A diferencia de las redes sociales convencionales, Willay ofrece:
● Especialización en Crisis: Herramientas diseñadas exclusivamente para la
gestión de delitos y desapariciones, eliminando el ruido informativo de otras
plataformas.
● Inteligencia de Respuesta: Priorización automática de alertas mediante IA,
asegurando que las emergencias críticas (riesgo de vida) reciban atención
inmediata.
● Acción Comunitaria Tecnificada: Democratiza el acceso a tecnología de
reconocimiento visual para la búsqueda de personas, reduciendo la
dependencia exclusiva de la burocracia institucional en las primeras horas.
3. Arquitectura de la Solución y Componentes Técnicos
Para garantizar la escalabilidad, el tiempo real y el cumplimiento de los lineamientos
del curso (Lineamiento 4), se propone la siguiente arquitectura:
3.1. Pila Tecnológica
● Frontend: Flutter. Permite un desarrollo ágil para aplicaciones
móviles (Android/iOS) y una interfaz web administrativa,
compartiendo una única base de código.
● Backend & Data: Firebase.
○ Cloud Firestore: Base de datos NoSQL en tiempo real para la
sincronización de alertas.
○ Firebase Authentication: Gestión segura de la identidad de los
vecinos.
○ Cloud Storage: Almacenamiento de evidencias fotográficas y
fichas de búsqueda.
○ Firestore Geopoints para la geolocalización
● Entorno de IA (Microservicios):
○ Cloud Functions: Sin cold start si se mantiene caliente;
reemplaza “ Python + FastAPI” para tareas livianas.
○ Scripts de Visión Computacional: Implementación de
librerías para el emparejamiento facial: Google ML Kit (Face
Detection) + TensorFlow Lite con un modelo liviano
(MobileFaceNet).
○ Escala determinística/ probabilística: Integración de reglas
simples basadas en palabras clave (ej. "arma", "niño",
"secuestro" → prioridad 1). Uso de IA como fallback (casos
más complejos) para el análisis de texto y procesamiento de
lenguaje natural (NLP) para clasificar y priorizar reportes
automáticamente.
● Control de Versiones: GitHub (Repositorio centralizado con flujo de
trabajo GitFlow).
4. Arquitectura de la Solución y Componentes Técnicos
Usuario A abre la app, ve el mapa. Las alertas cercanas se carga desde Firestore
(cada 10 segundos o pull-to-refresh).
Usuario B reporta desesperación con foto.
La foto se sube a Almacenamiento en la nube.
Función en la nube extrae el incrustado facial usando ML Kit (Node.js puede usar
@google-cloud/vision? No, ML Kit no está en Node. Entonces mejor: el
cliente móvil extrae el embedding y lo sube directamente a Firestore. Esto es
clave para ahorrar servidor).
Se guarda en missing_people con incrustación, ubicación, marca de tiempo.
Usuario C (otro vecino) abre la cámara a una persona extraviada en la calle.
La aplicación extrae incrustada en el móvil.
Busca en Firestore los desaparecidos en una radio de 10km (trae todos, compara
localmente). Si hay match (similitud de coseno > umbral), muerte alerta.
Botón de pánico:
Enviía ubicación a Firestore → Cloud Function dispara FCM a todos los
usuarios en radio 500m (lista se obtiene de otra colección usuarios con
geolocalización).
5. Rendimiento estimado MVP
Latencia pánico → notificación: ~2-5 segundos (dependencia de FCM). Coincidencia facial: < 500 ms
(todo local en el móvil).
Costo mensual: $0 si te mantienes en gratis nivel de Firebase (plan Spark).

5.1. Consideraciones para el Desarrollo Ágil
El proyecto se dividirá en tres componentes principales de software que se
gestionan en el tablero de metodología ágil:
● Módulo de Registro y Mapa: Visualización de incidentes.
● Módulo de Inteligencia: Integración de Gemini y Scripts de visión.
● Módulo de Notificación Crítica: Sistema de alertas en tiempo real.
6. Fase de Design Thinking
6.1. Fase 1: Empatizar
6.1.1. Técnicas de Investigación empleadas
● Entrevistas cualitativas: Se simularon/realizaron entrevistas a
ciudadanos que han sido víctimas de robos en los últimos 6 meses y a
personas que participan activamente en juntas vecinales.
● Observación (Shadowing Digital): Análisis del comportamiento de los
usuarios en grupos de WhatsApp vecinales y grupos de Facebook de
"Personas Desaparecidas Perú", identificando el desorden y la
desinformación.
6.1.2. Mapas de Empatía
Para profundizar, analizamos a nuestro usuario principal: El Vecino Alerta.
● ¿Qué ve? Noticias constantes de inseguridad, grupos de WhatsApp
llenos de mensajes irrelevantes (spam), poca presencia policial en las
calles.
● ¿Qué oye? Que "llamar a la policía es por gusto", que "los delincuentes
salen libres rápido", que los vecinos deben organizarse solos.
● ¿Qué piensa y siente? Impotencia frente a la delincuencia. Miedo a
que le pase algo a su familia. Deseo de ayudar, pero temor a
represalias.
● ¿Qué dice y hace? Participa en grupos vecinales, comparte capturas de
cámaras de seguridad en redes sociales, pero siente que la información
se pierde.
● Dolores (Pains): La lentitud de respuesta de las autoridades y la falta
de una herramienta técnica confiable.
● Ganancias (Gains): Sentir que su comunidad es un entorno seguro y
que su reporte realmente genera una acción inmediata.
6.2. Fase 2: Definir
6.2.1. Personas de Usuario (Perfiles Detallados)
Persona A: "Ricardo, el Vigilante Comunitario"
● Perfil: 45 años, padre de familia, vive en un distrito con alto índice de
robos al paso.
● Motivación: Quiero una herramienta que le permita avisar a sus
vecinos sobre un sostenoso en la cuadra sin tener que escribir un
texto largo en un momento de tensión.
Persona B: "Lucía, la Buscadora Esperanza"
● Perfil: 28 años, joven profesional cuyo familiar adulto mayor se ha
extraviado.
● Motivación: Necesita que la foto de su abuelo llegue a todos los
conductores y vecinos de la zona en menos de 10 minutos, ya que las
primeras horas son vitales.
6.2.2. Punto de Vista (POV) - Punto de Vista
Usuario Necesidad Insight (Revelación)

Vecinos
organizados
Una plataforma de alerta
inmediata y
estructurada.
Los canales actuales (redes sociales)
generan caos y ansiedad en lugar de
soluciones efectivas durante una
emergencia.
Familiares de
desaparecidos
Un sistema de
reconocimiento y
difusión visual masivo.
La "hora dorada" se pierde en trámitas
burocráticos, mientras que la tecnología
de IA podría procesar visitantes
ciudadanos en segundos.
6.2.3. Preguntas "¿Cómo podríamos" (¿Cómo podemos?)
Para guiar la idea, planteamos:
● ¿Cómo podemos reducir el tiempo de difusión de una desesperación
¿de horas a segundos?
● ¿Cómo podríamos filtrar los informes falsos o irrelevantes mediante IA
¿para no saturar al usuario?
● ¿Cómo podemos incentivar la colaboración ciudadana sin exponente la
¿identidad o seguridad del informante?

6.3. Fase 3: Idear
Tras el análisis, se seleccionaron las siguientes funciones "rompedoras" para Willay:
Botón de Pánico Inteligente: Enviía ubicación y una alerta sonora distintiva a la
de otras aplicaciones a los vecinos cercanos.
Facial Match de IA: Al subir una foto de una persona encontrada en la calle, el
sistema busca coincidencias en milisegundos con la base de datos de
desaparecidos.
Priorización por PNL: La IA (Géminis) analiza si el informe es "Robo a mano
armada" (Prioridad 1) o "Vehículo mal estado" (Prioridad 3).