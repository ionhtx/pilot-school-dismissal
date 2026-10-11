import { Temporal } from '@js-temporal/polyfill';
import type { Clock } from '@openhall/domain';
import { describe, expect, it } from 'vitest';
import {
  completeEmailAuthentication,
  requestEmailSignin,
  requestEmailSignup,
  sessionExpiry,
  type BootstrapInstallation,
  type CredentialDigester,
  type EmailAuthTransactionStore,
  type MagicLinkSender,
  type SecureRandomSource,
} from '../src/authentication/index.js';
import type { SystemTransactionContext, SystemTransactionRunner } from '../src/persistence.js';

const NOW = Temporal.Instant.from('2026-10-11T12:00:00Z');

const clock: Clock = { now: () => NOW };
const random: SecureRandomSource = { randomBytes: (length) => new Uint8Array(length).fill(7) };
const digester: CredentialDigester = {
  digest: (value) => value,
  digestSessionToken: (value) => value,
  deriveCsrfToken: (value) => Uint8Array.from([99, ...value]),
  matches: (left, right) => Buffer.from(left).equals(Buffer.from(right)),
};
const runner: SystemTransactionRunner = {
  run: (operation) => operation({} as SystemTransactionContext),
};

function installation(): BootstrapInstallation {
  const expiry = sessionExpiry(NOW, 'email');
  return {
    tenant: { id: 'tenant-1', slug: 'oak-school', name: 'Oak School', status: 'active' },
    accountId: 'account-1',
    personId: 'person-1',
    session: {
      id: 'session-1',
      tenantId: 'tenant-1',
      accountId: 'account-1',
      identityProviderId: null,
      tokenDigest: new Uint8Array(32),
      csrfTokenDigest: new Uint8Array(32),
      accountSessionRevision: 0n,
      authenticationMethod: 'email',
      createdAt: NOW,
      authenticatedAt: NOW,
      lastSeenAt: NOW,
      idleExpiresAt: expiry.idleExpiresAt,
      absoluteExpiresAt: expiry.absoluteExpiresAt,
      revokedAt: null,
      revocationReason: null,
    },
  };
}

function harness(existing = false) {
  const signupInputs: unknown[] = [];
  const signinInputs: unknown[] = [];
  const sent: unknown[] = [];
  const completed: unknown[] = [];
  const transactions: EmailAuthTransactionStore = {
    findMagicLinkIdentity: () =>
      Promise.resolve(existing ? { tenantId: 'tenant-1', accountId: 'account-1' } : undefined),
    createSignup: (_context, input) => {
      signupInputs.push(input);
      return Promise.resolve({
        id: 'challenge-1',
        purpose: 'signup',
        emailNormalized: input.emailNormalized,
        tenantId: null,
        accountId: null,
        expiresAt: input.expiresAt,
        consumedAt: null,
        revokedAt: null,
      });
    },
    createSignin: (_context, input) => {
      signinInputs.push(input);
      return Promise.resolve({
        id: 'challenge-1',
        purpose: 'signin',
        emailNormalized: input.emailNormalized,
        tenantId: input.tenantId,
        accountId: input.accountId,
        expiresAt: input.expiresAt,
        consumedAt: null,
        revokedAt: null,
      });
    },
    complete: (_context, input) => {
      completed.push(input);
      return Promise.resolve(installation());
    },
  };
  const sender: MagicLinkSender = {
    send: (input) => {
      sent.push(input);
      return Promise.resolve();
    },
  };
  return { transactions, sender, signupInputs, signinInputs, sent, completed };
}

function dependencies(value: ReturnType<typeof harness>) {
  return {
    transactions: value.transactions,
    sender: value.sender,
    random,
    digester,
    clock,
    runner,
    appOrigin: 'https://pilot.example.edu',
  };
}

describe('email-first school authentication', () => {
  it('normalizes the owner email and sends a fragment-only signup link', async () => {
    const value = harness();
    await requestEmailSignup(
      {
        email: ' Admin@Example.EDU ',
        schoolName: 'Oak Ridge School',
        schoolTimeZone: 'America/Chicago',
        adminGivenName: 'Alex',
        adminFamilyName: 'Rivera',
        requestId: 'request-1',
      },
      dependencies(value),
    );
    expect(value.signupInputs).toHaveLength(1);
    expect(value.signupInputs[0]).toMatchObject({
      emailNormalized: 'admin@example.edu',
      tenantSlug: 'oak-ridge-school-07070707',
      schoolSlug: 'oak-ridge-school',
    });
    expect(value.sent).toHaveLength(1);
    const url = (value.sent[0] as { verificationUrl: string }).verificationUrl;
    expect(url).toMatch(/^https:\/\/pilot\.example\.edu\/email\/verify#/);
    expect(new URL(url).search).toBe('');
  });

  it('turns a duplicate signup request into a non-disclosing sign-in link', async () => {
    const value = harness(true);
    await requestEmailSignup(
      {
        email: 'admin@example.edu',
        schoolName: 'Ignored School',
        schoolTimeZone: 'America/Chicago',
        adminGivenName: 'Alex',
        adminFamilyName: 'Rivera',
        requestId: 'request-2',
      },
      dependencies(value),
    );
    expect(value.signupInputs).toHaveLength(0);
    expect(value.signinInputs).toHaveLength(1);
    expect(value.sent[0]).toMatchObject({ purpose: 'signin' });
  });

  it('does not reveal whether an unknown sign-in email exists', async () => {
    const value = harness(false);
    await requestEmailSignin(
      { email: 'unknown@example.edu', requestId: 'request-3' },
      dependencies(value),
    );
    expect(value.signinInputs).toHaveLength(0);
    expect(value.sent).toHaveLength(0);
  });

  it('completes a link with separated session and CSRF credentials', async () => {
    const value = harness();
    const raw = Buffer.alloc(32, 7).toString('base64url');
    const result = await completeEmailAuthentication(raw, 'request-4', dependencies(value));
    expect(value.completed).toHaveLength(1);
    const input = value.completed[0] as {
      tokenDigest: Uint8Array;
      sessionTokenDigest: Uint8Array;
      csrfTokenDigest: Uint8Array;
    };
    expect(input.tokenDigest).toEqual(new Uint8Array(32).fill(7));
    expect(input.sessionTokenDigest).toEqual(new Uint8Array(32).fill(7));
    expect(input.csrfTokenDigest[0]).toBe(99);
    expect(result.installation.session.authenticationMethod).toBe('email');
  });
});
