import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { getAllClientSummaries } from '../../services/finance';
import { createScheduledCheckIn } from '../../services/chat';
import { COLORS } from '../../constants/colors';
import { ClientFinanceSummary } from '../../types/finance';

export default function TrainerClientsScreen() {
  const { trainerProfile } = useAuthStore();
  const [clients, setClients] = useState<ClientFinanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Client Details & Check-In Modal
  const [selectedClient, setSelectedClient] = useState<ClientFinanceSummary | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');

  const trainerId = trainerProfile?.id ?? '';

  useEffect(() => {
    if (!trainerId) return;
    loadClients();
  }, [trainerId]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const list = await getAllClientSummaries(trainerId);
      setClients(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCheckIn = async () => {
    if (!selectedClient || !checkInMsg.trim()) {
      Alert.alert('Please write a check-in message');
      return;
    }
    try {
      await createScheduledCheckIn({
        trainerId,
        clientId: selectedClient.clientId,
        message: checkInMsg.trim(),
        scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        frequency: 'weekly',
        isActive: true,
      });
      setShowCheckInModal(false);
      setCheckInMsg('');
      Alert.alert('Check-In Scheduled! ⏰', `Automated check-in reminder set for ${selectedClient.clientName}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Clients ({clients.length})</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={54} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No active clients yet</Text>
            <Text style={styles.emptySub}>
              Clients who book sessions with you will show up here with full financial and coaching history.
            </Text>
          </View>
        ) : (
          clients.map((client) => (
            <TouchableOpacity
              key={client.clientId}
              style={styles.clientCard}
              onPress={() => setSelectedClient(client)}
              activeOpacity={0.8}
            >
              <View style={styles.clientTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{client.clientName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{client.clientName}</Text>
                  <Text style={styles.clientSince}>
                    Client since {format(new Date(client.firstSessionAt), 'MMM yyyy')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.totalRevenue}>₹{client.totalEarned.toLocaleString('en-IN')}</Text>
                  <Text style={styles.sessionCount}>{client.completedSessions} sessions done</Text>
                </View>
              </View>

              <View style={styles.clientBottom}>
                <View style={styles.rateBadge}>
                  <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
                  <Text style={styles.rateText}>
                    Historical Rate Tracking Active
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.quickChatBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/chat/[id]',
                      params: { id: client.clientId, name: client.clientName },
                    })
                  }
                >
                  <Ionicons name="chatbubble-outline" size={14} color={COLORS.white} />
                  <Text style={styles.quickChatText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Client Detail & Coaching History Modal */}
      <Modal visible={!!selectedClient} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalName}>{selectedClient?.clientName}</Text>
                <Text style={styles.modalSince}>
                  Joined on {selectedClient?.firstSessionAt ? format(new Date(selectedClient.firstSessionAt), 'dd MMM yyyy') : '--'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedClient(null)}>
                <Ionicons name="close-circle" size={26} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Financial Overview with this client */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>Personal Financial Record</Text>
              <View style={styles.historyRow}>
                <View>
                  <Text style={styles.historyVal}>₹{selectedClient?.totalEarned.toLocaleString('en-IN')}</Text>
                  <Text style={styles.historyLabel}>Total Lifetime Revenue</Text>
                </View>
                <View>
                  <Text style={styles.historyVal}>{selectedClient?.completedSessions}</Text>
                  <Text style={styles.historyLabel}>Completed Sessions</Text>
                </View>
                <View>
                  <Text style={styles.historyVal}>{selectedClient?.cancelledSessions}</Text>
                  <Text style={styles.historyLabel}>Cancelled</Text>
                </View>
              </View>
            </View>

            {/* Rate Evolution */}
            <View style={styles.rateHistoryBox}>
              <Text style={styles.rateHistoryTitle}>Rate Progression with Client</Text>
              <Text style={styles.rateHistoryDesc}>
                All sessions locked the trainer's rate at the exact booking moment.
              </Text>
              <View style={styles.rateTagRow}>
                <View style={styles.rateTag}>
                  <Text style={styles.rateTagText}>First Session: ₹{selectedClient?.rateHistory?.[selectedClient.rateHistory.length - 1]?.pricingOnline ?? 399}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                <View style={[styles.rateTag, styles.rateTagCurrent]}>
                  <Text style={[styles.rateTagText, styles.rateTagTextCurrent]}>
                    Current Rate: ₹{trainerProfile?.pricingOnline ?? 499}
                  </Text>
                </View>
              </View>
            </View>

            {/* Coaching Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.checkInActionBtn}
                onPress={() => setShowCheckInModal(true)}
              >
                <Ionicons name="alarm-outline" size={18} color={COLORS.primary} />
                <Text style={styles.checkInActionText}>Set Scheduled Check-in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chatActionPrimary}
                onPress={() => {
                  const c = selectedClient;
                  setSelectedClient(null);
                  if (c) {
                    router.push({
                      pathname: '/chat/[id]',
                      params: { id: c.clientId, name: c.clientName },
                    })
                  }
                }}
              >
                <Ionicons name="chatbubbles" size={18} color={COLORS.white} />
                <Text style={styles.chatActionPrimaryText}>Open Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Scheduled Check-In Modal */}
      <Modal visible={showCheckInModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { gap: 14 }]}>
            <Text style={styles.modalName}>Schedule Automated Check-In</Text>
            <Text style={styles.modalSince}>
              Bodivex will automatically prompt {selectedClient?.clientName} every week with your instructions.
            </Text>

            <TextInput
              style={styles.checkInInput}
              placeholder="e.g. Please log your weight and upload front/side progress pictures this Sunday!"
              placeholderTextColor={COLORS.textMuted}
              value={checkInMsg}
              onChangeText={setCheckInMsg}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCheckInModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateCheckIn}>
                <Text style={styles.saveText}>Set Weekly Check-In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  list: { padding: 16, gap: 12 },
  center: { paddingVertical: 60, alignItems: 'center' },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  clientTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 19, fontWeight: '800' },
  clientName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  clientSince: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  totalRevenue: { fontSize: 17, fontWeight: '800', color: COLORS.success },
  sessionCount: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  clientBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  quickChatBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickChatText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalSince: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  historyCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  historyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyVal: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  historyLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  rateHistoryBox: {
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  rateHistoryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  rateHistoryDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  rateTagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rateTag: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rateTagCurrent: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  rateTagText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  rateTagTextCurrent: { color: COLORS.primary, fontWeight: '700' },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  checkInActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  checkInActionText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  chatActionPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  chatActionPrimaryText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  checkInInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});
