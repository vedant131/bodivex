import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/** Uploads a local file (file:// URI from the picker) and returns its public URL. */
export const uploadImage = async (localUri: string, path: string, fallbackType = 'image/jpeg'): Promise<string> => {
  if (/^https?:\/\//.test(localUri)) return localUri; // already uploaded
  const blob = await (await fetch(localUri)).blob();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || fallbackType });
  return getDownloadURL(fileRef);
};

export const uploadVideo = (localUri: string, path: string) => uploadImage(localUri, path, 'video/mp4');
