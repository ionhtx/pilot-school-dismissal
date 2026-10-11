import type { Clock } from '@openhall/domain';
import type { SystemTransactionRunner } from '../persistence.js';
import { AuthenticationError } from './errors.js';
import type {
  BootstrapInstallation,
  CredentialDigester,
  EmailAuthTransactionStore,
  MagicLinkSender,
  SecureRandomSource,
} from './ports.js';
import { assertValidTimeZone, deriveSlug, fromBase64Url, toBase64Url } from './validation.js';

export const EMAIL_AUTH_ISSUER = 'urn:waypass:magic-link';
export const EMAIL_LINK_TTL_SECONDS = 15 * 60;

export interface EmailSignupInput {
  readonly email: string;
  readonly schoolName: string;
  readonly schoolTimeZone: string;
  readonly adminGivenName: string;
  readonly adminFamilyName: string;
  readonly requestId: string;
}

export interface EmailSigninInput {
  readonly email: string;
  readonly requestId: string;
}

export interface EmailAuthDependencies {
  readonly transactions: EmailAuthTransactionStore;
  readonly sender: MagicLinkSender;
  readonly random: SecureRandomSource;
  readonly digester: CredentialDigester;
  readonly clock: Clock;
  readonly runner: SystemTransactionRunner;
  readonly appOrigin: string;
}

function requiredText(value: string, label: string, max = 200): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > max) {
    throw new AuthenticationError('invalid_signup_details', `Invalid ${label}`);
  }
  return normalized;
}

export function normalizeEmail(value: string): { normalized: string; display: string } {
  const display = value.trim();
  const normalized = display.toLowerCase();
  if (
    display.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(display) ||
    normalized.includes('..')
  ) {
    throw new AuthenticationError('invalid_signup_details', 'Invalid email address');
  }
  return { normalized, display };
}

function verificationUrl(origin: string, rawToken: string): string {
  const url = new URL('/email/verify', origin);
  url.hash = rawToken;
  return url.toString();
}

function token(dependencies: Pick<EmailAuthDependencies, 'random' | 'digester'>): {
  raw: string;
  digest: Uint8Array;
} {
  const bytes = dependencies.random.randomBytes(32);
  return { raw: toBase64Url(bytes), digest: dependencies.digester.digest(bytes) };
}

function uniqueTenantSlug(base: string, random: SecureRandomSource): string {
  const suffix = Array.from(random.randomBytes(4), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
  const prefix = base.slice(0, 54).replace(/-+$/u, '') || 'school';
  return `${prefix}-${suffix}`;
}

/** Creates a verified-email signup challenge without creating tenant data. */
export async function requestEmailSignup(
  input: EmailSignupInput,
  dependencies: EmailAuthDependencies,
): Promise<void> {
  const email = normalizeEmail(input.email);
  const schoolName = requiredText(input.schoolName, 'school name');
  const givenName = requiredText(input.adminGivenName, 'administrator given name');
  const familyName = requiredText(input.adminFamilyName, 'administrator family name');
  const schoolTimeZone = assertValidTimeZone(input.schoolTimeZone);
  const schoolSlug = deriveSlug(schoolName);
  if (schoolSlug === undefined) {
    throw new AuthenticationError('invalid_signup_details', 'Invalid school name');
  }
  const existing = await dependencies.transactions.findMagicLinkIdentity(email.normalized);
  const issued = token(dependencies);
  const expiresAt = dependencies.clock.now().add({ seconds: EMAIL_LINK_TTL_SECONDS });
  if (existing === undefined) {
    await dependencies.runner.run((context) =>
      dependencies.transactions.createSignup(context, {
        emailNormalized: email.normalized,
        emailDisplay: email.display,
        tenantName: schoolName,
        tenantSlug: uniqueTenantSlug(schoolSlug, dependencies.random),
        schoolName,
        schoolSlug,
        schoolTimeZone,
        adminGivenName: givenName,
        adminFamilyName: familyName,
        adminDisplayName: `${givenName} ${familyName}`,
        tokenDigest: issued.digest,
        expiresAt,
      }),
    );
  } else {
    await dependencies.runner.run((context) =>
      dependencies.transactions.createSignin(context, {
        emailNormalized: email.normalized,
        emailDisplay: email.display,
        tenantId: existing.tenantId,
        accountId: existing.accountId,
        tokenDigest: issued.digest,
        expiresAt,
      }),
    );
  }
  await dependencies.sender.send({
    to: email.display,
    verificationUrl: verificationUrl(dependencies.appOrigin, issued.raw),
    purpose: existing === undefined ? 'signup' : 'signin',
  });
}

/** Always returns normally for an unknown email to prevent account discovery. */
export async function requestEmailSignin(
  input: EmailSigninInput,
  dependencies: EmailAuthDependencies,
): Promise<void> {
  const email = normalizeEmail(input.email);
  const existing = await dependencies.transactions.findMagicLinkIdentity(email.normalized);
  if (existing === undefined) return;
  const issued = token(dependencies);
  await dependencies.runner.run((context) =>
    dependencies.transactions.createSignin(context, {
      emailNormalized: email.normalized,
      emailDisplay: email.display,
      tenantId: existing.tenantId,
      accountId: existing.accountId,
      tokenDigest: issued.digest,
      expiresAt: dependencies.clock.now().add({ seconds: EMAIL_LINK_TTL_SECONDS }),
    }),
  );
  await dependencies.sender.send({
    to: email.display,
    verificationUrl: verificationUrl(dependencies.appOrigin, issued.raw),
    purpose: 'signin',
  });
}

export async function completeEmailAuthentication(
  rawToken: string,
  requestId: string,
  dependencies: Pick<
    EmailAuthDependencies,
    'transactions' | 'random' | 'digester' | 'clock' | 'runner'
  >,
): Promise<{
  readonly installation: BootstrapInstallation;
  readonly sessionToken: string;
  readonly csrfToken: string;
}> {
  let tokenDigest: Uint8Array;
  try {
    tokenDigest = dependencies.digester.digest(fromBase64Url(rawToken));
  } catch {
    throw new AuthenticationError('email_auth_token_invalid');
  }
  const sessionBytes = dependencies.random.randomBytes(32);
  const csrfBytes = dependencies.digester.deriveCsrfToken(sessionBytes);
  const installation = await dependencies.runner.run((context) =>
    dependencies.transactions.complete(context, {
      tokenDigest,
      sessionTokenDigest: dependencies.digester.digestSessionToken(sessionBytes),
      csrfTokenDigest: dependencies.digester.digest(csrfBytes),
      now: dependencies.clock.now(),
      requestId,
    }),
  );
  return {
    installation,
    sessionToken: toBase64Url(sessionBytes),
    csrfToken: toBase64Url(csrfBytes),
  };
}
