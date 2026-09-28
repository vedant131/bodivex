import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';
import { logout as signOutUser } from '../../services/auth';
import {
  updateTrainerRates,
  updateTrainerProfile,
  addTransformation,
  getTransformations,
  getTrainerQA,
  answerTrainerQuestion,
  getTrainerReviews,
} from '../../services/trainers';
import { COLORS } from '../../constants/colors';
import { Transformation, TrainerQA } from '../../types/trainer';

export default function TrainerProfileManageScreen() {
  const { user, trainerProfile, setTrainerProfile } = useAuthStore();
  const [showEditRatesModal, setShowEditRatesModal] = useState(false);
  const [onlineRate, setOnlineRate] = useState(trainerProfile?.pricingOnline?.toString() ?? '499');
  const [offlineRate, setOfflineRate] = useState(trainerProfile?.pricingOffline?.toString() ?? '799');

  // Modals for Coach Tools
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [beforeUri, setBeforeUri] = useState<string | null>(null);
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploadingTransform, setIsUploadingTransform] = useState(false);

  // Q&A Management
  const [showQAModal, setShowQAModal] = useState(false);
  const [qaList, setQaList] = useState<TrainerQA[]>([]);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isAnsweringQA, setIsAnsweringQA] = useState<string | null>(null);

  // Selected Asker Profile Quick View Modal
  const [selectedAsker, setSelectedAsker] = useState<{
    id: string;
    name: string;
    role: 'client' | 'trainer';
    photo?: string;
  } | null>(null);

  // Reviews Modal
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  const activeTrainerId = trainerProfile?.id ?? user?.id ?? '';

  useEffect(() => {
    if (activeTrainerId) {
      getTrainerQA(activeTrainerId).then(setQaList);
      getTrainerReviews(activeTrainerId).then(setReviewsList);
    }
  }, [activeTrainerId]);

  const handleUpdateRates = async () => {
    if (!trainerProfile) return;
    const newOnline = Number(onlineRate);
    const newOffline = Number(offlineRate);

    if (isNaN(newOnline) || isNaN(newOffline)) {
      Alert.alert('Please enter valid numeric rates');
      return;
    }

    try {
      await updateTrainerRates(trainerProfile.id, {
        pricingOnline: newOnline,
        pricingOffline: newOffline,
      });

      const updated = {
        ...trainerProfile,
        pricingOnline: newOnline,
        pricingOffline: newOffline,
      };
      setTrainerProfile(updated);
      setShowEditRatesModal(false);
      Alert.alert('Rates updated', 'Existing bookings keep the price they were booked at.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const pickImage = async (type: 'before' | 'after') => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        if (type === 'before') {
          setBeforeUri(res.assets[0].uri);
        } else {
          setAfterUri(res.assets[0].uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not pick image');
    }
  };

  const handleUploadTransformation = async () => {
    if (!beforeUri || !afterUri) {
      Alert.alert('Missing Photos', 'Please select both Before and After photos.');
      return;
    }

    setIsUploadingTransform(true);
    try {
      await addTransformation({
        trainerId: activeTrainerId,
        beforePhotoUrl: beforeUri,
        afterPhotoUrl: afterUri,
        caption: caption.trim() || 'Client transformation journey',
        clientConsentGiven: true,
      });

      Alert.alert('Uploaded', 'The transformation is now on your public profile.');
      setBeforeUri(null);
      setAfterUri(null);
      setCaption('');
      setShowTransformModal(false);
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setIsUploadingTransform(false);
    }
  };

  const handleAnswerQA = async (qaId: string) => {
    const text = replyTextMap[qaId]?.trim();
    if (!text) return;

    setIsAnsweringQA(qaId);
    try {
      await answerTrainerQuestion(qaId, text);
      setQaList((prev) =>
        prev.map((q) => (q.id === qaId ? { ...q, answer: text, answeredAt: new Date() } : q))
      );
      setReplyTextMap((prev) => ({ ...prev, [qaId]: '' }));
      Alert.alert('Answer Published! 💬', 'Your response is now visible publicly to all clients.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsAnsweringQA(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Bodivex?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              {trainerProfile?.profilePhoto ? (
                <Image source={{ uri: trainerProfile.profilePhoto }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{trainerProfile?.name?.[0] ?? 'T'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{trainerProfile?.name || 'Coach'}</Text>
              <Text style={styles.city}>{trainerProfile?.city || 'Mumbai'} · {trainerProfile?.experience || 3} yrs experience</Text>

              <View style={styles.badgeRow}>
                <View style={styles.kycBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
                  <Text style={styles.kycText}>Aadhaar & PAN Verified</Text>
                </View>
                <View style={styles.bankBadge}>
                  <Ionicons name="card" size={12} color={COLORS.primary} />
                  <Text style={styles.bankText}>Bank Linked</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Public View Shortcut */}
        {trainerProfile && (
          <TouchableOpacity
            style={styles.previewCard}
            onPress={() => router.push(`/trainer/${trainerProfile.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle}>👁️ View Public Profile</Text>
              <Text style={styles.previewSub}>See how clients discover and view your profile</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Pricing Management Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Session Pricing</Text>
            <TouchableOpacity onPress={() => setShowEditRatesModal(true)}>
              <Text style={styles.editLink}>Update Rates</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rateRow}>
            <View style={styles.rateBox}>
              <Text style={styles.rateBoxTitle}>Online Video</Text>
              <Text style={styles.rateBoxPrice}>₹{trainerProfile?.pricingOnline ?? 499}/hr</Text>
              <Text style={styles.rateBoxSub}>Per live session</Text>
            </View>
            <View style={styles.rateBox}>
              <Text style={styles.rateBoxTitle}>In-Person Offline</Text>
              <Text style={styles.rateBoxPrice}>₹{trainerProfile?.pricingOffline ?? 799}/hr</Text>
              <Text style={styles.rateBoxSub}>At gym / field</Text>
            </View>
          </View>
        </View>

        {/* Coach Growth & Engagement Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile & Community Tools</Text>
          <Text style={styles.sectionSub}>Manage public transformations, community inquiries, and client ratings</Text>

          <View style={styles.coachToolsGrid}>
            {/* 1. Upload Transformation */}
            <TouchableOpacity
              style={styles.coachToolCard}
              onPress={() => setShowTransformModal(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.toolIconBg, { backgroundColor: `${COLORS.primary}15` }]}>
                <Ionicons name="camera" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>Upload Transformation</Text>
                <Text style={styles.toolSub}>Post Before & After photos with AI verification</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* 2. Answer Q&A */}
            <TouchableOpacity
              style={styles.coachToolCard}
              onPress={() => setShowQAModal(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.toolIconBg, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubbles" size={22} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.toolTitle}>Community Q&A</Text>
                  {qaList.filter((q) => !q.answer).length > 0 && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>
                        {qaList.filter((q) => !q.answer).length} new
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.toolSub}>Answer public questions from prospective clients</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* 3. Client Reviews */}
            <TouchableOpacity
              style={styles.coachToolCard}
              onPress={() => setShowReviewsModal(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.toolIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="star" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>Client Reviews & Ratings</Text>
                <Text style={styles.toolSub}>
                  {reviewsList.length} verified reviews · ⭐ {trainerProfile?.rating?.toFixed(1) || '5.0'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            {/* 4. Arena Rankings */}
            <TouchableOpacity
              style={styles.coachToolCard}
              onPress={() => router.push('/leaderboard')}
              activeOpacity={0.85}
            >
              <View style={[styles.toolIconBg, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="trophy" size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>Bodivex Arena Standings</Text>
                <Text style={styles.toolSub}>
                  View your rank in {trainerProfile?.city || 'your city'} and Pan-India
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio & Gym */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio & Coaching Description</Text>
          <Text style={styles.bioText}>
            {trainerProfile?.bio ||
              'Certified fitness coach dedicated to sustainable fat loss, progressive strength building, and posture correction.'}
          </Text>

          {trainerProfile?.gymLocation && (
            <View style={styles.gymRow}>
              <Ionicons name="barbell" size={18} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.gymName}>{trainerProfile.gymLocation.name}</Text>
                <Text style={styles.gymAddress}>{trainerProfile.gymLocation.address}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Specializations & Certs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations</Text>
          <View style={styles.specChips}>
            {(trainerProfile?.specializations ?? ['Weight Loss', 'Muscle Gain', 'HIIT']).map((s) => (
              <View key={s} style={styles.specChip}>
                <Text style={styles.specText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings & Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Rates Modal */}
      <Modal visible={showEditRatesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Coaching Rates</Text>
            <Text style={styles.modalSub}>
              Existing bookings keep the price they were booked at.
            </Text>

            <Text style={styles.inputLabel}>Online Session Rate (₹ / hr)</Text>
            <TextInput
              style={styles.rateInput}
              keyboardType="number-pad"
              value={onlineRate}
              onChangeText={setOnlineRate}
            />

            <Text style={styles.inputLabel}>In-Person Offline Rate (₹ / hr)</Text>
            <TextInput
              style={styles.rateInput}
              keyboardType="number-pad"
              value={offlineRate}
              onChangeText={setOfflineRate}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditRatesModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveRateBtn} onPress={handleUpdateRates}>
                <Text style={styles.saveRateText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 1. Upload Transformation Modal ── */}
      <Modal visible={showTransformModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Upload Client Transformation</Text>
              <TouchableOpacity onPress={() => setShowTransformModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Bodivex uses AI verification to ensure photo authenticity, preventing filtered or stolen results.
            </Text>

            {/* Photos Picker Row */}
            <View style={styles.photoPickerRow}>
              {/* Before Photo */}
              <TouchableOpacity
                style={styles.photoPickerBox}
                onPress={() => pickImage('before')}
                activeOpacity={0.8}
              >
                {beforeUri ? (
                  <Image source={{ uri: beforeUri }} style={styles.pickedImage} contentFit="cover" />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <Ionicons name="image-outline" size={28} color={COLORS.primary} />
                    <Text style={styles.photoPickerLabel}>Before Photo</Text>
                    <Text style={styles.photoPickerSub}>Tap to choose</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />

              {/* After Photo */}
              <TouchableOpacity
                style={styles.photoPickerBox}
                onPress={() => pickImage('after')}
                activeOpacity={0.8}
              >
                {afterUri ? (
                  <Image source={{ uri: afterUri }} style={styles.pickedImage} contentFit="cover" />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <Ionicons name="trophy-outline" size={28} color={COLORS.success} />
                    <Text style={styles.photoPickerLabel}>After Photo</Text>
                    <Text style={styles.photoPickerSub}>Tap to choose</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Caption */}
            <Text style={styles.inputLabel}>Story & Results Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="e.g. 12 weeks of strength training & deficit diet. Dropped 14kg with clean macros!"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              value={caption}
              onChangeText={setCaption}
            />

            <View style={styles.aiBadgeBanner}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
              <Text style={styles.aiBadgeText}>
                Includes Bodivex AI authenticity badge to increase client trust
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowTransformModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveRateBtn,
                  (!beforeUri || !afterUri || isUploadingTransform) && { opacity: 0.6 },
                ]}
                onPress={handleUploadTransformation}
                disabled={!beforeUri || !afterUri || isUploadingTransform}
              >
                {isUploadingTransform ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveRateText}>Publish Transformation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 2. Answer Community Q&A Modal ── */}
      <Modal visible={showQAModal} transparent animationType="slide" onRequestClose={() => setShowQAModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Community Q&A Inquiries</Text>
              <TouchableOpacity onPress={() => setShowQAModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Public inquiries asked by clients and fellow coaches. Tap on any profile to see who asked!
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420, marginTop: 8 }}>
              {qaList.length === 0 ? (
                <View style={styles.emptyQABox}>
                  <Ionicons name="chatbubbles-outline" size={36} color={COLORS.textMuted} />
                  <Text style={styles.emptyQAText}>No questions asked yet</Text>
                </View>
              ) : (
                qaList.map((item) => {
                  const isTrainerAsker = item.askerRole === 'trainer';
                  return (
                    <View key={item.id} style={styles.qaManageCard}>
                      <View style={styles.qaManageHeader}>
                        <TouchableOpacity
                          style={styles.qaManageAvatar}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (isTrainerAsker && item.clientId) {
                              setShowQAModal(false);
                              router.push(`/trainer/${item.clientId}` as any);
                            } else {
                              setSelectedAsker({
                                id: item.clientId,
                                name: item.clientName,
                                role: item.askerRole || 'client',
                                photo: item.askerPhoto,
                              });
                            }
                          }}
                        >
                          <Text style={[styles.qaManageAvatarText, isTrainerAsker && { color: COLORS.primaryDark }]}>
                            {item.clientName?.[0] || (isTrainerAsker ? 'T' : 'C')}
                          </Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                              onPress={() => {
                                if (isTrainerAsker && item.clientId) {
                                  setShowQAModal(false);
                                  router.push(`/trainer/${item.clientId}` as any);
                                } else {
                                  setSelectedAsker({
                                    id: item.clientId,
                                    name: item.clientName,
                                    role: item.askerRole || 'client',
                                    photo: item.askerPhoto,
                                  });
                                }
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            >
                              <Text style={styles.qaManageClient}>{item.clientName}</Text>
                              <Ionicons name="open-outline" size={11} color={COLORS.textMuted} />
                            </TouchableOpacity>

                            <View style={[styles.roleTagBadge, isTrainerAsker ? styles.roleTagTrainer : styles.roleTagClient]}>
                              <Ionicons
                                name={isTrainerAsker ? 'barbell' : 'person'}
                                size={10}
                                color={isTrainerAsker ? COLORS.primaryDark : '#0369A1'}
                              />
                              <Text style={[styles.roleTagText, isTrainerAsker ? styles.roleTagTextTrainer : styles.roleTagTextClient]}>
                                {isTrainerAsker ? 'Coach' : 'Client'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.qaManageQuestion}>{item.question}</Text>
                        </View>
                      </View>

                      {item.answer ? (
                        <View style={styles.qaManageAnswerBox}>
                          <Text style={styles.qaManageAnswerLabel}>Your Public Answer:</Text>
                          <Text style={styles.qaManageAnswerText}>{item.answer}</Text>
                        </View>
                      ) : (
                        <View style={styles.qaReplyForm}>
                          <TextInput
                            style={styles.qaReplyInput}
                            placeholder="Type your coaching answer..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            value={replyTextMap[item.id] || ''}
                            onChangeText={(txt) =>
                              setReplyTextMap((prev) => ({ ...prev, [item.id]: txt }))
                            }
                          />
                          <TouchableOpacity
                            style={[
                              styles.replySubmitBtn,
                              (!replyTextMap[item.id]?.trim() || isAnsweringQA === item.id) && {
                                opacity: 0.5,
                              },
                            ]}
                            onPress={() => handleAnswerQA(item.id)}
                            disabled={!replyTextMap[item.id]?.trim() || isAnsweringQA === item.id}
                          >
                            {isAnsweringQA === item.id ? (
                              <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                              <Text style={styles.replySubmitText}>Post Answer</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Asker Quick Profile View Modal */}
      <Modal visible={!!selectedAsker} transparent animationType="fade" onRequestClose={() => setSelectedAsker(null)}>
        <TouchableOpacity
          style={styles.askerModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAsker(null)}
        >
          <View style={styles.askerModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.askerModalTop}>
              <View style={styles.askerModalAvatarWrap}>
                {selectedAsker?.photo ? (
                  <Image source={{ uri: selectedAsker.photo }} style={styles.askerModalAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.askerModalAvatarFallback, selectedAsker?.role === 'trainer' && { backgroundColor: `${COLORS.primary}20` }]}>
                    <Text style={[styles.askerModalAvatarText, selectedAsker?.role === 'trainer' && { color: COLORS.primary }]}>
                      {selectedAsker?.name?.[0] || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.askerModalName}>{selectedAsker?.name}</Text>
                <View style={[styles.roleTagBadge, selectedAsker?.role === 'trainer' ? styles.roleTagTrainer : styles.roleTagClient, { alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Ionicons
                    name={selectedAsker?.role === 'trainer' ? 'barbell' : 'person'}
                    size={11}
                    color={selectedAsker?.role === 'trainer' ? COLORS.primaryDark : '#0369A1'}
                  />
                  <Text style={[styles.roleTagText, selectedAsker?.role === 'trainer' ? styles.roleTagTextTrainer : styles.roleTagTextClient]}>
                    {selectedAsker?.role === 'trainer' ? 'Verified Fitness Coach' : 'Bodivex Gym Client'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedAsker(null)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.askerModalInfoBox}>
              <View style={styles.askerInfoRow}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
                <Text style={styles.askerInfoText}>Aadhaar Identity Verified</Text>
              </View>
              <View style={styles.askerInfoRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                <Text style={styles.askerInfoText}>Active Bodivex Community Member</Text>
              </View>
            </View>

            {selectedAsker?.role === 'trainer' ? (
              <TouchableOpacity
                style={styles.askerActionBtn}
                onPress={() => {
                  const askerId = selectedAsker.id;
                  setSelectedAsker(null);
                  setShowQAModal(false);
                  if (askerId) {
                    router.push(`/trainer/${askerId}` as any);
                  }
                }}
              >
                <Text style={styles.askerActionBtnText}>View Full Coach Profile</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.askerActionBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setSelectedAsker(null)}
              >
                <Text style={[styles.askerActionBtnText, { color: COLORS.textPrimary }]}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── 3. Client Reviews Modal ── */}
      <Modal visible={showReviewsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Client Reviews & Ratings</Text>
              <TouchableOpacity onPress={() => setShowReviewsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Reviews from clients who completed a session through Bodivex.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400, marginTop: 10 }}>
              {reviewsList.length === 0 ? (
                <View style={styles.emptyQABox}>
                  <Ionicons name="star-outline" size={36} color={COLORS.textMuted} />
                  <Text style={styles.emptyQAText}>No verified reviews yet</Text>
                </View>
              ) : (
                reviewsList.map((rev) => (
                  <View key={rev.id} style={styles.reviewManageCard}>
                    <View style={styles.reviewManageHeader}>
                      <View style={styles.qaManageAvatar}>
                        <Text style={styles.qaManageAvatarText}>{rev.clientName?.[0] || 'C'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.qaManageClient}>{rev.clientName}</Text>
                        <Text style={styles.reviewManageType}>
                          {rev.sessionType || '1-on-1 Training Session'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons key={s} name="star" size={13} color="#FFB300" />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewManageComment}>"{rev.comment}"</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: COLORS.white, fontSize: 26, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  city: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.success}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kycText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  bankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bankText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  previewCard: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  previewSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: COLORS.white,
    marginTop: 12,
    padding: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  editLink: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  rateRow: { flexDirection: 'row', gap: 12 },
  rateBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateBoxTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  rateBoxPrice: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  rateBoxSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  bioText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
  },
  gymName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  gymAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  specChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specChip: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  specText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  logoutItem: { borderBottomWidth: 0 },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  rateInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  saveRateBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveRateText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  // Coach Tools
  sectionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: -4 },
  coachToolsGrid: { gap: 10, marginTop: 4 },
  coachToolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toolIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  toolSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  pendingBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },

  // Modal common
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Photo Picker
  photoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  photoPickerBox: {
    flex: 1,
    height: 150,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickedImage: { width: '100%', height: '100%' },
  photoPickerPlaceholder: { alignItems: 'center', gap: 4, padding: 8 },
  photoPickerLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  photoPickerSub: { fontSize: 10, color: COLORS.textMuted },
  captionInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  aiBadgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FFF4',
    padding: 10,
    borderRadius: 10,
  },
  aiBadgeText: { fontSize: 11, color: COLORS.success, fontWeight: '600', flex: 1 },

  // Q&A Manage
  emptyQABox: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  emptyQAText: { fontSize: 13, color: COLORS.textMuted },
  qaManageCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qaManageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  qaManageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaManageAvatarText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  qaManageClient: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  qaManageQuestion: { fontSize: 13, color: COLORS.textPrimary, marginTop: 2, lineHeight: 18 },
  qaManageAnswerBox: {
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  qaManageAnswerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  qaManageAnswerText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },
  qaReplyForm: { gap: 8, marginTop: 4 },
  qaReplyInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 55,
    textAlignVertical: 'top',
  },
  replySubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  replySubmitText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },

  // Reviews Manage
  reviewManageCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewManageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewManageType: { fontSize: 11, color: COLORS.textMuted },
  reviewManageComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, fontStyle: 'italic' },

  // Role Badges
  roleTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagTrainer: {
    backgroundColor: '#FEE2E2',
  },
  roleTagClient: {
    backgroundColor: '#E0F2FE',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  roleTagTextTrainer: {
    color: COLORS.primaryDark,
  },
  roleTagTextClient: {
    color: '#0369A1',
  },

  // Asker Quick View Modal
  askerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  askerModalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  askerModalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  askerModalAvatarWrap: {
    position: 'relative',
  },
  askerModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  askerModalAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  askerModalAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0369A1',
  },
  askerModalName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  askerModalInfoBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  askerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  askerInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  askerActionBtn: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  askerActionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
