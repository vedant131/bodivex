import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../ui/PressableScale';
import { Glass } from '../ui/Glass';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { T, type } from '../../constants/theme';

export const INTRO_MIN_S = 30;
export const INTRO_MAX_S = 60;
const INTRO_MAX_MB = 45; // storage caps files at 50MB (free plan)

/** Muted, looping autoplay clip; tap to toggle sound. */
export function IntroVideoPlayer({ uri, height = 220, radius = T.radius.xl, soundBottom = 12 }: {
  uri: string; height?: number; radius?: number; soundBottom?: number;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  return (
    <PressableScale onPress={() => { player.muted = !player.muted; }} haptic={false}
      accessibilityLabel={muted ? 'Intro video, tap for sound' : 'Intro video, tap to mute'}>
      <View style={[styles.frame, { height, borderRadius: radius }]}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        <View style={[styles.sound, { bottom: soundBottom }]}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color="#fff" />
        </View>
      </View>
    </PressableScale>
  );
}

/** Record or choose a 30–60s intro. Returns a local file:// uri (upload on save). */
export function IntroVideoPicker({ uri, onChange }: { uri?: string; onChange: (uri: string) => void }) {
  const [busy, setBusy] = useState(false);

  const pick = async (camera: boolean) => {
    setBusy(true);
    try {
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['videos'],
        videoMaxDuration: INTRO_MAX_S,
        // iOS: phones shoot 4K HEVC (100MB+/min). Record at VGA and transcode picks to 540p H.264,
        // which stays well under the upload limit and also plays on Android.
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.VGA640x480,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_960x540,
      };
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        Alert.alert('Camera access needed', 'Allow camera access in Settings to record your intro.');
        return;
      }
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled) return;
      const a = res.assets[0];
      const secs = (a.duration ?? 0) / 1000; // ms per expo-image-picker
      // Note: some web pickers report no duration; the storage rule still caps size.
      if (a.duration && (secs < INTRO_MIN_S - 0.5 || secs > INTRO_MAX_S + 0.5)) {
        Alert.alert('Video length', `Your clip is ${Math.round(secs)}s. It needs to be ${INTRO_MIN_S}–${INTRO_MAX_S} seconds.`);
        return;
      }
      // Note: Android pickers can't compress; a 1080p minute is ~100MB. Ask for 720p there
      // until we add on-device compression (needs a development build, not Expo Go).
      if (a.fileSize && a.fileSize > INTRO_MAX_MB * 1024 * 1024) {
        Alert.alert('Video too large', `This clip is ${Math.round(a.fileSize / 1048576)} MB (max ${INTRO_MAX_MB} MB). Record it at 720p in your camera settings, or pick a shorter clip.`);
        return;
      }
      onChange(a.uri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {uri ? (
        <IntroVideoPlayer key={uri} uri={uri} />
      ) : (
        <Glass radius={T.radius.lg} style={styles.empty}>
          <Ionicons name="videocam-outline" size={28} color={T.text2} />
          <Text style={type.headline}>{INTRO_MIN_S}–{INTRO_MAX_S} second intro</Text>
          <Text style={[type.caption, { textAlign: 'center' }]}>
            Say hi, show where you train and how you coach. It plays muted at the top of your profile.
          </Text>
        </Glass>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button title={uri ? 'Re-record' : 'Record'} icon="videocam" variant="glass" onPress={() => pick(true)} disabled={busy} /></View>
        <View style={{ flex: 1 }}><Button title="Choose" icon="images" variant="glass" onPress={() => pick(false)} disabled={busy} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#000' },
  sound: {
    position: 'absolute', right: 12, bottom: 12, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', gap: 6, padding: 22 },
});
