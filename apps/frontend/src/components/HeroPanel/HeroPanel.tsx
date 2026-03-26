/**
 * Full-screen landing hero. Collapses on first interaction (CTA click).
 * All animations use GSAP.
 */

import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

export interface HeroPanelProps {
  onEnter: () => void;
}

export function HeroPanel({ onEnter }: HeroPanelProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const orbs = [orb1Ref.current, orb2Ref.current].filter(Boolean);
      gsap.fromTo(
        orbs,
        { opacity: 0 },
        { opacity: 1, duration: 2, stagger: 0.4, ease: 'power2.out' }
      );

      if (badgeRef.current) {
        gsap.fromTo(
          badgeRef.current,
          { scale: 0 },
          { scale: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.3 }
        );
      }

      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.4 }
        );
      }

      if (subRef.current) {
        gsap.fromTo(
          subRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, delay: 0.6 }
        );
      }

      if (featuresRef.current) {
        gsap.fromTo(
          featuresRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, delay: 0.8 }
        );
      }

      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1,
            delay: 1,
            ease: 'power2.inOut',
            transformOrigin: 'center',
          }
        );
      }

      if (ctaRef.current) {
        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, delay: 1 }
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleCtaClick = useCallback(() => {
    onEnter();
  }, [onEnter]);

  const handleCtaMouseEnter = useCallback(() => {
    if (ctaRef.current) gsap.to(ctaRef.current, { scale: 1.03, duration: 0.2 });
  }, []);

  const handleCtaMouseLeave = useCallback(() => {
    if (ctaRef.current) gsap.to(ctaRef.current, { scale: 1, duration: 0.2 });
  }, []);

  return (
    <div className="hero-frame">
      <div ref={heroRef} className="hero">
        <div ref={orb1Ref} className="hero-orb1" />
        <div ref={orb2Ref} className="hero-orb2" />

        <div ref={badgeRef} className="hero-badge">
          nutrition-first meal discovery
        </div>

        <div ref={headingRef} className="hero-title">
          Spin your
          <br />
          <span>next meal.</span>
        </div>

        <div ref={subRef} className="hero-sub">
          One recipe, perfectly matched to your macros. No scrolling. No deciding.
        </div>

        <button
          ref={ctaRef}
          type="button"
          onClick={handleCtaClick}
          onMouseEnter={handleCtaMouseEnter}
          onMouseLeave={handleCtaMouseLeave}
          className="hero-cta"
        >
          Start Cooking
        </button>

        <div ref={lineRef} className="hero-line" />

        <div ref={featuresRef} className="hero-features">
          <span className="hero-feat">AI-generated recipes</span>
          <span className="hero-feat">Macro-matched</span>
          <span className="hero-feat">Ingredient substitution</span>
          <span className="hero-feat">Daily log & streaks</span>
        </div>
      </div>
    </div>
  );
}
