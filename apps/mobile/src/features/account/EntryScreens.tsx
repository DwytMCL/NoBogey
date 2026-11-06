import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authPalette } from "../../ui/auth-palette";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@nobogey/ui";
import NoBogeyLogo from "../../../../../assets/logo/NoBogey-Logo.png";
import SplashLogo from "../../../../../assets/logo/splash-logo-1024x1024.png";
import { Button } from "../../ui/primitives";
import { backToPreviousPage } from "../../ui/navigation";
import { TermsAcceptanceModal } from "../legal/TermsAcceptanceModal";
import { useAppSession, type AppRole } from "../session/AppSession";
import { resolveStartupRoute } from "../session/session-state";

type Mode = "login" | "register";

export function SplashScreen() {
  const [logoFailed, setLogoFailed] = useState(false);
  const { initialRole, isAuthenticated, isHydrated } = useAppSession();
  useEffect(() => {
    if (!isHydrated) return;
    const timeout = setTimeout(() => {
      router.replace(resolveStartupRoute(isAuthenticated, initialRole));
    }, 2440);
    return () => clearTimeout(timeout);
  }, [initialRole, isAuthenticated, isHydrated]);

  return <SafeAreaView edges={["top", "bottom"]} style={styles.splash}><View style={styles.splashContent}><View style={styles.splashBrand}><View style={styles.logoFrame}>{logoFailed ? <Text accessibilityRole="image" style={styles.logoFallback}>NB</Text> : <Image accessibilityLabel="NoBogey golfer and caddie logo" onError={() => setLogoFailed(true)} resizeMode="contain" source={SplashLogo} style={styles.logo} />}</View><Text accessibilityRole="header" style={styles.splashWordmark}>NoBogey</Text></View><GolfLoadingIndicator /></View></SafeAreaView>;
}

function GolfLoadingIndicator() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(120),
      Animated.timing(progress, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(120),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return <View accessibilityLabel="Golf loading" accessibilityRole="progressbar" style={styles.loadingTrack}>
    <Animated.View style={[styles.loadingBall, { transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 78] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
    ] }]}>
      {Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, column) => {
        const x = (column - 3) * 3.15;
        const y = (row - 3) * 3.15;
        if (x * x + y * y > 10.5 * 10.5) return null;
        return <View key={`${row}-${column}`} style={[styles.loadingBallDimple, { left: 12.6 + x, top: 12.6 + y }]} />;
      }))}
      <View style={styles.loadingBallHighlight} />
    </Animated.View>
  </View>;
}

export function OnboardingScreen() {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const choose = (role: AppRole) => {
    setSelectedRole(role);
  };
  const startRegistration = () => {
    if (!selectedRole) return;
    router.replace({
      pathname: "/sign-in",
      params: {
        mode: "register",
        role: selectedRole,
        ...(selectedRole === "caddie" ? { returnTo: "/caddie/onboarding" } : {}),
      },
    });
  };
  const roleName = selectedRole === "caddie" ? "caddie" : "golfer";
  return <SafeAreaView edges={["top", "bottom"]} style={styles.authSafe}><ScrollView contentContainerStyle={[styles.authContent, styles.onboardingContent]} contentInsetAdjustmentBehavior="automatic">{selectedRole ? <><RoleIntro title={`Continue as a ${roleName}?`} subtitle="Are you new to NoBogey, or do you already have an account?" /><Button palette={authPalette} accessibilityLabel={`I’m new to NoBogey as a ${roleName}`} onPress={startRegistration}>I’m new here</Button><Pressable accessibilityLabel={`I already have a ${roleName} account`} accessibilityRole="button" onPress={() => router.replace({ pathname: "/sign-in", params: { role: selectedRole, ...(selectedRole === "caddie" ? { returnTo: "/caddie/onboarding" } : {}) } })} style={styles.existingAccountButton}><Text style={styles.existingAccountText}>I already have an account</Text></Pressable><Pressable accessibilityLabel="Choose a different role" accessibilityRole="button" onPress={() => setSelectedRole(null)}><Text style={styles.secondaryLink}>Choose a different role</Text></Pressable></> : <><RoleIntro title="How do you use NoBogey?" subtitle="Choose whether you are continuing as a golfer or a caddie." /><RoleChoice description="Browse tee times and caddies before creating an account." icon="golf" label="I’m a golfer" onPress={() => choose("golfer")} /><RoleChoice description="Create a professional profile for verification by your home club." icon="account-tie-outline" label="I’m a caddie" onPress={() => choose("caddie")} /></>}<Text style={styles.placeholderNote}>Golfers can add a caddie identity later from Profile.</Text></ScrollView></SafeAreaView>;
}

