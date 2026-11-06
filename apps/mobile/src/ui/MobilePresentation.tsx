import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, type ScrollViewProps, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { mobilePalette as palette } from "./mobile-palette";
import { NoBogeyWordmark } from "./NoBogeyWordmark";

export function MobileButton({ children, onPress, disabled = false, loading = false, variant = "primary", accessibilityLabel }: PropsWithChildren<{
  onPress?: (() => void) | undefined;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
  accessibilityLabel?: string;
}>) {
  const primary = variant === "primary";
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress}
    style={({ pressed }) => [styles.button, !primary && styles.secondaryButton, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>
    {loading ? <ActivityIndicator color={primary ? palette.white : palette.forest} /> : null}
    <Text style={[styles.buttonText, !primary && styles.secondaryButtonText]}>{children}</Text>
  </Pressable>;
}

export function MobilePageIntro({ title, description, eyebrow, brand = true }: { title: string; description?: string; eyebrow?: string; brand?: boolean }) {
  return <View style={styles.intro}>
    {brand ? <View style={styles.brand}><NoBogeyWordmark centered={false} /></View> : null}
    {eyebrow ? <View style={styles.eyebrowRow}><View style={styles.eyebrowLine} /><Text style={styles.eyebrow}>{eyebrow}</Text></View> : null}
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
  </View>;
}

/** A bounded, keyboard-aware mobile sheet; its body can scroll independently of the footer. */
export function MobileSheet({ title, children, footer, onClose, visible, ...scrollProps }: PropsWithChildren<{
  title: string;
  footer?: ReactNode;
  onClose: () => void;
  visible: boolean;
}> & Pick<ScrollViewProps, "onScroll" | "onLayout" | "onContentSizeChange">) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose} presentationStyle="overFullScreen">
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: Math.max(0, height - insets.top - 12), width: Math.max(0, width - insets.left - insets.right), paddingBottom: Math.max(20, insets.bottom) }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={styles.close}><Feather name="x" color={palette.forest} size={21} /></Pressable></View>
        <ScrollView {...scrollProps} style={styles.scroll} contentContainerStyle={styles.sheetContent} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" scrollEventThrottle={16}>{children}</ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  button: { alignItems: "center", backgroundColor: palette.forest, borderColor: palette.forest, borderWidth: 1, borderRadius: 14, flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 54, paddingHorizontal: 20, paddingVertical: 15 },
  buttonText: { color: palette.white, flexShrink: 1, fontFamily: "Inter", fontSize: 14, fontWeight: "600", lineHeight: 21, textAlign: "center" },
  secondaryButton: { backgroundColor: palette.surface, borderColor: palette.line },
  secondaryButtonText: { color: palette.forest },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.8 },
  intro: { gap: 14 }, brand: { alignItems: "center", paddingBottom: 24, paddingTop: 4 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 10 }, eyebrowLine: { width: 24, height: 1, backgroundColor: palette.gold },
  eyebrow: { color: palette.forest, flex: 1, fontFamily: "Inter", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, lineHeight: 17, textTransform: "uppercase" },
  title: { color: palette.forest, fontFamily: "Inter", fontSize: 34, fontWeight: "500", letterSpacing: -1.3, lineHeight: 41 },
  description: { color: palette.muted, fontFamily: "Inter", fontSize: 14, lineHeight: 23 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16, 35, 29, 0.48)" },
  sheet: { alignSelf: "center", backgroundColor: palette.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, flexShrink: 1, maxWidth: 720, width: "100%", paddingTop: 10 },
  handle: { alignSelf: "center", backgroundColor: palette.line, borderRadius: 99, height: 4, width: 40 },
  sheetHeader: { alignItems: "center", flexDirection: "row", gap: 16, paddingHorizontal: 24, paddingVertical: 20 },
  sheetTitle: { color: palette.forest, flex: 1, fontFamily: "Inter", fontSize: 23, fontWeight: "600", letterSpacing: -0.7, lineHeight: 30 },
  close: { alignItems: "center", backgroundColor: palette.sage, borderRadius: 99, height: 44, justifyContent: "center", width: 44 },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 }, sheetContent: { gap: 22, paddingHorizontal: 24, paddingBottom: 24 },
  footer: { borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 16, paddingHorizontal: 24 }
});
