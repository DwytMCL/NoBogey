import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobilePalette } from "../../ui/mobile-palette";
import { MobileButton, MobileSheet } from "../../ui/MobilePresentation";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { NoBogeyWordmark } from "../../ui/NoBogeyWordmark";
import { backToPreviousPage } from "../../ui/navigation";
import { TermsAcceptanceModal } from "../legal/TermsAcceptanceModal";
import { useAppSession } from "../session/AppSession";
import { CaddieContactSettings } from "../contact/CaddieContactSettings";
import { loadPreferences, savePreferences } from "../../../backend/users/users.service";
import { useGuidedTour } from "../guided-tour/GuidedTour";

const colors = { ...mobilePalette, canvas: mobilePalette.white, text: mobilePalette.ink, textMuted: mobilePalette.muted, border: mobilePalette.line, fairwayDark: mobilePalette.forest, primary: mobilePalette.forest, primaryPressed: mobilePalette.forestDark, onPrimary: mobilePalette.white, accent: "#A34646" };

type SettingsRole = "golfer" | "caddie";
type SettingsSheet = "contact" | "deletion" | "notifications" | "payment" | "preferences" | "support";
type SettingsItem = {
  detail: string;
  disabled?: boolean;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress?: () => void;
};

export function SettingsScreen({ role = "golfer" }: { role?: SettingsRole }) {
  const { signOut } = useAppSession();
  const { startTour } = useGuidedTour();
  const [activeSheet, setActiveSheet] = useState<SettingsSheet | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const sections = getSections(role, {
    openSheet: setActiveSheet,
    openTerms: () => setTermsVisible(true),
    restartTour: () => startTour(role)
  });

  const logOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace("/sign-in");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <ResponsiveContent style={styles.frame}>
          <View style={styles.header}>
            <NoBogeyWordmark />
            <Pressable accessibilityLabel="Go back" accessibilityRole="button" hitSlop={10} onPress={() => backToPreviousPage(role === "golfer" ? "/golfer/profile" : "/caddie/profile")} style={styles.backButton}>
              <MaterialCommunityIcons color={colors.fairwayDark} name="arrow-left" size={25} />
            </Pressable>
            <View style={styles.headerCopy} />
            <View style={styles.headerSpacer} />
          </View>

          <Text accessibilityRole="header" style={styles.pageTitle}>Settings</Text>
          {sections.map((section) => <SettingsSection items={section.items} key={section.title} title={section.title} />)}

          <Pressable accessibilityLabel="Log out" accessibilityRole="button" accessibilityState={{ busy: isLoggingOut, disabled: isLoggingOut }} disabled={isLoggingOut} onPress={() => void logOut()} style={({ pressed }) => [styles.logoutCard, pressed && styles.logoutPressed, isLoggingOut && styles.logoutDisabled]}>
            <MaterialCommunityIcons color={colors.accent} name="logout-variant" size={25} />
            <Text style={styles.logoutText}>{isLoggingOut ? "Logging out…" : "Log out"}</Text>
            <MaterialCommunityIcons color={colors.accent} name="chevron-right" size={24} />
          </Pressable>
        </ResponsiveContent>
      </ScrollView>
      <SettingsActionSheet onClose={() => setActiveSheet(null)} role={role} sheet={activeSheet} />
      <TermsAcceptanceModal mode="viewer" onAccept={() => setTermsVisible(false)} onDecline={() => setTermsVisible(false)} visible={termsVisible} />
    </SafeAreaView>
  );
}

