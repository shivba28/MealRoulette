import { EngagementMetric } from '../domain/EngagementMetric';
import type { SwipeEvent } from '../domain/SwipeEvent';

export interface AggregateSwipesInput {
  events: SwipeEvent[];
  entityId: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Pure aggregation: compute engagement metrics from swipe events.
 * Designed for high write throughput: events can be batched and aggregated asynchronously.
 */
export function aggregateSwipes(input: AggregateSwipesInput): EngagementMetric {
  const { events, entityId, periodStart, periodEnd } = input;
  let likes = 0;
  let passes = 0;
  for (const e of events) {
    if (e.direction === 'right') likes += 1;
    else passes += 1;
  }
  return new EngagementMetric(
    entityId,
    likes,
    passes,
    likes + passes,
    periodStart,
    periodEnd
  );
}
