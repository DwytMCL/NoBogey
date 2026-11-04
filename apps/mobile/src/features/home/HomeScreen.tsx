import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@nobogey/ui";
import homeCourseHero from "../../../assets/images/home-course-hero.jpg";
import { useMobileData } from "../data/useMobileData";
import { CaddieCard, CourseCard } from "../booking/components/MarketplaceCards";
import { CaddieDetailSheet } from "../caddies/components/CaddieDetailSheet";
import { EmptyState } from "../../ui/EmptyState";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { MOBILE_BOTTOM_NAVIGATION_HEIGHT, MobileBottomNavigation } from "../../ui/MobileBottomNavigation";
import { InAppAlertBanner } from "../notifications/InAppAlertBanner";
import { NotificationBell } from "../notifications/NotificationBell";
import { useNotificationAlerts } from "../notifications/NotificationAlertProvider";
import { TourTarget, useAutomaticGuidedTour } from "../guided-tour/GuidedTour";
import { NoBogeyWordmark } from "../../ui/NoBogeyWordmark";
import { mobilePalette } from "../../ui/mobile-palette";

const forest = mobilePalette.forest;
const cream = mobilePalette.white;
const ink = mobilePalette.ink;
const muted = mobilePalette.muted;
const sage = mobilePalette.greenSoft;

export function HomeScreen() {
  useAutomaticGuidedTour("golfer");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { caddies, courses } = useMobileData();
  const { dismissBanner, getUnreadCount, getVisibleAlert, markBookingOpened } = useNotificationAlerts();
  const [selectedCaddieId, setSelectedCaddieId] = useState<string>();
  const selectedCaddie = caddies.find((caddie) => caddie.id === selectedCaddieId) ?? null;
  const alert = getVisibleAlert("golfer");
  const contentWidth = Math.min(width, 720);
  const gutter = Math.max(16, Math.min(24, contentWidth * 0.055));
  const cardWidth = Math.max(240, Math.min(320, contentWidth * 0.72));
  const wordmarkSize = Math.max(34, Math.min(44, contentWidth * 0.1));
  const subtitleSize = Math.max(28, Math.min(38, contentWidth * 0.08));

  return <SafeAreaView edges={["top"]} style={styles.safeArea}><ScrollView contentContainerStyle={[styles.content, { paddingBottom: MOBILE_BOTTOM_NAVIGATION_HEIGHT + insets.bottom + spacing.xl }]} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}><ResponsiveContent style={styles.page}>
    {alert ? <InAppAlertBanner actionLabel="View booking" body={alert.body} onAction={() => { markBookingOpened(alert.bookingId, "golfer"); router.push({ pathname: "/golfer/bookings/[bookingId]", params: { bookingId: alert.bookingId } }); }} onDismiss={() => dismissBanner(alert.id)} title={alert.title} /> : null}
    <TourTarget id="golfer-home"><ImageBackground imageStyle={styles.heroImage} resizeMode="cover" source={homeCourseHero} style={[styles.hero, { minHeight: Math.max(252, Math.min(310, contentWidth * 0.74)) }]}><View style={[styles.heroCopy, { paddingHorizontal: gutter, paddingTop: Math.max(16, gutter) }]}>
      <View style={styles.brandRow}><NoBogeyWordmark style={{ fontSize: wordmarkSize, lineHeight: wordmarkSize * 1.1 }} /><View style={styles.brandAction}><NotificationBell count={getUnreadCount("golfer")} onPress={() => router.push("/golfer/bookings")} /></View></View>
      <View style={styles.heroMessage}><Text accessibilityRole="header" style={[styles.subtitle, { fontSize: subtitleSize, lineHeight: subtitleSize * 1.2 }]}>The <Text style={styles.subtitleAccent}>premier caddie</Text> booking service.</Text><Text style={styles.heroDescription}>Find a caddie for your next round. Explore courses, choose your preferred caddie, and request a booking.</Text></View>
      <Pressable accessibilityLabel="Book a Caddie Now" accessibilityRole="button" onPress={() => router.push("/golfer/find-game")} style={({ pressed }) => [styles.bookCaddieButton, pressed && styles.bookCaddieButtonPressed]}><Text style={styles.bookCaddieButtonText}>Book a Caddie Now!</Text><MaterialCommunityIcons color="#FFFFFF" name="arrow-right" size={20} /></Pressable>
    </View></ImageBackground></TourTarget>
    <HomeSection actionLabel="See All" onAction={() => router.push("/golfer/courses/all")} subtitle="Popular courses around you" title="Courses" gutter={gutter}>{courses.length ? <ScrollView horizontal contentContainerStyle={[styles.horizontalList, { paddingHorizontal: gutter }]} showsHorizontalScrollIndicator={false}>{courses.map((course) => <CourseCard compact compactWidth={cardWidth} course={course} key={course.id} onPress={() => router.push({ pathname: "/golfer/courses/[courseId]", params: { courseId: course.id } })} />)}</ScrollView> : <View style={{ paddingHorizontal: gutter }}><EmptyState description="Courses will appear after the catalog service is connected." icon="golf" minHeight={390} title="No courses available" /></View>}</HomeSection>
    <HomeSection actionLabel="See All" onAction={() => router.push("/golfer/caddies/all")} title="Caddies" gutter={gutter}>{caddies.length ? <ScrollView horizontal contentContainerStyle={[styles.horizontalList, { paddingHorizontal: gutter }]} showsHorizontalScrollIndicator={false}>{caddies.map((caddie) => <CaddieCard caddie={caddie} compact compactWidth={cardWidth} key={caddie.id} onPress={() => setSelectedCaddieId(caddie.id)} />)}</ScrollView> : <View style={{ paddingHorizontal: gutter }}><EmptyState description="Caddies will appear after the directory service is connected." icon="account-group-outline" minHeight={470} title="No caddies available" /></View>}</HomeSection>
  </ResponsiveContent></ScrollView><MobileBottomNavigation active="home" /><CaddieDetailSheet caddie={selectedCaddie} course={courses.find((course) => course.id === selectedCaddie?.homeCourseId)} onBook={() => router.push({ pathname: "/golfer/courses", params: { caddieId: selectedCaddie?.id, courseId: selectedCaddie?.homeCourseId } })} onClose={() => setSelectedCaddieId(undefined)} visible={Boolean(selectedCaddie)} /></SafeAreaView>;
}

