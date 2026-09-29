import { uploadFile } from './backend';

/** Uploads a local image (file:// URI from the picker) and returns its public URL. */
export const uploadImage = (localUri: string, path: string) => uploadFile(localUri, path, 'image/jpeg');

export const uploadVideo = (localUri: string, path: string) => uploadFile(localUri, path, 'video/mp4');
