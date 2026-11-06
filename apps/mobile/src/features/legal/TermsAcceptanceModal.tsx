import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { mobilePalette as palette } from "../../ui/mobile-palette";
import { MobileButton, MobileSheet } from "../../ui/MobilePresentation";

type TermsAcceptanceModalProps = {
  mode?: "acceptance" | "viewer";
  onAccept: () => void;
  onDecline: () => void;
  visible: boolean;
};

export const termsVersion = "2026-08-18";
const legalBaseUrl = (process.env.EXPO_PUBLIC_APP_URL?.trim() || "https://nobogeyofficial.com").replace(/\/$/, "");

export function TermsAcceptanceModal({ mode = "acceptance", onAccept, onDecline, visible }: TermsAcceptanceModalProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);

  useEffect(() => {
    if (visible) {
      setHasReadTerms(false);
      setHasReachedEnd(false);
    }
  }, [visible]);

  return (
    <MobileSheet title="Terms & Conditions" visible={visible} onClose={onDecline}
      onLayout={({ nativeEvent }) => {
        viewportHeight.current = nativeEvent.layout.height;
        if (contentHeight.current > 0 && contentHeight.current <= viewportHeight.current) setHasReachedEnd(true);
      }}
      onContentSizeChange={(_, height) => {
        contentHeight.current = height;
        if (viewportHeight.current > 0 && height <= viewportHeight.current) setHasReachedEnd(true);
      }}
      onScroll={({ nativeEvent }) => {
        const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
        if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 16) setHasReachedEnd(true);
      }}>
          <Text selectable style={styles.subtitle}>Effective August 18, 2026</Text>
            <Text selectable style={styles.intro}>These Terms apply to every NoBogey user, including golfers and caddies. By creating an account or using the App, you agree to them.</Text>
            <TermSection title="1. Accounts and eligibility">You must be at least 18 to create an account, or use the App under a parent or guardian’s supervision. Keep your details accurate and credentials secure. Caddies must complete their affiliated course’s onboarding and verification before accepting assignments.</TermSection>
            <TermSection title="2. Bookings, matching, and payments">Tee times are subject to each course’s availability and policies. Caddie matching is a convenience feature and does not guarantee availability, compatibility, or performance. Cancellations within 12 hours may incur the fee shown in the booking confirmation. Payments may use GCash or another authorized provider and are subject to that provider’s terms; refunds follow the applicable cancellation policy.</TermSection>
            <TermSection title="3. Respectful use">Do not provide false information, break the law, harass or discriminate against others, bypass NoBogey systems, or interfere with the App’s security. NoBogey may suspend or end access for violations, harmful conduct, fraud, or course-reported misconduct.</TermSection>
            <TermSection title="4. Risk and responsibility">Golf involves risks, including injury, property damage, and outdoor conditions, which you accept when using the App. NoBogey is a technology platform: it does not operate golf courses or employ caddies, and is not responsible for course conditions or a golfer’s or caddie’s conduct. To the extent allowed by law, NoBogey’s liability is limited to the lower of the net platform fees for the affected booking or fees paid in the previous three months.</TermSection>
            <TermSection title="5. Privacy and intellectual property">We process personal data under the Philippine Data Privacy Act of 2012 and the NoBogey Privacy Policy. NoBogey’s content, trademarks, logos, and software belong to NoBogey or its licensors and may not be copied, modified, distributed, or reverse-engineered without written consent.</TermSection>
            <TermSection title="6. Changes, law, and contact">We may update these Terms and will communicate material changes through the App; continued use means you accept the update. Philippine law applies, and unresolved disputes may be submitted to the appropriate courts of Metro Manila. For questions or account-deletion requests, contact nobogeyofficial@gmail.com.</TermSection>
          <View style={styles.disclosureLinks}>
            <Text selectable style={styles.disclosureLabel}>Read the full policies</Text>
            <View style={styles.linkRow}>
              <LegalLink label="Terms & Conditions" url={`${legalBaseUrl}/terms/`} />
              <LegalLink label="Privacy Policy" url={`${legalBaseUrl}/privacy/`} />
            </View>
          </View>
          {mode === "acceptance" ? <>
            {!hasReachedEnd ? <Text accessibilityLiveRegion="polite" selectable style={styles.readHint}>Scroll to the end to enable acknowledgement.</Text> : null}
            <Pressable accessibilityLabel="I have read and agree to the Terms and Conditions" accessibilityRole="checkbox" accessibilityState={{ checked: hasReadTerms, disabled: !hasReachedEnd }} disabled={!hasReachedEnd} onPress={() => setHasReadTerms((current) => !current)} style={[styles.checkboxRow, !hasReachedEnd && styles.checkboxDisabled]}>
              <View style={[styles.checkbox, hasReadTerms && styles.checkboxChecked]}>{hasReadTerms ? <Text selectable={false} style={styles.checkmark}>✓</Text> : null}</View>
              <Text selectable style={styles.checkboxText}>I have read and agree to the Terms & Conditions and Privacy Policy.</Text>
            </Pressable>
            <View style={styles.actions}>
              <View style={styles.action}><MobileButton accessibilityLabel="Decline terms and conditions" onPress={onDecline} variant="secondary">Decline</MobileButton></View>
              <View style={styles.action}><MobileButton accessibilityLabel="Accept terms and conditions" disabled={!hasReadTerms} onPress={onAccept}>Accept & Continue</MobileButton></View>
            </View>
          </> : <MobileButton accessibilityLabel="Close terms and conditions" onPress={onDecline}>Close</MobileButton>}
    </MobileSheet>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return <Pressable accessibilityHint="Opens in your browser" accessibilityLabel={`Open full ${label}`} accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={({ pressed }) => [styles.legalLink, pressed && styles.legalLinkPressed]}><Text selectable style={styles.legalLinkText}>{label}</Text></Pressable>;
}

