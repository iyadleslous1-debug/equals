import { isAlreadyRegistered, signInNextStep } from '@/features/auth/authErrors';
import type { AppError } from '@/lib/result';

const err = (code: string, message: string): AppError => ({ code, message });

describe('signInNextStep', () => {
  it('routes unconfirmed emails to the confirm screen', () => {
    expect(signInNextStep(err('auth/email-not-confirmed', 'Confirmez votre email.'), 'a@b.co')).toEqual({
      kind: 'confirm',
      email: 'a@b.co',
    });
  });

  it('routes rate-limited attempts to the throttled state', () => {
    expect(signInNextStep(err('auth/rate-limited', 'Trop de tentatives.'))).toEqual({
      kind: 'throttled',
      message: 'Trop de tentatives.',
    });
  });

  it('falls back to the plain message otherwise', () => {
    expect(signInNextStep(err('auth/signin-failed', 'Email ou mot de passe incorrect.'))).toEqual({
      kind: 'message',
      message: 'Email ou mot de passe incorrect.',
    });
  });
});

describe('isAlreadyRegistered', () => {
  it('detects the already-registered signup error only', () => {
    expect(isAlreadyRegistered(err('auth/email-registered', 'Un compte existe déjà.'))).toBe(true);
    expect(isAlreadyRegistered(err('auth/signup-failed', 'Trop de tentatives.'))).toBe(false);
  });
});
