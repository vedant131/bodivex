import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTrainerStore } from '../../stores/trainerStore';
import { useAuthStore } from '../../stores/authStore';
import {
  getTransformations,
  getTrainerQA,
  getTrainerReviews,
  askTrainerQuestion,
} from '../../services/trainers';
import { COLORS } from '../../constants/colors';
import { TrainerProfile, Transformation, TrainerQA } from '../../types/trainer';

const { width } = Dimensions.get('window');

export default function TrainerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { fetchTrainerById, selectedTrainer: trainer, isLoading } = useTrainerStore();

  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [qaList, setQaList] = useState<TrainerQA[]>([]);
  const [activeTab, setActiveTab] = useState<'about' | 'results' | 'reviews' | 'qa'>('about');

  // Selected Asker Profile Quick View Modal
  const [selectedAsker, setSelectedAsker] = useState<{
    id: string;
    name: string;
    role: 'client' | 'trainer';
    photo?: string;
  } | null>(null);

  // Ask Question Modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmittingQA, setIsSubmittingQA] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTrainerById(id);
      getTransformations(id).then(setTransformations);
      getTrainerReviews(id).then(setReviews);
      getTrainerQA(id).then(setQaList);
    }
  }, [id]);

  const handleAskQuestion = async () => {
    if (!newQuestion.trim() || !id) return;
    setIsSubmittingQA(true);
    const askerRole: 'client' | 'trainer' = user?.role === 'trainer' ? 'trainer' : 'client';
    try {
      const qId = await askTrainerQuestion(
        id,
        user?.id || 'guest_user',
        user?.name || (askerRole === 'trainer' ? 'Coach' : 'Client'),
        newQuestion.trim(),
        askerRole,
        user?.profilePhoto
      );
      setQaList([
        {
          id: qId,
          trainerId: id,
          clientId: user?.id || 'guest_user',
          clientName: user?.name || (askerRole === 'trainer' ? 'Coach' : 'Client'),
          askerRole,
          askerPhoto: user?.profilePhoto,
          question: newQuestion.trim(),
          createdAt: new Date(),
        },
        ...qaList,
      ]);
      setNewQuestion('');
      setShowAskModal(false);
      Alert.alert(
        'Question Submitted! 💬',
        'Your question has been posted publicly. The coach will answer directly on their profile.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSubmittingQA(false);
    }
  };

  if (isLoading || !trainer) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const minRate = Math.min(trainer.pricingOnline ?? 99999, trainer.pricingOffline ?? 99999);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        {/* Hero Photo with Floating Actions */}
        <View style={styles.heroContainer}>
          {trainer.profilePhoto ? (
            <Image source={{ uri: trainer.profilePhoto }} style={styles.heroPhoto} contentFit="cover" />
          ) : (
            <LinearGradient colors={[COLORS.secondary, COLORS.accent]} style={styles.heroPhoto} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.45, 1]}
            style={styles.heroGradient}
          />

          {/* Top Bar Nav */}
          <SafeAreaView edges={['top']} style={styles.heroNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navCircleBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.navCircleBtn}>
                <Ionicons name="share-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navCircleBtn}>
                <Ionicons name="heart-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Hero Bottom Info Overlay */}
          <View style={styles.heroInfoOverlay}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={[styles.availChip, trainer.isAvailableNow && styles.availChipActive]}>
                <View style={[styles.availDot, trainer.isAvailableNow && styles.availDotActive]} />
                <Text style={styles.availText}>
                  {trainer.isAvailableNow ? 'Available for Live Session' : 'Offline'}
                </Text>
              </View>

              {trainer.videoIntroUrl && (
                <View style={styles.videoIntroChip}>
                  <Ionicons name="play" size={12} color={COLORS.white} />
                  <Text style={styles.videoIntroText}>Intro Video</Text>
                </View>
              )}
            </View>

            <View style={styles.heroNameRow}>
              <Text style={styles.heroName}>{trainer.name}</Text>
              {trainer.isKYCApproved && (
                <View style={styles.verifiedPill}>
                  <Ionicons name="shield-checkmark" size={13} color={COLORS.white} />
                  <Text style={styles.verifiedPillText}>Verified Coach</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroLocation}>
              <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.85)" /> {trainer.city}, {trainer.state} • {trainer.experience} yrs coaching
            </Text>
          </View>
        </View>

        {/* Clean, Well-Sized Stats Grid Card */}
        <View style={styles.statsCardGrid}>
          <View style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="star" size={15} color="#FFB300" />
              <Text style={styles.statBoxValue}>{trainer.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.statBoxLabel}>{trainer.totalReviews} reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{trainer.totalSessions}+</Text>
            <Text style={styles.statBoxLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statBoxValue}>{trainer.experience} yrs</Text>
            <Text style={styles.statBoxLabel}>Experience</Text>
          </View>
        </View>

        {/* Specialization Tags */}
        <View style={styles.sectionPadding}>
          <Text style={styles.specSectionTitle}>Specializations</Text>
          <View style={styles.specTagsWrap}>
            {trainer.specializations.map((spec) => (
              <View key={spec} style={styles.specPill}>
                <Ionicons name="fitness" size={13} color={COLORS.primary} />
                <Text style={styles.specPillText}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Clean Segmented Pill Tabs */}
        <View style={styles.pillTabsContainer}>
          {(['about', 'results', 'reviews', 'qa'] as const).map((tab) => {
            const labels = {
              about: 'Overview',
              results: 'Results',
              reviews: `Reviews (${reviews.length || trainer.totalReviews})`,
              qa: 'Q&A',
            };
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.pillTabBtn, isSelected && styles.pillTabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.pillTabText, isSelected && styles.pillTabTextActive]}
                  numberOfLines={1}
                >
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB CONTENT: Always renders properly inside scroll */}
        <View style={styles.tabContentWrap}>
          {/* Tab 1: Overview */}
          {activeTab === 'about' && (
            <View style={styles.tabBody}>
              {/* Bio Card */}
              <View style={styles.contentCard}>
                <Text style={styles.cardHeaderTitle}>About the Coach</Text>
                <Text style={styles.bioBody}>{trainer.bio}</Text>
                {trainer.languages && trainer.languages.length > 0 && (
                  <View style={styles.langRow}>
                    <Ionicons name="chatbubbles-outline" size={15} color={COLORS.textSecondary} />
                    <Text style={styles.langText}>Speaks: {trainer.languages.join(', ')}</Text>
                  </View>
                )}
              </View>

              {/* Session Packages & Pricing */}
              <View style={styles.contentCard}>
                <Text style={styles.cardHeaderTitle}>Training Options & Rates</Text>
                <Text style={styles.cardHeaderSub}>
                  Pay the trainer directly once they confirm your booking.
                </Text>

                {trainer.pricingOnline && (
                  <View style={styles.pricingCard}>
                    <View style={[styles.pricingIconBg, { backgroundColor: `${COLORS.primary}15` }]}>
                      <Ionicons name="videocam" size={22} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingTitle}>1-on-1 Online Live Session</Text>
                      <Text style={styles.pricingSub}>Live HD video workout with form correction</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.pricingAmount}>₹{trainer.pricingOnline}</Text>
                      <Text style={styles.pricingUnit}>/ session</Text>
                    </View>
                  </View>
                )}

                {trainer.pricingOffline && (
                  <View style={styles.pricingCard}>
                    <View style={[styles.pricingIconBg, { backgroundColor: `${COLORS.secondary}15` }]}>
                      <Ionicons name="barbell" size={22} color={COLORS.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingTitle}>In-Person Gym Training</Text>
                      <Text style={styles.pricingSub}>
                        {trainer.gymLocation?.name || 'Partner Gym in your area'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.pricingAmount}>₹{trainer.pricingOffline}</Text>
                      <Text style={styles.pricingUnit}>/ session</Text>
                    </View>
                  </View>
                )}

                {trainer.pricingMonthly && (
                  <View style={[styles.pricingCard, styles.pricingCardFeatured]}>
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueText}>POPULAR</Text>
                    </View>
                    <View style={[styles.pricingIconBg, { backgroundColor: `${COLORS.success}15` }]}>
                      <Ionicons name="calendar" size={22} color={COLORS.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingTitle}>Monthly Complete Coaching</Text>
                      <Text style={styles.pricingSub}>Custom workout plan + macro diet + 12 sessions</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.pricingAmount, { color: COLORS.success }]}>₹{trainer.pricingMonthly}</Text>
                      <Text style={styles.pricingUnit}>/ month</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Certifications & Badges */}
              {trainer.certifications && trainer.certifications.length > 0 && (
                <View style={styles.contentCard}>
                  <Text style={styles.cardHeaderTitle}>Verified Certifications</Text>
                  <View style={{ gap: 10, marginTop: 6 }}>
                    {trainer.certifications.map((cert, i) => (
                      <View key={i} style={styles.certRow}>
                        <Ionicons name="ribbon-outline" size={20} color={COLORS.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.certTitleText}>{cert.name}</Text>
                          <Text style={styles.certIssuerText}>{cert.issuedBy} • {cert.year}</Text>
                        </View>
                        {cert.verified && (
                          <View style={styles.certCheck}>
                            <Ionicons name="checkmark" size={13} color={COLORS.success} />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Tab 2: Transformations (Results) */}
          {activeTab === 'results' && (
            <View style={styles.tabBody}>
              <View style={styles.resultsBanner}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultsBannerTitle}>Bodivex AI-Verified Results</Text>
                  <Text style={styles.resultsBannerSub}>
                    Before & after photos are authenticated to guarantee genuine results from real sessions.
                  </Text>
                </View>
              </View>

              {transformations.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="images-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No transformations yet</Text>
                  <Text style={styles.emptySub}>Photos will appear here as clients complete their cycles.</Text>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {transformations.map((t) => (
                    <TransformationCard key={t.id} transformation={t} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'reviews' && (
            <View style={styles.tabBody}>
              <View style={styles.reviewScoreCard}>
                <View style={{ alignItems: 'center', paddingRight: 18, borderRightWidth: 1, borderRightColor: COLORS.border }}>
                  <Text style={styles.bigScore}>{trainer.rating.toFixed(1)}</Text>
                  <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons key={s} name="star" size={14} color="#FFB300" />
                    ))}
                  </View>
                  <Text style={styles.scoreSub}>{reviews.length || trainer.totalReviews} verified reviews</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 16, justifyContent: 'center', gap: 6 }}>
                  <Text style={styles.breakdownItem}>⭐ 5 Stars — 92%</Text>
                  <Text style={styles.breakdownItem}>⭐ 4 Stars — 6%</Text>
                  <Text style={styles.breakdownItem}>⭐ 3 Stars — 2%</Text>
                </View>
              </View>

              {/* Reviews list */}
              <View style={{ gap: 12 }}>
                {reviews.map((rev) => (
                  <View key={rev.id} style={styles.contentCard}>
                    <View style={styles.singleReview}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.reviewerAvatar}>
                            <Text style={styles.reviewerAvatarText}>{rev.clientName?.[0] || 'C'}</Text>
                          </View>
                          <View>
                            <Text style={styles.reviewerName}>{rev.clientName}</Text>
                            <Text style={styles.reviewDate}>{rev.sessionType || 'Verified Booking'}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons key={s} name="star" size={13} color="#FFB300" />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewComment}>"{rev.comment}"</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tab 4: Public Community Q&A */}
          {activeTab === 'qa' && (
            <View style={styles.tabBody}>
              {/* Ask Question CTA */}
              <View style={styles.askQuestionCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.askCardTitle}>Have a question for {trainer.name.split(' ')[0]}?</Text>
                  <Text style={styles.askCardSub}>
                    Ask publicly about diet, workout style, or timings. The coach answers right here!
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.askQuestionBtn}
                  onPress={() => setShowAskModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubbles" size={16} color={COLORS.white} />
                  <Text style={styles.askQuestionBtnText}>Ask Question</Text>
                </TouchableOpacity>
              </View>

              {/* Q&A List */}
              <View style={{ gap: 12 }}>
                {qaList.map((item) => {
                  const isTrainerAsker = item.askerRole === 'trainer';
                  return (
                    <View key={item.id} style={styles.contentCard}>
                      <View style={styles.qaHeader}>
                        <View style={styles.qaQBadge}>
                          <Text style={styles.qaQBadgeText}>Q</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qaQuestionText}>{item.question}</Text>
                          
                          {/* Asker Info with Role Badge and clickable profile trigger */}
                          <View style={styles.askerMetaRow}>
                            <TouchableOpacity
                              style={styles.askerClickableProfile}
                              activeOpacity={0.7}
                              onPress={() => {
                                if (isTrainerAsker && item.clientId && item.clientId !== id) {
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
                              {item.askerPhoto ? (
                                <Image source={{ uri: item.askerPhoto }} style={styles.askerSmallAvatar} contentFit="cover" />
                              ) : (
                                <View style={[styles.askerSmallAvatarFallback, isTrainerAsker && { backgroundColor: '#FEE2E2' }]}>
                                  <Text style={[styles.askerSmallAvatarText, isTrainerAsker && { color: COLORS.primary }]}>
                                    {item.clientName?.[0] || (isTrainerAsker ? 'T' : 'C')}
                                  </Text>
                                </View>
                              )}
                              <Text style={styles.qaAuthorName}>{item.clientName}</Text>
                              <Ionicons name="open-outline" size={11} color={COLORS.textMuted} />
                            </TouchableOpacity>

                            {/* Distinct User Role Tag: Client vs Coach */}
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
                        </View>
                      </View>

                      {item.answer ? (
                        <View style={styles.qaAnswerBox}>
                          <View style={styles.qaABadge}>
                            <Text style={styles.qaABadgeText}>A</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.qaAnswerAuthor}>{trainer.name} (Coach)</Text>
                            <Text style={styles.qaAnswerText}>{item.answer}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.pendingAnswerBox}>
                          <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                          <Text style={styles.pendingAnswerText}>Waiting for coach reply...</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Generous bottom padding to ensure clean scrolling past the sticky button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Bottom Booking Bar — Full Width, Instant Booking */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBarWrap}>
        <View style={styles.bottomBarContent}>
          <TouchableOpacity
            style={styles.mainBookBtn}
            onPress={() => router.push(`/booking/${trainer.id}` as any)}
            activeOpacity={0.9}
          >
            <View>
              <Text style={styles.bookPriceText}>From ₹{minRate} / session</Text>
              <Text style={styles.bookPriceSub}>Free to request · pay trainer directly</Text>
            </View>
            <View style={styles.bookBtnRight}>
              <Text style={styles.mainBookBtnText}>Book Session</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Public Ask Question Modal with KeyboardAvoidingView */}
      <Modal visible={showAskModal} transparent animationType="slide" onRequestClose={() => setShowAskModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalDismissTouchable} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>Ask Coach {trainer.name.split(' ')[0]}</Text>
                <View style={[styles.roleTagBadge, user?.role === 'trainer' ? styles.roleTagTrainer : styles.roleTagClient]}>
                  <Ionicons
                    name={user?.role === 'trainer' ? 'barbell' : 'person'}
                    size={10}
                    color={user?.role === 'trainer' ? COLORS.primaryDark : '#0369A1'}
                  />
                  <Text style={[styles.roleTagText, user?.role === 'trainer' ? styles.roleTagTextTrainer : styles.roleTagTextClient]}>
                    Posting as {user?.role === 'trainer' ? 'Coach' : 'Client'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAskModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Your inquiry will be posted publicly with your profile tag so {trainer.name.split(' ')[0]} and community members can recognize you.
            </Text>

            <TextInput
              style={styles.questionInput}
              placeholder="e.g. Do you support vegetarian high-protein meal plans for lean muscle gain?"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={newQuestion}
              onChangeText={setNewQuestion}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[styles.submitQuestionBtn, (!newQuestion.trim() || isSubmittingQA) && styles.submitQuestionDisabled]}
              onPress={handleAskQuestion}
              disabled={!newQuestion.trim() || isSubmittingQA}
            >
              {isSubmittingQA ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitQuestionText}>Post Question Publicly</Text>
              )}
            </TouchableOpacity>
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
                  if (askerId && askerId !== id) {
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
    </View>
  );
}

const TransformationCard = ({ transformation }: { transformation: Transformation }) => (
  <View style={styles.transformCard}>
    <View style={styles.transformPhotos}>
      <Image source={{ uri: transformation.beforePhotoUrl }} style={styles.transformPhoto} contentFit="cover" />
      <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
      <Image source={{ uri: transformation.afterPhotoUrl }} style={styles.transformPhoto} contentFit="cover" />
    </View>
    {transformation.caption && (
      <Text style={styles.transformCaption}>{transformation.caption}</Text>
    )}
    {transformation.aiVerified && (
      <View style={styles.aiVerifiedSmall}>
        <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
        <Text style={styles.aiVerifiedSmallText}>AI Verified</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { paddingBottom: 40 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroContainer: { height: 360, position: 'relative' },
  heroPhoto: { width: '100%', height: '100%' },
  heroGradient: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  navCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfoOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 8,
  },
  availChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availChipActive: { backgroundColor: 'rgba(0, 200, 81, 0.35)' },
  availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  availDotActive: { backgroundColor: '#00E676' },
  availText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  videoIntroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,107,53,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  videoIntroText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroName: { fontSize: 28, fontWeight: '900', color: COLORS.white, flex: 1 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedPillText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  heroLocation: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },

  // Stats
  statsCardGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statBoxValue: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
  statBoxLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  // Specializations
  sectionPadding: { paddingHorizontal: 20, marginTop: 20 },
  specSectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  specTagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  specPillText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  // Pill Tabs
  pillTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAECEF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  pillTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  pillTabBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillTabText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  pillTabTextActive: { color: COLORS.primary, fontWeight: '800' },

  // Tab Body
  tabBody: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  contentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeaderTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  cardHeaderSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginTop: -4 },
  bioBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  langText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // Pricing Cards
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pricingCardFeatured: {
    backgroundColor: '#F0FFF4',
    borderColor: '#C6F6D5',
    position: 'relative',
    marginTop: 6,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestValueText: { color: COLORS.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  pricingIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pricingTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  pricingSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pricingAmount: { fontSize: 19, fontWeight: '900', color: COLORS.textPrimary },
  pricingUnit: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Certifications
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  certTitleText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  certIssuerText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  certCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Results / Transformations
  resultsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FFF4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  resultsBannerTitle: { fontSize: 13, fontWeight: '800', color: '#1B5E20' },
  resultsBannerSub: { fontSize: 11, color: '#2E7D32', lineHeight: 16, marginTop: 2 },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  transformCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  transformPhotos: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  transformPhoto: { flex: 1, height: 140, borderRadius: 12 },
  transformCaption: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18, fontWeight: '500' },
  aiVerifiedSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiVerifiedSmallText: { fontSize: 11, color: COLORS.success, fontWeight: '700' },

  // Reviews Tab
  reviewScoreCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bigScore: { fontSize: 44, fontWeight: '900', color: COLORS.textPrimary },
  scoreSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  breakdownItem: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  singleReview: { gap: 10 },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerAvatarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  reviewerName: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  reviewDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  reviewComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  tabContentWrap: { width: '100%' },

  // Q&A Tab & Cards
  askQuestionCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  askCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  askCardSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  askQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  askQuestionBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  qaHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  qaQBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  qaQBadgeText: { fontSize: 12, fontWeight: '900', color: COLORS.primary },
  qaQuestionText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 20 },
  qaAuthorText: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  qaAnswerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  qaABadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  qaABadgeText: { fontSize: 11, fontWeight: '900', color: COLORS.white },
  qaAnswerAuthor: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  qaAnswerText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginTop: 2 },
  pendingAnswerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  pendingAnswerText: { fontSize: 12, color: '#B78103', fontWeight: '600' },

  // Ask Question Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissTouchable: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  questionInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitQuestionBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitQuestionDisabled: {
    opacity: 0.5,
  },
  submitQuestionText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },

  // Asker Role & Profile Link
  askerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  askerClickableProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  askerSmallAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  askerSmallAvatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  askerSmallAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  qaAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  roleTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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

  // Asker Modal Quick View
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

  // Bottom Floating Bar
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chatIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}40`,
    backgroundColor: `${COLORS.primary}08`,
    gap: 2,
  },
  chatBtnLabel: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  mainBookBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  bookPriceText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  bookPriceSub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  bookBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mainBookBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
});