function TermSection({ children, title }: { children: string; title: string }) {
  return <View style={styles.termSection}><Text selectable style={styles.termTitle}>{title}</Text><Text selectable style={styles.termBody}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  action: { flex: 1, minWidth: 120 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  checkbox: { alignItems: "center", borderColor: palette.line, borderRadius: 7, borderWidth: 1, height: 24, justifyContent: "center", width: 24 },
  checkboxChecked: { backgroundColor: palette.forest, borderColor: palette.forest }, checkboxDisabled: { opacity: 0.45 },
  checkboxRow: { alignItems: "flex-start", flexDirection: "row", gap: 12, paddingVertical: 12, minHeight: 48 },
  checkboxText: { color: palette.forest, flex: 1, fontFamily: "Inter", fontSize: 13, lineHeight: 22 }, checkmark: { color: palette.white, fontFamily: "Inter", fontSize: 15 },
  disclosureLabel: { color: palette.muted, fontFamily: "Inter", fontSize: 11, lineHeight: 18 },
  disclosureLinks: { borderTopColor: palette.line, borderTopWidth: 1, gap: 8, paddingTop: 20 },
  intro: { color: palette.muted, fontFamily: "Inter", fontSize: 14, lineHeight: 24 },
  legalLink: { minHeight: 44, justifyContent: "center", paddingVertical: 8 }, legalLinkPressed: { opacity: 0.65 },
  legalLinkText: { color: palette.forest, fontFamily: "Inter", fontSize: 12, fontWeight: "600", lineHeight: 20, textDecorationLine: "underline" },
  linkRow: { columnGap: 24, flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  readHint: { color: palette.muted, fontFamily: "Inter", fontSize: 12, lineHeight: 20 },
  subtitle: { color: palette.muted, fontFamily: "Inter", fontSize: 12, lineHeight: 20 },
  termBody: { color: palette.muted, fontFamily: "Inter", fontSize: 13, lineHeight: 23 },
  termSection: { gap: 10 },
  termTitle: { color: palette.forest, fontFamily: "Inter", fontSize: 16, fontWeight: "600", letterSpacing: -0.3, lineHeight: 24 }
});
