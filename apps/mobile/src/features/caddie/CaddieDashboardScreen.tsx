import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Booking } from "@nobogey/contracts";
import { colors, spacing } from "@nobogey/ui";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { loadSchedule, saveSchedule } from "../../../backend/availability/availability.service";
import { respondToBooking } from "../../../backend/bookings/bookings.service";
import { EmptyState } from "../../ui/EmptyState";
import { NoBogeyWordmark } from "../../ui/NoBogeyWordmark";
import { mobilePalette } from "../../ui/mobile-palette";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { useMobileData } from "../data/useMobileData";
import { TourTarget, useAutomaticGuidedTour, useGuidedTour } from "../guided-tour/GuidedTour";
import { InAppAlertBanner } from "../notifications/InAppAlertBanner";
import { NotificationBell } from "../notifications/NotificationBell";
import { useNotificationAlerts } from "../notifications/NotificationAlertProvider";
import { CaddieAvailabilityEditor, CaddieSchedulePanel, initialAvailabilitySlots } from "./CaddieScheduleScreen";
import { CaddieMatchSheet } from "./CaddieMatchSheet";
import { isUpcomingCaddieBooking, type UpcomingCaddieBooking } from "./caddie-assignment-ui";

// Use logical screen points and respect the user's text size rather than shrinking the screen.
function useDashboardLayout() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pagePadding = width < 360 ? 16 : 20;
  const contentWidth = Math.min(720, width - insets.left - insets.right - pagePadding * 2);
  return {
    pagePadding,
    compact: contentWidth / fontScale < 340,
    tileWidth: Math.min(contentWidth, Math.max(128, 128 * fontScale)),
    metricTileWidth: Math.min(Math.max(0, contentWidth - 38), 112 * fontScale),
  };
}

type DashboardTab = "dashboard" | "schedule" | "portfolio";

