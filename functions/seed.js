const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, GeoPoint, FieldValue } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const LOCATIONS = {
  centro:      [{ latitude: -11.8680, longitude: -77.0730 }, { latitude: -11.8720, longitude: -77.0750 }],
  zapallal:    [{ latitude: -11.8350, longitude: -77.0950 }, { latitude: -11.8380, longitude: -77.0920 }],
  la_ensenada: [{ latitude: -11.8900, longitude: -77.1050 }, { latitude: -11.8850, longitude: -77.1020 }],
  huamantanga: [{ latitude: -11.8500, longitude: -77.0450 }, { latitude: -11.8520, longitude: -77.0420 }],
  otros:       [{ latitude: -11.9000, longitude: -77.0650 }, { latitude: -11.9050, longitude: -77.0700 }],
};

const REPORTS = [
  { type: "panic",  priority: "P1", status: "received",  zone: "centro",      authorName: "Oscar Salazar",   text: null,                                                                                                  categoryLabel: null,        incidentType: "otro" },
  { type: "text",   priority: "P1", status: "attending", zone: "zapallal",    authorName: "Maria Garcia",    text: "Robo a mano armada frente al mercado Zapallal, el delincuente huyo hacia la avenida principal",      categoryLabel: "Robo",      incidentType: "robo" },
  { type: "text",   priority: "P1", status: "received",  zone: "la_ensenada", authorName: "Juan Perez",      text: "Balacera en la esquina de La Ensenada con jiron Las Flores, hay heridos",                           categoryLabel: "Asalto",    incidentType: "asalto" },
  { type: "panic",  priority: "P1", status: "received",  zone: "centro",      authorName: "Rosa Quispe",     text: null,                                                                                                  categoryLabel: null,        incidentType: "otro" },
  { type: "text",   priority: "P2", status: "received",  zone: "centro",      authorName: "Carlos Mendoza",  text: "Pelea entre vecinos en el parque central de Puente Piedra, varios golpeados",                        categoryLabel: "Violencia", incidentType: "violencia_familiar" },
  { type: "text",   priority: "P2", status: "received",  zone: "huamantanga", authorName: "Ana Torres",      text: "Incendio en deposito de materiales cerca de la carretera, se extiende rapido",                      categoryLabel: "Incendio",  incidentType: "otro" },
  { type: "text",   priority: "P2", status: "attending", zone: "zapallal",    authorName: "Pedro Flores",    text: "Extorsion telefonica a comerciantes de la zona, ya son 3 afectados esta semana",                    categoryLabel: "Extorsion", incidentType: "otro" },
  { type: "text",   priority: "P2", status: "received",  zone: "la_ensenada", authorName: "Luis Chavez",     text: "Persona desmayada en la via publica cerca del colegio, necesita atencion medica urgente",           categoryLabel: "Salud",     incidentType: "accidente" },
  { type: "text",   priority: "P3", status: "received",  zone: "centro",      authorName: "Carmen Ramos",    text: "Grupo de jovenes sospechosos merodeando la zona del mercado desde hace una hora",                   categoryLabel: "Rescate",   incidentType: "persona_sospechosa" },
  { type: "text",   priority: "P3", status: "closed",    zone: "otros",       authorName: "Jorge Vargas",    text: "Perros callejeros atacando a transeuentes en el parque, varios mordidos",                           categoryLabel: "Otros",     incidentType: "otro" },
  { type: "text",   priority: "P3", status: "received",  zone: "zapallal",    authorName: "Sofia Luna",      text: "Grafitis en la fachada del colegio, pintas con mensajes ofensivos",                                 categoryLabel: "Otros",     incidentType: "vandalismo" },
  { type: "text",   priority: "P3", status: "received",  zone: "huamantanga", authorName: "Miguel Castro",   text: "Alumbrado publico apagado en 3 cuadras, zona oscura y peligrosa en la noche",                      categoryLabel: "Otros",     incidentType: "otro" },
];

const MISSING_PERSONS = [
  {
    name: "Maria Elena Quispe Huanca", age: 67, category: "perdida",
    lastSeenZone: "zapallal", lastSeenGeohash: "",
    description: "Adulta mayor con Alzheimer. Vestia blusa rosada y falda azul. Desaparecio el martes por la tarde del mercado de Zapallal. Responde al nombre de Elena.",
    photoUrl: "", embedding: null, active: true,
  },
  {
    name: "Kevin Rodrigo Mamani", age: 15, category: "perdida",
    lastSeenZone: "centro", lastSeenGeohash: "",
    description: "Adolescente de 15 anos. Llevaba uniforme escolar azul del colegio San Pedro. No llego a casa despues del colegio el viernes.",
    photoUrl: "", embedding: null, active: true,
  },
  {
    name: "Carlos Rimachi", age: 32, category: "buscada",
    lastSeenZone: "la_ensenada", lastSeenGeohash: "",
    description: "Sospechoso de robo a mano armada en La Ensenada. Contextura gruesa, cicatriz en mejilla izquierda, tatuaje de serpiente en cuello. Peligroso.",
    photoUrl: "", embedding: null, active: true,
  },
];

function randomLoc(zone) {
  const locs = LOCATIONS[zone] || LOCATIONS.centro;
  const base = locs[Math.floor(Math.random() * locs.length)];
  return new GeoPoint(
    base.latitude  + (Math.random() - 0.5) * 0.005,
    base.longitude + (Math.random() - 0.5) * 0.005
  );
}

async function seed() {
  console.log("Iniciando seed de datos de prueba...\n");

  console.log("Creando reportes...");
  for (const r of REPORTS) {
    await db.collection("reports").add({
      authorUid:     "seed-" + Math.random().toString(36).slice(2, 8),
      authorName:    r.authorName,
      type:          r.type,
      incidentType:  r.incidentType,
      categoryLabel: r.categoryLabel,
      text:          r.text,
      priority:      r.priority,
      status:        r.status,
      zone:          r.zone,
      location:      randomLoc(r.zone),
      geohash:       "",
      attendedBy:    r.status === "attending" ? "operator-seed" : null,
      photoUrl:      null,
      createdAt:     FieldValue.serverTimestamp(),
      updatedAt:     FieldValue.serverTimestamp(),
    });
    console.log("  OK [" + r.priority + "] " + (r.categoryLabel ?? "Panico") + " - " + r.zone + " (" + r.authorName + ")");
  }

  console.log("\nCreando fichas de personas...");
  for (const p of MISSING_PERSONS) {
    await db.collection("missing_persons").add({
      ...p,
      registrantUid: "seed-operator",
      createdAt: FieldValue.serverTimestamp(),
      closedAt: null,
    });
    console.log("  OK [" + p.category.toUpperCase() + "] " + p.name + " - " + p.lastSeenZone);
  }

  console.log("\nSeed completado:");
  console.log("  " + REPORTS.length + " reportes creados");
  console.log("  " + MISSING_PERSONS.length + " fichas de personas creadas");
}

seed().catch(console.error).finally(() => process.exit(0));