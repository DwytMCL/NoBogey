import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeUserError, isValidEmailAddress } from '@nobogey/utils';

import { establishSessionFromMobileAuthCallback, parseMobileAuthCallback } from '../../../backend/auth/auth-callback';
import { requestPasswordReset, updatePassword } from '../../../backend/auth/auth.service';
import { completeMobileCaptcha } from '../../../backend/auth/captcha';
import { getPasswordPolicyError, PASSWORD_REQUIREMENTS } from '../../../backend/auth/password-policy';
import { MobileButton, MobilePageIntro } from '../../ui/MobilePresentation';
import { mobilePalette } from '../../ui/mobile-palette';
import type { AppRole } from '../session/AppSession';

export function PasswordResetScreen() {
  const params = useLocalSearchParams<{ email?: string; role?: AppRole }>();
  const callbackUrl = Linking.useURL();
  const pathname = usePathname();
  const handledCallback = useRef<string | undefined>(undefined);
  const role: AppRole = params.role === 'caddie' ? 'caddie' : 'golfer';
  const [email, setEmail] = useState(params.email ?? '');
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [completed, setCompleted] = useState(false);
  const parsedCallback = callbackUrl ? parseMobileAuthCallback(callbackUrl) : null;
  const isRecoveryCallback = parsedCallback?.kind === 'recovery' || pathname === '/mobile-auth/recovery';

  useEffect(() => {
    if (!callbackUrl || parsedCallback?.kind !== 'recovery' || handledCallback.current === callbackUrl) return;
    handledCallback.current = callbackUrl;
    setSubmitting(true);
    setMessage('Verifying your secure reset link…');
    void establishSessionFromMobileAuthCallback(callbackUrl, 'recovery')
      .then(() => {
        setRecoveryReady(true);
        setMessage(undefined);
      })
      .catch((error: unknown) => setMessage(describeUserError(error, 'This reset link is invalid or has expired.')))
      .finally(() => setSubmitting(false));
  }, [callbackUrl, parsedCallback?.kind]);

  const requestReset = async () => {
    if (!isValidEmailAddress(email)) {
      setMessage('Enter a valid email address linked to your account.');
      return;
    }
    setSubmitting(true);
    setMessage('Complete the security check in your browser, then return to NoBogey.');
    try {
      const captchaToken = await completeMobileCaptcha();
      await requestPasswordReset(email, captchaToken);
      setMessage('If an account matches that address, a secure reset link is on its way.');
    } catch (error) {
      setMessage(describeUserError(error, 'The reset email could not be sent. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const savePassword = async () => {
    const passwordError = getPasswordPolicyError(newPassword);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    setMessage(undefined);
    try {
      await updatePassword(newPassword);
      setCompleted(true);
      setMessage('Your password has been updated. Sign in with your new password.');
    } catch (error) {
      setMessage(describeUserError(error, 'Your password could not be updated. Request a new reset link and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const recoveryForm = recoveryReady && !completed
    ? <View style={styles.form}><Field autoCapitalize="none" label="New password" onChangeText={setNewPassword} secureTextEntry value={newPassword} /><Field autoCapitalize="none" label="Confirm new password" onChangeText={setConfirmPassword} secureTextEntry value={confirmPassword} /><Text style={styles.hint}>{PASSWORD_REQUIREMENTS}</Text>{message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<MobileButton disabled={submitting || !newPassword || !confirmPassword} loading={submitting} onPress={() => void savePassword()}>{submitting ? 'Updating…' : 'Update password'}</MobileButton></View>
    : null;
  const requestForm = !isRecoveryCallback
    ? <View style={styles.form}><Field autoCapitalize="none" keyboardType="email-address" label="Email address" onChangeText={setEmail} value={email} />{message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<MobileButton disabled={submitting || !email} loading={submitting} onPress={() => void requestReset()}>{submitting ? 'Sending…' : 'Send reset link'}</MobileButton></View>
    : null;

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}><ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><MobilePageIntro eyebrow="Account security" title={isRecoveryCallback ? 'Choose a new password' : 'Reset your password'} description={isRecoveryCallback ? 'Secure your NoBogey account with a new password.' : `Enter the email linked to your ${role} account. We’ll send you a secure reset link.`} />{requestForm}{recoveryForm}{isRecoveryCallback && !recoveryReady && message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}{completed && message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<Pressable accessibilityLabel="Back to login" accessibilityRole="link" onPress={() => router.replace({ pathname: '/sign-in', params: { role } })} style={styles.backLink}><Text style={styles.backText}>{completed ? 'Sign in now' : 'Back to login'}</Text></Pressable></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field({ label, secureTextEntry, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const [visible, setVisible] = useState(false);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}><TextInput accessibilityLabel={label} autoCorrect={false} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor={mobilePalette.muted} style={styles.input} {...props} secureTextEntry={secureTextEntry && !visible} />{secureTextEntry ? <Pressable accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} accessibilityRole="button" accessibilityState={{ checked: visible }} onPress={() => setVisible((value) => !value)} style={styles.visibilityButton}><Feather color={mobilePalette.forest} name={visible ? 'eye-off' : 'eye'} size={20} /></Pressable> : null}</View></View>;
}

const styles = StyleSheet.create({
  backLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }, backText: { color: mobilePalette.forest, fontFamily: 'Inter', fontSize: 13, fontWeight: '600', lineHeight: 20 }, field: { gap: 8 }, form: { gap: 18 }, hint: { color: mobilePalette.muted, fontFamily: 'Inter', fontSize: 12, lineHeight: 19 }, inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: mobilePalette.white, borderColor: mobilePalette.line, borderRadius: 14, borderWidth: 1 }, visibilityButton: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minWidth: 52 }, input: { flex: 1, backgroundColor: 'transparent', borderRadius: 14, color: mobilePalette.ink, fontFamily: 'Inter', fontSize: 15, minHeight: 56, paddingHorizontal: 16 }, label: { color: mobilePalette.forest, fontFamily: 'Inter', fontSize: 12, fontWeight: '600', lineHeight: 19 }, message: { backgroundColor: mobilePalette.goldSoft, borderRadius: 14, color: mobilePalette.forest, fontFamily: 'Inter', fontSize: 13, lineHeight: 21, padding: 16 }, page: { alignSelf: 'center', flexGrow: 1, gap: 28, justifyContent: 'center', maxWidth: 560, padding: 24, width: '100%' }, safe: { backgroundColor: mobilePalette.white, flex: 1 },
});