export function CaddieDashboardScreen() {
  const { pagePadding } = useDashboardLayout();
  useAutomaticGuidedTour("caddie");
  const { activeTarget, refreshTarget } = useGuidedTour();
  const { bookings, caddies, courses, refresh } = useMobileData();
  const { acceptAssignment, dismissBanner, getUnreadCount, getVisibleAlert, hasUnreadAlert, isAssignmentAccepted, markBookingOpened } = useNotificationAlerts();
  const [tab, setTab] = useState<DashboardTab>("dashboard");
  const [availabilityEditorVisible, setAvailabilityEditorVisible] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState(initialAvailabilitySlots);
  const [selectedBookingId, setSelectedBookingId] = useState<string>();
  const [acceptingBookingId, setAcceptingBookingId] = useState<string>();
  const scrollRef = useRef<ScrollView>(null);
  const [tabsY, setTabsY] = useState(0);

  useEffect(() => { void loadSchedule().then(setAvailabilitySlots).catch(() => undefined); }, []);
  useEffect(() => {
    if (!activeTarget) return;
    if (activeTarget === "caddie-tab-dashboard") setTab("dashboard");
    if (activeTarget === "caddie-tab-schedule") setTab("schedule");
    if (activeTarget === "caddie-upcoming-assignments") setTab("schedule");
    if (activeTarget === "caddie-tab-portfolio") setTab("portfolio");
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, tabsY - spacing.lg) }));
    const timeout = setTimeout(refreshTarget, 350);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [activeTarget, refreshTarget, tabsY]);

  const updateAvailability = (slots: typeof availabilitySlots) => { setAvailabilitySlots(slots); void saveSchedule(slots).catch(() => undefined); };
  const assignments = bookings.filter(isUpcomingCaddieBooking);
  const nextAssignment = assignments[0];
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);
  const selectedCaddie = caddies.find((caddie) => caddie.id === selectedBooking?.caddieId);
  const selectedCourse = courses.find((course) => course.id === selectedBooking?.courseId);
  const alert = getVisibleAlert("caddie");
  const openBooking = (bookingId: string) => {
    markBookingOpened(bookingId, "caddie");
    if (bookings.find((item) => item.id === bookingId)?.status === "confirmed") {
      router.push({ pathname: "/caddie/matches/[bookingId]", params: { bookingId } });
      return;
    }
    setSelectedBookingId(bookingId);
  };
  const handleAccept = async (booking: Booking) => {
    if (isAssignmentAccepted(booking.id)) return;
    setAcceptingBookingId(booking.id);
    try { await respondToBooking(booking.id, true); acceptAssignment(booking.id); setSelectedBookingId(undefined); refresh(); }
    finally { setAcceptingBookingId(undefined); }
  };
  const handleDecline = async (booking: Booking) => { await respondToBooking(booking.id, false); setSelectedBookingId(undefined); refresh(); };

  return <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[styles.safeArea, { backgroundColor: mobilePalette.white }]}>
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pagePadding }]} contentInsetAdjustmentBehavior="automatic" ref={scrollRef} showsVerticalScrollIndicator={false}>
      <ResponsiveContent style={styles.content}>
        <TourTarget id="caddie-dashboard"><DashboardHeader notificationCount={getUnreadCount("caddie")} onNotifications={() => router.push("/caddie/roster")} /></TourTarget>
        {alert ? <InAppAlertBanner actionLabel="View request" body={alert.body} onAction={() => openBooking(alert.bookingId)} onDismiss={() => dismissBanner(alert.id)} title={alert.title} /> : null}
        <View accessibilityRole="tablist" onLayout={(event) => setTabsY(event.nativeEvent.layout.y)} style={styles.tabs}>
          <TourTarget id="caddie-tab-dashboard" style={styles.tabTarget}><Tab active={tab === "dashboard"} icon="view-dashboard-outline" label="Dashboard" onPress={() => setTab("dashboard")} /></TourTarget>
          <TourTarget id="caddie-tab-schedule" style={styles.tabTarget}><Tab active={tab === "schedule"} icon="calendar-week" label="Schedule" onPress={() => setTab("schedule")} /></TourTarget>
          <TourTarget id="caddie-tab-portfolio" style={styles.tabTarget}><Tab active={tab === "portfolio"} icon="account-star-outline" label="Portfolio" onPress={() => setTab("portfolio")} /></TourTarget>
        </View>
        {tab === "dashboard" ? <DashboardView assignment={nextAssignment} courseName={courses.find((course) => course.id === nextAssignment?.courseId)?.name} onEditAvailability={() => setAvailabilityEditorVisible(true)} onOpenAssignment={() => nextAssignment && openBooking(nextAssignment.id)} onShowPortfolio={() => setTab("portfolio")} onShowSchedule={() => setTab("schedule")} /> : null}
        {tab === "schedule" ? <ScheduleView assignments={assignments} hasUnreadRequest={(bookingId) => hasUnreadAlert("caddie", bookingId, "booking_assignment_requested")} isAccepted={isAssignmentAccepted} onEditAvailability={() => setAvailabilityEditorVisible(true)} onOpenAssignment={openBooking} slots={availabilitySlots} /> : null}
        {tab === "portfolio" ? <PortfolioView /> : null}
      </ResponsiveContent>
    </ScrollView>
    {availabilityEditorVisible ? <CaddieAvailabilityEditor onClose={() => setAvailabilityEditorVisible(false)} onSave={updateAvailability} slots={availabilitySlots} /> : null}
    <CaddieMatchSheet assignmentWindowState="eligible" booking={selectedBooking} caddie={selectedCaddie} course={selectedCourse} golfer={undefined} isAccepting={selectedBookingId === acceptingBookingId} isAssignmentAccepted={selectedBookingId ? isAssignmentAccepted(selectedBookingId) : false} onAcceptAssignment={(booking) => void handleAccept(booking)} onClose={() => setSelectedBookingId(undefined)} onDeclineAssignment={(booking) => void handleDecline(booking)} visible={Boolean(selectedBookingId)} />
  </SafeAreaView>;
}

