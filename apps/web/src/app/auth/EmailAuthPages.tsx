import { useEffect, useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { AppFrame } from '../AppFrame';
import { queryClient } from '../query-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type RequestState = 'idle' | 'sending' | 'sent' | 'error';

async function postJson(path: string, body: unknown): Promise<boolean> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export function EmailSigninForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<RequestState>('idle');
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    const ok = await postJson('/api/v1/auth/email/signin', { email }).catch(() => false);
    setState(ok ? 'sent' : 'error');
  }
  if (state === 'sent') {
    return (
      <Alert>
        <AlertTitle>Check your email</AlertTitle>
        <AlertDescription>
          If that address belongs to a WayPass account, a one-time sign-in link is on its way.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="signin-email">Work email</Label>
        <Input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
      </div>
      {state === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t send the link</AlertTitle>
          <AlertDescription>Check the address and try again.</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' && <Spinner data-icon="inline-start" />}
        Email me a sign-in link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New school?{' '}
        <Link className="font-medium text-foreground underline" to="/signup">
          Create your school
        </Link>
      </p>
    </form>
  );
}

export function SignupPage() {
  const [state, setState] = useState<RequestState>('idle');
  const [form, setForm] = useState({
    email: '',
    schoolName: '',
    schoolTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago',
    adminGivenName: '',
    adminFamilyName: '',
  });
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    const ok = await postJson('/api/v1/auth/email/signup', form).catch(() => false);
    setState(ok ? 'sent' : 'error');
  }
  return (
    <AppFrame>
      <div className="mx-auto grid w-full max-w-lg gap-4 py-10">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold tracking-tight">Create your WayPass school</h1>
            <CardDescription>
              Verify your work email, then start configuring dismissal and student-release
              workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state === 'sent' ? (
              <Alert>
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  We sent a one-time link. Opening it creates the school and signs you in as its
                  first administrator.
                </AlertDescription>
              </Alert>
            ) : (
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  void submit(event);
                }}
              >
                <div className="grid gap-1.5">
                  <Label htmlFor="signup-school">School name</Label>
                  <Input
                    id="signup-school"
                    required
                    autoComplete="organization"
                    value={form.schoolName}
                    onChange={(event) => {
                      setForm({ ...form, schoolName: event.target.value });
                    }}
                  />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="signup-given">First name</Label>
                    <Input
                      id="signup-given"
                      required
                      autoComplete="given-name"
                      value={form.adminGivenName}
                      onChange={(event) => {
                        setForm({ ...form, adminGivenName: event.target.value });
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="signup-family">Last name</Label>
                    <Input
                      id="signup-family"
                      required
                      autoComplete="family-name"
                      value={form.adminFamilyName}
                      onChange={(event) => {
                        setForm({ ...form, adminFamilyName: event.target.value });
                      }}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="signup-email">Work email</Label>
                  <Input
                    id="signup-email"
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => {
                      setForm({ ...form, email: event.target.value });
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="signup-timezone">School time zone</Label>
                  <Input
                    id="signup-timezone"
                    required
                    value={form.schoolTimeZone}
                    onChange={(event) => {
                      setForm({ ...form, schoolTimeZone: event.target.value });
                    }}
                  />
                </div>
                {state === 'error' && (
                  <Alert variant="destructive">
                    <AlertTitle>Couldn&apos;t start signup</AlertTitle>
                    <AlertDescription>
                      Check the details or use a different school name, then try again.
                    </AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={state === 'sending'}>
                  {state === 'sending' && <Spinner data-icon="inline-start" />}
                  Verify email and create school
                </Button>
                <Button variant="link" nativeButton={false} render={<Link to="/login" />}>
                  Already registered? Sign in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}

export function EmailVerificationPage() {
  const [state, setState] = useState<'verifying' | 'invalid' | 'conflict'>('verifying');
  useEffect(() => {
    const token = window.location.hash.slice(1);
    history.replaceState(null, '', window.location.pathname);
    if (!token) {
      setState('invalid');
      return;
    }
    void fetch('/api/v1/auth/email/complete', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Authorization: `EmailLink ${token}` },
    })
      .then(async (response) => {
        if (response.ok) {
          queryClient.clear();
          window.location.assign('/');
          return;
        }
        const body = (await response.json().catch(() => null)) as { code?: string } | null;
        setState(body?.code === 'email_auth_conflict' ? 'conflict' : 'invalid');
      })
      .catch(() => {
        setState('invalid');
      });
  }, []);
  return (
    <AppFrame>
      <div className="mx-auto w-full max-w-md py-10">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold tracking-tight">
              {state === 'verifying'
                ? 'Verifying your email…'
                : state === 'conflict'
                  ? 'School or email already registered'
                  : 'This email link is unavailable'}
            </h1>
            <CardDescription>
              {state === 'verifying'
                ? 'WayPass is creating your secure session.'
                : state === 'conflict'
                  ? 'Sign in instead, or use a different school name.'
                  : 'The link may have expired or already been used.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {state === 'verifying' ? (
              <div className="flex items-center gap-2" role="status">
                <Spinner />
                <span className="text-sm">Please wait</span>
              </div>
            ) : (
              <Button nativeButton={false} render={<Link to="/login" />}>
                Return to sign in
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppFrame>
  );
}
