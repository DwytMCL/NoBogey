/** Supabase Auth and application-role provisioning for the mobile app. */
import { getSupabaseClient } from '../client';
import { getBackendConfig } from '../shared/config';
import { isValidEmailAddress, normalizeEmailAddress } from '@nobogey/utils';
import type { AuthSession, SignInInput, SignUpInput, SignUpResult } from './auth.types';

type MobileRole = Extract<AuthSession['roles'][number], 'golfer' | 'caddie'>;

function requireValidEmailAddress(value: string): string {
  const email = normalizeEmailAddress(value);
  if (!isValidEmailAddress(email)) throw new Error('INVALID_EMAIL_ADDRESS');
  return email;
}

async function toAuthSession(userId: string, email: string, accessToken: string, expiresAt: number): Promise<AuthSession> {
  const { data, error } = await getSupabaseClient().from('user_roles').select('role').eq('user_id', userId);
  if (error) throw error;
  return {
    userId,
    email,
    accessToken,
    expiresAt,
    roles: (data ?? []).map(({ role }) => role) as AuthSession['roles'],
  };
}

async function completeSignupRole(role: MobileRole): Promise<void> {
  const { error } = await getSupabaseClient().rpc('complete_signup', { p_role: role });
  if (error) throw error;
}

/** Sign up a golfer or caddie. Will call Supabase Auth and create the related profile. */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const client = getSupabaseClient();
  const { appUrl } = getBackendConfig();
  const { data, error } = await client.auth.signUp({
    email: requireValidEmailAddress(input.email),
    password: input.password,
    options: {
      captchaToken: input.captchaToken,
      emailRedirectTo: `${appUrl.replace(/\/$/, '')}/mobile-auth/confirm`,
      data: { display_name: input.displayName.trim(), username: input.username?.trim() || undefined, intended_role: input.role, terms_version: '2026-08-14', privacy_version: '2026-08-14', legal_accepted_at: new Date().toISOString() },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Supabase did not return the created user');
  if (!data.session) return { userId: data.user.id, needsEmailConfirmation: true, session: null };
  await completeSignupRole(input.role);
  return {
    userId: data.user.id,
    needsEmailConfirmation: false,
    session: await toAuthSession(data.user.id, data.user.email ?? input.email, data.session.access_token, data.session.expires_at ?? 0),
  };
}

/** Sign in an existing account. Will call Supabase Auth password sign-in. */
export async function signIn(input: SignInInput): Promise<AuthSession> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: requireValidEmailAddress(input.email),
    password: input.password,
    options: { captchaToken: input.captchaToken },
  });
  if (error) throw error;
  let session = await toAuthSession(data.user.id, data.user.email ?? input.email, data.session.access_token, data.session.expires_at ?? 0);
  if (!session.roles.length && (data.user.user_metadata?.intended_role === 'golfer' || data.user.user_metadata?.intended_role === 'caddie')) {
    await completeSignupRole(data.user.user_metadata.intended_role);
    session = await toAuthSession(data.user.id, data.user.email ?? input.email, data.session.access_token, data.session.expires_at ?? 0);
  }
  return session;
}

/** Add a mobile identity to the current authenticated account and return its refreshed roles. */
export async function ensureCurrentUserRole(role: MobileRole): Promise<AuthSession> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('AUTH_REQUIRED');
  await completeSignupRole(role);
  return toAuthSession(
    data.session.user.id,
    data.session.user.email ?? '',
    data.session.access_token,
    data.session.expires_at ?? 0,
  );
}

/** Finish profile provisioning after an email-confirmation callback establishes a session. */
export async function completeConfirmedSignup(): Promise<MobileRole | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const role = data.user?.user_metadata?.intended_role;
  if (role !== 'golfer' && role !== 'caddie') return null;
  await completeSignupRole(role);
  return role;
}

/** Send the account recovery email through Supabase Auth. */
export async function requestPasswordReset(email: string, captchaToken: string): Promise<void> {
  const { appUrl } = getBackendConfig();
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(requireValidEmailAddress(email), {
    captchaToken,
    redirectTo: `${appUrl.replace(/\/$/, '')}/mobile-auth/recovery`,
  });
  if (error) throw error;
}

/** Replace the password for an authenticated recovery session. */
export async function updatePassword(password: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
  const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
  if (signOutError) throw signOutError;
}

/** Sign out the current account. Will invalidate the local Supabase Auth session. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
}

/** Read the current session. Will retrieve the active Supabase Auth session. */
export async function getSession(): Promise<AuthSession | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  return toAuthSession(data.session.user.id, data.session.user.email ?? '', data.session.access_token, data.session.expires_at ?? 0);
}
