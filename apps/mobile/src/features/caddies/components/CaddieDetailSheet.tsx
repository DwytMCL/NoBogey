import type { Caddie, GolfCourse } from "@nobogey/contracts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatMoney } from "@nobogey/utils";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobilePalette } from "../../../ui/mobile-palette";
import { CaddieAvatar } from "./CaddieAvatar";

type CaddieDetailSheetProps = { caddie: Caddie | null; course?: GolfCourse | undefined; onBook: () => void; onClose: () => void; visible: boolean };

export function CaddieDetailSheet({ caddie, course, onBook, onClose, visible }: CaddieDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { height, width, fontScale } = useWindowDimensions();
  const sheetWidth = Math.min(720, width - insets.left - insets.right);
  const compact = sheetWidth / fontScale < 340;
  if (!caddie) return null;

  return <Modal animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen" transparent visible={visible}>
    <View style={styles.backdrop}>
      <Pressable accessibilityLabel="Close caddie details" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityLabel={`${caddie.displayName} booking details`} accessibilityViewIsModal style={[styles.sheet, { height: Math.min(height * .9, height - insets.top - 12), width: sheetWidth, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}><Text style={styles.sheetEyebrow}>MEET YOUR CADDIE</Text><Pressable accessibilityLabel="Close caddie details" accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.closeButton}><MaterialCommunityIcons color={mobilePalette.forest} name="close" size={22} /></Pressable></View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <View style={[styles.identity, compact && styles.identityCompact]}><CaddieAvatar name={caddie.displayName} size="large" style={styles.avatar} /><View style={[styles.identityCopy, compact && styles.identityCopyCompact]}><Text accessibilityRole="header" selectable style={styles.name}>{caddie.displayName}</Text><View style={styles.verifiedLabel}><MaterialCommunityIcons color={mobilePalette.forest} name="check-circle" size={15} /><Text style={styles.classLabel}>Verified caddie</Text></View><Text selectable style={styles.meta}>{caddie.yearsExperience} years experience · {course?.name ?? "Course to be confirmed"}</Text><Text selectable style={styles.rating}><MaterialCommunityIcons color={mobilePalette.gold} name="star" size={16} /> {caddie.ratingAverage.toFixed(1)} · {caddie.reviewCount} {caddie.reviewCount === 1 ? "review" : "reviews"}</Text></View></View>
          <View style={[styles.stats, compact && styles.statsCompact]}><Stat compact={compact} label="Caddie rate" value={formatMoney(caddie.rate.amountInCentavos)} /><Stat compact={compact} label="Rounds played" value={String(caddie.completedRounds)} /></View>
          <Section title="About"><Text selectable style={styles.body}>{caddie.bio || "Profile details will be shared by the caddie soon."}</Text></Section>
          <Section title="Specialties"><View style={styles.tags}>{caddie.specialties.length ? caddie.specialties.map((specialty) => <Text key={specialty} style={styles.tag}>{specialty}</Text>) : <Text style={styles.meta}>Specialties not listed</Text>}</View></Section>
          <Section title="Languages"><Text selectable style={styles.body}>{caddie.languages.join(", ") || "Not listed"}</Text></Section>
        </ScrollView>
        <View style={styles.actionArea}><Pressable accessibilityLabel={`Start booking with ${caddie.displayName}`} accessibilityRole="button" onPress={onBook} style={({ pressed }) => [styles.bookButton, pressed && styles.pressed]}><Text style={styles.bookText}>Book with {caddie.displayName.split(" ")[0]}</Text><MaterialCommunityIcons color={mobilePalette.gold} name="arrow-top-right" size={19} /></Pressable><Text style={styles.scheduleNote}>A preferred caddie is a request. The club confirms the final assignment.</Text></View>
      </View>
    </View>
  </Modal>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Stat({ compact, label, value }: { compact: boolean; label: string; value: string }) {
  return <View style={[styles.stat, compact && styles.statCompact]}><Text style={styles.statLabel}>{label}</Text><Text selectable style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(16, 35, 29, 0.48)", flex: 1, justifyContent: "flex-end" },
  sheet: { alignSelf: "center", backgroundColor: mobilePalette.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  handle: { alignSelf: "center", backgroundColor: "#D5D2C8", borderRadius: 999, height: 4, marginTop: 10, width: 40 },
  sheetHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16 },
  sheetEyebrow: { color: mobilePalette.muted, flex: 1, fontSize: 10, lineHeight: 17, fontWeight: "600", letterSpacing: 1.6 },
  closeButton: { alignItems: "center", backgroundColor: "#F0EEE7", borderColor: mobilePalette.line, borderWidth: 1, borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: 24, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 8 },
  identity: { alignItems: "center", flexDirection: "row", gap: 18 },
  identityCopyCompact: { flex: 0, width: "100%" },
  statCompact: { flex: 0 },
  identityCompact: { alignItems: "flex-start", flexDirection: "column" },
  avatar: { backgroundColor: mobilePalette.forest, borderColor: "#E2D3AF", borderWidth: 2 },
  identityCopy: { flex: 1, gap: 8, minWidth: 0 },
  name: { color: mobilePalette.forest, fontSize: 27, fontWeight: "600", letterSpacing: -.8, lineHeight: 34 },
  verifiedLabel: { alignItems: "center", flexDirection: "row", gap: 5 },
  classLabel: { color: mobilePalette.forest, flexShrink: 1, fontSize: 10, fontWeight: "600", letterSpacing: 1, lineHeight: 17, textTransform: "uppercase" },
  meta: { color: mobilePalette.muted, fontSize: 12, lineHeight: 20 },
  rating: { color: mobilePalette.forest, fontSize: 13, fontWeight: "600", lineHeight: 21 },
  stats: { flexDirection: "row", gap: 12 },
  statsCompact: { flexDirection: "column" },
  stat: { backgroundColor: "#F7F5EF", borderColor: mobilePalette.line, borderWidth: 1, borderRadius: 18, flex: 1, gap: 10, padding: 18 },
  statLabel: { color: mobilePalette.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1, lineHeight: 17, textTransform: "uppercase" },
  statValue: { color: mobilePalette.forest, fontSize: 21, fontWeight: "600", letterSpacing: -.5, lineHeight: 29 },
  section: { borderTopColor: mobilePalette.line, borderTopWidth: 1, gap: 12, paddingTop: 22 },
  sectionTitle: { color: mobilePalette.forest, fontSize: 18, fontWeight: "600", letterSpacing: -.4, lineHeight: 25 },
  body: { color: "#525B50", fontSize: 14, lineHeight: 24 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#EDF0E8", borderRadius: 999, color: mobilePalette.forest, fontSize: 12, fontWeight: "500", lineHeight: 19, overflow: "hidden", paddingHorizontal: 14, paddingVertical: 9 },
  actionArea: { backgroundColor: mobilePalette.white, borderTopColor: mobilePalette.line, borderTopWidth: 1, gap: 12, paddingHorizontal: 24, paddingTop: 18 },
  bookButton: { alignItems: "center", backgroundColor: mobilePalette.forest, borderRadius: 999, flexDirection: "row", gap: 12, justifyContent: "center", minHeight: 54, paddingHorizontal: 20, paddingVertical: 15 },
  bookText: { color: mobilePalette.white, flexShrink: 1, fontSize: 14, fontWeight: "600", lineHeight: 21, textAlign: "center" },
  scheduleNote: { color: mobilePalette.muted, fontSize: 11, lineHeight: 18, textAlign: "center" },
  pressed: { opacity: .7 },
});