function getSections(role: SettingsRole, actions: { openSheet: (sheet: SettingsSheet) => void; openTerms: () => void; restartTour: () => void }): Array<{ title: string; items: SettingsItem[] }> {
  const profilePath = role === "golfer" ? "/golfer/profile" : "/caddie/profile";
  return [
    { title: "ACCOUNT", items: [
      { detail: "Manage your account details", icon: "account-circle-outline" as const, label: "Account Information", onPress: () => router.push(profilePath) },
      ...(role === "caddie" ? [{ detail: "Phone, email address, and sharing", icon: "card-account-phone-outline" as const, label: "Contact Information", onPress: () => actions.openSheet("contact") }] : []),
      { detail: role === "golfer" ? "Preferred courses, language, group size" : "Home course, languages, availability", icon: "calendar-check-outline" as const, label: role === "golfer" ? "Booking Preferences" : "Caddie Preferences", onPress: () => actions.openSheet("preferences") },
      { detail: "Learn how account-deletion requests will work", icon: "account-remove-outline" as const, label: "Delete Account", onPress: () => actions.openSheet("deletion") }
    ] },
    { title: "PAYMENT", items: [
      { detail: role === "golfer" ? "Review local payment setup" : "Review local payout setup", icon: (role === "golfer" ? "credit-card-outline" : "bank-outline") as SettingsItem['icon'], label: role === "golfer" ? "Payment Methods" : "Payout Method", onPress: () => actions.openSheet("payment") }
    ] },
    { title: "PREFERENCES", items: [
      { detail: role === "golfer" ? "Booking alerts and promotions" : "Match alerts and promotions", icon: "bell-outline" as const, label: "Notifications", onPress: () => actions.openSheet("notifications") },
      { detail: "Account controls are not available in this local demo", disabled: true, icon: "lock-outline" as const, label: "Privacy & Security" }
    ] },
    { title: "SUPPORT", items: [
      { detail: "See the main app controls again", icon: "map-marker-path" as const, label: "Replay App Tour", onPress: actions.restartTour },
      { detail: "View local support options", icon: "help-circle-outline" as const, label: "Help & Support", onPress: () => actions.openSheet("support") },
      { detail: "Terms of Service · Privacy Policy", icon: "file-document-outline" as const, label: "Terms & Conditions", onPress: actions.openTerms }
    ] }
  ];
}

function SettingsSection({ items, title }: { items: SettingsItem[]; title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionCard}>{items.map((item, index) => <SettingsRow isLast={index === items.length - 1} item={item} key={item.label} />)}</View></View>;
}

function SettingsRow({ isLast, item }: { isLast: boolean; item: SettingsItem }) {
  return <Pressable accessibilityHint={item.disabled ? item.detail : undefined} accessibilityLabel={item.label} accessibilityRole="button" accessibilityState={{ disabled: item.disabled }} disabled={item.disabled} onPress={item.onPress} style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, pressed && !item.disabled && styles.rowPressed, item.disabled && styles.rowDisabled]}>
    <View style={styles.rowIcon}><MaterialCommunityIcons color={item.disabled ? colors.textMuted : colors.fairwayDark} name={item.icon} size={21} /></View>
    <View style={styles.rowCopy}><Text style={[styles.rowLabel, item.disabled && styles.textDisabled]}>{item.label}</Text><Text style={styles.rowDetail}>{item.detail}</Text></View>
    <MaterialCommunityIcons color={item.disabled ? colors.textMuted : colors.fairwayDark} name={item.disabled ? "information-outline" : "chevron-right"} size={26} />
  </Pressable>;
}

function SettingsActionSheet({ onClose, role, sheet }: { onClose: () => void; role: SettingsRole; sheet: SettingsSheet | null }) {
  const [notifications, setNotifications] = useState({ alerts: true, promotions: false });
  useEffect(() => { void loadPreferences<{ notifications?: typeof notifications }>().then((value) => value?.notifications && setNotifications(value.notifications)).catch(() => undefined); }, []);
  const title = sheet === "contact" ? "Contact information" : sheet === "deletion" ? "Delete account" : sheet === "preferences" ? (role === "golfer" ? "Booking preferences" : "Caddie preferences") : sheet === "payment" ? (role === "golfer" ? "Payment methods" : "Payout method") : sheet === "notifications" ? "Notifications" : "Help & support";
  return <MobileSheet title={title} visible={sheet !== null} onClose={onClose} footer={<MobileButton accessibilityLabel={`Close ${title}`} onPress={onClose}>Done</MobileButton>}>
    {sheet === "contact" && role === "caddie" ? <CaddieContactSettings /> : null}
    {sheet === "deletion" ? <AccountDeletionContent /> : null}
    {sheet === "preferences" ? <PreferenceContent role={role} /> : null}
    {sheet === "payment" ? <PaymentContent role={role} /> : null}
    {sheet === "notifications" ? <NotificationContent notifications={notifications} setNotifications={setNotifications} /> : null}
    {sheet === "support" ? <SupportContent /> : null}
  </MobileSheet>;
}

