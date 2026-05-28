import type { Zone } from "@/types/models";

export const ZONES: { value: Zone; label: string }[] = [
  { value: "zapallal", label: "Zapallal" },
  { value: "la_ensenada", label: "La Ensenada" },
  { value: "huamantanga", label: "Huamantanga" },
  { value: "centro", label: "Centro" },
  { value: "otros", label: "Otros" },
];

export const zoneLabel = (z: Zone | null | undefined): string =>
  ZONES.find((x) => x.value === z)?.label ?? "—";
