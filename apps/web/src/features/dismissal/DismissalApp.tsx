import { useEffect, useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Building01Icon,
  DashboardSquare01Icon,
  InboxIcon,
  Key01Icon,
  Logout01Icon,
  Tick02Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import './dismissal.css';

type Role = 'guardian' | 'staff';
type PickupStatus = 'waiting' | 'ready' | 'released';

interface Student {
  id: string;
  name: string;
  grade: string;
  teacher: string;
  initials: string;
}

interface QueueEntry {
  id: string;
  studentId: string;
  guardianName: string;
  carTag: string;
  arrivedAt: string;
  status: PickupStatus;
  note: string;
}

interface CompletedEntry extends QueueEntry {
  completedAt: string;
}

interface DismissalState {
  queue: QueueEntry[];
  completed: CompletedEntry[];
}

const STORAGE_KEY = 'pilot-school-dismissal-v1';

const STUDENTS: [Student, ...Student[]] = [
  { id: 'mia', name: 'Mia Garcia', grade: '2nd', teacher: 'Mr. Martinez', initials: 'MG' },
  { id: 'lucas', name: 'Lucas Garcia', grade: 'K', teacher: 'Ms. Davis', initials: 'LG' },
];

const EMPTY_STATE: DismissalState = { queue: [], completed: [] };

function loadState(): DismissalState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return EMPTY_STATE;
    const parsed = JSON.parse(saved) as DismissalState;
    return {
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

function useDismissalState() {
  const [state, setState] = useState<DismissalState>(loadState);

  useEffect(() => {
    const sync = () => {
      setState(loadState());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('pilot-dismissal-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('pilot-dismissal-change', sync);
    };
  }, []);

  function save(next: DismissalState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    window.dispatchEvent(new Event('pilot-dismissal-change'));
  }

  return { state, save };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  return `${String(minutes)}m ago`;
}

function studentFor(id: string) {
  return STUDENTS.find((student) => student.id === id) ?? STUDENTS[0];
}

function AppHeader({ role, waiting }: { role: Role; waiting: number }) {
  return (
    <header className="dismissal-header">
      <div className="dismissal-brand">
        <span className="dismissal-brand__mark" aria-hidden="true">
          <HugeiconsIcon icon={Building01Icon} strokeWidth={2} />
        </span>
        <span>
          <strong>School Dismissal</strong>
          <small>Oakridge Campus</small>
        </span>
      </div>
      <nav className="portal-switcher" aria-label="Pilot portals">
        <Link className={role === 'guardian' ? 'is-active' : ''} to="/guardian">
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
          Guardian
        </Link>
        <Link className={role === 'staff' ? 'is-active' : ''} to="/staff">
          <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />
          Staff
          {waiting > 0 ? <span>{waiting}</span> : null}
        </Link>
      </nav>
      <div className="dismissal-window">
        <strong>Dismissal open</strong>
        <small>3:00–3:30 PM</small>
      </div>
    </header>
  );
}

function GuardianPortal({ state, save }: ReturnType<typeof useDismissalState>) {
  const queuedIds = new Set(state.queue.map((entry) => entry.studentId));
  const [selected, setSelected] = useState<string[]>(
    STUDENTS.filter((student) => !queuedIds.has(student.id)).map((student) => student.id),
  );
  const [note, setNote] = useState('');

  const allQueued = STUDENTS.every((student) => queuedIds.has(student.id));
  const available = STUDENTS.filter((student) => !queuedIds.has(student.id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function announceArrival(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const additions = selected
      .filter((studentId) => !queuedIds.has(studentId))
      .map((studentId) => ({
        id: crypto.randomUUID(),
        studentId,
        guardianName: 'Carlos Garcia',
        carTag: 'G-102',
        arrivedAt: now,
        status: 'waiting' as const,
        note: note.trim(),
      }));
    if (additions.length === 0) return;
    save({ ...state, queue: [...state.queue, ...additions] });
    setSelected([]);
    setNote('');
  }

  function updateNote() {
    const trimmed = note.trim();
    if (!trimmed) return;
    save({
      ...state,
      queue: state.queue.map((entry) =>
        entry.guardianName === 'Carlos Garcia' ? { ...entry, note: trimmed } : entry,
      ),
    });
    setNote('');
  }

  return (
    <main className="guardian-main">
      <div className="portal-status">
        <span className="status-dot" /> Guardian portal
        <Link to="/staff">
          <HugeiconsIcon icon={Key01Icon} strokeWidth={2} /> Staff console
        </Link>
      </div>

      <section className="identity-card">
        <Avatar className="guardian-avatar">
          <AvatarFallback>CG</AvatarFallback>
        </Avatar>
        <div>
          <p className="eyebrow">Authorized guardian</p>
          <h1>Carlos Garcia</h1>
          <p>Carline tag G-102 · (555) 234-5678</p>
        </div>
        <Button variant="ghost" size="sm">
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} /> Sign out
        </Button>
      </section>

      <form className="guardian-workspace" onSubmit={announceArrival}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your enrolled children</p>
            <h2>Select students for pickup</h2>
          </div>
          {available.length > 0 ? (
            <div className="text-actions">
              <button
                type="button"
                onClick={() => {
                  setSelected(available.map((item) => item.id));
                }}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected([]);
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        <div className="student-selection">
          {STUDENTS.map((student) => {
            const entry = state.queue.find((item) => item.studentId === student.id);
            const isSelected = selected.includes(student.id);
            return (
              <button
                type="button"
                key={student.id}
                className={`student-option ${isSelected ? 'is-selected' : ''} ${entry ? 'is-queued' : ''}`}
                onClick={() => {
                  if (!entry) toggle(student.id);
                }}
                disabled={Boolean(entry)}
                aria-pressed={isSelected}
              >
                <Avatar>
                  <AvatarFallback>{student.initials}</AvatarFallback>
                </Avatar>
                <span className="student-option__copy">
                  <strong>{student.name}</strong>
                  <small>
                    {student.grade} grade · {student.teacher}
                  </small>
                </span>
                {entry ? (
                  <Badge variant="secondary">
                    {entry.status === 'waiting'
                      ? `Queue #${String(state.queue.indexOf(entry) + 1)}`
                      : entry.status === 'ready'
                        ? 'Ready'
                        : 'Released'}
                  </Badge>
                ) : (
                  <span className="selection-check" aria-hidden="true">
                    {isSelected ? <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} /> : null}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!allQueued ? (
          <div className="arrival-panel">
            <label htmlFor="guardian-note">
              Pickup note <span>Optional</span>
            </label>
            <Textarea
              id="guardian-note"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
              placeholder="Carpool details, alternate guardian, or arrival note"
            />
            <Button type="submit" size="lg" disabled={selected.length === 0}>
              Announce arrival for {selected.length || 0}{' '}
              {selected.length === 1 ? 'student' : 'students'}
            </Button>
          </div>
        ) : (
          <div className="arrival-confirmed" role="status">
            <span className="arrival-confirmed__icon">
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} />
            </span>
            <div>
              <strong>Your children are in the pickup queue</strong>
              <p>Staff can now prepare and release them to your verified vehicle.</p>
            </div>
          </div>
        )}
      </form>

      {allQueued ? (
        <section className="late-note">
          <div>
            <p className="eyebrow">Plans changed?</p>
            <h2>Send a note to dismissal staff</h2>
          </div>
          <Textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
            placeholder="Running late or a different authorized adult is arriving"
          />
          <Button type="button" variant="outline" onClick={updateNote} disabled={!note.trim()}>
            Send note
          </Button>
        </section>
      ) : null}
    </main>
  );
}

function nextStatus(status: PickupStatus): PickupStatus | 'complete' {
  if (status === 'waiting') return 'ready';
  if (status === 'ready') return 'released';
  return 'complete';
}

function statusAction(status: PickupStatus) {
  if (status === 'waiting') return 'Mark ready';
  if (status === 'ready') return 'Release student';
  return 'Complete pickup';
}

function StaffPortal({ state, save }: ReturnType<typeof useDismissalState>) {
  const [selected, setSelected] = useState<string[]>([]);
  const active = state.queue;
  const waiting = active.filter((entry) => entry.status === 'waiting').length;
  const ready = active.filter((entry) => entry.status === 'ready').length;
  const released = active.filter((entry) => entry.status === 'released').length;

  function advance(ids: string[]) {
    const now = new Date().toISOString();
    const completed: CompletedEntry[] = [];
    const queue = state.queue.flatMap((entry) => {
      if (!ids.includes(entry.id)) return [entry];
      const next = nextStatus(entry.status);
      if (next === 'complete') {
        completed.push({ ...entry, completedAt: now });
        return [];
      }
      return [{ ...entry, status: next }];
    });
    save({ queue, completed: [...completed, ...state.completed] });
    setSelected([]);
  }

  const siblingEntries = active.filter((entry) => entry.guardianName === 'Carlos Garcia');
  const siblingAction =
    siblingEntries.length > 1 &&
    siblingEntries.every((entry) => entry.status === siblingEntries[0]?.status);

  return (
    <main className="staff-main">
      <div className="portal-status">
        <span className="status-dot status-dot--blue" /> Staff dismissal console
        <span>Authorized faculty access</span>
        <Link to="/guardian">Switch to guardian portal</Link>
      </div>

      <section className="staff-console">
        <div className="staff-tabs">
          <div>
            <button type="button" className="is-active">
              <HugeiconsIcon icon={InboxIcon} strokeWidth={2} /> Live queue
              {active.length ? <span>{active.length}</span> : null}
            </button>
          </div>
          <Badge variant="outline">Pilot shift · 3:00–3:30 PM</Badge>
        </div>

        <div className="staff-summary">
          <div>
            <p className="eyebrow">Live operations</p>
            <h1>Pickup queue</h1>
            <p>Verify each guardian, prepare the student, release, then complete pickup.</p>
          </div>
          <div className="summary-counts" aria-label="Queue status">
            <span>
              <strong>{waiting}</strong> Waiting
            </span>
            <span>
              <strong>{ready}</strong> Ready
            </span>
            <span>
              <strong>{released}</strong> Released
            </span>
          </div>
        </div>

        {siblingAction ? (
          <div className="sibling-banner">
            <span className="sibling-banner__icon">
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
            </span>
            <div>
              <strong>Sibling group · Carlos Garcia</strong>
              <p>{siblingEntries.map((entry) => studentFor(entry.studentId).name).join(' and ')}</p>
            </div>
            <Button
              onClick={() => {
                advance(siblingEntries.map((entry) => entry.id));
              }}
            >
              {siblingEntries[0] ? statusAction(siblingEntries[0].status) : 'Advance siblings'}
            </Button>
          </div>
        ) : null}

        {active.length > 0 ? (
          <div className="queue-toolbar">
            <button
              type="button"
              onClick={() => {
                setSelected(
                  selected.length === active.length ? [] : active.map((entry) => entry.id),
                );
              }}
            >
              {selected.length === active.length ? 'Clear selection' : 'Select all'}
            </button>
            <span>Select students to advance together</span>
            {selected.length > 0 ? (
              <Button
                size="sm"
                onClick={() => {
                  advance(selected);
                }}
              >
                Advance selected ({selected.length})
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="queue-list" aria-live="polite">
          {active.length === 0 ? (
            <div className="queue-empty">
              <span>
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
              </span>
              <h2>No families are waiting</h2>
              <p>New guardian arrivals will appear here automatically.</p>
              <Button nativeButton={false} variant="outline" render={<Link to="/guardian" />}>
                Open guardian pilot
              </Button>
            </div>
          ) : (
            active.map((entry, index) => {
              const student = studentFor(entry.studentId);
              const isSelected = selected.includes(entry.id);
              return (
                <article className={`queue-card queue-card--${entry.status}`} key={entry.id}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => {
                      setSelected((current) =>
                        current.includes(entry.id)
                          ? current.filter((id) => id !== entry.id)
                          : [...current, entry.id],
                      );
                    }}
                    aria-label={`Select ${student.name}`}
                  />
                  <div className="queue-position">#{index + 1}</div>
                  <Avatar className="queue-avatar">
                    <AvatarFallback>{student.initials}</AvatarFallback>
                  </Avatar>
                  <div className="queue-card__student">
                    <div>
                      <h2>{student.name}</h2>
                      <Badge variant={entry.status === 'ready' ? 'default' : 'secondary'}>
                        {entry.status}
                      </Badge>
                    </div>
                    <p>
                      {student.grade} grade · {student.teacher}
                    </p>
                    <p>
                      <strong>Guardian:</strong> {entry.guardianName} · Tag {entry.carTag}
                    </p>
                    <p>
                      Arrived {formatTime(entry.arrivedAt)} · {relativeTime(entry.arrivedAt)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      advance([entry.id]);
                    }}
                  >
                    {statusAction(entry.status)}
                  </Button>
                  {entry.note ? (
                    <div className="guardian-note">
                      <strong>Guardian note</strong>
                      <span>“{entry.note}”</span>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        <section className="completed-list">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Completed today</p>
              <h2>Recently dismissed</h2>
            </div>
            <Badge variant="secondary">{state.completed.length}</Badge>
          </div>
          {state.completed.length === 0 ? (
            <p className="muted-copy">No pickups completed yet.</p>
          ) : (
            state.completed.slice(0, 6).map((entry) => (
              <div className="completed-row" key={entry.id}>
                <span className="completed-check">
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} />
                </span>
                <span>
                  <strong>{studentFor(entry.studentId).name}</strong>
                  <small>
                    {entry.guardianName} · Tag {entry.carTag}
                  </small>
                </span>
                <time>{formatTime(entry.completedAt)}</time>
              </div>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

export function DismissalApp({ role }: { role: Role }) {
  const store = useDismissalState();
  return (
    <div className="dismissal-app">
      <AppHeader role={role} waiting={store.state.queue.length} />
      {role === 'guardian' ? <GuardianPortal {...store} /> : <StaffPortal {...store} />}
      <footer className="dismissal-footer">
        <span>Pilot-SD · Oakridge Elementary</span>
        <span>Pickup records persist on this pilot device</span>
      </footer>
    </div>
  );
}
