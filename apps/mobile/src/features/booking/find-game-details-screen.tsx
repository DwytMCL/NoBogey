import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { TeeTimeSlot } from "@nobogey/contracts";
import { describeUserError, formatMoney } from "@nobogey/utils";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { getAvailableCaddies } from "../../../backend/caddies/caddies.service";
import { createBooking } from "../../../backend/bookings/bookings.service";
import { mobileDataService } from "../../../backend/mock.service";
import { backToPreviousPage } from "../../ui/navigation";
import { useMobileData } from "../data/useMobileData";
import { useAppSession } from "../session/AppSession";
import { clubTeeSheet } from "./clubTeeSheet";
import { CaddiePortrait, FindGameScreen, flowColors } from "./components/FindGameUI";
import { GameDropdown, type GameIcon } from "./components/game-dropdown";
import { CaddieCard } from "./components/MarketplaceCards";
import { changeGameDraft, gameDate, gameTime, golferCounts, parseGolferCount, slotFits, type GameDraft } from "./game-details-state";

type GameParams = { courseId?: string; partySize?: string; date?: string; teeTimeId?: string; time?: string; caddieId?: string };
type LoadResult<T> = { key: string; items: T[]; error?: string };

export function FindGameDetailsScreen({ initialReview = false }: { initialReview?: boolean }) {
  const params = useLocalSearchParams<GameParams>();
  const { courses, caddies, isLoading, refresh } = useMobileData();
  const { golferSignedIn } = useAppSession();
  const [draft, setDraft] = useState<GameDraft>(() => ({
    courseId: params.courseId, date: params.date || (params.time ? new Date(params.time).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) : undefined),
    partySize: parseGolferCount(params.partySize) ?? (params.teeTimeId ? 4 : undefined),
    teeTimeId: params.teeTimeId, caddieId: params.caddieId
  }));
  const [stage, setStage] = useState<1 | 2 | 3>(initialReview ? 3 : 1);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string>();
  const [expanded, setExpanded] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [teeResult, setTeeResult] = useState<LoadResult<TeeTimeSlot>>();
  const [caddieResult, setCaddieResult] = useState<LoadResult<string>>();
  const [idempotencyKey] = useState(() => `mobile-${params.teeTimeId ?? "new"}-${params.caddieId ?? "new"}-${Date.now()}`);
  const [dates] = useState(() => mobileDataService.listWeekDates());
  const course = courses.find((item) => item.id === draft.courseId);
  const teeKey = course && draft.date ? `${course.id}/${draft.date}/${retry}` : "";
  const teeReady = Boolean(teeKey && teeResult?.key === teeKey);
  const slots = teeReady ? teeResult!.items : [];
  const slot = slots.find((item) => item.id === draft.teeTimeId && slotFits(item, draft.partySize));
  const caddieKey = course && slot ? `${course.id}/${slot.startsAt}/${retry}` : "";
  const caddiesReady = Boolean(caddieKey && caddieResult?.key === caddieKey);
  const availableCaddies = caddiesReady ? caddies.filter((item) => caddieResult!.items.includes(item.id)) : [];
  const caddie = availableCaddies.find((item) => item.id === draft.caddieId);
  const detailsComplete = Boolean(!isLoading && course && slot && draft.partySize);
  const caddieComplete = Boolean(detailsComplete && caddie);
  const busy = isLoading || Boolean(teeKey && !teeReady) || Boolean(caddieKey && !caddiesReady);

  useEffect(() => {
    if (!teeKey || !course || !draft.date) return;
    let active = true;
    void clubTeeSheet.getTeeTimes(course.id, draft.date).then((items) => {
      if (active) setTeeResult({ key: teeKey, items });
    }).catch(() => {
      if (active) setTeeResult({ key: teeKey, items: [], error: "We couldn’t load tee times. Please try again." });
    });
    return () => { active = false; };
  }, [course, draft.date, teeKey]);

  useEffect(() => {
    if (!caddieKey || !course || !slot) return;
    let active = true;
    void getAvailableCaddies(slot.id).then((items) => {
      if (active) setCaddieResult({ key: caddieKey, items: items.map((item) => item.id) });
    }).catch(() => {
      if (active) setCaddieResult({ key: caddieKey, items: [], error: "We couldn’t load caddies. Please try again." });
    });
    return () => { active = false; };
  }, [caddieKey, course, slot]);

  const back = useCallback(() => {
    if (expanded) { setExpanded(undefined); return true; }
    if (confirmed) { setConfirmed(false); return true; }
    if (stage === 3) { setStage(2); return true; }
    if (stage === 2) { setStage(1); return true; }
    return false;
  }, [confirmed, expanded, stage]);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", back);
    return () => subscription.remove();
  }, [back]));

  const select = (patch: Partial<GameDraft>) => {
    const next = changeGameDraft(draft, patch, slots);
    setNotice(draft.teeTimeId && !next.teeTimeId ? "Your game details changed. Please choose an available tee time and caddie." : draft.caddieId && !next.caddieId ? "Your tee time changed. Please choose an available caddie." : undefined);
    setDraft(next);
    if (stage > 1 && (patch.courseId || patch.date || patch.partySize || patch.teeTimeId)) setStage(1);
    setExpanded(undefined);
  };
  const toggle = (field: string) => setExpanded((current) => current === field ? undefined : field);
  const continueFlow = async () => {
    if (stage === 1 && detailsComplete) { setExpanded(undefined); setStage(2); return; }
    if (stage === 2 && caddieComplete) { setStage(3); return; }
    if (stage !== 3 || !caddieComplete || !course || !slot || !caddie || !draft.partySize) return;
    if (!golferSignedIn) {
      router.push({ pathname: "/sign-in", params: { courseId: course.id, date: draft.date, partySize: draft.partySize.toString(), teeTimeId: slot.id, time: slot.startsAt, caddieId: caddie.id, role: "golfer", returnTo: "/golfer/find-game" } });
      return;
    }
    setSubmitting(true);
    setBookingError(undefined);
    try {
      await createBooking({ caddieId: caddie.id, courseId: course.id, teeTimeId: slot.id, startsAt: slot.startsAt, endsAt: new Date(new Date(slot.startsAt).getTime() + 4 * 60 * 60 * 1000).toISOString(), partySize: draft.partySize, idempotencyKey });
      setConfirmed(true);
    } catch (cause) {
      setBookingError(describeUserError(cause, "Your booking was not submitted. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };
  const title = confirmed ? "Your request is ready" : stage === 3 ? "Confirm your booking" : stage === 2 ? "Choose your caddie" : course ? "Choose your tee time" : "Let’s find your round";
  const description = confirmed ? "Your booking request has been sent to the club." : stage === 3 ? "Review the details below, then confirm your caddie request." : stage === 2 ? "These caddies are shown for your selected course and tee time." : course ? "Select your date, tee time, and the number of golfers." : "Choose a course to start planning your round.";
  const actionLabel = confirmed ? "Back to home" : stage === 3 ? submitting ? "Creating booking…" : "Confirm booking" : stage === 2 ? "Continue to confirmation" : "See available caddies";
  const actionDisabled = confirmed ? false : submitting || (stage === 1 ? !detailsComplete : !caddieComplete);

  return <FindGameScreen key={`${stage}-${confirmed}`} step={stage} title={title} description={description}
    actionLabel={actionLabel} actionDisabled={actionDisabled}
    onAction={confirmed ? () => backToPreviousPage("/golfer/home") : () => void continueFlow()} onBack={() => { if (!back()) backToPreviousPage("/golfer/home"); }}>
    {confirmed ? <View style={styles.confirmed}>
      <View style={styles.confirmedIcon}><MaterialCommunityIcons color="#FFFFFF" name="check" size={32} /></View>
      <Text accessibilityRole="header" style={styles.confirmedTitle}>Booking request sent</Text>
      <Text style={styles.confirmedCopy}>Your preferred caddie request for {course?.name} has been sent to the club.</Text>
      <Text style={styles.help}>Final caddie assignment is subject to club approval and availability.</Text>
    </View> : stage === 3 ? <>
      <View style={styles.summary}>
        <SummaryRow icon="golf" label="Golf course" value={course?.name || "Course unavailable"} />
        <SummaryRow icon="calendar-blank-outline" label="Date" value={draft.date ? gameDate(draft.date) : "Choose a date"} />
        <SummaryRow icon="clock-outline" label="Tee time" value={slot ? gameTime(slot.startsAt) : busy ? "Checking availability…" : "Choose an available tee time"} />
        <SummaryRow icon="account-group" label="Number of golfers" value={draft.partySize ? `${draft.partySize} ${draft.partySize === 1 ? "golfer" : "golfers"}` : "Choose your group size"} />
        <View style={[styles.summaryRow, styles.lastRow]}>{caddie ? <CaddiePortrait caddie={caddie} /> : <MaterialCommunityIcons color={flowColors.forest} name="account-outline" size={24} />}<View style={styles.copy}><Text style={styles.caption}>Preferred caddie</Text><Text selectable style={styles.value}>{caddie?.displayName || (busy ? "Checking availability…" : "Choose an available caddie")}</Text></View></View>
      </View>
      {caddie ? <View style={styles.fee}><MaterialCommunityIcons color={flowColors.forest} name="tag-outline" size={23} /><View style={styles.copy}><Text selectable style={styles.value}>Caddie fee — {formatMoney(caddie.rate.amountInCentavos, caddie.rate.currency)}</Text><Text style={styles.caption}>Course fees are not included.</Text></View></View> : null}
      {!caddieComplete ? <Text accessibilityLiveRegion="polite" style={styles.help}>{busy ? "Checking your booking details…" : "Some selections are no longer available. Edit your details to continue."}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => setStage(2)} style={styles.edit}><Text style={styles.editText}>Edit caddie</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setStage(1)} style={styles.edit}><Text style={styles.editText}>Edit game details</Text></Pressable>
      {bookingError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{bookingError}</Text> : null}
      <Text style={styles.help}>Confirming creates a live booking request. Final caddie assignment is subject to club approval.</Text>
    </> : stage === 2 ? <View style={styles.caddieList}>
      <View style={styles.selectionSummary}><Text style={styles.selectionSummaryText}>{course?.name} · {slot ? gameTime(slot.startsAt) : "Tee time"} · {draft.partySize} {draft.partySize === 1 ? "golfer" : "golfers"}</Text><Pressable accessibilityRole="button" onPress={() => setStage(1)}><Text style={[styles.editText, styles.selectionEditText]}>Edit</Text></Pressable></View>
      {caddieKey && !caddiesReady ? <Text style={styles.help}>Checking caddie availability…</Text> : null}
      {availableCaddies.map((item) => <CaddieCard caddie={item} key={item.id} onPress={() => select({ caddieId: item.id })} selected={item.id === caddie?.id} verified />)}
      {caddiesReady && caddieResult?.error ? <Feedback message={caddieResult.error} action="Try again" onPress={() => setRetry((value) => value + 1)} /> : caddiesReady && !isLoading && !availableCaddies.length ? <Feedback message="No caddies are available for this round." action="Choose another tee time" onPress={() => setStage(1)} /> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.help}>{notice}</Text> : null}
    </View> : <View style={styles.form}>
      <GameDropdown label="Golf course" placeholder={isLoading ? "Loading courses…" : "Choose a golf course"} value={course?.name} icon="golf" disabled={isLoading || !courses.length} expanded={expanded === "course"} onToggle={() => toggle("course")} selectedId={draft.courseId} onSelect={(courseId) => select({ courseId, partySize: draft.partySize ?? golferCounts[0] })} options={courses.map((item) => ({ id: item.id, label: item.name }))} />
      {!isLoading && !courses.length ? <Feedback message="No courses are available right now." action="Refresh courses" onPress={refresh} /> : null}
      {!course ? <Text style={styles.help}>Choose your course to start planning your round.</Text> : !draft.date || !draft.partySize ? <Text style={styles.help}>Next, choose your date and group size.</Text> : null}
      <GolferCountStepper count={draft.partySize} disabled={!course} onChange={(partySize) => select({ partySize })} />
      <GameDropdown label="Date" placeholder="Choose a date" value={draft.date ? gameDate(draft.date) : undefined} icon="calendar-blank-outline" disabled={!course} expanded={expanded === "date"} onToggle={() => toggle("date")} selectedId={draft.date} onSelect={(date) => select({ date })} options={dates.map((date) => ({ id: date, label: gameDate(date) }))} />
      <GameDropdown label="Tee time" placeholder={teeKey && !teeReady ? "Loading tee times…" : "Choose a tee time"} value={slot ? gameTime(slot.startsAt) : undefined} icon="clock-outline" disabled={!draft.partySize || !teeReady || !slots.some((item) => slotFits(item, draft.partySize))} expanded={expanded === "time"} onToggle={() => toggle("time")} selectedId={slot?.id} onSelect={(teeTimeId) => select({ teeTimeId })} options={slots.filter((item) => slotFits(item, draft.partySize)).map((item) => ({ id: item.id, label: gameTime(item.startsAt), detail: `${item.remainingPlayerCapacity} ${item.remainingPlayerCapacity === 1 ? "spot" : "spots"} available` }))} />
      {teeReady && teeResult?.error ? <Feedback message={teeResult.error} action="Try again" onPress={() => setRetry((value) => value + 1)} /> : teeReady && draft.partySize && !slots.some((item) => slotFits(item, draft.partySize)) ? <Feedback message="No tee times fit your group on this date." action="Try another date" onPress={() => setExpanded("date")} /> : null}
      {teeReady && draft.teeTimeId && !slot && slots.length ? <Text accessibilityLiveRegion="polite" style={styles.help}>Your previous tee time is no longer available. Please select another.</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.help}>{notice}</Text> : null}
      {slot ? <Text style={styles.help}>Continue to see caddies available for this tee time.</Text> : null}
    </View>}
  </FindGameScreen>;
}