function PreferenceContent({ role }: { role: SettingsRole }) { const entries = role === "golfer" ? [["Preferred courses", "Coming soon"], ["Language", "English"], ["Group size", "Coming soon"]] : [["Home course", "Set from profile"], ["Languages", "English"], ["Availability", "Coming soon"]]; return <><Text style={styles.sheetCopy}>These preferences will be available when account settings are connected.</Text><View style={styles.contentCard}>{entries.map(([label, value], index) => <View key={label} style={[styles.infoRow, index === 0 && styles.firstInfoRow]}><Text style={styles.infoLabel}>{label}</Text><Text selectable style={[styles.infoValue, value === "Coming soon" && styles.comingSoon]}>{value}</Text></View>)}</View></>; }
function PaymentContent({ role }: { role: SettingsRole }) { const noun = role === "golfer" ? "payment method" : "payout method"; return <View style={styles.emptySheet}><View style={styles.emptyIcon}><MaterialCommunityIcons color={colors.fairwayDark} name={role === "golfer" ? "credit-card-outline" : "bank-outline"} size={28} /></View><Text style={styles.emptyTitle}>No {noun} yet</Text><Text style={styles.emptyCopy}>{role === "golfer" ? "You will choose payment during a booking when payment methods are available." : "Payout setup will be available after account verification and club approval."}</Text><View style={styles.comingSoonPill}><Text style={styles.comingSoonText}>Coming soon</Text></View></View>; }
function NotificationContent({ notifications, setNotifications }: { notifications: { alerts: boolean; promotions: boolean }; setNotifications: Dispatch<SetStateAction<{ alerts: boolean; promotions: boolean }>> }) { const [saveState, setSaveState] = useState<"idle" | "saved">("idle"); const update = (key: "alerts"|"promotions", value: boolean) => setNotifications((current) => { const next={...current,[key]:value}; void savePreferences({ notifications: next }).then(() => { setSaveState("saved"); setTimeout(() => setSaveState("idle"), 1800); }).catch(() => undefined); return next; }); return <><Text style={styles.sheetCopy}>Choose which updates NoBogey sends to your account.</Text><View style={styles.contentCard}>{([['alerts', 'Booking or match alerts', 'Changes to your current bookings'], ['promotions', 'Promotions', 'News and offers from NoBogey']] as const).map(([key, label, detail], index) => <View key={key} style={[styles.toggleRow, index === 0 && styles.firstInfoRow]}><View style={styles.toggleCopy}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.toggleDetail}>{detail}</Text></View><Switch accessibilityLabel={label} accessibilityRole="switch" onValueChange={(value) => update(key,value)} thumbColor={colors.surface} ios_backgroundColor={colors.line} trackColor={{ false: colors.border, true: colors.primary }} value={notifications[key]} /></View>)}</View>{saveState === "saved" ? <Text accessibilityLiveRegion="polite" style={styles.savedText}>Saved</Text> : null}</>; }
function SupportContent() { const [subject, setSubject] = useState(""); const [query, setQuery] = useState(""); const sendQuery = () => { const body = query.trim(); if (!body) return; void Linking.openURL(`mailto:nobogeyofficial@gmail.com?subject=${encodeURIComponent(subject.trim() || "NoBogey support enquiry")}&body=${encodeURIComponent(body)}`); }; return <><Text style={styles.sheetCopy}>Send a question about bookings, payments, privacy, or your account.</Text><View style={styles.supportForm}><View style={styles.field}><Text style={styles.infoLabel}>Subject</Text><TextInput accessibilityLabel="Support query subject" onChangeText={setSubject} placeholder="What can we help with?" placeholderTextColor={colors.textMuted} style={styles.input} value={subject} /></View><View style={styles.field}><Text style={styles.infoLabel}>Your message</Text><TextInput accessibilityLabel="Support query" multiline onChangeText={setQuery} placeholder="Tell us more about your question." placeholderTextColor={colors.textMuted} style={[styles.input, styles.messageInput]} value={query} /></View><Pressable accessibilityHint="Opens your email app with this query" accessibilityLabel="Email support" accessibilityRole="button" accessibilityState={{ disabled: !query.trim() }} disabled={!query.trim()} onPress={sendQuery} style={({ pressed }) => [styles.emailButton, !query.trim() && styles.emailButtonDisabled, pressed && query.trim() && styles.sheetButtonPressed]}><Text style={styles.sheetButtonText}>Email support</Text></Pressable></View><Pressable accessibilityHint="Opens your email app" accessibilityLabel="Email NoBogey support" accessibilityRole="link" onPress={() => void Linking.openURL("mailto:nobogeyofficial@gmail.com")} style={({ pressed }) => [styles.supportContact, pressed && styles.supportContactPressed]}><MaterialCommunityIcons color={colors.fairwayDark} name="email-outline" size={22} /><View style={styles.supportContactCopy}><Text style={styles.supportContactLabel}>NoBogey support</Text><Text selectable style={styles.supportContactEmail}>nobogeyofficial@gmail.com</Text></View></Pressable></>; }
function AccountDeletionContent() { const requestDeletion = () => void Linking.openURL("mailto:nobogeyofficial@gmail.com?subject=NoBogey%20account%20deletion%20request"); return <><View style={styles.deleteNotice}><MaterialCommunityIcons color="#A34646" name="alert-circle-outline" size={24} /><View style={styles.noticeCopy}><Text style={styles.deleteTitle}>Request account deletion</Text><Text style={styles.noticeText}>This does not delete your account immediately. We will confirm your request and explain any required verification or retention period.</Text></View></View><Pressable accessibilityHint="Opens your email app" accessibilityLabel="Email account deletion request" accessibilityRole="button" onPress={requestDeletion} style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}><Text style={styles.deleteButtonText}>Email deletion request</Text><MaterialCommunityIcons color="#A34646" name="arrow-right" size={18} /></Pressable></>; }

