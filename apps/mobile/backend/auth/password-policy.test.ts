import { describe, expect, it } from 'vitest';

import { getPasswordPolicyError } from './password-policy';

describe('NoBogey password policy', () => {
  it('accepts a password with sufficient length and character variety', () => {
    expect(getPasswordPolicyError('NoBogey-safe#2026')).toBeNull();
  });

  it.each(['short#A1', 'alllowercase#2026', 'ALLUPPERCASE#2026', 'NoNumbersHere!', 'NoSymbolsHere2026'])(
    'rejects a weak password: %s',
    (password) => expect(getPasswordPolicyError(password)).not.toBeNull(),
  );

  it.each(['Contraseña2026', 'Golf Course 2026', 'Birdie2026₱₱'])(
    'rejects characters Supabase does not count as symbols: %s',
    (password) => expect(getPasswordPolicyError(password)).not.toBeNull(),
  );

  it.each(['Backslash\\2026', 'Quote"Mark2026', 'Tilde~Bogey2026'])(
    'accepts Supabase symbols: %s',
    (password) => expect(getPasswordPolicyError(password)).toBeNull(),
  );
});