function DashboardHeader({ notificationCount, onNotifications }: { notificationCount: number; onNotifications: () => void }) { const { compact } = useDashboardLayout(); return <View style={[styles.header, compact && styles.headerCompact]}><NoBogeyWordmark centered={!compact} /><View style={styles.headerActions}><NotificationBell count={notificationCount} onPress={onNotifications} /><Pressable accessibilityLabel="Open settings" accessibilityRole="button" hitSlop={8} onPress={() => router.push("/caddie/settings")} style={styles.iconButton}><MaterialCommunityIcons color={colors.fairwayDark} name="cog-outline" size={21} /></Pressable></View></View>; }
function DashboardView({ assignment, courseName, onEditAvailability, onOpenAssignment, onShowPortfolio, onShowSchedule }: { assignment: UpcomingCaddieBooking | undefined; courseName: string | undefined; onEditAvailability: () => void; onOpenAssignment: () => void; onShowPortfolio: () => void; onShowSchedule: () => void }) {
  return <View style={styles.stack}>
    <View style={styles.nextCard}>
      <View style={styles.nextTop}>
        <Text style={styles.nextEyebrow}>NEXT ON THE COURSE</Text>
        <MaterialCommunityIcons color="#C79B43" name="golf-tee" size={24} />
      </View>
      {assignment ? <Pressable accessibilityLabel="Open next assignment" accessibilityRole="button" onPress={onOpenAssignment} style={({ pressed }) => [styles.assignmentPreview, pressed && styles.pressed]}>
        <StatusBadge status={assignment.status} />
        <Text style={styles.nextTitle}>Your next assignment</Text>
        <Text style={styles.nextMeta}>{formatDateTime(assignment.teeTime)}</Text>
        <Text style={styles.nextMeta}>{courseName ?? "Course details pending"} · {assignment.partySize} {assignment.partySize === 1 ? "golfer" : "golfers"}</Text>
        <View style={styles.heroLink}><Text style={styles.nextLink}>View assignment</Text><MaterialCommunityIcons color="#F3E5C5" name="arrow-top-right" size={19} /></View>
      </Pressable> : <View style={styles.assignmentPreview}>
        <Text style={styles.nextTitle}>Room for your next great round.</Text>
        <Text style={styles.nextMeta}>New booking requests will appear here. Keep your availability up to date.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="View caddie roster" onPress={() => router.push("/caddie/roster")} style={({ pressed }) => [styles.heroLink, pressed && styles.pressed]}><Text style={styles.nextLink}>View roster</Text><MaterialCommunityIcons color="#F3E5C5" name="arrow-top-right" size={19} /></Pressable>
      </View>}
    </View>
    <Pressable accessibilityLabel="Edit availability" accessibilityRole="button" onPress={onEditAvailability} style={({ pressed }) => [styles.availabilityAction, pressed && styles.pressed]}>
      <View style={styles.actionIcon}><MaterialCommunityIcons color={mobilePalette.forest} name="calendar-edit" size={22} /></View>
      <View style={styles.flex}><Text style={styles.actionTitle}>Make time for the course</Text><Text style={styles.actionCopy}>Update your weekly availability</Text></View>
      <MaterialCommunityIcons color={mobilePalette.forest} name="arrow-right" size={20} />
    </Pressable>
    <WeeklyMetrics />
    <SectionHeading detail="Everything you need, one tap away." title="Your clubhouse" />
    <View style={styles.quickGrid}>
      <QuickAction icon="account-group-outline" label="Caddie roster" onPress={() => router.push("/caddie/roster")} />
      <QuickAction icon="calendar-arrow-right" label="View schedule" onPress={onShowSchedule} />
      <QuickAction icon="calendar-week" label="Edit availability" onPress={onEditAvailability} />
      <QuickAction icon="account-edit-outline" label="Your portfolio" onPress={onShowPortfolio} />
    </View>
  </View>;
}
function WeeklyMetrics() { return <View style={styles.weeklyMetrics}><View style={styles.weeklyHeader}><Text accessibilityRole="header" style={styles.weeklyTitle}>This week</Text><Text style={styles.weeklyLabel}>AT A GLANCE</Text></View><View style={styles.weeklyGrid}><WeeklyMetric label="EARNINGS" /><WeeklyMetric label="BOOKED SLOTS" /><WeeklyMetric label="AVG. RATING" /><WeeklyMetric label="REPEAT CLIENTS" /></View></View>; }
function WeeklyMetric({ label }: { label: string }) { const { metricTileWidth } = useDashboardLayout(); return <View accessibilityLabel={`${label.toLowerCase()} unavailable`} style={[styles.weeklyMetric, { minWidth: metricTileWidth }]}><Text style={styles.weeklyMetricLabel}>{label}</Text><Text style={styles.weeklyMetricValue}>—</Text></View>; }
function ScheduleView({ assignments, hasUnreadRequest, isAccepted, onEditAvailability, onOpenAssignment, slots }: { assignments: UpcomingCaddieBooking[]; hasUnreadRequest: (bookingId: string) => boolean; isAccepted: (bookingId: string) => boolean; onEditAvailability: () => void; onOpenAssignment: (bookingId: string) => void; slots: typeof initialAvailabilitySlots }) { return <View style={styles.stack}><CaddieSchedulePanel onEditAvailability={onEditAvailability} slots={slots} /><TourTarget id="caddie-upcoming-assignments" style={styles.assignmentSection}><SectionHeading detail="Existing booking requests and confirmed rounds" title="Caddie roster" /><View style={styles.whiteCard}>{assignments.length ? assignments.map((booking, index) => <AssignmentRow accepted={isAccepted(booking.id)} booking={booking} highlighted={hasUnreadRequest(booking.id)} key={booking.id} onPress={() => onOpenAssignment(booking.id)} showDivider={index > 0} />) : <EmptyState description="Assigned rounds will appear here as bookings become available." icon="golf" minHeight={170} title="No upcoming assignments" />}</View></TourTarget><SectionHeading detail="Round feedback from the review connection" title="Recent reviews" /><View style={styles.whiteCard}><EmptyState description="Reviews will appear here when feedback data is available." icon="star-outline" minHeight={150} title="No reviews yet" /></View></View>; }
function PortfolioView() {
  const unavailable = () => undefined;
  const { compact } = useDashboardLayout();
  return <View style={styles.stack}>
    <View style={styles.portfolioHero}>
      <View style={styles.portfolioIdentity}>
        <View style={styles.avatar}><MaterialCommunityIcons color="#DDEADF" name="account-outline" size={28} /></View>
        <Text style={styles.portfolioLabel}>PROFESSIONAL PORTFOLIO</Text>
      </View>
      <Text accessibilityRole="header" style={styles.portfolioName}>Profile details pending</Text>
      <Text style={styles.portfolioCopy}>Your verified profile information will appear here when available.</Text>
    </View>
    <View style={[styles.portfolioActions, compact && styles.portfolioActionsCompact]}>
      <Pressable accessibilityLabel="Edit profile" accessibilityRole="button" onPress={() => router.push("/caddie/profile")} style={({ pressed }) => [styles.profileEditButton, pressed && styles.pressed]}>
        <Text style={styles.profileEditText}>Edit profile</Text>
        <MaterialCommunityIcons color={mobilePalette.white} name="arrow-top-right" size={18} />
      </Pressable>
      <Pressable accessibilityLabel="Share portfolio, coming soon" accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={styles.primaryDisabled}>
        <Text style={styles.primaryDisabledText}>Share portfolio</Text>
        <Text style={styles.shareSoon}>Soon</Text>
      </Pressable>
    </View>
    <SectionHeading detail="Professional profile tools" title="Quick actions" /><View style={styles.quickGrid}><QuickAction icon="account-edit-outline" label="Edit Profile" onPress={() => router.push("/caddie/profile")} /><QuickAction disabled icon="certificate-outline" label="Manage Credentials" onPress={unavailable} /><QuickAction disabled icon="tag-outline" label="Update Specialties" onPress={unavailable} /><QuickAction disabled icon="share-variant-outline" label="Share Portfolio" onPress={unavailable} /></View><PortfolioSection icon="text-box-outline" title="About"><Text style={styles.placeholderText}>A professional introduction will appear here when profile information is available.</Text></PortfolioSection><PortfolioSection icon="target" title="Specialties"><EmptyState description="Specialties will appear here once they are added to the profile." icon="target" minHeight={115} title="No specialties listed" /></PortfolioSection><PortfolioSection icon="certificate-outline" title="Credentials"><EmptyState description="Credentials will appear here once verification data is available." icon="certificate-outline" minHeight={115} title="No credentials listed" /></PortfolioSection><PortfolioSection icon="chart-line" title="Performance highlights"><View style={styles.metricGrid}>{["Tier", "Tenure", "Rounds completed", "Average rating", "Average HCP", "Repeat golfers"].map((label) => <View key={label} style={styles.metricTile}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>—</Text></View>)}</View></PortfolioSection><PortfolioSection icon="star-outline" title="Recent reviews"><EmptyState description="Feedback will appear here when reviews are available." icon="star-outline" minHeight={115} title="No reviews yet" /></PortfolioSection></View>; }
