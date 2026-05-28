// Helpers para subir blobs a Cloud Storage. Útil tanto para fichas como
// para avistamientos con match.
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "./firebase";

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return await res.blob();
}

export async function uploadMissingPhoto(personId: string, imageUri: string): Promise<string> {
  const ref = storageRef(getFirebaseStorage(), `missing/${personId}.jpg`);
  const blob = await uriToBlob(imageUri);
  await uploadBytes(ref, blob, { contentType: "image/jpeg" });
  return await getDownloadURL(ref);
}

export async function uploadSightingPhoto(sightingId: string, imageUri: string): Promise<string> {
  const ref = storageRef(getFirebaseStorage(), `sightings/${sightingId}.jpg`);
  const blob = await uriToBlob(imageUri);
  await uploadBytes(ref, blob, { contentType: "image/jpeg" });
  return await getDownloadURL(ref);
}
