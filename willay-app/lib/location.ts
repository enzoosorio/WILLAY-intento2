// Helpers de ubicación. La idea es que el resto de la app NUNCA llame a
// expo-location directo — siempre pasa por acá para obtener {coords + geohash}.
import * as Location from "expo-location";
import { GeoPoint } from "firebase/firestore";

import { encodeGeohash } from "./geohash";

export interface LocationResult {
  geopoint: GeoPoint;
  geohash: string;
  lat: number;
  lon: number;
  accuracy: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentWithGeohash(): Promise<LocationResult> {
  const granted = await requestLocationPermission();
  if (!granted) throw new Error("Permiso de ubicación denegado");
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude, accuracy } = pos.coords;
  return {
    geopoint: new GeoPoint(latitude, longitude),
    geohash: encodeGeohash(latitude, longitude),
    lat: latitude,
    lon: longitude,
    accuracy: accuracy ?? null,
  };
}
