export type PickupStatus = 'waiting' | 'ready' | 'released';

export interface QueueEntry {
  id: string;
  studentId: string;
  guardianName: string;
  carTag: string;
  arrivedAt: string;
  status: PickupStatus;
  note: string;
}

export interface CompletedEntry extends QueueEntry {
  completedAt: string;
}

export interface DismissalRun {
  serviceDate: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt: string | null;
  queue: QueueEntry[];
  completed: CompletedEntry[];
}

export interface DismissalStore {
  activeRun: DismissalRun;
  history: DismissalRun[];
}

export const SCHOOL_TIME_ZONE = 'America/Chicago';

export function serviceDateFor(
  instant: Date = new Date(),
  timeZone: string = SCHOOL_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  if (!year || !month || !day) throw new Error('School service date could not be resolved.');
  return `${year}-${month}-${day}`;
}

export function createDismissalRun(serviceDate: string, openedAt: string): DismissalRun {
  return {
    serviceDate,
    status: 'open',
    openedAt,
    closedAt: null,
    queue: [],
    completed: [],
  };
}

export function createDismissalStore(instant: Date = new Date()): DismissalStore {
  return {
    activeRun: createDismissalRun(serviceDateFor(instant), instant.toISOString()),
    history: [],
  };
}

export function rollStoreToServiceDate(
  store: DismissalStore,
  instant: Date = new Date(),
): DismissalStore {
  const serviceDate = serviceDateFor(instant);
  if (store.activeRun.serviceDate === serviceDate) return store;

  const closedRun: DismissalRun = {
    ...store.activeRun,
    status: 'closed',
    closedAt: instant.toISOString(),
  };

  return {
    activeRun: createDismissalRun(serviceDate, instant.toISOString()),
    history: [closedRun, ...store.history],
  };
}

export function parseDismissalStore(value: string | null, instant: Date = new Date()) {
  if (!value) return createDismissalStore(instant);

  try {
    const parsed = JSON.parse(value) as Partial<DismissalStore>;
    const activeRun = parsed.activeRun;
    if (
      !activeRun ||
      typeof activeRun.serviceDate !== 'string' ||
      !Array.isArray(activeRun.queue) ||
      !Array.isArray(activeRun.completed)
    ) {
      return createDismissalStore(instant);
    }

    return rollStoreToServiceDate(
      {
        activeRun: {
          serviceDate: activeRun.serviceDate,
          status: activeRun.status === 'closed' ? 'closed' : 'open',
          openedAt:
            typeof activeRun.openedAt === 'string' ? activeRun.openedAt : instant.toISOString(),
          closedAt: typeof activeRun.closedAt === 'string' ? activeRun.closedAt : null,
          queue: activeRun.queue,
          completed: activeRun.completed,
        },
        history: Array.isArray(parsed.history) ? parsed.history : [],
      },
      instant,
    );
  } catch {
    return createDismissalStore(instant);
  }
}