function HomeSection({ actionLabel, children, gutter, onAction, subtitle, title }: { actionLabel: string; children: React.ReactNode; gutter: number; onAction: () => void; subtitle?: string; title: string }) {
  return <View style={styles.section}><View style={[styles.sectionHeader, { paddingHorizontal: gutter }]}><View style={styles.sectionHeading}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}</View><Pressable accessibilityLabel={`${actionLabel} ${title.toLowerCase()}`} accessibilityRole="button" hitSlop={8} onPress={onAction} style={styles.seeAllButton}><Text style={styles.seeAll}>{actionLabel}</Text><MaterialCommunityIcons color={forest} name="chevron-right" size={17} /></Pressable></View>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: cream, flex: 1 },
  content: { paddingTop: 0 },
  page: { gap: 26 },
  hero: { backgroundColor: sage, overflow: "hidden", width: "100%" },
  heroImage: { width: "100%" },
  heroCopy: { backgroundColor: "rgba(252, 251, 247, 0.9)", flex: 1, gap: 8, paddingBottom: 24 },
  brandAction: { alignItems: "flex-end", minWidth: 44, position: "absolute", right: 0, top: 7 },
  brandRow: { alignItems: "center", minHeight: 58, position: "relative" },
  heroMessage: { gap: 14, maxWidth: 570, paddingTop: 16, paddingBottom: 8 },
  subtitle: { color: forest, fontWeight: "500", letterSpacing: -1, maxWidth: 480 },
  subtitleAccent: { color: mobilePalette.gold },
  heroDescription: { color: "#62695F", fontSize: 14, lineHeight: 23, maxWidth: 400 },
  bookCaddieButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: forest, borderCurve: "continuous", borderRadius: 14, boxShadow: "0 5px 18px rgba(23, 63, 53, 0.16)", flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 8, minHeight: 56, paddingHorizontal: 20, paddingVertical: 14 },
  bookCaddieButtonPressed: { backgroundColor: mobilePalette.forestDark },
  bookCaddieButtonText: { color: "#FFFFFF", flexShrink: 1, fontSize: 16, fontWeight: "800", textAlign: "center" },
  section: { gap: 13 },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  sectionHeading: { flex: 1, minWidth: 0 },
  sectionTitle: { color: ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.65 },
  sectionSubtitle: { color: muted, fontSize: 13, lineHeight: 18 },
  seeAllButton: { alignItems: "center", flexDirection: "row", justifyContent: "center", minHeight: 44 },
  seeAll: { color: forest, fontSize: 14, fontWeight: "800" },
  horizontalList: { gap: 12, paddingBottom: 8 }
});
