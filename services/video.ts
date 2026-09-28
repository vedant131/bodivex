import { Linking, Alert } from 'react-native';

/**
 * Opens the session's video room. Note: free Jitsi Meet (browser/app, no account for
 * joiners; the first person may be asked to sign in to start the room). Agora in-app video
 * replaces this once the app moves to a development build.
 */
export const openVideoCall = (roomId?: string) => {
  if (!roomId) {
    Alert.alert('Video room not ready', 'The room is created when the trainer confirms the session.');
    return;
  }
  Linking.openURL(`https://meet.jit.si/${roomId}`);
};
