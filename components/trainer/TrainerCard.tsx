import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS } from '../../constants/colors';
import { TrainerProfile } from '../../types/trainer';

interface Props {
  trainer: TrainerProfile;
  variant: 'full' | 'compact';
}

export function TrainerCard({ trainer, variant }: Props) {
  const handlePress = () => router.push(`/trainer/${trainer.id}`);

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={handlePress} activeOpacity={0.85}>
        {/* Photo */}
        <View style={styles.compactPhotoContainer}>
          {trainer.profilePhoto ? (
            <Image source={{ uri: trainer.profilePhoto }} style={styles.compactPhoto} contentFit="cover" />
          ) : (
            <View style={styles.compactPhotoPlaceholder}>
              <Ionicons name="person" size={28} color={COLORS.textMuted} />
            </View>
          )}
          {trainer.isAvailableNow && <View style={styles.availableDot} />}
        </View>
        {/* Info */}
        <Text style={styles.compactName} numberOfLines={1}>{trainer.name}</Text>
        <View style={styles.compactRating}>
          <Ionicons name="star" size={12} color="#FFB300" />
          <Text style={styles.compactRatingText}>{trainer.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.compactPrice}>
          {trainer.pricingOnline
            ? `₹${trainer.pricingOnline}/hr`
            : trainer.pricingOffline
            ? `₹${trainer.pricingOffline}/hr`
            : 'View Profile'}
        </Text>
      </TouchableOpacity>
    );
  }

  // Full card
  return (
    <TouchableOpacity style={styles.fullCard} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.fullCardRow}>
        {/* Photo */}
        <View style={styles.fullPhotoContainer}>
          {trainer.profilePhoto ? (
            <Image source={{ uri: trainer.profilePhoto }} style={styles.fullPhoto} contentFit="cover" />
          ) : (
            <View style={styles.fullPhotoPlaceholder}>
              <Ionicons name="person" size={36} color={COLORS.textMuted} />
            </View>
          )}
          {trainer.isAvailableNow && (
            <View style={styles.availableBadge}>
              <Text style={styles.availableBadgeText}>Now</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.fullCardDetails}>
          <View style={styles.fullCardHeader}>
            <Text style={styles.fullName} numberOfLines={1}>{trainer.name}</Text>
            {trainer.isKYCApproved && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{trainer.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.reviewCount}>({trainer.totalReviews} reviews)</Text>
            <View style={styles.dot} />
            <Text style={styles.sessionsText}>{trainer.totalSessions}+ sessions</Text>
          </View>

          <Text style={styles.cityText}>
            <Ionicons name="location" size={12} color={COLORS.textMuted} /> {trainer.city}
            {' · '}{trainer.experience} yr{trainer.experience !== 1 ? 's' : ''} exp
          </Text>

          {/* Specializations */}
          <View style={styles.specRow}>
            {trainer.specializations.slice(0, 2).map((s) => (
              <View key={s} style={styles.specChip}>
                <Text style={styles.specText}>{s}</Text>
              </View>
            ))}
            {trainer.specializations.length > 2 && (
              <Text style={styles.moreSpec}>+{trainer.specializations.length - 2}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Pricing & Booking Action Row */}
      <View style={styles.pricingRow}>
        <View style={styles.pricingStack}>
          {trainer.pricingOnline ? (
            <View style={styles.pricingItem}>
              <Ionicons name="videocam" size={13} color={COLORS.primary} />
              <Text style={styles.pricingText}>₹{trainer.pricingOnline}<Text style={styles.pricingUnit}>/online</Text></Text>
            </View>
          ) : null}
          {trainer.pricingOffline ? (
            <View style={styles.pricingItem}>
              <Ionicons name="barbell" size={13} color={COLORS.textSecondary} />
              <Text style={styles.pricingText}>₹{trainer.pricingOffline}<Text style={styles.pricingUnit}>/in-person</Text></Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.bookBtn} onPress={handlePress} activeOpacity={0.85}>
          <Text style={styles.bookBtnText}>View Coach</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Compact
  compactCard: {
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 6,
    marginLeft: 20,
  },
  compactPhotoContainer: { position: 'relative', width: 56, height: 56 },
  compactPhoto: { width: 56, height: 56, borderRadius: 28 },
  compactPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  compactRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  compactPrice: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // Full
  fullCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  fullCardRow: { flexDirection: 'row', gap: 14 },
  fullPhotoContainer: { position: 'relative' },
  fullPhoto: { width: 80, height: 80, borderRadius: 16 },
  fullPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  availableBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -16 }],
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availableBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  fullCardDetails: { flex: 1, gap: 6 },
  fullCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fullName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  reviewCount: { fontSize: 12, color: COLORS.textMuted },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted },
  sessionsText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  cityText: { fontSize: 12, color: COLORS.textSecondary },
  specRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  specChip: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  specText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  moreSpec: { fontSize: 11, color: COLORS.textMuted, alignSelf: 'center', fontWeight: '600' },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pricingStack: { gap: 3 },
  pricingItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pricingText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '800' },
  pricingUnit: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  bookBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  bookBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
});
