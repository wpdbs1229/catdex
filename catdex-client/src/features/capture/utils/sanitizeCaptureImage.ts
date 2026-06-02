import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const maxImageWidth = 1600;

export async function sanitizeCaptureImage(uri: string) {
  const result = await manipulateAsync(uri, [{ resize: { width: maxImageWidth } }], {
    compress: 0.88,
    format: SaveFormat.JPEG,
  });

  return result.uri;
}