function _LegacyAuthScreen() {
  const params = useLocalSearchParams<{ mode?: Mode; role?: AppRole; returnTo?: string; caddieId?: string; courseId?: string; teeTimeId?: string; time?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === "register" ? "register" : "login");
  const [role] = useState<AppRole>(params.role === "caddie" ? "caddie" : "golfer");
  const [termsVisible, setTermsVisible] = useState(false);
  const { selectInitialRole, signInAs } = useAppSession();
  const completeSignIn = () => {
    selectInitialRole(role);
    signInAs(role);
    if (role === "caddie") {
      // This device-local role choice is not authentication or authorization.
      router.replace("/caddie/dashboard");
      return;
    }
    if (params.returnTo === "/golfer/caddies") {
      router.replace({ pathname: "/golfer/caddies", params: { caddieId: params.caddieId, courseId: params.courseId, teeTimeId: params.teeTimeId, time: params.time } });
      return;
    }
    router.replace("/golfer/home");
  };
  const submit = () => {
    if (role === "golfer" && mode === "register") {
      setTermsVisible(true);
      return;
    }
    completeSignIn();
  };
  const submitLabel = mode === "login" ? "Log in" : `Create ${role} account`;
  const caddieRegistration = role === "caddie" && mode === "register";
  return <SafeAreaView edges={["top", "bottom"]} style={styles.authSafe}><ScrollView contentContainerStyle={styles.authContent} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"><View style={styles.authHeader}><Image accessibilityLabel="NoBogey logo" resizeMode="contain" source={NoBogeyLogo} style={styles.authLogo} /><Text accessibilityRole="header" style={styles.authTitle}>{mode === "login" ? "Welcome back." : "Join the fairway."}</Text><Text style={styles.authSubtitle}>{role === "caddie" ? "Create your professional profile, then submit it to your home club for verification." : "Create an account only when you’re ready to pay."}</Text></View><View style={styles.modeTabs}><Tab active={mode === "login"} label="Log in" onPress={() => setMode("login")} /><Tab active={mode === "register"} label="Create account" onPress={() => { if (role === "caddie") { selectInitialRole("caddie"); router.replace("/caddie/onboarding"); return; } setMode("register"); }} /></View>{caddieRegistration ? <View style={styles.roleGroup}><Text style={styles.fieldLabel}>Caddie registration is part of your professional profile</Text><Text style={styles.placeholderNote}>Continue to enter your account details, select your home club, and submit your profile for verification.</Text><Button accessibilityLabel="Start caddie onboarding" onPress={() => { selectInitialRole("caddie"); router.replace("/caddie/onboarding"); }}>Start caddie onboarding</Button></View> : <View style={styles.form}>{mode === "register" && <Field label="Full name" placeholder="Enter your full name" />}<Field autoCapitalize="none" keyboardType="email-address" label="Email address" placeholder="Enter your email address" /><Field label="Password" placeholder="Enter your password" secureTextEntry /><Button accessibilityLabel={submitLabel} onPress={submit}>{submitLabel}</Button></View>}<Pressable accessibilityLabel="Return to role selection" accessibilityRole="button" onPress={() => backToPreviousPage("/onboarding")}><Text style={styles.secondaryLink}>Back to role selection</Text></Pressable></ScrollView><TermsAcceptanceModal onAccept={() => { setTermsVisible(false); completeSignIn(); }} onDecline={() => setTermsVisible(false)} visible={termsVisible} /></SafeAreaView>;
}

function Field({ label, ...inputProps }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#788179" style={styles.input} {...inputProps} /></View>; }
function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeTab, active && styles.modeTabActive]}><Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text></Pressable>; }
function RoleIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={styles.roleIntro}><View style={styles.roleBrand}><Image accessibilityLabel="NoBogey logo" resizeMode="contain" source={NoBogeyLogo} style={styles.onboardingLogo} /><Text style={styles.roleWordmark}>NoBogey</Text></View><Text accessibilityRole="header" style={styles.roleIntroTitle}>{title}</Text><Text style={styles.roleIntroSubtitle}>{subtitle}</Text></View>;
}

function RoleChoice({ description, icon, label, onPress }: { description: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; onPress: () => void }) { return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.roleTab}><View style={styles.roleIconBadge}><MaterialCommunityIcons color={authPalette.forest} name={icon} size={26} /></View><View style={styles.roleCopy}><Text style={styles.roleTitle}>{label}</Text><Text style={styles.roleDescription}>{description}</Text></View><Text style={styles.arrow}>›</Text></Pressable>; }