function SummaryRow({ icon, label, value }: { icon: GameIcon; label: string; value: string }) {
  return <View style={styles.summaryRow}><MaterialCommunityIcons color={flowColors.forest} name={icon} size={24} /><View style={styles.copy}><Text style={styles.caption}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View></View>;
}

function GolferCountStepper({ count, disabled, onChange }: { count?: number | undefined; disabled: boolean; onChange: (count: number) => void }) {
  const minimum = golferCounts[0]!;
  const maximum = golferCounts[golferCounts.length - 1]!;
  const value = count ?? minimum;
  const decreaseDisabled = disabled || value <= minimum;
  const increaseDisabled = disabled || value >= maximum;

  return <View style={styles.stepperField}>
    <Text style={[styles.stepperLabel, disabled && styles.stepperDisabledLabel]}>Number of golfers</Text>
    <View style={[styles.stepperControl, disabled && styles.stepperDisabled]}>
      <MaterialCommunityIcons color={flowColors.forest} name="account-group" size={22} />
      <View style={styles.stepperCopy}><Text accessibilityLiveRegion="polite" style={styles.stepperValue}>{value}</Text><Text style={styles.stepperDetail}>{value === 1 ? "golfer" : "golfers"}</Text></View>
      <View accessibilityLabel="Adjust number of golfers" accessibilityRole="adjustable" accessibilityValue={{ min: minimum, max: maximum, now: value }} style={styles.stepperActions}>
        <Pressable accessibilityLabel="Remove golfer" accessibilityRole="button" accessibilityState={{ disabled: decreaseDisabled }} disabled={decreaseDisabled} hitSlop={4} onPress={() => onChange(value - 1)} style={({ pressed }) => [styles.stepperButton, decreaseDisabled && styles.stepperButtonDisabled, pressed && !decreaseDisabled && styles.stepperButtonPressed]}><MaterialCommunityIcons color={flowColors.onGreen} name="minus" size={20} /></Pressable>
        <Pressable accessibilityLabel="Add golfer" accessibilityRole="button" accessibilityState={{ disabled: increaseDisabled }} disabled={increaseDisabled} hitSlop={4} onPress={() => onChange(value + 1)} style={({ pressed }) => [styles.stepperButton, increaseDisabled && styles.stepperButtonDisabled, pressed && !increaseDisabled && styles.stepperButtonPressed]}><MaterialCommunityIcons color={flowColors.onGreen} name="plus" size={20} /></Pressable>
      </View>
    </View>
  </View>;
}

