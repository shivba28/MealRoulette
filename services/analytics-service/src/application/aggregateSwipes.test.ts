import { SwipeEvent } from '../domain/SwipeEvent';
import { aggregateSwipes } from './aggregateSwipes';

describe('aggregateSwipes', () => {
  it('counts likes and passes', () => {
    const events = [
      new SwipeEvent('1', 'u1', 'r1', 'right', '2024-01-01T00:00:00Z'),
      new SwipeEvent('2', 'u1', 'r1', 'left', '2024-01-01T00:01:00Z'),
      new SwipeEvent('3', 'u1', 'r1', 'right', '2024-01-01T00:02:00Z'),
    ];
    const result = aggregateSwipes({
      events,
      entityId: 'r1',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-02',
    });
    expect(result.likes).toBe(2);
    expect(result.passes).toBe(1);
    expect(result.totalSwipes).toBe(3);
    expect(result.likeRate).toBeCloseTo(2 / 3);
  });

  it('empty swipe array returns zero counts and likeRate is 0 (no NaN)', () => {
    const result = aggregateSwipes({
      events: [],
      entityId: 'r1',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-02',
    });
    expect(result.likes).toBe(0);
    expect(result.passes).toBe(0);
    expect(result.totalSwipes).toBe(0);
    expect(result.likeRate).toBe(0);
    expect(Number.isNaN(result.likeRate)).toBe(false);
  });

  it('all likes', () => {
    const events = [
      new SwipeEvent('1', 'u1', 'r1', 'right', '2024-01-01T00:00:00Z'),
      new SwipeEvent('2', 'u1', 'r1', 'right', '2024-01-01T00:01:00Z'),
      new SwipeEvent('3', 'u1', 'r1', 'right', '2024-01-01T00:02:00Z'),
    ];
    const result = aggregateSwipes({
      events,
      entityId: 'r1',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-02',
    });
    expect(result.likes).toBe(3);
    expect(result.passes).toBe(0);
    expect(result.totalSwipes).toBe(3);
    expect(result.likeRate).toBe(1);
  });

  it('all passes', () => {
    const events = [
      new SwipeEvent('1', 'u1', 'r1', 'left', '2024-01-01T00:00:00Z'),
      new SwipeEvent('2', 'u1', 'r1', 'left', '2024-01-01T00:01:00Z'),
    ];
    const result = aggregateSwipes({
      events,
      entityId: 'r1',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-02',
    });
    expect(result.likes).toBe(0);
    expect(result.passes).toBe(2);
    expect(result.totalSwipes).toBe(2);
    expect(result.likeRate).toBe(0);
  });

  it('handles large dataset (10,000 events)', () => {
    const events: SwipeEvent[] = [];
    for (let i = 0; i < 10000; i++) {
      events.push(
        new SwipeEvent(
          String(i),
          'u1',
          'r1',
          i % 2 === 0 ? 'right' : 'left',
          '2024-01-01T00:00:00Z'
        )
      );
    }
    const result = aggregateSwipes({
      events,
      entityId: 'r1',
      periodStart: '2024-01-01',
      periodEnd: '2024-01-02',
    });
    expect(result.likes).toBe(5000);
    expect(result.passes).toBe(5000);
    expect(result.totalSwipes).toBe(10000);
    expect(result.likeRate).toBe(0.5);
  });

  it('does not mutate input events array', () => {
    const events = [
      new SwipeEvent('1', 'u1', 'r1', 'right', '2024-01-01T00:00:00Z'),
      new SwipeEvent('2', 'u1', 'r1', 'left', '2024-01-01T00:01:00Z'),
    ];
    const input = { events, entityId: 'r1', periodStart: '2024-01-01', periodEnd: '2024-01-02' };
    const snapshot = JSON.stringify(input.events.map((e) => e.id));
    aggregateSwipes(input);
    expect(JSON.stringify(input.events.map((e) => e.id))).toBe(snapshot);
    expect(input.events).toHaveLength(2);
  });
});
