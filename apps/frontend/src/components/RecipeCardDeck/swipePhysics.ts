/**
 * Swipe animation physics: delta-time based, 60fps-friendly.
 * All calculations use dt (ms) so animation is frame-rate independent;
 * we pass dt into springStep so 60fps and 120fps both behave correctly.
 *
 * Easing: ease-out cubic for exit (card flies off). Spring damping for return.
 */

/** Ease-out cubic: 1 - (1-t)^3. Good for exit (fast start, smooth stop). */
export function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

/**
 * Damped spring: x and v updated each frame using dt (delta-time).
 * Spring force: F = -stiffness * x - damping * v
 * v += F * dt, x += v * dt
 * Delta-time ensures smooth 60fps regardless of frame jitter.
 * Tuned for smooth return to center without overshoot.
 */
export const SPRING_STIFFNESS = 0.002;
export const SPRING_DAMPING = 0.06;

export function springStep(
  x: number,
  v: number,
  dt: number,
  stiffness = SPRING_STIFFNESS,
  damping = SPRING_DAMPING
): { x: number; v: number } {
  const force = -stiffness * x - damping * v;
  const newV = v + force * dt;
  const newX = x + newV * dt;
  return { x: newX, v: newV };
}

/** Consider spring at rest when position and velocity are below threshold. */
export const SPRING_REST_THRESHOLD = 0.5;
export const SPRING_VELOCITY_THRESHOLD = 0.1;

export function isSpringAtRest(
  x: number,
  v: number,
  positionThreshold = SPRING_REST_THRESHOLD,
  velocityThreshold = SPRING_VELOCITY_THRESHOLD
): boolean {
  return Math.abs(x) < positionThreshold && Math.abs(v) < velocityThreshold;
}