function Feedback({ message, action, onPress }: { message: string; action: string; onPress: () => void }) {
  return <View style={styles.feedback}><Text accessibilityLiveRegion="polite" style={styles.feedbackText}>{message}</Text><Pressable accessibilityRole="button" onPress={onPress} style={styles.retry}><Text style={styles.feedbackAction}>{action}</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  form: { gap: 22 },
  caddieList: { gap: 20 },
  stepperField: { gap: 9 },
  stepperLabel: { color: flowColors.forest, fontSize: 13, fontWeight: "600", lineHeight: 20 },
  stepperDisabledLabel: { color: flowColors.muted },
  stepperControl: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: flowColors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, minHeight: 76, paddingHorizontal: 16, paddingVertical: 12 },
  stepperDisabled: { backgroundColor: "#EFEEE9", opacity: 0.4 },
  stepperCopy: { flex: 1, minWidth: 40, gap: 3 },
  stepperValue: { color: flowColors.forest, fontSize: 22, fontVariant: ["tabular-nums"], fontWeight: "600", lineHeight: 28 },
  stepperDetail: { color: flowColors.muted, fontSize: 12, lineHeight: 16 },
  stepperActions: { flexDirection: "row", gap: 8 },
  stepperButton: { alignItems: "center", backgroundColor: flowColors.forest, borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  stepperButtonDisabled: { opacity: 0.45 },
  stepperButtonPressed: { backgroundColor: flowColors.forestDark },
  help: { color: flowColors.muted, fontSize: 12, lineHeight: 18 },
  feedback: { backgroundColor: "#FAF2DE", borderColor: "#E7D9B6", borderWidth: 1, borderRadius: 18, gap: 4, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  feedbackText: { color: "#6B5830", fontSize: 13, lineHeight: 21 },
  feedbackAction: { color: flowColors.forest, fontSize: 13, fontWeight: "700" },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  summary: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: flowColors.border, borderRadius: 22, paddingHorizontal: 20 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: flowColors.border },
  lastRow: { borderBottomWidth: 0 },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  caption: { color: flowColors.muted, fontSize: 12, lineHeight: 17 },
  value: { color: flowColors.forest, fontSize: 15, lineHeight: 23, fontWeight: "600" },
  fee: { backgroundColor: "#F7F5EF", borderWidth: 1, borderColor: flowColors.border, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 14, padding: 20 },
  edit: { backgroundColor: "#F0EEE7", borderRadius: 999, minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  editText: { color: flowColors.forest, fontSize: 13, fontWeight: "600", lineHeight: 20 },
  selectionSummary: { alignItems: "center", backgroundColor: "#F0F1E9", borderColor: flowColors.border, borderWidth: 1, borderRadius: 18, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", padding: 16 },
  selectionSummaryText: { color: flowColors.forest, flex: 1, minWidth: 100, fontSize: 13, fontWeight: "500", lineHeight: 21 },
  selectionEditText: { color: flowColors.forest, paddingVertical: 12 },
  confirmed: { alignItems: "center", backgroundColor: "#F7F5EF", borderColor: flowColors.border, borderRadius: 24, borderWidth: 1, gap: 18, padding: 28 },
  confirmedIcon: { alignItems: "center", backgroundColor: flowColors.forest, borderRadius: 999, height: 64, justifyContent: "center", width: 64 },
  confirmedTitle: { color: flowColors.forest, fontSize: 26, fontWeight: "600", lineHeight: 33, letterSpacing: -.7, textAlign: "center" },
  confirmedCopy: { color: flowColors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  error: { color: "#A52A2A", fontSize: 13, lineHeight: 19 }
});
