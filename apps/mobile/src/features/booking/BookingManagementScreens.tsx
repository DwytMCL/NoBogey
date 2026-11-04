import type { Booking, Caddie, GolfCourse } from "@nobogey/contracts";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useState } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { describeUserError, formatMoney, formatTeeTime } from "@nobogey/utils";
import { colors, radius, spacing, typography } from "@nobogey/ui";
import { EmptyState } from "../../ui/EmptyState";
import { backToPreviousPage } from "../../ui/navigation";
import { Button } from "../../ui/primitives";
import { useMobileData } from "../data/useMobileData";
import { MobileBottomNavigation } from "../../ui/MobileBottomNavigation";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { cancelBooking } from '../../../backend/bookings/bookings.service';
import { CaddieContactCard } from "../contact/CaddieContactCard";
import { useNotificationAlerts } from "../notifications/NotificationAlertProvider";
import { getSupabaseClient } from "../../../backend/client";
import { RoundConfirmationActions, RoundConfirmationSummary } from "./round-confirmation-ui";
import { mobilePalette } from "../../ui/mobile-palette";
import { flowColors } from "./components/FindGameUI";

export function MyBookingsScreen() {
  const { bookings, caddies, courses } = useMobileData();
  const { hasUnreadAlert, isAssignmentAccepted, markBookingOpened } = useNotificationAlerts();
  const upcomingBookings = bookings.filter((booking) => booking.status === "requested" || booking.status === "confirmed");
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={styles.bookingsSafe}>
      <ScrollView contentContainerStyle={styles.bookingsPage} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <ResponsiveContent style={styles.bookingsFrame}>
          <View style={styles.bookingsIntro}>
            <Text style={styles.bookingsEyebrow}>TIME WELL SPENT ON THE COURSE</Text>
            <Text accessibilityRole="header" style={styles.bookingsTitle}>My bookings</Text>
            <Text style={styles.bookingsSubtitle}>Your next round, all in one place. Keep track of requests and confirmed tee times.</Text>
          </View>
          <View style={styles.bookingsSectionHeading}>
            <Text accessibilityRole="header" style={styles.bookingsSectionTitle}>Upcoming rounds</Text>
            <Text style={styles.bookingsCount}>{upcomingBookings.length} {upcomingBookings.length === 1 ? "round" : "rounds"}</Text>
          </View>
          {upcomingBookings.length
            ? upcomingBookings.map((booking) => <BookingCard booking={booking} caddie={caddies.find((item) => item.id === booking.caddieId)} course={courses.find((item) => item.id === booking.courseId)} isAccepted={booking.status === "confirmed" || isAssignmentAccepted(booking.id)} isUnread={hasUnreadAlert("golfer", booking.id, "booking_assignment_accepted")} key={booking.id} onOpen={() => markBookingOpened(booking.id, "golfer")} />)
            : <View style={styles.bookingsEmpty}>
                <View style={styles.bookingsEmptyIcon}><Feather color={mobilePalette.forest} name="calendar" size={26} /></View>
                <Text accessibilityRole="header" style={styles.bookingsEmptyTitle}>Your next round awaits</Text>
                <Text style={styles.bookingsEmptyCopy}>Your requested and confirmed rounds will appear here. Find a course to get started.</Text>
              </View>}
          <Pressable accessibilityRole="button" accessibilityLabel="Book a round" onPress={() => router.push("/golfer/find-game")} style={({ pressed }) => [styles.bookRoundButton, pressed && styles.bookingsPressed]}>
            <Text style={styles.bookRoundText}>Book a round</Text><Feather color={mobilePalette.white} name="arrow-up-right" size={19} />
          </Pressable>
        </ResponsiveContent>
      </ScrollView>
      <MobileBottomNavigation active="bookings" />
    </SafeAreaView>
  );
}
export function BookingDetailsScreen() {
  const { bookings, caddies, courses, refresh } = useMobileData();
  const [actionError, setActionError] = useState<string>();
  const { isAssignmentAccepted, markBookingOpened } = useNotificationAlerts();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const booking = bookings.find((item) => item.id === bookingId);
  const caddie = caddies.find((item) => item.id === booking?.caddieId);
  const course = courses.find((item) => item.id === booking?.courseId);

  useEffect(() => {
    if (bookingId) markBookingOpened(bookingId, "golfer");
  }, [bookingId, markBookingOpened]);

  if (!booking) {
    return <UnavailableBooking title="Booking unavailable" />;
  }
  const assignmentAccepted = booking.status === "confirmed" || isAssignmentAccepted(booking.id);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.detailSafe}>
      <ScrollView contentContainerStyle={styles.detailPage} contentInsetAdjustmentBehavior="automatic">
        <ResponsiveContent style={styles.detailFrame}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTopline}>
              <Text style={styles.detailEyebrow}>YOUR ROUND</Text>
              <StatusChip accepted={assignmentAccepted} status={booking.status} />
            </View>
            <Text accessibilityRole="header" style={styles.detailTitle}>{course?.name ?? "Course details unavailable"}</Text>
            {course && (course.city || course.province) ? <View style={styles.locationRow}><Feather color="#687267" name="map-pin" size={13} /><Text style={styles.detailCaption}>{[course.city, course.province].filter(Boolean).join(", ")}</Text></View> : null}
          </View>

          <View style={styles.detailCard}>
            <View style={styles.roundFacts}>
              <View style={styles.roundFact}><Feather color={mobilePalette.forest} name="calendar" size={18} /><View style={styles.factCopy}><Text style={styles.detailLabel}>Date & tee time</Text><Text selectable style={styles.factValue}>{formatTeeTime(booking.teeTime)}</Text></View></View>
              <View style={styles.roundFact}><Feather color={mobilePalette.forest} name="users" size={18} /><View style={styles.factCopy}><Text style={styles.detailLabel}>Group size</Text><Text selectable style={styles.factValue}>{booking.partySize} {booking.partySize === 1 ? "golfer" : "golfers"}</Text></View></View>
            </View>
            <View style={styles.referenceRow}><Text style={styles.detailLabel}>Booking reference</Text><Text selectable style={styles.referenceValue}>{booking.id}</Text></View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailEyebrow}>{booking.status === "confirmed" ? "ASSIGNED CADDIE" : "PREFERRED CADDIE"}</Text>
            <View style={styles.caddieRow}>
              <View style={styles.caddieInitial}><Text style={styles.caddieInitialText}>{caddie?.displayName.trim().slice(0, 1).toUpperCase() || "C"}</Text></View>
              <View style={styles.caddieCopy}><Text selectable style={styles.caddieName}>{caddie?.displayName ?? "Assigned caddie"}</Text><View style={styles.caddieState}><View style={[styles.stateDot, assignmentAccepted && styles.stateDotAccepted]} /><Text style={styles.caddieMeta}>{assignmentAccepted ? "Assignment accepted" : "Awaiting response"}</Text></View></View>
            </View>
            <View style={styles.feeRow}><Text style={styles.detailCaption}>Caddie fee</Text><Text selectable style={styles.rate}>{formatMoney(booking.quotedRate.amountInCentavos, booking.quotedRate.currency)}</Text></View>
          </View>

          <RoundConfirmationActions booking={booking} role="golfer" />
          {booking.status === "requested" || booking.status === "confirmed" ? <Button onPress={() => void cancelBooking(booking.id).then(refresh).catch((error) => setActionError(describeUserError(error, "Your booking could not be canceled. Please try again.")))} variant="secondary">Cancel booking</Button> : null}
          {actionError ? <Text accessibilityLiveRegion="polite" style={styles.detailError}>{actionError}</Text> : null}
          <CaddieContactCard isAccepted={assignmentAccepted} />
        </ResponsiveContent>
      </ScrollView>
    </SafeAreaView>
  );
}

