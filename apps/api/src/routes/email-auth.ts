import {
  AuthenticationError,
  completeEmailAuthentication,
  requestEmailSignin,
  requestEmailSignup,
} from '@openhall/application';
import {
  EmailAuthAcceptedSchema,
  EmailAuthCompleteResponseSchema,
  EmailSigninRequestSchema,
  EmailSignupRequestSchema,
  ProblemDetailsSchema,
} from '@openhall/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { setSessionCookie } from '../auth/cookies.js';
import type { AuthDependencies } from '../auth/dependencies.js';
import { problemFor, statusFor } from '../auth/problems.js';

function emailToken(header: string | undefined): string | undefined {
  const prefix = 'EmailLink ';
  if (typeof header !== 'string' || !header.startsWith(prefix)) return undefined;
  const value = header.slice(prefix.length).trim();
  return value.length > 0 && value.length <= 256 ? value : undefined;
}

async function sendProblem(
  reply: FastifyReply,
  request: FastifyRequest,
  error: AuthenticationError,
): Promise<void> {
  await reply
    .status(statusFor(error.code))
    .type('application/problem+json')
    .send(problemFor(error, request));
}

function sameOrigin(request: FastifyRequest, expected: string): boolean {
  const origin = request.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) return origin === expected;
  const referer = request.headers.referer;
  if (typeof referer !== 'string' || referer.length === 0) return false;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

export function registerEmailAuthRoutes(
  app: FastifyInstance,
  dependencies: AuthDependencies,
): void {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();
  const emailDependencies = {
    transactions: dependencies.emailTransactions,
    sender: dependencies.magicLinkSender,
    random: dependencies.random,
    digester: dependencies.digester,
    clock: dependencies.clock,
    runner: dependencies.systemRunner,
    appOrigin: dependencies.origin,
  };

  typedApp.post(
    '/api/v1/auth/email/signup',
    {
      schema: {
        operationId: 'requestEmailSignup',
        tags: ['authentication'],
        body: EmailSignupRequestSchema,
        response: {
          202: EmailAuthAcceptedSchema,
          400: ProblemDetailsSchema,
          403: ProblemDetailsSchema,
          409: ProblemDetailsSchema,
          429: ProblemDetailsSchema,
          502: ProblemDetailsSchema,
        },
      },
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    },
    async (request, reply) => {
      if (!sameOrigin(request, dependencies.origin)) {
        await sendProblem(reply, request, new AuthenticationError('invalid_request_origin'));
        return;
      }
      try {
        await requestEmailSignup({ ...request.body, requestId: request.id }, emailDependencies);
        return await reply.status(202).send({ accepted: true as const });
      } catch (error) {
        if (error instanceof AuthenticationError) {
          await sendProblem(reply, request, error);
          return;
        }
        throw error;
      }
    },
  );

  typedApp.post(
    '/api/v1/auth/email/signin',
    {
      schema: {
        operationId: 'requestEmailSignin',
        tags: ['authentication'],
        body: EmailSigninRequestSchema,
        response: {
          202: EmailAuthAcceptedSchema,
          400: ProblemDetailsSchema,
          403: ProblemDetailsSchema,
          429: ProblemDetailsSchema,
          502: ProblemDetailsSchema,
        },
      },
      config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      if (!sameOrigin(request, dependencies.origin)) {
        await sendProblem(reply, request, new AuthenticationError('invalid_request_origin'));
        return;
      }
      try {
        await requestEmailSignin(
          { email: request.body.email, requestId: request.id },
          emailDependencies,
        );
        return await reply.status(202).send({ accepted: true as const });
      } catch (error) {
        if (error instanceof AuthenticationError) {
          await sendProblem(reply, request, error);
          return;
        }
        throw error;
      }
    },
  );

  typedApp.post(
    '/api/v1/auth/email/complete',
    {
      schema: {
        operationId: 'completeEmailAuthentication',
        tags: ['authentication'],
        response: {
          200: EmailAuthCompleteResponseSchema,
          401: ProblemDetailsSchema,
          409: ProblemDetailsSchema,
          429: ProblemDetailsSchema,
        },
      },
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    },
    async (request, reply) => {
      const raw = emailToken(request.headers.authorization);
      if (raw === undefined) {
        await sendProblem(reply, request, new AuthenticationError('email_auth_token_invalid'));
        return;
      }
      try {
        const completed = await completeEmailAuthentication(raw, request.id, emailDependencies);
        const maxAge = Math.max(
          60,
          Math.floor(
            (completed.installation.session.absoluteExpiresAt.epochMilliseconds -
              dependencies.clock.now().epochMilliseconds) /
              1000,
          ),
        );
        setSessionCookie(reply, dependencies.isProduction, completed.sessionToken, maxAge);
        return await reply.send({
          authenticated: true as const,
          authenticationMethod: 'email' as const,
          absoluteExpiresAt: completed.installation.session.absoluteExpiresAt.toString(),
        });
      } catch (error) {
        if (error instanceof AuthenticationError) {
          await sendProblem(reply, request, error);
          return;
        }
        throw error;
      }
    },
  );
}
