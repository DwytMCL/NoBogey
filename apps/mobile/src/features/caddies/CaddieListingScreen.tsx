import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@nobogey/ui";
import { mobilePalette as palette } from "../../ui/mobile-palette";
import { EmptyState } from "../../ui/EmptyState";
import { CaddieCard } from "../booking/components/MarketplaceCards";
import { CaddieDetailSheet } from "./components/CaddieDetailSheet";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { MobileBottomNavigation } from "../../ui/MobileBottomNavigation";
import { useMobileData } from "../data/useMobileData";
import { FindGameDetailsScreen } from "../booking/find-game-details-screen";

export function CaddieListingScreen() {
  const { courseId, teeTimeId } = useLocalSearchParams<{ courseId?: string; teeTimeId?: string }>();
  return courseId && teeTimeId ? <FindGameDetailsScreen /> : <CaddieDirectoryScreen />;
}

function CaddieDirectoryScreen() {
  const { caddies, courses } = useMobileData();
  const { caddieId, courseId } = useLocalSearchParams<{ caddieId?: string; courseId?: string }>();
  const [selectedId, setSelectedId] = useState<string | undefined>(caddieId);
  const availableCaddies = useMemo(() => caddies.filter((caddie) => !courseId || caddie.homeCourseId === courseId), [caddies, courseId]);

  useEffect(() => { setSelectedId(availableCaddies.some((caddie) => caddie.id === caddieId) ? caddieId : undefined); }, [availableCaddies, caddieId]);

  return <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}><ResponsiveContent style={styles.frame}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>ON YOUR SIDE OF THE FAIRWAY</Text>
        <Text accessibilityRole="header" style={styles.title}>Available caddies</Text>
        <Text style={styles.subtitle}>Find the right company for your next round. Explore experience, specialties, and home courses.</Text>
      </View>
      <View style={styles.resultsHeading}><Text accessibilityRole="header" style={styles.resultsTitle}>Meet your next caddie</Text><Text style={styles.resultsCount}>{availableCaddies.length} {availableCaddies.length === 1 ? "caddie" : "caddies"}</Text></View>
      {availableCaddies.length ? <View style={styles.grid}>{availableCaddies.map((caddie) => <CaddieCard caddie={caddie} key={caddie.id} onPress={() => setSelectedId(caddie.id)} verified />)}</View> : <View style={styles.empty}><EmptyState description="No verified caddies are currently listed." icon="account-group-outline" minHeight={250} title="No caddies available" /></View>}
    </ResponsiveContent></ScrollView>
    <CaddieDetailSheet caddie={caddies.find((caddie) => caddie.id === selectedId) ?? null} course={courses.find((item) => item.id === (courseId ?? caddies.find((caddie) => caddie.id === selectedId)?.homeCourseId))} onBook={() => router.push({ pathname: "/golfer/courses", params: { caddieId: selectedId, courseId: caddies.find((caddie) => caddie.id === selectedId)?.homeCourseId } })} onClose={() => setSelectedId(undefined)} visible={Boolean(selectedId)} />
    <MobileBottomNavigation active="caddies" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 24, paddingBottom: 128 },
  frame: { gap: 24 },
  heading: { gap: 12, paddingHorizontal: 20 },
  eyebrow: { color: palette.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1.6, lineHeight: 17 },
  title: { color: palette.forest, fontSize: 32, fontWeight: "600", letterSpacing: -1.2, lineHeight: 39 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 23 },
  resultsHeading: { alignItems: "center", borderTopColor: palette.line, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginHorizontal: 20, paddingTop: 22 },
  resultsTitle: { color: palette.forest, fontSize: 18, fontWeight: "600", letterSpacing: -.4 },
  resultsCount: { backgroundColor: "#F0EEE7", borderRadius: 999, color: "#686E62", fontSize: 11, fontWeight: "600", paddingHorizontal: 12, paddingVertical: 7 },
  empty: { paddingHorizontal: 20 },
  grid: { alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.lg },
  safeArea: { backgroundColor: palette.white, flex: 1 },
});
