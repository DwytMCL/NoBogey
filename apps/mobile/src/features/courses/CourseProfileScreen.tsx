import { Stack, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatMoney } from "@nobogey/utils";
import { MobileButton } from "../../ui/MobilePresentation";
import { mobilePalette as palette } from "../../ui/mobile-palette";
import { localCaddiePlaceholder, localCoursePlaceholder } from "../../ui/local-image-placeholders";
import { ResponsiveContent } from "../../ui/ResponsiveContent";
import { useMobileData } from "../data/useMobileData";

export function CourseProfileScreen() {
  const { caddies, courses, isLoading } = useMobileData();
  const { width } = useWindowDimensions();
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const course = courses.find((item) => item.id === courseId);
  const header = <Stack.Screen options={{ headerStyle: { backgroundColor: palette.white }, headerTintColor: palette.forest }} />;
  if (!course) return <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>{header}<ScrollView contentContainerStyle={styles.content}><ResponsiveContent style={styles.frame}><View style={styles.emptyCard}>{isLoading ? <ActivityIndicator color={palette.forest} accessibilityLabel="Loading course" /> : null}<Text accessibilityRole="header" style={styles.sectionTitle}>{isLoading ? "Loading course…" : "Course unavailable"}</Text><Text style={styles.body}>{isLoading ? "Getting the details for your next round." : "We couldn't find the details for this course."}</Text><MobileButton onPress={() => router.replace("/golfer/courses/all")}>Browse courses</MobileButton></View></ResponsiveContent></ScrollView></SafeAreaView>;
  const available = caddies.filter((item) => item.homeCourseId === course.id);
  const location = [course.city, course.province].filter(Boolean).join(", ");
  const cardWidth = Math.max(200, Math.min(300, width - 64));
  return <SafeAreaView edges={["bottom", "left", "right"]} style={styles.safeArea}>{header}
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
      <ResponsiveContent style={styles.frame}>
        <View accessibilityLabel={`${course.name} course photo`} accessibilityRole="image" style={styles.hero}><Image resizeMode="cover" source={localCoursePlaceholder(course)} style={styles.heroPhoto} /></View>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{location || "ON THE COURSE"}</Text>
          <Text accessibilityRole="header" style={styles.title}>{course.name}</Text>
          <View style={styles.stats}><Stat label="PAR" value={String(course.par)} /><Stat label="YARDS" value={course.yardage.toLocaleString()} /><Stat label="HOLES" value={String(course.holes)} /><Stat label="AVAILABLE" value={`${available.length} ${available.length === 1 ? "caddie" : "caddies"}`} /></View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text accessibilityRole="header" style={styles.sectionTitle}>Available caddies</Text>{available.length ? <Pressable accessibilityRole="button" accessibilityLabel="See all available caddies" onPress={() => router.push({ pathname: "/golfer/caddies", params: { courseId: course.id } })} style={styles.seeAllButton}><Text style={styles.seeAll}>See all</Text></Pressable> : null}</View>
          {available.length ? <ScrollView horizontal contentContainerStyle={styles.horizontalList} showsHorizontalScrollIndicator={false}>{available.map((caddie) => <Pressable key={caddie.id} accessibilityRole="button" accessibilityLabel={`View ${caddie.displayName}'s profile`} onPress={() => router.push({ pathname: "/golfer/caddies/[caddieId]", params: { caddieId: caddie.id, courseId: course.id } })} style={({ pressed }) => [styles.caddieCard, { width: cardWidth }, pressed && styles.pressed]}>
            <Image accessibilityLabel={`${caddie.displayName} profile photo`} source={localCaddiePlaceholder(caddie)} style={styles.caddiePhoto} />
            <View style={styles.caddieCopy}><Text style={styles.caddieName}>{caddie.displayName}</Text><Text style={styles.body}>{caddie.yearsExperience} years experience · {caddie.ratingAverage.toFixed(1)} rating</Text><Text style={styles.rate}>{formatMoney(caddie.rate.amountInCentavos, caddie.rate.currency)}</Text></View>
          </Pressable>)}</ScrollView> : <View style={styles.emptyCard}><Text accessibilityRole="header" style={styles.emptyTitle}>No caddies available</Text><Text style={styles.body}>There are no caddies listed for this course yet. Please check again later.</Text></View>}
        </View>
        <View style={styles.locationCard}><Text style={styles.eyebrow}>LOCATION</Text><Text style={styles.sectionTitle}>{course.name}</Text>{location ? <Text style={styles.body}>{location}</Text> : null}<MobileButton disabled>Get directions</MobileButton></View>
      </ResponsiveContent>
    </ScrollView>
  </SafeAreaView>;
}

function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: palette.white, flex: 1 }, content: { padding: 24, paddingTop: 12, paddingBottom: 40 }, frame: { gap: 28 },
  hero: { aspectRatio: 1.4, maxHeight: 360, backgroundColor: palette.sage, borderRadius: 24, overflow: "hidden", width: "100%" }, heroPhoto: { width: "100%", height: "100%" },
  intro: { gap: 16 }, eyebrow: { color: palette.muted, fontFamily: "Inter", fontSize: 10, fontWeight: "600", letterSpacing: 1.6, lineHeight: 18, textTransform: "uppercase" },
  title: { color: palette.forest, fontFamily: "Inter", fontSize: 36, fontWeight: "500", letterSpacing: -1.4, lineHeight: 43 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, stat: { backgroundColor: palette.ivory, borderRadius: 16, flexBasis: "45%", flexGrow: 1, minWidth: 100, gap: 10, padding: 18 },
  statLabel: { color: palette.muted, fontFamily: "Inter", fontSize: 10, fontWeight: "600", letterSpacing: 1, lineHeight: 17 }, statValue: { color: palette.forest, fontFamily: "Inter", fontSize: 18, fontWeight: "500", lineHeight: 25 },
  section: { borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 24, gap: 18 }, sectionHeading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  sectionTitle: { color: palette.forest, flexShrink: 1, fontFamily: "Inter", fontSize: 23, fontWeight: "500", letterSpacing: -0.7, lineHeight: 30 },
  body: { color: palette.muted, fontFamily: "Inter", fontSize: 13, lineHeight: 22 }, emptyCard: { backgroundColor: palette.ivory, borderColor: palette.line, borderWidth: 1, borderRadius: 20, gap: 14, padding: 24 },
  emptyTitle: { color: palette.forest, fontFamily: "Inter", fontSize: 19, fontWeight: "500", lineHeight: 26, letterSpacing: -0.4 },
  horizontalList: { gap: 16 }, caddieCard: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 20, overflow: "hidden" }, caddiePhoto: { height: 180, width: "100%", resizeMode: "cover" }, caddieCopy: { gap: 10, padding: 18 },
  caddieName: { color: palette.forest, fontFamily: "Inter", fontSize: 20, fontWeight: "500", letterSpacing: -0.5, lineHeight: 27 }, rate: { color: palette.forest, fontFamily: "Inter", fontSize: 14, fontWeight: "600", lineHeight: 21 },
  locationCard: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 22, padding: 24, gap: 16 }, seeAllButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 4 }, seeAll: { color: palette.forest, fontFamily: "Inter", fontSize: 12, fontWeight: "600", lineHeight: 20 }, pressed: { opacity: 0.8 }
});
