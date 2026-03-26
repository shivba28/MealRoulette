import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

export interface PullCordProps {
  /** Called after a successful tug animation completes. */
  onToggle: () => void;
  /** Optional: used to style the cord differently when "open". */
  isOpen?: boolean;
  className?: string;
  /** Minimum drag distance (in SVG units) to count as a tug. */
  tugThreshold?: number;
  /**
   * Optional: called while dragging with a normalized pull progress (0..1).
   * Useful for "preview" UI (e.g. partial panel open).
   */
  onPullProgress?: (progress: number) => void;
  /** Optional: called on release with the final pull progress (0..1). */
  onPullEnd?: (progress: number) => void;
  /** Sound path for the click; defaults to `/click.mp3` (public). */
  clickSoundSrc?: string;
}

export interface PullCordHandle {
  /** Play the tug/bounce animation without toggling. */
  bounce: () => void;
}

type Point = { x: number; y: number };

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const CORD_DURATION = 0.1;

/**
 * React component version of `cord.html`.
 * Uses MorphSVGPlugin for smooth path morphing when available; falls back to shape swap otherwise.
 */

export const PullCord = forwardRef<PullCordHandle, PullCordProps>(function PullCord(
  {
    onToggle,
    isOpen = false,
    className,
    tugThreshold = 50,
    onPullProgress,
    onPullEnd,
    clickSoundSrc = '/click.mp3',
  },
  ref
) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dummyLineRef = useRef<SVGLineElement | null>(null);
  const dummyGroupRef = useRef<SVGGElement | null>(null);
  const hitRef = useRef<SVGCircleElement | null>(null);
  const cordsRef = useRef<Array<SVGPathElement | null>>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const suppressClickRef = useRef(false);
  const busyRef = useRef(false);
  const dragStartRef = useRef<Point | null>(null);
  const proxyRef = useRef<HTMLDivElement | null>(null);
  const draggableRef = useRef<Draggable[] | null>(null);
  const morphSVGAvailableRef = useRef(false);

  const END = useMemo(() => ({ x: 98.7255, y: 380.5405 }), []);
  const START = useMemo(() => ({ x: 98.7255, y: 240.5405 }), []);
  const pullMax = useMemo(() => Math.max(1, END.y - START.y), [END.y, START.y]);

  const cordDs = useMemo(
    () => [
      'M123.228-28.56v150.493',
      'M123.228-28.59s28 8.131 28 19.506-18.667 13.005-28 19.507c-9.333 6.502-28 8.131-28 19.506s28 19.507 28 19.507',
      'M123.228-28.575s-20 16.871-20 28.468c0 11.597 13.333 18.978 20 28.468 6.667 9.489 20 16.87 20 28.467 0 11.597-20 28.468-20 28.468',
      'M123.228-28.569s16 20.623 16 32.782c0 12.16-10.667 21.855-16 32.782-5.333 10.928-16 20.623-16 32.782 0 12.16 16 32.782 16 32.782',
      'M123.228-28.563s-10 24.647-10 37.623c0 12.977 6.667 25.082 10 37.623 3.333 12.541 10 24.647 10 37.623 0 12.977-10 37.623-10 37.623',
    ],
    []
  );

  useEffect(() => {
    audioRef.current = new Audio(clickSoundSrc);
  }, [clickSoundSrc]);

  const resetDummy = useCallback(() => {
    const line = dummyLineRef.current;
    if (!line) return;
    gsap.set(line, { attr: { x2: END.x, y2: END.y } });
  }, [END.x, END.y]);

  useEffect(() => {
    resetDummy();
  }, [resetDummy]);

  const showCordIndex = useCallback((idx: number) => {
    const cords = cordsRef.current;
    for (let i = 0; i < cords.length; i++) {
      const el = cords[i];
      if (!el) continue;
      gsap.set(el, { display: i === idx ? 'block' : 'none' });
    }
  }, []);

  const runTugAnimation = useCallback((opts?: { onComplete?: () => void }) => {
    if (busyRef.current) return;
    const dummy = dummyGroupRef.current;
    const hit = hitRef.current;
    if (!dummy || !hit) return;

    busyRef.current = true;
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    audioRef.current?.play().catch(() => {});

    gsap.set([dummy, hit], { display: 'none' });
    showCordIndex(0);

    const mainPath = cordsRef.current[0];
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([dummy, hit], { display: 'block' });
        showCordIndex(-1);
        resetDummy();
        busyRef.current = false;
        opts?.onComplete?.();
      },
    });

    if (morphSVGAvailableRef.current && mainPath) {
      // Smooth morph like cord.html: morph path 0 to each target and yoyo back
      for (let i = 1; i < cordDs.length; i++) {
        const target = cordsRef.current[i];
        if (target) {
          tl.to(mainPath, {
            morphSVG: target,
            duration: CORD_DURATION,
            repeat: 1,
            yoyo: true,
          });
        }
      }
    } else {
      // Fallback: swap shapes without morphing
      for (let i = 1; i < cordDs.length; i++) {
        tl.add(() => showCordIndex(i), `+=${CORD_DURATION}`);
        tl.add(() => showCordIndex(0), `+=${CORD_DURATION}`);
      }
    }
  }, [cordDs.length, resetDummy, showCordIndex]);

  const runToggle = useCallback(() => {
    runTugAnimation({ onComplete: onToggle });
  }, [onToggle, runTugAnimation]);

  useImperativeHandle(
    ref,
    () => ({
      bounce: () => runTugAnimation(),
    }),
    [runTugAnimation]
  );

  // GSAP plugin setup: Draggable + optional MorphSVGPlugin for smooth path morph (matches cord.html)
  // MorphSVGPlugin is a GreenSock Club plugin: add it to the project to enable smooth cord animation.
  useEffect(() => {
    gsap.registerPlugin(Draggable);
    import('gsap/MorphSVGPlugin')
      .then((m) => {
        if (m.MorphSVGPlugin) {
          gsap.registerPlugin(m.MorphSVGPlugin);
          morphSVGAvailableRef.current = true;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const hit = hitRef.current;
    const line = dummyLineRef.current;
    if (!hit || !line) return;

    const proxy = document.createElement('div');
    proxyRef.current = proxy;
    gsap.set(proxy, { x: END.x, y: END.y });

    // Clear any previous draggable instance
    draggableRef.current?.forEach((d) => d.kill());
    draggableRef.current = null;

    const ds = Draggable.create(proxy, {
      trigger: hit,
      type: 'x,y',
      onPress: function (e: PointerEvent | MouseEvent | TouchEvent) {
        // Draggable normalizes pointer position on the instance
        const sx = (e as any).x ?? (this as any).pointerX ?? (this as any).x;
        const sy = (e as any).y ?? (this as any).pointerY ?? (this as any).y;
        dragStartRef.current = { x: sx, y: sy };
      },
      onDrag: function () {
        const x = (this as any).x;
        const y = (this as any).y;
        gsap.set(line, { attr: { x2: x, y2: y } });

        const pulled = Math.max(0, y - END.y);
        const progress = Math.max(0, Math.min(1, pulled / pullMax));
        onPullProgress?.(progress);
      },
      onRelease: function (e: PointerEvent | MouseEvent | TouchEvent) {
        const start = dragStartRef.current;
        const ex = (e as any).x ?? (this as any).pointerX ?? (this as any).x;
        const ey = (e as any).y ?? (this as any).pointerY ?? (this as any).y;
        const travelled = start ? dist(start, { x: ex, y: ey }) : 0;

        const pulled = Math.max(0, (this as any).y - END.y);
        const progress = Math.max(0, Math.min(1, pulled / pullMax));
        onPullEnd?.(progress);

        gsap.to(line, {
          attr: { x2: END.x, y2: END.y },
          duration: 0.1,
          ease: 'power2.out',
          onComplete: () => {
            if (travelled > tugThreshold) runToggle();
            else resetDummy();
          },
        });
      },
    });

    draggableRef.current = ds;

    return () => {
      draggableRef.current?.forEach((d) => d.kill());
      draggableRef.current = null;
      proxyRef.current = null;
      dragStartRef.current = null;
    };
  }, [END.x, END.y, onPullEnd, onPullProgress, pullMax, resetDummy, runToggle, tugThreshold]);

  // Keep cords hidden by default (dummy line visible)
  useEffect(() => {
    showCordIndex(-1);
    const dummy = dummyGroupRef.current;
    const hit = hitRef.current;
    if (dummy && hit) gsap.set([dummy, hit], { display: 'block' });
  }, [showCordIndex]);

  return (
    <div
      className={['pull-cord', className].filter(Boolean).join(' ')}
      role="button"
      tabIndex={0}
      aria-label="Pull cord"
      data-open={isOpen ? 'true' : 'false'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          runToggle();
        }
      }}
    >
      <svg
        ref={svgRef}
        className="pull-cord__svg"
        viewBox="0 240 200 220"
        width="100"
        height="100"
        aria-hidden
      >
        <defs>
          <marker
            id="pullcord-end"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <circle cx="5" cy="5" r="1" className="toggle-scene__cord-end" />
          </marker>
        </defs>

        <g className="toggle-scene__cords">
          {cordDs.map((d, idx) => (
            <path
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              ref={(el) => {
                cordsRef.current[idx] = el;
              }}
              className="toggle-scene__cord"
              markerEnd="url(#pullcord-end)"
              fill="none"
              strokeLinecap="square"
              strokeWidth="6"
              d={d}
              transform="translate(-24.503 256.106)"
              style={{ display: 'none' }}
            />
          ))}

          <g ref={dummyGroupRef} className="line toggle-scene__dummy-cord">
            <line
              ref={dummyLineRef}
              markerEnd="url(#pullcord-end)"
              x1={START.x}
              x2={END.x}
              y1={START.y}
              y2={END.y}
            />
          </g>

          <circle
            ref={hitRef}
            className="toggle-scene__hit-spot"
            cx={END.x}
            cy={END.y}
            r="20"
            fill="transparent"
            onClick={() => {
              if (suppressClickRef.current) return;
              runToggle();
            }}
          />
        </g>
      </svg>
    </div>
  );
});

