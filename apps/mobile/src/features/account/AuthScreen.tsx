import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@nobogey/ui';
import { describeUserError, isValidEmailAddress } from '@nobogey/utils';

import { ensureCurrentUserRole, signIn, signUp } from '../../../backend/auth/auth.service';
import { completeMobileCaptcha } from '../../../backend/auth/captcha';
import { getPasswordPolicyError } from '../../../backend/auth/password-policy';
import { authPalette } from '../../ui/auth-palette';
import { Button } from '../../ui/primitives';
import { TermsAcceptanceModal } from '../legal/TermsAcceptanceModal';
import { useAppSession, type AppRole } from '../session/AppSession';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: Mode; role?: AppRole; returnTo?: string; caddieId?: string; courseId?: string; teeTimeId?: string; time?: string; date?: string; partySize?: string; confirmed?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'register' ? 'register' : 'login');
  const role: AppRole = params.role === 'caddie' ? 'caddie' : 'golfer';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>(params.confirmed === '1' ? 'Email confirmed. Log in to continue.' : undefined);
  const [submitting, setSubmitting] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const { selectInitialRole, signInAs } = useAppSession();

  const finish = () => {
    selectInitialRole(role);
    signInAs(role);
    if (role === 'caddie') return router.replace(params.returnTo === '/caddie/onboarding' ? '/caddie/onboarding' : '/caddie/dashboard');
    if (params.returnTo === '/golfer/bookings/new') return router.replace({ pathname: '/golfer/bookings/new', params });
    if (params.returnTo === '/golfer/find-game') return router.replace({ pathname: '/golfer/find-game', params });
    if (params.returnTo === '/golfer/caddies') return router.replace({ pathname: '/golfer/caddies', params });
    router.replace('/golfer/home');
  };

  const authenticate = async () => {
    setSubmitting(true);
    setMessage(undefined);
    try {
      setMessage('Complete the security check in your browser, then return to NoBogey.');
      const captchaToken = await completeMobileCaptcha();
      setMessage(undefined);
      if (mode === 'register') {
        const username = displayName.replace(/[^A-Za-z0-9_]/g, '').slice(0, 32);
        const result = await signUp({ email, password, displayName, role, captchaToken, ...(username.length >= 3 ? { username } : {}) });
        if (result.needsEmailConfirmation) {
          setMessage('Check your email to confirm your account, then return here and log in. If no email arrives, sign in instead or reset your password.');
          setMode('login');
          return;
        }
      } else {
        let session = await signIn({ email, password, captchaToken });
        if (!session.roles.includes(role) && session.roles.includes('super_admin')) {
          session = await ensureCurrentUserRole(role);
        }
        if (!session.roles.includes(role) && !session.roles.includes('super_admin')) throw new Error(`This account is not registered as a ${role}.`);
      }
      finish();
    } catch (error) {
      setMessage(describeUserError(error, mode === 'register' ? 'Your account could not be created. Please try again.' : 'You could not be signed in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    if (!isValidEmailAddress(email)) {
      setMessage('Enter a valid email address. You can use Gmail or any personal, work, school, or organization email.');
      return;
    }
    if (mode === 'login') {
      void authenticate();
      return;
    }
    const passwordError = getPasswordPolicyError(password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }
    setTermsVisible(true);
  };

  return <SafeAreaView edges={['top', 'bottom']} style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"><View style={styles.header}><Text style={styles.eyebrow}>N O B O G E Y  ·  {role.toUpperCase()}</Text><Text accessibilityRole="header" style={styles.title}>{mode === 'login' ? 'Welcome back.' : 'Join NoBogey.'}</Text><Text style={styles.subtitle}>{mode === 'login' ? `Log in to your ${role} account.` : `Create your ${role} account. Email confirmation is required.`}</Text></View><View style={styles.form}>{mode === 'register' ? <Field label="Full name" onChangeText={setDisplayName} value={displayName} /> : null}<Field autoCapitalize="none" keyboardType="email-address" label="Email address" onChangeText={setEmail} value={email} /><PasswordField onChangeText={setPassword} onToggleVisibility={() => setPasswordVisible((visible) => !visible)} value={password} visible={passwordVisible} />{mode === 'login' ? <Pressable accessibilityLabel="Forgot password" accessibilityRole="link" onPress={() => router.push({ pathname: '/reset-password', params: { email, role } })} style={styles.forgotPassword}><Text style={styles.forgotPasswordText}>Forgot password?</Text></Pressable> : null}{message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<Button palette={authPalette} disabled={submitting || !email || !password || (mode === 'register' && !displayName)} onPress={submit}>{submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</Button></View></ScrollView></KeyboardAvoidingView><TermsAcceptanceModal onAccept={() => { setTermsVisible(false); void authenticate(); }} onDecline={() => setTermsVisible(false)} visible={termsVisible} /></SafeAreaView>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor={colors.textMuted} style={styles.input} {...props} /></View>;
}

function PasswordField({ onToggleVisibility, visible, ...props }: { onToggleVisibility: () => void; visible: boolean } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>Password</Text><View style={styles.passwordInput}><TextInput accessibilityLabel="Password" autoCapitalize="none" autoCorrect={false} placeholder="Enter password" placeholderTextColor={colors.textMuted} secureTextEntry={!visible} style={styles.passwordTextInput} {...props} /><Pressable accessibilityLabel={visible ? 'Hide password' : 'Show password'} accessibilityRole="button" accessibilityState={{ checked: visible }} hitSlop={8} onPress={onToggleVisibility} style={styles.visibilityButton}><Feather color={authPalette.forest} name={visible ? 'eye-off' : 'eye'} size={20} /></Pressable></View></View>;
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs }, forgotPassword: { alignSelf: 'flex-end', marginTop: -spacing.sm }, forgotPasswordText: { color: authPalette.forest, fontFamily: 'Inter', fontSize: 12, fontWeight: '600', lineHeight: 20 }, form: { gap: spacing.lg }, header: { backgroundColor: authPalette.forest, borderRadius: 24, borderBottomColor: authPalette.gold, borderBottomWidth: 4, gap: spacing.sm, padding: spacing.xl, paddingVertical: spacing.xxl }, eyebrow: { color: authPalette.goldSoft, fontFamily: 'Inter', fontSize: 10, fontWeight: '600', letterSpacing: 1.6 }, input: { backgroundColor: authPalette.surface, borderColor: authPalette.line, borderRadius: 12, borderWidth: 1, color: colors.text, fontFamily: 'Inter', fontSize: 15, minHeight: 52, paddingHorizontal: 14 }, label: { color: authPalette.forest, fontFamily: 'Inter', fontSize: 12, fontWeight: '600' }, message: { color: authPalette.forest, fontFamily: 'Inter', fontSize: 13, lineHeight: 20 }, page: { flexGrow: 1, gap: spacing.xl, justifyContent: 'center', padding: spacing.xl, alignSelf: 'center', width: '100%', maxWidth: 560 }, passwordInput: { alignItems: 'center', backgroundColor: authPalette.surface, borderColor: authPalette.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', minHeight: 52 }, passwordTextInput: { color: colors.text, flex: 1, fontFamily: 'Inter', fontSize: 15, minHeight: 52, paddingHorizontal: 14 }, safe: { backgroundColor: authPalette.surface, flex: 1 }, subtitle: { color: authPalette.onGreenMuted, fontFamily: 'Inter', fontSize: 14, lineHeight: 22 }, title: { color: authPalette.surface, fontFamily: 'Inter', fontSize: 30, fontWeight: '700', letterSpacing: -0.9, lineHeight: 37 }, visibilityButton: { alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', minWidth: 52 },
});