export function RateCaddieScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { bookings } = useMobileData();
  const booking = bookings.find((item) => item.id === bookingId);
  const [score, setScore] = useState(5); const [comment, setComment] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  if (!booking) return <UnavailableBooking title="Caddie rating unavailable" />;
  const submit = async () => { setSaving(true); setMessage(""); try { const { data: auth } = await getSupabaseClient().auth.getUser(); if (!auth.user) throw new Error("AUTH_REQUIRED"); const { error } = await getSupabaseClient().from("ratings").insert({ booking_id: booking.id, rater_id: auth.user.id, ratee_id: booking.caddieId, score, comment: comment.trim() || null }); if (error) throw error; setMessage("Thank you. Your rating was saved."); } catch (error) { setMessage(describeUserError(error, "Your rating was not submitted. Please try again.")); } finally { setSaving(false); } };
  return <SafeAreaView edges={["bottom"]} style={styles.safeArea}><ScrollView contentContainerStyle={styles.page}><Text accessibilityRole="header" style={styles.title}>Rate your caddie</Text><View style={styles.ratingRow}>{[1,2,3,4,5].map((value) => <Pressable accessibilityLabel={`${value} stars`} accessibilityRole="button" key={value} onPress={() => setScore(value)}><Text style={styles.ratingStar}>{value <= score ? "★" : "☆"}</Text></Pressable>)}</View><TextInput accessibilityLabel="Rating comments" multiline onChangeText={setComment} placeholder="Share feedback about your round" style={styles.ratingInput} value={comment} />{message ? <Text style={styles.subtitle}>{message}</Text> : null}<Button disabled={saving} onPress={() => void submit()}>{saving ? "Saving…" : "Submit rating"}</Button></ScrollView></SafeAreaView>;
}

