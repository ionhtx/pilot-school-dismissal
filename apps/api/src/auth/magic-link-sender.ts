import { AuthenticationError, type MagicLinkSender } from '@openhall/application';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class ResendMagicLinkSender implements MagicLinkSender {
  constructor(
    private readonly apiKey: string | null,
    private readonly fromEmail: string | null,
  ) {}

  async send(input: {
    readonly to: string;
    readonly verificationUrl: string;
    readonly purpose: 'signup' | 'signin';
  }): Promise<void> {
    if (this.apiKey === null || this.fromEmail === null) {
      throw new AuthenticationError('auth_provider_unavailable');
    }
    const action =
      input.purpose === 'signup' ? 'Create your Pilot-SD school' : 'Sign in to Pilot-SD';
    const safeUrl = escapeHtml(input.verificationUrl);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [input.to],
        subject: action,
        text: `${action}: ${input.verificationUrl}\n\nThis link expires in 15 minutes and can be used once.`,
        html: `<p>${escapeHtml(action)}</p><p><a href="${safeUrl}">Continue to Pilot-SD</a></p><p>This link expires in 15 minutes and can be used once.</p>`,
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (response?.ok !== true) {
      throw new AuthenticationError('auth_provider_unavailable');
    }
  }
}
