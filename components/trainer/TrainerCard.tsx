import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from '../ui/PressableScale';
import { Glass } from '../ui/Glass';
import { Avatar } from '../ui/Bits';
import { T, type } from '../../constants/theme';
import { TrainerProfile } from '../../types/trainer';
import { useAuthStore } from '../../stores/authStore';
import { trainsAtGym } from '../../services/gyms';

interface Props {
  trainer: TrainerProfile;
  /** 'compact' = tall portrait card for carousels, 'full' = glass list row */
  variant: 'full' | 'compact';
}

/** Lowest session price as text; a coach without prices yet shows a dash, never "₹Infinity". */
const fromPrice = (t: TrainerProfile) => {
  const prices = [t.pricingOnline, t.pricingOffline].filter((p): p is number => !!p);
  return prices.length ? `₹${Math.min(...prices)}` : '–';
};

const open = (t: TrainerProfile) => router.push(`/trainer/${t.id}`);

export function TrainerCard({ trainer, variant }: Props) {
  const price = fromPrice(trainer);
  const rating = trainer.totalReviews > 0 ? trainer.rating.toFixed(1) : 'New';
  const myGymId = useAuthStore((s) => s.clientProfile?.gym?.id);
  const atMyGym = trainsAtGym(trainer, myGymId);
  const myCity = useAuthStore((s) => s.clientProfile?.city);
  const otherCity = !!myCity && !!trainer.city && trainer.city !== myCity; // shown because they train online

  if (variant === 'compact') {
    return (
      <PressableScale onPress={() => open(trainer)} style={styles.portrait} accessibilityLabel={`${trainer.name}, ${rating}, from ${price}`}>
        {trainer.profilePhoto ? (
          <Image source={{ uri: trainer.profilePhoto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        ) : (
          <Avatar name={trainer.name} size={170} radius={0} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.fade} />
        {trainer.isAvailableNow && (
          <View style={styles.openBadge}>
            <View style={styles.openDot} />
            <Text style={styles.openText}>Open</Text>
          </View>
        )}
        {atMyGym && (
          <View style={[styles.openBadge, styles.gymBadge]}>
            <Ionicons name="barbell" size={10} color="#fff" />
            <Text style={styles.openText}>Your gym</Text>
          </View>
        )}
        <Glass variant="clear" radius={16} style={styles.tag}>
          <Text style={styles.tagName} numberOfLines={1}>{trainer.name}</Text>
          <View style={styles.tagRow}>
            <Ionicons name="star" size={11} color={T.star} />
            <Text style={styles.tagMeta}>{rating}</Text>
            <Text style={styles.tagPrice}>{price}</Text>
          </View>
        </Glass>
      </PressableScale>
    );
  }

  return (
    <PressableScale onPress={() => open(trainer)} accessibilityLabel={`${trainer.name}, ${rating}, from ${price}`}>
      <Glass radius={T.radius.lg} style={styles.row}>
        <View>
          <Avatar uri={trainer.profilePhoto} name={trainer.name} size={62} radius={18} />
          {trainer.isAvailableNow && <View style={styles.rowDot} />}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={type.headline} numberOfLines={1}>{trainer.name}</Text>
          {atMyGym && (
            <View style={styles.gymPill}>
              <Ionicons name="barbell" size={11} color={T.ring2} />
              <Text style={styles.gymPillText}>Trains at your gym</Text>
            </View>
          )}
          {otherCity && (
            <View style={[styles.gymPill, styles.cityPill]}>
              <Ionicons name="videocam" size={11} color={T.ring3} />
              <Text style={[styles.gymPillText, { color: T.ring3 }]}>{trainer.city} · online</Text>
            </View>
          )}
          <Text style={type.caption} numberOfLines={1}>
            {trainer.specializations.slice(0, 2).join(' · ') || 'Personal trainer'}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={12} color={T.star} />
            <Text style={styles.meta}>{rating}{trainer.totalReviews > 0 ? ` (${trainer.totalReviews})` : ''}</Text>
            <Text style={styles.metaSep}>•</Text>
            <Text style={styles.meta}>{trainer.experience} yrs</Text>
            {trainer.sessionPreference !== 'offline' && (
              <>
                <Text style={styles.metaSep}>•</Text>
                <Ionicons name="videocam" size={12} color={T.text2} />
              </>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>{price}</Text>
          <Text style={type.caption}>/session</Text>
        </View>
      </Glass>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  portrait: { width: 160, height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: T.bgRaised },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '45%' },
  openBadge: {
    position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 99, paddingHorizontal: 8, height: 22,
  },
  openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.ring2 },
  openText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  gymBadge: { top: 36, backgroundColor: 'rgba(155,255,58,0.28)', gap: 4 },
  gymPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(155,255,58,0.14)', borderRadius: 99, paddingHorizontal: 8, height: 20 },
  cityPill: { backgroundColor: 'rgba(46,230,240,0.12)' },
  gymPillText: { color: T.ring2, fontSize: 11, fontWeight: '800' },
  tag: { position: 'absolute', left: 8, right: 8, bottom: 8, paddingHorizontal: 10, paddingVertical: 8 },
  tagName: { color: T.text, fontSize: 14, fontWeight: '800' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tagMeta: { color: T.text2, fontSize: 11, fontWeight: '700', flex: 1 },
  tagPrice: { color: T.text, fontSize: 13, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  rowDot: {
    position: 'absolute', right: -2, top: -2, width: 14, height: 14, borderRadius: 7,
    backgroundColor: T.ring2, borderWidth: 3, borderColor: T.bg,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  meta: { color: T.text2, fontSize: 12, fontWeight: '700' },
  metaSep: { color: T.text3, fontSize: 10 },
  price: { color: T.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
});