function UnavailableBooking({ title }: { title: string }) {
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.unavailable}>
        <EmptyState description="Booking details will appear after the booking service is connected." icon="calendar-remove-outline" minHeight={500} title={title} />
        <Button onPress={() => backToPreviousPage("/golfer/bookings")}>Back to bookings</Button>
      </View>
    </SafeAreaView>
  );
}

function BookingCard({ booking, caddie, course, isAccepted, isUnread, onOpen }: { booking: Booking; caddie: Caddie | undefined; course: GolfCourse | undefined; isAccepted: boolean; isUnread: boolean; onOpen: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`View booking at ${course?.name ?? "Course details unavailable"}`}
      accessibilityRole="button"
      onPress={() => { onOpen(); router.push({ pathname: "/golfer/bookings/[bookingId]", params: { bookingId: booking.id } }); }}
      style={({ pressed }) => [styles.bookingCard, isUnread && styles.bookingCardUnread, pressed && styles.bookingsPressed]}
    >
      <View style={styles.bookingMain}><View style={styles.dateBlock}><Text style={styles.dateDay}>{formatDatePart(booking.teeTime, "weekday")}</Text><Text style={styles.dateNumber}>{formatDatePart(booking.teeTime, "day")}</Text><Text style={styles.dateMonth}>{formatDatePart(booking.teeTime, "month")}</Text></View><View style={styles.bookingCopy}><View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{course?.name ?? "Course details unavailable"}</Text>{isUnread ? <Text style={styles.updateBadge}>Updated</Text> : null}</View><Text style={styles.cardMeta}>{formatTeeTime(booking.teeTime)}</Text><Text style={styles.cardMeta}>{caddie?.displayName ?? "Assigned caddie"}</Text></View><MaterialCommunityIcons color={flowColors.forest} name="chevron-right" size={22} /></View>
      {booking.status === "confirmed" ? <RoundConfirmationSummary bookingId={booking.id} /> : null}
      <View style={styles.bookingFooter}><StatusChip accepted={isAccepted} status={booking.status} /><Text style={styles.caddieStatus}>{isAccepted ? "Caddie accepted" : "Awaiting caddie response"}</Text></View>
    </Pressable>
  );
}

