import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { describeUserError } from "@nobogey/utils";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { MobileButton, MobilePageIntro } from "../../ui/MobilePresentation";
import { mobilePalette as palette } from "../../ui/mobile-palette";
import { loadCaddieVerificationStatus } from "../../../backend/users/users.service";

const statuses: Record<string, { label: string; title: string; description: string }> = {
  draft: { label: "Not submitted", title: "Your profile, ready for review.", description: "Your verification status will appear here after your profile is submitted to your home club." },
  unverified: { label: "Not verified", title: "Verification is still needed.", description: "Your home club has not verified your caddie profile yet." },
  pending: { label: "Under review", title: "Your club is reviewing your profile.", description: "Your submitted details are with your home club. Check back here for their decision." },
  changes_requested: { label: "Changes requested", title: "Your profile needs an update.", description: "Your home club has requested changes. Read their feedback below before updating your profile." },
  verified: { label: "Verified", title: "You're verified.", description: "Your home club has verified your caddie profile." },
  approved: { label: "Approved", title: "Your profile is approved.", description: "Your home club has approved your caddie profile." },
  rejected: { label: "Not approved", title: "Your club has reviewed your profile.", description: "Your profile was not approved. Review any feedback from your home club below." }
};

export function VerificationStatusScreen() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof loadCaddieVerificationStatus>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void loadCaddieVerificationStatus()
      .then((value) => { if (active) setResult(value); })
      .catch((reason: unknown) => { if (active) setError(describeUserError(reason, "Your verification status could not be loaded. Please try again.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const statusKey = result?.status ?? "draft";
  const status = statuses[statusKey] ?? { label: statusKey.replaceAll("_", " "), title: "Your latest verification status.", description: "Your home club's current review status is shown here." };
  return <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safe}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll}>
      <ResponsiveContent style={styles.content}>
        <MobilePageIntro eyebrow="Caddie account" title="Caddie verification" description="Keep track of your profile review with your home club." />
        {loading ? <View style={styles.card}><ActivityIndicator color={palette.forest} accessibilityLabel="Loading verification" /><Text style={styles.body}>Checking your verification status…</Text></View>
          : error ? <View style={styles.card}><Text accessibilityRole="header" style={styles.cardTitle}>We couldn't load your status</Text><Text accessibilityLiveRegion="polite" selectable style={styles.body}>{error}</Text><MobileButton onPress={() => setAttempt((value) => value + 1)}>Try again</MobileButton></View>
          : <>
            <View style={styles.statusCard}>
              <Text style={styles.badge}>{status.label}</Text>
              <Text accessibilityRole="header" style={styles.statusTitle}>{status.title}</Text>
              <Text style={styles.statusCopy}>{status.description}</Text>
            </View>
            {result?.note ? <View style={styles.card}><Text style={styles.eyebrow}>FROM YOUR HOME CLUB</Text><Text selectable style={styles.body}>{result.note}</Text></View> : null}
            {result?.reviewedAt ? <Text style={styles.updated}>Last reviewed {new Date(result.reviewedAt).toLocaleString()}</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.refresh}><Feather name="refresh-cw" size={16} color={palette.forest} /><Text style={styles.refreshText}>Refresh status</Text></Pressable>
          </>}
        <View style={styles.actions}><MobileButton onPress={() => router.replace("/caddie/dashboard")}>Back to dashboard</MobileButton><MobileButton variant="secondary" onPress={() => router.push("/caddie/settings")}>Account settings</MobileButton></View>
      </ResponsiveContent>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: palette.white, flex: 1 }, scroll: { flexGrow: 1, padding: 24, paddingTop: 28, paddingBottom: 40 }, content: { maxWidth: 560, gap: 28 },
  card: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 20, gap: 16, padding: 24 },
  cardTitle: { color: palette.forest, fontFamily: "Inter", fontSize: 22, fontWeight: "500", lineHeight: 29, letterSpacing: -0.6 },
  body: { color: palette.muted, fontFamily: "Inter", fontSize: 14, lineHeight: 24 },
  statusCard: { backgroundColor: palette.forest, borderRadius: 24, gap: 22, padding: 24 },
  badge: { alignSelf: "flex-start", backgroundColor: palette.goldSoft, borderRadius: 99, color: palette.forest, overflow: "hidden", fontFamily: "Inter", fontSize: 11, fontWeight: "600", lineHeight: 18, paddingHorizontal: 14, paddingVertical: 7 },
  statusTitle: { color: palette.white, fontFamily: "Inter", fontSize: 28, fontWeight: "500", letterSpacing: -0.8, lineHeight: 35 },
  statusCopy: { color: palette.onGreenMuted, fontFamily: "Inter", fontSize: 14, lineHeight: 24 },
  eyebrow: { color: palette.forest, fontFamily: "Inter", fontSize: 10, fontWeight: "600", letterSpacing: 1.3, lineHeight: 18 },
  updated: { color: palette.muted, fontFamily: "Inter", fontSize: 12, lineHeight: 20 },
  refresh: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 44, paddingVertical: 12 },
  refreshText: { color: palette.forest, fontFamily: "Inter", fontSize: 13, fontWeight: "600", lineHeight: 20 }, actions: { gap: 12 }
});
