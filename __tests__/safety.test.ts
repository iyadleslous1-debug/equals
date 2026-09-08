import { REPORT_REASONS, mapSafetyError } from '@/features/safety/api';

describe('REPORT_REASONS', () => {
  it('offers only submittable reasons (DB requires 3+ chars, no self-reports)', () => {
    expect(REPORT_REASONS.length).toBeGreaterThanOrEqual(4);
    for (const reason of REPORT_REASONS) {
      expect(reason.trim().length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('mapSafetyError', () => {
  it('treats double-block as idempotent success', () => {
    expect(mapSafetyError({ code: '23505', message: 'duplicate' })).toEqual({
      code: 'safety/already-blocked',
      message: 'Déjà bloqué.',
    });
  });

  it('falls back to an actionable message', () => {
    expect(mapSafetyError({ code: 'XX000', message: 'boom' })).toEqual({
      code: 'safety/action-failed',
      message: 'Action impossible. Réessayez.',
    });
    expect(mapSafetyError(null)).toEqual({
      code: 'safety/action-failed',
      message: 'Action impossible. Réessayez.',
    });
  });
});