function StatusChip({ accepted, status }: { accepted: boolean; status: Booking["status"] }) { const label = status === "confirmed" || accepted ? "Confirmed" : status === "requested" ? "Requested" : status; return <View style={[styles.statusChip, label === "Confirmed" && styles.statusChipConfirmed]}><Text style={[styles.statusChipText, label === "Confirmed" && styles.statusChipTextConfirmed]}>{label}</Text></View>; }
function formatDatePart(value: string, part: "weekday" | "day" | "month") { return new Intl.DateTimeFormat("en-US", { [part]: part === "day" ? "numeric" : "short", timeZone: "Asia/Manila" }).format(new Date(value)); }

const styles = StyleSheet.create({
  bookingsSafe: { backgroundColor: mobilePalette.white, flex: 1 },
  bookingsPage: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 128 },
  bookingsFrame: { gap: 24 },
  bookingsIntro: { gap: 12 },
  bookingsEyebrow: { color: mobilePalette.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1.6, lineHeight: 17 },
  bookingsTitle: { color: mobilePalette.forest, fontSize: 32, fontWeight: "600", letterSpacing: -1.2, lineHeight: 39 },
  bookingsSubtitle: { color: mobilePalette.muted, fontSize: 14, lineHeight: 23 },
  bookingsSectionHeading: { alignItems: "center", borderTopColor: mobilePalette.line, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", paddingTop: 22 },
  bookingsSectionTitle: { color: mobilePalette.forest, fontSize: 18, fontWeight: "600", letterSpacing: -.4 },
  bookingsCount: { backgroundColor: "#F0EEE7", borderRadius: 999, color: "#686E62", fontSize: 11, fontWeight: "600", paddingHorizontal: 12, paddingVertical: 7 },
  bookingsEmpty: { alignItems: "center", backgroundColor: "#F7F5EF", borderColor: mobilePalette.line, borderWidth: 1, borderRadius: 24, gap: 16, paddingHorizontal: 24, paddingVertical: 36 },
  bookingsEmptyIcon: { alignItems: "center", backgroundColor: "#E8EDE3", borderRadius: 999, height: 60, justifyContent: "center", width: 60 },
  bookingsEmptyTitle: { color: mobilePalette.forest, fontSize: 23, fontWeight: "600", letterSpacing: -.6, lineHeight: 30, textAlign: "center" },
  bookingsEmptyCopy: { color: mobilePalette.muted, fontSize: 13, lineHeight: 22, textAlign: "center" },
  bookRoundButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: mobilePalette.forest, borderRadius: 999, flexDirection: "row", gap: 12, justifyContent: "center", minHeight: 52, paddingHorizontal: 24, paddingVertical: 14 },
  bookRoundText: { color: mobilePalette.white, flexShrink: 1, fontSize: 14, fontWeight: "600", lineHeight: 21, textAlign: "center" },
  bookingsPressed: { opacity: .7 },
  frame: { gap: spacing.lg },
  ratingInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 130, padding: spacing.md, textAlignVertical: "top" },
  ratingRow: { flexDirection: "row", gap: spacing.sm },
  ratingStar: { color: colors.warning, fontSize: 34 },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderColor: mobilePalette.line,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: 18
  },
  bookingCardUnread: { backgroundColor: "#F7FBF6", borderColor: flowColors.forest, borderWidth: 2 },
  bookingMain: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 14 },
  bookingCopy: { flex: 1, flexBasis: 140, gap: 6, minWidth: 0 },
  bookingFooter: { flexWrap: "wrap", gap: 10, alignItems: "center", borderTopColor: "#EEECE6", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  caddieStatus: { color: mobilePalette.muted, flexShrink: 1, fontSize: 12, lineHeight: 19, fontWeight: "500" },
  dateBlock: { alignItems: "center", backgroundColor: "#F0F1E9", borderRadius: 14, gap: 3, justifyContent: "center", minHeight: 82, padding: 10, minWidth: 56 },
  dateDay: { color: flowColors.forest, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  dateNumber: { color: mobilePalette.forest, fontSize: 26, fontWeight: "600", lineHeight: 31 },
  dateMonth: { color: colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  cardMeta: { color: mobilePalette.muted, fontSize: 12, lineHeight: 20 },
  cardTitle: { color: mobilePalette.forest, flexShrink: 1, fontSize: 18, fontWeight: "600", letterSpacing: -.4, lineHeight: 24 },
  cardTitleRow: { flexWrap: "wrap", alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  emptyBookings: { backgroundColor: "#FAF9F6", borderWidth: 0 },
  intro: { gap: spacing.sm },
  detailSafe: { backgroundColor: "#F7F5EF", flex: 1 },
  detailPage: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 32 },
  detailFrame: { gap: 20, maxWidth: 560 },
  detailHeader: { gap: 12 },
  detailTopline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  detailEyebrow: { color: "#73786D", fontFamily: "Inter", fontSize: 10, fontWeight: "700", letterSpacing: 1.3, lineHeight: 15 },
  detailTitle: { color: mobilePalette.ink, fontFamily: "Inter", fontSize: 27, fontWeight: "600", letterSpacing: -0.9, lineHeight: 34 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  detailCaption: { color: "#687267", fontFamily: "Inter", fontSize: 12, lineHeight: 18 },
  detailCard: { backgroundColor: mobilePalette.white, borderColor: mobilePalette.line, borderCurve: "continuous", borderRadius: 18, borderWidth: 1, gap: 16, padding: 18 },
  roundFacts: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  roundFact: { flexDirection: "row", alignItems: "center", gap: 10, flexGrow: 1, flexBasis: 110 },
  factCopy: { gap: 5, flex: 1 },
  detailLabel: { color: "#687267", fontFamily: "Inter", fontSize: 11, lineHeight: 16 },
  factValue: { color: mobilePalette.forest, fontFamily: "Inter", fontSize: 13, fontWeight: "600", lineHeight: 19 },
  referenceRow: { borderTopColor: mobilePalette.line, borderTopWidth: 1, gap: 5, paddingTop: 14 },
  referenceValue: { color: "#687267", fontFamily: "Inter", fontSize: 11, lineHeight: 17 },
  caddieRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  caddieInitial: { alignItems: "center", backgroundColor: "#E9EFE6", borderRadius: 24, height: 46, justifyContent: "center", width: 46 },
  caddieInitialText: { color: mobilePalette.forest, fontFamily: "Inter", fontSize: 18, fontWeight: "600" },
  caddieCopy: { flex: 1, gap: 6, minWidth: 0 },
  caddieName: { color: mobilePalette.ink, fontFamily: "Inter", fontSize: 16, fontWeight: "600", lineHeight: 22 },
  caddieState: { flexDirection: "row", alignItems: "center", gap: 6 },
  stateDot: { backgroundColor: "#C79B43", borderRadius: 3, height: 5, width: 5 },
  stateDotAccepted: { backgroundColor: "#418466" },
  caddieMeta: { color: "#687267", flexShrink: 1, fontFamily: "Inter", fontSize: 11, lineHeight: 17 },
  feeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 14, borderTopColor: mobilePalette.line, borderTopWidth: 1 },
  rate: { color: mobilePalette.forest, fontFamily: "Inter", fontSize: 20, fontWeight: "600", letterSpacing: -0.4, lineHeight: 26 },
  detailError: { color: "#A52A2A", fontFamily: "Inter", fontSize: 12, lineHeight: 18 },
  page: { gap: spacing.lg, padding: spacing.xl, paddingBottom: 112 },
  safeArea: { backgroundColor: "#FAF9F6", flex: 1 },
  subtitle: { color: colors.textMuted, fontSize: typography.body },
  title: { color: colors.text, fontSize: typography.heading, fontWeight: "900" },
  updateBadge: { backgroundColor: "#FFF0B8", borderRadius: 999, color: "#785E0A", fontSize: 9, fontWeight: "900", overflow: "hidden", paddingHorizontal: 7, paddingVertical: 4, textTransform: "uppercase" },
  statusChip: { backgroundColor: "#FFF2CE", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusChipConfirmed: { backgroundColor: "#E2F0E4" },
  statusChipText: { color: "#826316", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  statusChipTextConfirmed: { color: flowColors.forest },
  unavailable: { flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.xl },
});