function AssignmentRow({ accepted, booking, highlighted, onPress, showDivider }: { accepted: boolean; booking: UpcomingCaddieBooking; highlighted: boolean; onPress: () => void; showDivider: boolean }) { return <Pressable accessibilityLabel="Open assignment" accessibilityRole="button" onPress={onPress} style={[styles.assignmentRow, showDivider && styles.assignmentDivider, highlighted && styles.assignmentHighlighted]}><View style={styles.assignmentDate}><Text style={styles.assignmentDay}>{formatDay(booking.teeTime)}</Text><Text style={styles.assignmentMonth}>{formatMonth(booking.teeTime)}</Text></View><View style={styles.flex}><View style={styles.assignmentTitleRow}><Text style={styles.assignmentTitle}>Assigned golfer</Text>{highlighted ? <Text style={styles.newPill}>NEW</Text> : null}</View><Text style={styles.assignmentCopy}>{formatTime(booking.teeTime)} · {booking.partySize} {booking.partySize === 1 ? "golfer" : "golfers"}</Text></View><StatusBadge status={booking.status === "confirmed" ? "confirmed" : accepted ? "accepted" : booking.status} /></Pressable>; }
function PortfolioSection({ children, icon, title }: { children: ReactNode; icon: string; title: string }) { return <View style={styles.whiteCard}><View style={styles.sectionTitleRow}><View style={styles.sectionIcon}><MaterialCommunityIcons color="#164730" name={icon as never} size={18} /></View><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text></View>{children}</View>; }
function QuickAction({ disabled = false, icon, label, onPress }: { disabled?: boolean; icon: string; label: string; onPress: () => void }) { const { tileWidth } = useDashboardLayout(); return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.quickAction, { minWidth: tileWidth }, disabled && styles.disabled, pressed && styles.pressed]}><MaterialCommunityIcons color={disabled ? "#829A8C" : "#164730"} name={icon as never} size={22} /><View style={styles.quickLabelRow}><Text style={styles.quickText}>{label}</Text><MaterialCommunityIcons color={mobilePalette.forest} name="arrow-top-right" size={16} /></View>{disabled ? <Text style={styles.comingSoon}>Soon</Text> : null}</Pressable>; }
function SectionHeading({ detail, title }: { detail: string; title: string }) { return <View><Text accessibilityRole="header" style={styles.sectionHeading}>{title}</Text><Text style={styles.sectionDetail}>{detail}</Text></View>; }
function StatusBadge({ status }: { status: string }) { const copy = status.replaceAll("_", " "); const style = status === "accepted" || status === "confirmed" ? styles.statusConfirmed : status === "requested" || status === "pending" ? styles.statusRequested : styles.statusDefault; return <View style={[styles.statusBadge, style]}><Text style={styles.statusText}>{copy}</Text></View>; }
function Tab({ active, icon, label, onPress }: { active: boolean; icon: string; label: string; onPress: () => void }) { const { compact } = useDashboardLayout(); return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.tab, compact && styles.tabCompact, active && styles.tabActive]}><MaterialCommunityIcons color={active ? mobilePalette.onGreen : mobilePalette.forest} name={icon as never} size={16} /><Text style={[styles.tabText, { color: active ? mobilePalette.onGreen : mobilePalette.forest }]}>{label}</Text></Pressable>; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value)); }
function formatDay(value: string) { return new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value)); }
function formatMonth(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "Asia/Manila" }).format(new Date(value)).toUpperCase(); }
function formatTime(value: string) { return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value)); }

