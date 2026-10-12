import { describe, expect, it } from 'vitest';
import {
  createDismissalStore,
  rollStoreToServiceDate,
  serviceDateFor,
  type DismissalStore,
} from './dismissal-state';

describe('daily dismissal runs', () => {
  it('uses the school timezone rather than UTC to resolve the service date', () => {
    expect(serviceDateFor(new Date('2026-10-13T03:30:00.000Z'))).toBe('2026-10-12');
  });

  it('keeps the active run intact during the same school day', () => {
    const store = createDismissalStore(new Date('2026-10-12T20:00:00.000Z'));
    expect(rollStoreToServiceDate(store, new Date('2026-10-13T03:30:00.000Z'))).toBe(store);
  });

  it('archives yesterday and starts today with no carried operational status', () => {
    const store: DismissalStore = {
      activeRun: {
        serviceDate: '2026-10-12',
        status: 'open',
        openedAt: '2026-10-12T18:00:00.000Z',
        closedAt: null,
        queue: [
          {
            id: 'pickup-1',
            studentId: 'mia',
            guardianName: 'Carlos Garcia',
            carTag: 'G-102',
            arrivedAt: '2026-10-12T20:00:00.000Z',
            status: 'released',
            note: '',
          },
        ],
        completed: [],
      },
      history: [],
    };

    const next = rollStoreToServiceDate(store, new Date('2026-10-13T15:00:00.000Z'));

    expect(next.activeRun.serviceDate).toBe('2026-10-13');
    expect(next.activeRun.queue).toEqual([]);
    expect(next.activeRun.completed).toEqual([]);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]?.status).toBe('closed');
    expect(next.history[0]?.queue[0]?.status).toBe('released');
  });
});
