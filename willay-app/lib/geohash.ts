// Wrapper sobre ngeohash con la precisión que usamos en MVP (precision 6 ≈ 1.2km).
// Misma idea de "geohash + 8 vecinos" que usaríamos con FCM topics.
import ngeohash from "ngeohash";

export const GEOHASH_PRECISION = 6;

export function encodeGeohash(lat: number, lon: number, precision = GEOHASH_PRECISION): string {
  return ngeohash.encode(lat, lon, precision);
}

/** Devuelve el geohash propio + los 8 vecinos (norte, sur, este, oeste, diagonales). */
export function neighborhoodGeohashes(geohash: string): string[] {
  const neighbors = ngeohash.neighbors(geohash);
  return [geohash, ...neighbors];
}