const styles = StyleSheet.create({
  portfolioIdentity: { alignItems: "center", flexDirection: "row", gap: 14 },
  portfolioActionsCompact: { flexDirection: "column" },
  profileEditButton: { alignItems: "center", backgroundColor: "#173F35", borderRadius: 999, flex: 1, flexDirection: "row", gap: 12, justifyContent: "center", minHeight: 52, paddingHorizontal: 18, paddingVertical: 14 },
  profileEditText: { color: "#FCFBF7", flexShrink: 1, fontSize: 13, lineHeight: 20, fontWeight: "600", textAlign: "center" },
  shareSoon: { color: "#686E62", backgroundColor: "#E5E1D8", borderRadius: 999, fontSize: 10, fontWeight: "600", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3 },
  headerCompact: { flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  tabCompact: { flexDirection: "column", paddingVertical: 10 },
  nextEyebrow: { color: "#D9CEAA", fontSize: 10, letterSpacing: 1.6, fontWeight: "600" },
  assignmentPreview: { alignItems: "flex-start", gap: 12 },
  heroLink: { alignSelf: "stretch", alignItems: "center", flexDirection: "row", justifyContent: "space-between", borderTopColor: "#426156", borderTopWidth: 1, paddingTop: 16, marginTop: 8, minHeight: 44 },
  quickLabelRow: { alignSelf: "stretch", minWidth: 0, alignItems: "center", flexDirection: "row", gap: 5 },
  pressed: { opacity: .7 },
  actionCopy: { color: "#686E62", fontSize: 12, marginTop: 3, lineHeight: 18 }, actionIcon: { alignItems: "center", backgroundColor: "#E3E9DD", borderRadius: 999, height: 42, justifyContent: "center", width: 42 }, actionTitle: { color: "#173F35", fontSize: 14, fontWeight: "600", lineHeight: 20 }, assignmentCopy: { color: "#597267", fontSize: 12, marginTop: 3 }, assignmentDate: { alignItems: "center", backgroundColor: "#E7F0E8", borderRadius: 12, justifyContent: "center", minHeight: 50, width: 48 }, assignmentDay: { color: "#164730", fontSize: 17, fontWeight: "900" }, assignmentDivider: { borderTopColor: "#E4E8E2", borderTopWidth: 1 }, assignmentHighlighted: { backgroundColor: "#FFF8E6" }, assignmentMonth: { color: "#5E776B", fontSize: 10, fontWeight: "900", letterSpacing: .8 }, assignmentRow: { flexWrap: "wrap", alignItems: "center", flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md }, assignmentSection: { gap: spacing.sm }, assignmentTitle: { color: "#173F2E", fontSize: 14, fontWeight: "900" }, assignmentTitleRow: { flexWrap: "wrap", alignItems: "center", flexDirection: "row", gap: 6 }, availabilityAction: { alignItems: "center", backgroundColor: "#F0F1E9", borderRadius: 20, borderColor: "#E5E1D8", borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 84, padding: 16 }, avatar: { alignItems: "center", backgroundColor: "#2B5447", borderColor: "#567365", borderWidth: 1, borderRadius: 999, height: 48, justifyContent: "center", width: 48 }, comingSoon: { color: "#71877B", fontSize: 10, fontWeight: "800" }, content: { gap: 24 }, destination: { alignItems: "center", backgroundColor: "#F0F6F0", borderRadius: 18, flexDirection: "row", flex: 1, gap: 8, minHeight: 66, padding: spacing.sm }, destinationIcon: { alignItems: "center", backgroundColor: "#D4E8D8", borderRadius: 10, height: 36, justifyContent: "center", width: 36 }, destinationRow: { flexDirection: "row", gap: spacing.sm }, destinationText: { color: "#164730", flex: 1, fontSize: 14, fontWeight: "900" }, disabled: { opacity: .64 }, emptyCopy: { color: "#657D70", fontSize: 12, marginTop: 2 }, emptyIcon: { alignItems: "center", backgroundColor: "#DAEADC", borderRadius: 14, height: 46, justifyContent: "center", width: 46 }, emptyNext: { alignItems: "center", backgroundColor: "#F4F7F1", borderRadius: 18, flexDirection: "row", gap: spacing.sm, minHeight: 92, padding: spacing.md }, emptyTitle: { color: "#173F2E", fontSize: 16, fontWeight: "900" }, flex: { flex: 1, minWidth: 0 }, header: { alignItems: "center", flexDirection: "row", minHeight: 52 }, headerActions: { alignItems: "center", flexDirection: "row", gap: 8, marginLeft: "auto" }, headerTitle: { color: colors.ink, fontSize: 29, fontWeight: "900", letterSpacing: -.8 }, iconButton: { alignItems: "center", backgroundColor: "#FCFBF7", borderColor: "#E5E1D8", borderWidth: 1, borderRadius: 999, height: 40, justifyContent: "center", width: 40 }, metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metricLabel: { color: "#617B6D", fontSize: 11, fontWeight: "800" }, metricTile: { backgroundColor: "#EDF4ED", borderRadius: 14, flexBasis: "46%", flexGrow: 1, minWidth: 120, gap: 4, minHeight: 72, padding: spacing.sm }, metricValue: { color: "#173F2E", fontSize: 22, fontWeight: "900" }, newPill: { backgroundColor: "#FFF0B8", borderRadius: 999, color: "#785E0A", fontSize: 9, fontWeight: "900", overflow: "hidden", paddingHorizontal: 6, paddingVertical: 3 }, nextCard: { backgroundColor: "#173F35", borderRadius: 24, gap: 22, padding: 20 }, nextIcon: { alignItems: "center", backgroundColor: "#367D57", borderRadius: 12, height: 42, justifyContent: "center", width: 42 }, nextLink: { color: "#F3E5C5", fontSize: 13, fontWeight: "600" }, nextMeta: { color: "#DDEADF", fontSize: 13, lineHeight: 21 }, nextTitle: { color: "#FCFBF7", fontSize: 28, lineHeight: 33, fontWeight: "600", letterSpacing: -1 }, nextTop: { flexWrap: "wrap", gap: 8, alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, placeholderText: { color: "#5F786B", fontSize: 13, lineHeight: 20 }, portfolioActions: { flexDirection: "row", gap: 12 }, portfolioCopy: { color: "#DDEADF", fontSize: 13, lineHeight: 21 }, portfolioHero: { backgroundColor: "#173F35", borderRadius: 24, gap: 18, padding: 24 }, portfolioLabel: { color: "#D9CEAA", flex: 1, fontSize: 10, lineHeight: 17, fontWeight: "600", letterSpacing: 1.6 }, portfolioName: { color: "#FCFBF7", fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -.8 }, primaryDisabled: { alignItems: "center", backgroundColor: "#F0EEE7", borderColor: "#E5E1D8", borderWidth: 1, borderRadius: 999, flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", minHeight: 52, paddingHorizontal: 18, paddingVertical: 14 }, primaryDisabledText: { color: "#686E62", flexShrink: 1, fontSize: 13, lineHeight: 20, fontWeight: "600", textAlign: "center" }, quickAction: { alignItems: "flex-start", backgroundColor: "#FCFBF7", borderColor: "#E5E1D8", borderWidth: 1, borderRadius: 18, flexBasis: "46%", flexGrow: 1, gap: 26, minHeight: 112, justifyContent: "space-between", padding: 16 }, quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, quickText: { color: "#173F35", flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 19 }, ratingPill: { alignItems: "center", backgroundColor: "#F7E9BB", borderRadius: 999, flexDirection: "row", gap: 3, paddingHorizontal: 8, paddingVertical: 5 }, ratingText: { color: "#694F1D", fontSize: 12, fontWeight: "900" }, safeArea: { backgroundColor: "#FCFBF7", flex: 1 }, scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }, secondaryButton: { minWidth: 120, padding: 12, alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#C9D7CB", borderRadius: 14, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46 }, secondaryText: { color: "#164730", fontSize: 13, fontWeight: "900" }, sectionDetail: { color: "#77766F", fontSize: 12, lineHeight: 19, marginTop: 4 }, sectionHeading: { color: "#173F35", fontSize: 23, fontWeight: "600", letterSpacing: -.7 }, sectionIcon: { alignItems: "center", backgroundColor: "#DCECE0", borderRadius: 10, height: 34, justifyContent: "center", width: 34 }, sectionTitle: { color: "#173F2E", fontSize: 16, fontWeight: "900" }, sectionTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 }, stack: { gap: 20 }, statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, statusConfirmed: { backgroundColor: "#CDE7D5" }, statusDefault: { backgroundColor: "#E6ECE7" }, statusRequested: { backgroundColor: "#FFF0B8" }, statusText: { color: "#315D46", fontSize: 10, fontWeight: "900", textTransform: "capitalize" }, tab: { alignItems: "center", borderRadius: 999, flex: 1, flexDirection: "row", gap: 5, justifyContent: "center", minHeight: 44, paddingHorizontal: 4 }, tabActive: { backgroundColor: "#173F35" }, tabTarget: { flex: 1, minWidth: 0 }, tabText: { fontSize: 11, fontWeight: "600", flexShrink: 1, textAlign: "center" }, tabTextActive: { color: "#F7F3E9" }, tabs: { backgroundColor: "#F0EEE7", borderRadius: 999, flexDirection: "row", padding: 5 }, weeklyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, weeklyHeader: { flexWrap: "wrap", gap: 8, alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, weeklyLabel: { color: "#77766F", fontSize: 9, fontWeight: "600", letterSpacing: 1.2 }, weeklyMetric: { backgroundColor: "#FCFBF7", borderColor: "#E5E1D8", borderWidth: 1, borderRadius: 14, flexBasis: "46%", flexGrow: 1, justifyContent: "space-between", gap: 12, minHeight: 104, padding: 14 }, weeklyMetricLabel: { color: "#173F35", fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: .5 }, weeklyMetricValue: { color: "#173F35", fontSize: 24, fontWeight: "500", marginTop: 4 }, weeklyMetrics: { backgroundColor: "#F7F5EF", borderColor: "#E5E1D8", borderWidth: 1, borderRadius: 22, gap: 18, padding: 18 }, weeklyTitle: { color: "#173F35", fontSize: 21, fontWeight: "600", letterSpacing: -.6 }, whiteCard: { backgroundColor: "#FFFFFF", borderColor: "#E0E7DF", borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md }
});
