// Zonas y sectores oficiales del distrito de Puente Piedra
// Fuente: Municipalidad Distrital de Puente Piedra — Serenazgo

export const ZONES = [
  // ZONA SUR
  { value:"ensenada",   label:"La Ensenada",   zone:"SUR" },
  { value:"laderas",    label:"Laderas",        zone:"SUR" },
  { value:"chillon",    label:"Chillón",        zone:"SUR" },
  { value:"shangrila",  label:"Shangri-La",     zone:"SUR" },
  // ZONA CENTRO
  { value:"tambo_inga_oeste", label:"Tambo Inga Oeste", zone:"CENTRO" },
  { value:"tambo_inga_este",  label:"Tambo Inga Este",  zone:"CENTRO" },
  { value:"pampa_libre",      label:"Pampa Libre",      zone:"CENTRO" },
  { value:"gallinazos",       label:"Gallinazos",       zone:"CENTRO" },
  { value:"santa_rosa",       label:"Santa Rosa",       zone:"CENTRO" },
  { value:"cercado",          label:"Cercado",          zone:"CENTRO" },
  { value:"las_vegas",        label:"Las Vegas",        zone:"CENTRO" },
  { value:"la_grama",         label:"La Grama",         zone:"CENTRO" },
  { value:"copacabana",       label:"Copacabana",       zone:"CENTRO" },
  // ZONA NORTE
  { value:"el_dorado",    label:"El Dorado",    zone:"NORTE" },
  { value:"leoncio_prado",label:"Leoncio Prado",zone:"NORTE" },
  { value:"jerusalem",    label:"Jerusalén",    zone:"NORTE" },
  { value:"lomas",        label:"Lomas",        zone:"NORTE" },
];

export const ZONE_GROUPS = [
  { label:"🔴 Zona Sur",    zones: ZONES.filter(z=>z.zone==="SUR") },
  { label:"🟡 Zona Centro", zones: ZONES.filter(z=>z.zone==="CENTRO") },
  { label:"🔵 Zona Norte",  zones: ZONES.filter(z=>z.zone==="NORTE") },
];