const styles = StyleSheet.create({
  existingAccountButton: { alignItems: "center", borderColor: authPalette.forest, borderCurve: "continuous", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 52, paddingHorizontal: 18 },
  existingAccountText: { color: authPalette.forest, fontSize: 16, fontWeight: "800" },
  onboardingContent: { flexGrow: 1, justifyContent: "center", alignSelf: "center", width: "100%", maxWidth: 560, paddingTop: spacing.xl },
  onboardingLogo: { height: 80, width: 80 },
  roleIntro: { backgroundColor: authPalette.forest, borderCurve: "continuous", borderRadius: 24, borderBottomColor: authPalette.gold, borderBottomWidth: 4, gap: spacing.md, padding: spacing.xl },
  roleBrand: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  roleWordmark: { color: authPalette.goldSoft, fontFamily: "Inter", fontSize: 21, fontWeight: "700", letterSpacing: -0.5 },
  roleIntroTitle: { color: authPalette.surface, fontFamily: "Inter", fontSize: 29, fontWeight: "700", letterSpacing: -0.9, lineHeight: 36 },
  roleIntroSubtitle: { color: authPalette.onGreenMuted, fontFamily: "Inter", fontSize: 14, lineHeight: 22 },
  roleIconBadge: { alignItems: "center", backgroundColor: authPalette.goldSoft, borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  arrow: { color: authPalette.forest, fontSize: 26, fontWeight: "500" }, authContent: { gap: spacing.xl, padding: spacing.xl, paddingTop: 48 }, authHeader: { gap: spacing.sm }, authLogo: { height: 48, width: 48 }, authSafe: { backgroundColor: authPalette.surface, flex: 1 }, authSubtitle: { color: "#617067", fontFamily: "Inter", fontSize: 14, lineHeight: 22 }, authTitle: { color: "#143B2A", fontFamily: "Inter", fontSize: 30, fontWeight: "700", letterSpacing: -0.9 }, field: { gap: 7 }, fieldLabel: { color: "#416052", fontFamily: "Inter", fontSize: 12, fontWeight: "600" }, form: { gap: spacing.lg }, input: { backgroundColor: "#FFFFFF", borderColor: "#CBD4CC", borderCurve: "continuous", borderRadius: 12, borderWidth: 1, color: "#16231C", fontFamily: "Inter", fontSize: 15, minHeight: 52, paddingHorizontal: 14 }, loadingTrack: { backgroundColor: "transparent", height: 40, width: 118 },
  loadingBall: { position: "absolute", left: 6, top: 6, backgroundColor: "#F3F5EF", borderColor: "#CAD4CD", borderRadius: 14, borderWidth: 1, height: 28, width: 28, overflow: "hidden", boxShadow: "0 3px 6px rgba(0, 0, 0, 0.24), inset -3px -4px 7px rgba(78, 105, 90, 0.18)" },
  loadingBallDimple: { position: "absolute", backgroundColor: "#DEE5DC", borderRadius: 1, height: 1.75, width: 1.75, boxShadow: "inset 0 1px 1px rgba(67, 94, 79, 0.3), 0 1px 0 rgba(255, 255, 255, 0.85)" },
  loadingBallHighlight: { position: "absolute", left: 3.5, top: 2, width: 13, height: 6, borderRadius: 7, backgroundColor: "rgba(255, 255, 255, 0.5)", transform: [{ rotate: "-30deg" }] },
  logo: { height: "100%", width: "100%" }, logoFallback: { color: authPalette.goldSoft, fontSize: 28, fontWeight: "900" }, logoFrame: { alignItems: "center", height: 196, justifyContent: "center", width: 196 }, modeTab: { alignItems: "center", borderRadius: 10, flex: 1, justifyContent: "center", minHeight: 44 }, modeTabActive: { backgroundColor: "#FFFFFF" }, modeTabText: { color: "#68756C", fontFamily: "Inter", fontSize: 14, fontWeight: "600" }, modeTabTextActive: { color: "#174B32" }, modeTabs: { backgroundColor: "#E4EAE4", borderRadius: 12, flexDirection: "row", padding: 4 }, placeholderNote: { color: "#6A706B", fontFamily: "Inter", fontSize: 11, lineHeight: 18, textAlign: "center" }, roleCopy: { flex: 1, gap: 4 }, roleDescription: { color: "#647067", fontFamily: "Inter", fontSize: 12, lineHeight: 18 }, roleGroup: { gap: spacing.sm }, roleIcon: { fontSize: 25 }, roleTab: { alignItems: "center", backgroundColor: authPalette.surface, borderColor: authPalette.line, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16 }, roleTitle: { color: authPalette.forest, fontFamily: "Inter", fontSize: 15, fontWeight: "600", letterSpacing: -0.2 }, secondaryLink: { color: authPalette.forest, fontFamily: "Inter", fontSize: 14, fontWeight: "600", textAlign: "center" }, splash: { backgroundColor: authPalette.forest, flex: 1 }, splashBrand: { alignItems: "center", gap: 10 }, splashContent: { alignItems: "center", flex: 1, gap: 18, justifyContent: "center", padding: spacing.xl }, splashWordmark: { color: authPalette.goldSoft, fontSize: 25, fontWeight: "900", letterSpacing: -0.6 }
});

export { AuthScreen } from './AuthScreen';
