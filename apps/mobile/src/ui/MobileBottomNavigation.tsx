import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@nobogey/ui";
import { TourTarget } from "../features/guided-tour/GuidedTour";
import { mobilePalette } from "./mobile-palette";

type MobileNavigationTab = "bookings" | "caddies" | "home" | "profile";
export const MOBILE_BOTTOM_NAVIGATION_HEIGHT = 72;

export function MobileBottomNavigation({ active }: { active: MobileNavigationTab }) {
  const insets = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={[styles.navigation, { minHeight: MOBILE_BOTTOM_NAVIGATION_HEIGHT + insets.bottom, paddingBottom: Math.max(insets.bottom, spacing.xs) }]}><View style={styles.navigationContent}>
    <TourTarget id="golfer-nav-home" style={styles.target}><NavigationTab active={active === "home"} icon="home" label="Home" onPress={() => router.replace("/golfer/home")} /></TourTarget>
    <TourTarget id="golfer-nav-bookings" style={styles.target}><NavigationTab active={active === "bookings"} icon="calendar" label="Bookings" onPress={() => router.replace("/golfer/bookings")} /></TourTarget>
    <TourTarget id="golfer-nav-find-game" style={styles.primaryTarget}><Pressable accessibilityLabel="Book Now" accessibilityRole="button" onPress={() => router.push("/golfer/find-game")} style={styles.primaryItem}><View style={styles.primaryAction}><GolfBallIcon /></View><Text style={styles.primaryLabel}>Book Now</Text></Pressable></TourTarget>
    <TourTarget id="golfer-nav-caddies" style={styles.target}><NavigationTab active={active === "caddies"} icon="people" label="Caddies" onPress={() => router.replace("/golfer/caddies")} /></TourTarget>
    <TourTarget id="golfer-nav-profile" style={styles.target}><NavigationTab active={active === "profile"} icon="person-circle-outline" label="Profile" onPress={() => router.replace("/golfer/profile")} /></TourTarget>
  </View></View>;
}

function NavigationTab({ active, icon, label, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.item}><View style={[styles.icon, active && styles.iconActive]}><Ionicons color={active ? mobilePalette.onGreen : "#666A65"} name={icon} size={22} /></View><Text style={[styles.label, active && styles.labelActive]}>{label}</Text></Pressable>;
}

function GolfBallIcon() { return <View style={styles.golfBall}><View style={[styles.golfDot, styles.golfDotOne]} /><View style={[styles.golfDot, styles.golfDotTwo]} /><View style={[styles.golfDot, styles.golfDotThree]} /><View style={[styles.golfDot, styles.golfDotFour]} /><View style={[styles.golfDot, styles.golfDotFive]} /></View>; }

const styles = StyleSheet.create({
  golfBall: { alignItems: "center", borderColor: "#D8B66A", borderRadius: 16, borderWidth: 2, height: 32, justifyContent: "center", width: 32 },
  golfDot: { backgroundColor: "#D8B66A", borderRadius: 2, height: 4, position: "absolute", width: 4 },
  golfDotFive: { bottom: 7, left: 13 }, golfDotFour: { bottom: 10, right: 6 }, golfDotOne: { left: 7, top: 8 }, golfDotThree: { right: 7, top: 8 }, golfDotTwo: { left: 14, top: 5 },
  icon: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, iconActive: { backgroundColor: mobilePalette.forest },
  item: { alignItems: "center", flex: 1, gap: 2, justifyContent: "center", minHeight: 58, minWidth: 0 },
  label: { color: "#666A65", fontSize: 12, fontWeight: "600", textAlign: "center" }, labelActive: { color: "#173F35", fontWeight: "800" },
  navigation: { backgroundColor: "#FCFBF7", borderTopColor: "#E5E1D8", borderTopWidth: StyleSheet.hairlineWidth, bottom: 0, left: 0, paddingHorizontal: spacing.xs, paddingTop: spacing.xs, position: "absolute", right: 0 },
  navigationContent: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-around", maxWidth: 720, width: "100%" },
  primaryAction: { alignItems: "center", backgroundColor: "#FCFBF7", borderColor: "#173F35", borderRadius: 28, borderWidth: 2, height: 56, justifyContent: "center", width: 56 },
  primaryItem: { alignItems: "center", gap: 2, justifyContent: "center", minHeight: 70, minWidth: 64 },
  primaryLabel: { color: "#173F35", fontSize: 12, fontWeight: "800", textAlign: "center" },
  primaryTarget: { marginTop: -20 },
  target: { flex: 1 }
});
