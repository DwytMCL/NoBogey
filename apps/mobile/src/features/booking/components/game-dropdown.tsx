import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flowColors } from "./FindGameUI";

export type GameIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export type GameOption = { id: string; label: string; detail?: string; leading?: ReactNode };

export function GameDropdown({ label, placeholder, value, icon, leading, disabled, expanded, onToggle, options, selectedId, onSelect }: {
  label: string; placeholder: string; value?: string | undefined; icon: GameIcon; leading?: ReactNode;
  disabled?: boolean; expanded: boolean; onToggle: () => void; options: GameOption[];
  selectedId?: string | undefined; onSelect: (id: string) => void;
}) {
  const controlRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number }>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setAnchor(undefined);
    if (!expanded || disabled) return;
    let active = true;
    const frame = requestAnimationFrame(() => controlRef.current?.measureInWindow((x, y, width, height) => {
      if (active && width > 0) setAnchor({ x, y, width, height });
    }));
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [expanded, disabled, screenWidth, screenHeight]);

  const below = anchor ? Math.max(0, screenHeight - insets.bottom - anchor.y - anchor.height - 12) : 0;
  const above = anchor ? Math.max(0, anchor.y - insets.top - 12) : 0;
  const opensBelow = below >= 240 || below >= above;
  const menuHeight = Math.min(240, opensBelow ? below : above);
  const menuWidth = anchor ? Math.min(anchor.width, screenWidth - insets.left - insets.right - 16) : 0;

  return <View style={styles.field}>
    <Text style={[styles.label, disabled && styles.muted]}>{label}</Text>
    <View ref={controlRef} collapsable={false} style={[styles.control, disabled && styles.disabled, expanded && styles.open]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value || placeholder}`} accessibilityHint="Opens selection list" accessibilityState={{ disabled: Boolean(disabled), expanded }} disabled={disabled} onPress={onToggle} style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        {leading ?? <MaterialCommunityIcons color={flowColors.forest} name={icon} size={22} />}
        <Text style={[styles.value, !value && styles.muted]}>{value || placeholder}</Text>
        <MaterialCommunityIcons color={flowColors.muted} name={expanded ? "chevron-up" : "chevron-down"} size={20} />
      </Pressable>
    </View>
      {expanded && !disabled && anchor ? <Modal transparent animationType="fade" statusBarTranslucent visible onRequestClose={onToggle}>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Close ${label.toLowerCase()} options`} onPress={onToggle} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={[styles.menu, {
            width: menuWidth,
            left: Math.max(insets.left + 8, Math.min(anchor.x, screenWidth - insets.right - menuWidth - 8)),
            ...(opensBelow ? { top: anchor.y + anchor.height + 6 } : { bottom: screenHeight - anchor.y + 6 }),
          }]}>
          <ScrollView accessibilityRole="radiogroup" accessibilityLabel={label} nestedScrollEnabled style={[styles.options, { maxHeight: menuHeight }]} contentContainerStyle={styles.optionContent}>
        {options.map((option) => { const selected = selectedId === option.id; return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={`${option.label}${option.detail ? `, ${option.detail}` : ""}`} accessibilityState={{ selected }} onPress={() => onSelect(option.id)} style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
          {option.leading ?? <MaterialCommunityIcons color={selected ? flowColors.onGreen : flowColors.forest} name={icon} size={20} />}
          <View style={styles.copy}><Text style={[styles.value, selected && styles.selectedText]}>{option.label}</Text>{option.detail ? <Text style={[styles.detail, selected && styles.selectedDetail]}>{option.detail}</Text> : null}</View>
          {selected ? <MaterialCommunityIcons color={flowColors.onGreen} name="check-circle" size={19} /> : null}
        </Pressable>; })}
          </ScrollView>
          </View>
        </View>
      </Modal> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 9 },
  label: { color: flowColors.forest, fontSize: 13, fontWeight: "600", lineHeight: 20 },
  control: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: flowColors.border, borderRadius: 18, overflow: "hidden" },
  open: { borderColor: "#78968A", boxShadow: "0 3px 10px rgba(23,63,53,0.08)" },
  trigger: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 16, paddingVertical: 14 },
  value: { color: flowColors.ink, fontSize: 14, fontWeight: "600", flexShrink: 1, flexGrow: 1, lineHeight: 20 },
  muted: { color: flowColors.muted, fontWeight: "400" },
  disabled: { opacity: 0.4, backgroundColor: "#EFEEE9" },
  overlay: { flex: 1 },
  menu: { position: "absolute", backgroundColor: "#FFFFFF", borderColor: flowColors.border, borderWidth: 1, borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 28px rgba(23,63,53,0.16)" },
  options: { flexGrow: 0 },
  optionContent: { padding: 6 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 12, minHeight: 50, borderRadius: 12 },
  selected: { backgroundColor: flowColors.sage },
  selectedText: { color: flowColors.onGreen },
  selectedDetail: { color: flowColors.onGreenMuted },
  copy: { flex: 1, gap: 2 },
  detail: { color: flowColors.muted, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.7 }
});
