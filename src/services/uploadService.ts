import * as ImagePicker from "expo-image-picker";

export async function pickImageAsync() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to choose images.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.25,
    base64: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  // No Firebase Storage mode: save a small base64 data URL in Firestore.
  // This makes images appear again after refresh and on other screens.
  if (asset.base64) {
    const mimeType = asset.mimeType || (asset.uri?.toLowerCase().includes("png") ? "image/png" : "image/jpeg");
    return `data:${mimeType};base64,${asset.base64}`;
  }

  return asset.uri ?? null;
}

export async function uploadImageAsync(uri: string, _path?: string) {
  return uri;
}
