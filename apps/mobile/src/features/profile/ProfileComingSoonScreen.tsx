import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mobilePalette as palette } from "../../ui/mobile-palette";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { MobileBottomNavigation } from "../../ui/MobileBottomNavigation";
import { ProfileHeader } from "./RoleProfileScreen";

type ProfileRole = "golfer" | "caddie";

export function ProfileComingSoonScreen({ role }: { role: ProfileRole }) {
  const roleLabel = role === "golfer" ? "golfer" : "caddie";

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, role === "golfer" && styles.contentWithNavigation]} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <ResponsiveContent style={styles.frame}>
          <ProfileHeader role={role} />
          <View style={styles.intro}><Text accessibilityRole="header" style={styles.pageTitle}>Your profile</Text><Text style={styles.pageDescription}>A little more about you and your game.</Text></View>
          <View style={styles.comingSoonCard}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons color={palette.forest} name="account-clock-outline" size={34} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>Profile coming soon</Text>
            <Text style={styles.description}>We’re working on your {roleLabel} profile. Check back soon for account details, stats, and more.</Text>
          </View>
        </ResponsiveContent>
      </ScrollView>
      {role === "golfer" ? <MobileBottomNavigation active="profile" /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.white, flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  contentWithNavigation: { paddingBottom: 128 },
  frame: { gap: 28 },
  intro: { gap: 10, paddingTop: 4 },
  pageTitle: { color: palette.forest, fontSize: 32, fontWeight: "600", letterSpacing: -1.2, lineHeight: 39 },
  pageDescription: { color: palette.muted, fontSize: 14, lineHeight: 23 },
  comingSoonCard: { alignItems: "center", backgroundColor: "#F7F5EF", borderColor: palette.line, borderRadius: 28, borderWidth: 1, gap: 22, paddingHorizontal: 24, paddingVertical: 44 },
  iconCircle: { alignItems: "center", backgroundColor: "#E8EDE3", borderColor: "#DAE1D4", borderWidth: 1, borderRadius: 999, height: 80, justifyContent: "center", width: 80 },
  title: { color: palette.forest, fontSize: 27, fontWeight: "600", letterSpacing: -.8, lineHeight: 34, textAlign: "center" },
  description: { color: palette.muted, fontSize: 14, lineHeight: 24, maxWidth: 340, textAlign: "center" },
});
