/**
 * SMS sender abstraction — DORMANT in MVP0, kept as the Algeria plug-in point.
 *
 * MVP0 authenticates with email + password (free, no per-message cost), so no
 * SMS provider is wired up. When phone/OTP ships as an alternative method
 * (`lib/auth/phone.ts` stubs mark the exact seam), delivery follows this path:
 *
 * Supabase Auth sends OTP SMS through Twilio out of the box. Twilio delivery
 * to Algerian carriers (Djezzy / Mobilis / Ooredoo) is unreliable and
 * expensive, so production will almost certainly use a local SMS aggregator.
 *
 * Swap path (no app-code changes):
 *  1. In Supabase Dashboard → Auth → Hooks, enable the "Custom SMS sender"
 *     hook pointing at `supabase/functions/send-sms`.
 *  2. The edge function imports this same `SmsProvider` interface + the
 *     `AlgerianSmsProvider` below (edge-compatible `fetch`, no native deps).
 *  3. Set `EXPO_PUBLIC_SMS_PROVIDER=algerian` and the aggregator credentials.
 *
 * The app itself never sends SMS directly — it only calls Supabase Auth, which
 * triggers the configured sender server-side. This module exists so the
 * provider contract is defined once and shared by the edge function.
 */
import { config } from './config';
import { createLogger } from './logger';
import { err, ok, toAppError, type ApiResult } from './result';

const log = createLogger('sms');

export interface SmsSendParams {
  toE164: string;
  /** Raw OTP code. Never log this — pass it only to the provider API. */
  code: string;
  template?: string;
}

export interface SmsProvider {
  readonly name: string;
  sendOtp(params: SmsSendParams): Promise<ApiResult<void>>;
}

/** Default Supabase path — Twilio is configured in the Supabase dashboard. */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';

  async sendOtp(_params: SmsSendParams): Promise<ApiResult<void>> {
    // Delivery happens inside Supabase Auth; there is nothing to call here.
    // Kept as an explicit step so onboarding checklists stay honest.
    log.info('OTP delivery delegated to Supabase Auth (Twilio sender).');
    return ok(undefined);
  }
}

/**
 * Local Algerian aggregator (e.g. a Djezzy/Mobilis/Ooredoo SMS gateway or a
 * reseller API). Uses plain `fetch` so it runs in Edge Functions unchanged.
 *
 * Expected aggregator contract (adjust field names to the chosen vendor):
 *   POST {baseUrl}/send  { api_key, to, text, from }
 */
export class AlgerianSmsProvider implements SmsProvider {
  readonly name = 'algerian';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(
    baseUrl: string = process.env.ALGERIAN_SMS_API_URL ?? '',
    apiKey: string = process.env.ALGERIAN_SMS_API_KEY ?? '',
    senderId: string = process.env.ALGERIAN_SMS_SENDER_ID ?? 'DZCONNECT',
  ) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.senderId = senderId;
  }

  async sendOtp(params: SmsSendParams): Promise<ApiResult<void>> {
    if (this.baseUrl === '' || this.apiKey === '') {
      return err(
        'sms/not-configured',
        'Algerian SMS provider is selected but ALGERIAN_SMS_API_URL / ALGERIAN_SMS_API_KEY are missing.',
      );
    }
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: params.toE164,
          from: this.senderId,
          text: params.template ?? `DZ Connect: your code is ${params.code}. Never share it.`,
        }),
      });
      if (!response.ok) {
        return err('sms/provider-error', 'SMS provider rejected the request. Try again shortly.', {
          status: response.status,
        });
      }
      log.info('OTP handed to Algerian SMS provider.', { to: params.toE164 });
      return ok(undefined);
    } catch (error) {
      return err('sms/network', 'Could not reach the SMS provider.', toAppError(error).details);
    }
  }
}

/** Dev/no-SMS mode — logs that a code *would* be sent. Never use in prod. */
export class DisabledSmsProvider implements SmsProvider {
  readonly name = 'disabled';

  async sendOtp(params: SmsSendParams): Promise<ApiResult<void>> {
    log.warn('SMS sending is DISABLED — code not delivered.', { to: params.toE164 });
    return ok(undefined);
  }
}

/** Factory driven by `EXPO_PUBLIC_SMS_PROVIDER`. */
export function createSmsProvider(): SmsProvider {
  switch (config.smsProvider) {
    case 'twilio':
      return new TwilioSmsProvider();
    case 'algerian':
      return new AlgerianSmsProvider();
    case 'disabled':
      return new DisabledSmsProvider();
  }
}
