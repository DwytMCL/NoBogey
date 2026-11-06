import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { spacing } from "@nobogey/ui";
import { mobilePalette as palette } from "../../ui/mobile-palette";
import { useCaddieContact } from "./CaddieContactProvider";

export function CaddieContactSettings() {
  const { contact, updateContact } = useCaddieContact();
  return <View style={styles.content}>
    <Text style={styles.copy}>These details stay on this device until caddie contact settings are connected to your account.</Text>
    <View style={styles.section}><Text style={styles.sectionTitle}>Contact details</Text><View style={styles.card}><ContactField keyboardType="phone-pad" label="Phone number" onChangeText={(phoneNumber) => updateContact({ phoneNumber })} value={contact.phoneNumber} /><ContactField autoCapitalize="none" keyboardType="email-address" label="Contact email address" onChangeText={(contactEmail) => updateContact({ contactEmail })} value={contact.contactEmail} /></View></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Share after booking acceptance</Text><View style={styles.card}><ShareRow label="Share phone number" onValueChange={(sharePhone) => updateContact({ sharePhone })} value={contact.sharePhone} /><ShareRow label="Share email address" onValueChange={(shareEmail) => updateContact({ shareEmail })} value={contact.shareEmail} /></View></View>
  </View>;
}

function ContactField({ autoCapitalize, keyboardType, label, onChangeText, value }: { autoCapitalize?: "none"; keyboardType: "email-address" | "phone-pad"; label: string; onChangeText: (value: string) => void; value: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} autoCapitalize={autoCapitalize} keyboardType={keyboardType} onChangeText={onChangeText} placeholder={label} placeholderTextColor={palette.muted} style={styles.input} value={value} /></View>;
}

function ShareRow({ label, onValueChange, value }: { label: string; onValueChange: (value: boolean) => void; value: boolean }) {
  return <View style={styles.shareRow}><Text style={styles.shareLabel}>{label}</Text><Switch accessibilityLabel={label} accessibilityRole="switch" onValueChange={onValueChange} thumbColor={palette.surface} ios_backgroundColor={palette.line} trackColor={{ false: palette.line, true: palette.forest }} value={value} /></View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  copy: { color: palette.muted, fontFamily: "Inter", fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: palette.surface, borderColor: palette.line, borderCurve: "continuous", borderRadius: 18, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  field: { gap: spacing.xs },
  input: { backgroundColor: palette.white, borderColor: palette.line, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, color: palette.ink, fontFamily: "Inter", fontSize: 15, minHeight: 54, paddingHorizontal: 16, paddingVertical: 14 },
  label: { color: palette.ink, fontFamily: "Inter", fontSize: 12, lineHeight: 20, fontWeight: "600" },
  shareLabel: { color: palette.forest, flex: 1, minWidth: 0, fontFamily: "Inter", fontSize: 13, lineHeight: 21, fontWeight: "500" },
  section: { gap: spacing.sm },
  sectionTitle: { color: palette.forest, fontFamily: "Inter", fontSize: 10, lineHeight: 17, fontWeight: "600", letterSpacing: 0.9, textTransform: "uppercase" },
  shareRow: { gap: 16, alignItems: "center", borderTopColor: palette.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 56, paddingTop: spacing.sm }
});
