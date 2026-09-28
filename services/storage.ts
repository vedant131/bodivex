import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/** Uploads a local image (file:// URI from the picker) and returns its public URL. */
export const uploadImage = async (localUri: string, path: string): Promise<string> => {
  if (/^https?:\/\//.test(localUri)) return localUri; // already uploaded
  const blob = await (await fetch(localUri)).blob();
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(fileRef);
};