const styles = StyleSheet.create({
  backButton: { alignItems: "center", justifyContent: "center", minHeight: 44, minWidth: 44 },
  comingSoon: { color: colors.forest, fontWeight: "600" }, comingSoonPill: { alignSelf: "center", backgroundColor: colors.goldSoft, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  comingSoonText: { color: colors.forest, fontFamily: "Inter", fontSize: 10, fontWeight: "600", letterSpacing: 1, lineHeight: 17, textTransform: "uppercase" },
  content: { padding: 24, paddingTop: 12, paddingBottom: 40 }, frame: { gap: 28 },
  contentCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  deleteButton: { alignItems: "center", backgroundColor: "#FFF5F4", borderColor: "#E4B9B5", borderRadius: 14, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, minHeight: 54, padding: 16 },
  deleteButtonPressed: { opacity: 0.8 }, deleteButtonText: { color: "#A34646", fontFamily: "Inter", fontSize: 14, fontWeight: "600", lineHeight: 21 },
  deleteNotice: { alignItems: "flex-start", backgroundColor: "#FFF7F5", borderRadius: 18, flexDirection: "row", gap: 12, padding: 18 },
  deleteTitle: { color: "#8F3737", fontFamily: "Inter", fontSize: 16, fontWeight: "600", lineHeight: 23 },
  emailButton: { alignItems: "center", backgroundColor: colors.forest, borderRadius: 14, justifyContent: "center", minHeight: 54, paddingHorizontal: 20, paddingVertical: 15 }, emailButtonDisabled: { opacity: 0.45 },
  emptyCopy: { color: colors.muted, fontFamily: "Inter", fontSize: 14, lineHeight: 23, textAlign: "center" },
  emptyIcon: { alignItems: "center", backgroundColor: colors.goldSoft, borderRadius: 18, height: 60, justifyContent: "center", width: 60 },
  emptySheet: { alignItems: "center", backgroundColor: colors.ivory, borderColor: colors.line, borderWidth: 1, borderRadius: 22, gap: 16, padding: 24 },
  emptyTitle: { color: colors.forest, fontFamily: "Inter", fontSize: 22, fontWeight: "500", letterSpacing: -0.6, lineHeight: 29 },
  field: { gap: 9 }, firstInfoRow: { borderTopWidth: 0 },
  header: { alignItems: "center", flexDirection: "row", minHeight: 52 }, headerCopy: { flex: 1 }, headerSpacer: { minWidth: 44 },
  pageTitle: { color: colors.forest, fontFamily: "Inter", fontSize: 34, fontWeight: "500", letterSpacing: -1.3, lineHeight: 41, paddingTop: 8 },
  infoLabel: { color: colors.forest, fontFamily: "Inter", fontSize: 13, fontWeight: "600", lineHeight: 21 },
  infoRow: { borderTopColor: colors.line, borderTopWidth: 1, gap: 7, padding: 18 },
  infoValue: { color: colors.muted, fontFamily: "Inter", fontSize: 13, lineHeight: 21 },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 14, borderWidth: 1, color: colors.ink, fontFamily: "Inter", fontSize: 14, minHeight: 54, paddingHorizontal: 16, paddingVertical: 14 },
  logoutCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 16, minHeight: 68, padding: 18 }, logoutDisabled: { opacity: 0.45 }, logoutPressed: { backgroundColor: "#FFF5F4" },
  logoutText: { color: colors.accent, flex: 1, fontFamily: "Inter", fontSize: 14, fontWeight: "600", lineHeight: 21 },
  messageInput: { minHeight: 144, textAlignVertical: "top" }, noticeCopy: { flex: 1, minWidth: 0, gap: 8 },
  noticeText: { color: colors.muted, fontFamily: "Inter", fontSize: 13, lineHeight: 21 },
  row: { alignItems: "center", flexDirection: "row", gap: 14, minHeight: 86, paddingHorizontal: 16, paddingVertical: 18 },
  rowIcon: { alignItems: "center", justifyContent: "center", backgroundColor: colors.sage, borderRadius: 12, height: 38, width: 38 },
  rowCopy: { flex: 1, minWidth: 0, gap: 6 }, rowDetail: { color: colors.muted, fontFamily: "Inter", fontSize: 12, lineHeight: 19 },
  rowDisabled: { opacity: 0.55 }, rowDivider: { borderBottomColor: colors.line, borderBottomWidth: 1 },
  rowLabel: { color: colors.forest, fontFamily: "Inter", fontSize: 14, fontWeight: "600", lineHeight: 21 }, rowPressed: { backgroundColor: colors.ivory },
  safeArea: { backgroundColor: colors.white, flex: 1 }, savedText: { color: colors.forest, fontFamily: "Inter", fontSize: 12, fontWeight: "600", lineHeight: 19, textAlign: "center" },
  section: { gap: 12 }, sectionCard: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { color: colors.muted, fontFamily: "Inter", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, lineHeight: 17 },
  sheetButtonPressed: { opacity: 0.8 }, sheetButtonText: { color: colors.white, fontFamily: "Inter", fontSize: 14, fontWeight: "600", lineHeight: 21, textAlign: "center" },
  sheetCopy: { color: colors.muted, fontFamily: "Inter", fontSize: 14, lineHeight: 23 },
  supportContact: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 14, minHeight: 76, padding: 18 },
  supportContactCopy: { flex: 1, minWidth: 0, gap: 6 }, supportContactEmail: { color: colors.forest, flexShrink: 1, fontFamily: "Inter", fontSize: 13, fontWeight: "500", lineHeight: 21 },
  supportContactLabel: { color: colors.muted, fontFamily: "Inter", fontSize: 11, lineHeight: 18 }, supportContactPressed: { opacity: 0.75 }, supportForm: { gap: 22 },
  textDisabled: { color: colors.muted }, toggleCopy: { flex: 1, minWidth: 0, gap: 7 },
  toggleDetail: { color: colors.muted, fontFamily: "Inter", fontSize: 12, lineHeight: 20 },
  toggleRow: { alignItems: "center", borderTopColor: colors.line, borderTopWidth: 1, flexDirection: "row", gap: 16, padding: 18 }
});
