import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import {
  getFinanceDashboard,
  getSessionLog,
  getAllClientSummaries,
  initiateWithdrawal,
  getWithdrawalHistory,
  getTaxSummary,
  getEarningsChartData,
} from '../../services/finance';
import { getRateHistory } from '../../services/trainers';
import { COLORS } from '../../constants/colors';
import { FinanceDashboard, ClientFinanceSummary, Withdrawal, EarningsChartData } from '../../types/finance';
import { Session } from '../../types/session';
import { TrainerRateHistory } from '../../types/trainer';

type TabType = 'overview' | 'sessions' | 'clients' | 'rates' | 'withdraw';

export default function TrainerFinanceScreen() {
  const { trainerProfile } = useAuthStore();
  const trainerId = trainerProfile?.id ?? '';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<ClientFinanceSummary[]>([]);
  const [rateHistory, setRateHistory] = useState<TrainerRateHistory[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [chartData, setChartData] = useState<EarningsChartData[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (trainerId) loadAll();
  }, [trainerId]);

  useEffect(() => {
    if (trainerId) {
      getEarningsChartData(trainerId, chartPeriod).then(setChartData);
    }
  }, [chartPeriod, trainerId]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [dash, log, clientList, rates, withdrawList, chart] = await Promise.all([
        getFinanceDashboard(trainerId),
        getSessionLog(trainerId, 30),
        getAllClientSummaries(trainerId),
        getRateHistory(trainerId),
        getWithdrawalHistory(trainerId),
        getEarningsChartData(trainerId, chartPeriod),
      ]);
      setDashboard(dash);
      setSessions(log);
      setClients(clientList);
      setRateHistory(rates);
      setWithdrawals(withdrawList);
      setChartData(chart);
    } catch (e) {
      console.error('Finance load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (amount < 500) {
      Alert.alert('Minimum withdrawal is ₹500');
      return;
    }
    if (amount > (dashboard?.availableBalance ?? 0)) {
      Alert.alert('Insufficient balance');
      return;
    }
    try {
      await initiateWithdrawal(trainerId, amount, '4521', 'HDFC Bank');
      Alert.alert('Success', `₹${amount} withdrawal initiated. Settles in 1–2 business days.`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      loadAll();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const maxChart = Math.max(...chartData.map(d => d.amount), 1);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 My Finance</Text>
        <TouchableOpacity onPress={loadAll}>
          <Ionicons name="refresh" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Balance Card — Fintech Grade */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>AVAILABLE FOR PAYOUT</Text>
            <Text style={styles.balanceAmount}>₹{(dashboard?.availableBalance ?? 0).toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up-circle" size={18} color={COLORS.white} />
            <Text style={styles.withdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Escrow Held Line */}
        <View style={styles.escrowRow}>
          <Ionicons name="shield-checkmark" size={15} color="#FFB300" />
          <Text style={styles.escrowText}>
            ₹{(dashboard?.escrowBalance ?? 0).toLocaleString('en-IN')} held securely in client session escrow
          </Text>
        </View>

        {/* Quick Metrics */}
        <View style={styles.quickStats}>
          <QuickStat label="This Week" value={`₹${(dashboard?.thisWeek ?? 0).toLocaleString('en-IN')}`} />
          <View style={styles.statDivider} />
          <QuickStat label="This Month" value={`₹${(dashboard?.thisMonth ?? 0).toLocaleString('en-IN')}`} />
          <View style={styles.statDivider} />
          <QuickStat label="All Time" value={`₹${(dashboard?.allTime ?? 0).toLocaleString('en-IN')}`} />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {([
          { key: 'overview', label: 'Overview', icon: 'bar-chart' },
          { key: 'sessions', label: 'Sessions', icon: 'list' },
          { key: 'clients', label: 'Clients', icon: 'people' },
          { key: 'rates', label: 'Rate History', icon: 'trending-up' },
          { key: 'withdraw', label: 'Withdrawals', icon: 'wallet' },
        ] as { key: TabType; label: string; icon: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon as any} size={14} color={activeTab === t.key ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <View style={styles.periodToggle}>
                {(['week', 'month'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodBtn, chartPeriod === p && styles.periodBtnActive]}
                    onPress={() => setChartPeriod(p)}
                  >
                    <Text style={[styles.periodText, chartPeriod === p && styles.periodTextActive]}>
                      {p === 'week' ? 'Week' : 'Month'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bar Chart */}
            <View style={styles.chart}>
              {chartData.map((d, i) => {
                const pct = d.amount / maxChart;
                return (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barValue}>
                      {d.amount > 0 ? `₹${(d.amount / 1000).toFixed(1)}k` : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${Math.max(pct * 100, 4)}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{d.label}</Text>
                    {d.sessions > 0 && (
                      <Text style={styles.barSessions}>{d.sessions}s</Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <SummaryCard
                icon="checkmark-circle"
                iconColor={COLORS.success}
                label="Completed Sessions"
                value={dashboard?.completedSessionsCount ?? 0}
              />
              <SummaryCard
                icon="hourglass"
                iconColor={COLORS.warning}
                label="Pending Sessions"
                value={dashboard?.pendingSessionsCount ?? 0}
              />
              <SummaryCard
                icon="arrow-up-circle"
                iconColor={COLORS.primary}
                label="Total Withdrawn"
                value={`₹${(dashboard?.totalWithdrawn ?? 0).toLocaleString('en-IN')}`}
              />
              <SummaryCard
                icon="people"
                iconColor={COLORS.secondary}
                label="Total Clients"
                value={clients.length}
              />
            </View>
          </View>
        )}

        {/* ── SESSION LOG ── */}
        {activeTab === 'sessions' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Log</Text>
            {sessions.length === 0 ? (
              <Text style={styles.emptyText}>No sessions yet.</Text>
            ) : (
              sessions.map((session) => (
                <SessionLogItem key={session.id} session={session} />
              ))
            )}
          </View>
        )}

        {/* ── CLIENTS ── */}
        {activeTab === 'clients' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Breakdown</Text>
            {clients.length === 0 ? (
              <Text style={styles.emptyText}>No clients yet.</Text>
            ) : (
              clients.map((client) => (
                <ClientFinanceItem key={client.clientId} client={client} />
              ))
            )}
          </View>
        )}

        {/* ── RATE HISTORY ── */}
        {activeTab === 'rates' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rate History</Text>
            <Text style={styles.rateNote}>
              All sessions preserve the rate at time of booking. Rate changes only affect new bookings.
            </Text>
            {rateHistory.length === 0 ? (
              <Text style={styles.emptyText}>No rate changes recorded.</Text>
            ) : (
              rateHistory.map((rate, i) => (
                <View key={rate.id ?? i} style={styles.rateCard}>
                  <View style={styles.rateCardHeader}>
                    <Text style={styles.rateDate}>
                      {format(rate.effectiveFrom, 'dd MMM yyyy')}
                    </Text>
                    {i === 0 && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.ratePrices}>
                    {rate.pricingOnline !== undefined && (
                      <View style={styles.rateItem}>
                        <Ionicons name="videocam" size={14} color={COLORS.primary} />
                        <Text style={styles.rateText}>Online: ₹{rate.pricingOnline}/session</Text>
                      </View>
                    )}
                    {rate.pricingOffline !== undefined && (
                      <View style={styles.rateItem}>
                        <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.rateText}>Offline: ₹{rate.pricingOffline}/session</Text>
                      </View>
                    )}
                    {rate.pricingMonthly !== undefined && (
                      <View style={styles.rateItem}>
                        <Ionicons name="calendar" size={14} color={COLORS.success} />
                        <Text style={styles.rateText}>Monthly: ₹{rate.pricingMonthly}/month</Text>
                      </View>
                    )}
                  </View>
                  {rate.reason && (
                    <Text style={styles.rateReason}>Note: {rate.reason}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── WITHDRAWALS ── */}
        {activeTab === 'withdraw' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Withdrawal History</Text>
            <TouchableOpacity
              style={styles.newWithdrawBtn}
              onPress={() => setShowWithdrawModal(true)}
            >
              <Ionicons name="arrow-up-circle" size={18} color={COLORS.white} />
              <Text style={styles.newWithdrawBtnText}>New Withdrawal</Text>
            </TouchableOpacity>

            {withdrawals.length === 0 ? (
              <Text style={styles.emptyText}>No withdrawals yet.</Text>
            ) : (
              withdrawals.map((w) => (
                <WithdrawalItem key={w.id} withdrawal={w} />
              ))
            )}

            {/* Tax Summary */}
            <View style={styles.taxCard}>
              <Text style={styles.taxTitle}>📊 Tax Summary (FY 2026–27)</Text>
              <TaxRow label="Total Earned" value={`₹${(dashboard?.allTime ?? 0).toLocaleString('en-IN')}`} />
              <TaxRow label="Platform Fee Paid (5%)" value={`₹${Math.round((dashboard?.allTime ?? 0) * 0.05).toLocaleString('en-IN')}`} />
              <TaxRow label="Net Taxable" value={`₹${Math.round((dashboard?.allTime ?? 0) * 0.95).toLocaleString('en-IN')}`} bold />
              <TouchableOpacity style={styles.downloadBtn}>
                <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                <Text style={styles.downloadBtnText}>Download PDF for CA</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <View style={styles.modalBalanceRow}>
              <Text style={styles.modalBalanceLabel}>Available</Text>
              <Text style={styles.modalBalanceValue}>
                ₹{(dashboard?.availableBalance ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter amount (min ₹500)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
            <View style={styles.bankInfo}>
              <Ionicons name="card" size={18} color={COLORS.textSecondary} />
              <Text style={styles.bankInfoText}>HDFC Bank ••••4521 · Settles in 1–2 days</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWithdrawModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleWithdraw}>
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const QuickStat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.quickStatItem}>
    <Text style={styles.quickStatValue}>{value}</Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

const SummaryCard = ({ icon, iconColor, label, value }: any) => (
  <View style={styles.summaryCard}>
    <Ionicons name={icon} size={22} color={iconColor} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const SessionLogItem = ({ session }: { session: Session }) => {
  const isReleased = session.escrowStatus === 'released';
  const isHeld = session.escrowStatus === 'held';

  return (
    <View style={styles.sessionLogCard}>
      <View style={styles.sessionLogHeader}>
        <View>
          <Text style={styles.sessionLogClient}>{session.clientName}</Text>
          <Text style={styles.sessionLogDate}>
            {format(session.scheduledAt, 'dd MMM yyyy · hh:mm a')}
          </Text>
        </View>
        <View style={styles.sessionLogRight}>
          <Text style={styles.sessionLogAmount}>+₹{session.netEarned}</Text>
          <View style={[
            styles.escrowBadge,
            isReleased ? styles.escrowReleasedBadge : isHeld ? styles.escrowHeldBadge : null
          ]}>
            <Text style={[
              styles.escrowBadgeText,
              isReleased ? { color: COLORS.success } : isHeld ? { color: COLORS.warning } : {}
            ]}>
              {isReleased ? '✅ Released' : isHeld ? '🔒 Held' : session.escrowStatus}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.sessionLogFooter}>
        <View style={styles.sessionTypeChip}>
          <Ionicons name={session.type === 'online' ? 'videocam' : 'location'} size={11} color={COLORS.textSecondary} />
          <Text style={styles.sessionTypeText}>{session.type === 'online' ? 'Online' : 'Offline'} · {session.durationMins} min</Text>
        </View>
        <Text style={styles.sessionRateText}>Rate: ₹{session.rateAtBooking} (at booking time)</Text>
      </View>
    </View>
  );
};

const ClientFinanceItem = ({ client }: { client: ClientFinanceSummary }) => (
  <TouchableOpacity style={styles.clientFinanceCard}>
    <View style={styles.clientFinanceHeader}>
      <View style={styles.clientAvatar}>
        {client.clientPhoto ? (
          <Image source={{ uri: client.clientPhoto }} style={styles.clientAvatarImg} contentFit="cover" />
        ) : (
          <Text style={styles.clientAvatarText}>{client.clientName[0]}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.clientFinanceName}>{client.clientName}</Text>
        <Text style={styles.clientFinanceSince}>
          Since {format(client.firstSessionAt, 'MMM yyyy')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.clientTotalEarned}>₹{client.totalEarned.toLocaleString('en-IN')}</Text>
        <Text style={styles.clientTotalSessions}>{client.completedSessions} sessions</Text>
      </View>
    </View>
    <View style={styles.clientFinanceStats}>
      <MiniStat label="Completed" value={client.completedSessions} color={COLORS.success} />
      <MiniStat label="Cancelled" value={client.cancelledSessions} color={COLORS.danger} />
      <MiniStat label="Total" value={client.totalSessions} color={COLORS.primary} />
    </View>
  </TouchableOpacity>
);

const MiniStat = ({ label, value, color }: any) => (
  <View style={styles.miniStat}>
    <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const WithdrawalItem = ({ withdrawal }: { withdrawal: Withdrawal }) => (
  <View style={styles.withdrawalCard}>
    <View style={styles.withdrawalLeft}>
      <Ionicons name="arrow-up-circle" size={22} color={COLORS.primary} />
      <View>
        <Text style={styles.withdrawalAmount}>₹{withdrawal.amount.toLocaleString('en-IN')}</Text>
        <Text style={styles.withdrawalBank}>{withdrawal.bankName} ••••{withdrawal.bankLast4}</Text>
        <Text style={styles.withdrawalDate}>{format(withdrawal.createdAt, 'dd MMM yyyy')}</Text>
      </View>
    </View>
    <View style={[
      styles.withdrawalStatus,
      withdrawal.status === 'settled' ? styles.wsSettled : styles.wsPending
    ]}>
      <Text style={[
        styles.withdrawalStatusText,
        withdrawal.status === 'settled' ? { color: COLORS.success } : { color: COLORS.warning }
      ]}>
        {withdrawal.status === 'settled' ? '✅ Settled' : '⏳ Processing'}
      </Text>
    </View>
  </View>
);

const TaxRow = ({ label, value, bold }: any) => (
  <View style={styles.taxRow}>
    <Text style={[styles.taxLabel, bold && { fontWeight: '700', color: COLORS.textPrimary }]}>{label}</Text>
    <Text style={[styles.taxValue, bold && { fontWeight: '800', color: COLORS.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: COLORS.white, marginTop: 4 },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  withdrawBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,179,0,0.15)',
    padding: 10,
    borderRadius: 10,
  },
  escrowText: { fontSize: 13, color: COLORS.warning, fontWeight: '600' },
  quickStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  quickStatItem: { alignItems: 'center', flex: 1 },
  quickStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  quickStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabScroll: { marginTop: 12 },
  tabContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  mainScroll: { flex: 1 },
  section: { padding: 20, gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodToggle: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.white },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.white },
  chart: {
    flexDirection: 'row',
    height: 160,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 3 },
  barValue: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', backgroundColor: COLORS.border, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  barLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  barSessions: { fontSize: 9, color: COLORS.primary, fontWeight: '600' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    width: '47%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary },
  sessionLogCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  sessionLogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionLogClient: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sessionLogDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sessionLogRight: { alignItems: 'flex-end', gap: 4 },
  sessionLogAmount: { fontSize: 18, fontWeight: '800', color: COLORS.success },
  escrowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  escrowReleasedBadge: { backgroundColor: `${COLORS.success}15` },
  escrowHeldBadge: { backgroundColor: `${COLORS.warning}20` },
  escrowBadgeText: { fontSize: 11, fontWeight: '700' },
  sessionLogFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sessionTypeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  sessionRateText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  clientFinanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientFinanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  clientAvatarImg: { width: '100%', height: '100%' },
  clientAvatarText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  clientFinanceName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  clientFinanceSince: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  clientTotalEarned: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  clientTotalSessions: { fontSize: 12, color: COLORS.textSecondary },
  clientFinanceStats: { flexDirection: 'row', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  miniStat: { flex: 1, alignItems: 'center', gap: 2 },
  miniStatValue: { fontSize: 18, fontWeight: '800' },
  miniStatLabel: { fontSize: 11, color: COLORS.textMuted },
  rateNote: { fontSize: 13, color: COLORS.textSecondary, backgroundColor: `${COLORS.primary}10`, padding: 12, borderRadius: 10, lineHeight: 20 },
  rateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  rateCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateDate: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  currentBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  currentBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  ratePrices: { gap: 6 },
  rateItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rateText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  rateReason: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  newWithdrawBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  newWithdrawBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  withdrawalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  withdrawalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  withdrawalAmount: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  withdrawalBank: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  withdrawalDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  withdrawalStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  wsSettled: { backgroundColor: `${COLORS.success}15` },
  wsPending: { backgroundColor: `${COLORS.warning}20` },
  withdrawalStatusText: { fontSize: 12, fontWeight: '700' },
  taxCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  taxTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxLabel: { fontSize: 14, color: COLORS.textSecondary },
  taxValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  downloadBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  downloadBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalBalanceRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.background, padding: 14, borderRadius: 12 },
  modalBalanceLabel: { fontSize: 14, color: COLORS.textSecondary },
  modalBalanceValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  modalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bankInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.background, padding: 12, borderRadius: 12 },
  bankInfoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  confirmBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});
