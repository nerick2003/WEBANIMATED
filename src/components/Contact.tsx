import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { PolaroidPhoto } from "./PolaroidPhoto";
import { CONTACT_EMAIL, LINKEDIN_URL } from "../data";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-driven assembly: arrow column → curve → arrow head → copy → polaroid.
 * Band from section entering the viewport until its top nears the header — enough scroll distance to feel.
 * Progress is applied manually in onUpdate (ScrollTrigger’s scrub+timeline inside gsap.context was not syncing reliably).
 */
const CONTACT_ASSEMBLY = {
  start: "top bottom",
  end: "top 14%",
} as const

/** Scroll-linked rotation — drag translate lives *outside* this layer so pointer deltas stay screen-aligned. */
const POLAROID_TILT_SCROLL_DEG = { from: -8, to: 8 } as const;
const POLAROID_ASSEMBLY_SCALE = { from: 0.82, to: 1 } as const;
const POLAROID_ASSEMBLY_OPACITY = { from: 0.25, to: 1 } as const;
const COPY_ASSEMBLY_Y = 52;
const ARROW_COLUMN_X = -80;
const POLAROID_BASE_ROTATE_DEG = -1.25;

export type ContactProps = {
  /** True while the theme wipe runs — polaroid is lifted above the backdrop invert overlay. */
  isThemeWiping?: boolean;
  /** Pass pointer coords on enter so the floating “Drag” label positions immediately (avoids top-left flash). */
  onPolaroidHoverChange?: (hovered: boolean, clientX?: number, clientY?: number) => void;
};

type PolaroidLiftRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default function Contact({ isThemeWiping = false, onPolaroidHoverChange }: ContactProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const curvePathRef = useRef<SVGPathElement>(null);
  const arrowPathRef = useRef<SVGPathElement>(null);
  const polaroidTiltRef = useRef<HTMLDivElement>(null);
  const polaroidDragRef = useRef<HTMLDivElement>(null);
  const arrowColumnRef = useRef<HTMLDivElement>(null);
  const contactCopyRef = useRef<HTMLDivElement>(null);

  const year = new Date().getFullYear();
  const [polaroidLiftRect, setPolaroidLiftRect] = useState<PolaroidLiftRect | null>(null);
  /** Avoids one frame of fixed positioning after wipe ends while lift rect state is still set */
  const polaroidLiftActive = isThemeWiping ? polaroidLiftRect : null;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const drag = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const next = {
      x: drag.current.originX + (e.clientX - drag.current.startX),
      y: drag.current.originY + (e.clientY - drag.current.startY),
    };
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      /* End hover label if pointer released outside polaroid */
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
        onPolaroidHoverChange?.(false);
      }
    },
    [onPolaroidHoverChange],
  );

  useLayoutEffect(() => {
    if (!isThemeWiping) {
      setPolaroidLiftRect(null);
      return;
    }
    const el = polaroidDragRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPolaroidLiftRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [isThemeWiping]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const curve = curvePathRef.current;
    const arrow = arrowPathRef.current;
    const tilt = polaroidTiltRef.current;
    const arrowColumn = arrowColumnRef.current;
    const contactCopy = contactCopyRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const refreshAssembly = () => {
      ScrollTrigger.refresh()
    }

    let syncAfterLayout: (() => void) | undefined
    let onScrollTriggerRefresh: (() => void) | undefined

    const ctx = gsap.context(() => {
      if (reduced) {
        if (curve && arrow) {
          const cl = curve.getTotalLength();
          const al = arrow.getTotalLength();
          if (cl > 0 && al > 0) {
            gsap.set(curve, { attr: { strokeDasharray: cl, strokeDashoffset: 0 } });
            gsap.set(arrow, { attr: { strokeDasharray: al, strokeDashoffset: 0 } });
          }
        }
        if (arrowColumn) {
          gsap.set(arrowColumn, { x: 0, opacity: 1 });
        }
        if (contactCopy) {
          gsap.set(contactCopy, { y: 0, opacity: 1 });
        }
        if (tilt) {
          gsap.set(tilt, {
            rotation: POLAROID_TILT_SCROLL_DEG.to,
            scale: POLAROID_ASSEMBLY_SCALE.to,
            opacity: POLAROID_ASSEMBLY_OPACITY.to,
            force3D: true,
          });
        }
        return;
      }

      let curveLen = 0;
      let arrowLen = 0;
      if (curve && arrow) {
        curveLen = curve.getTotalLength();
        arrowLen = arrow.getTotalLength();
        if (curveLen > 0 && arrowLen > 0) {
          gsap.set(curve, {
            attr: { strokeDasharray: curveLen, strokeDashoffset: curveLen },
          });
          gsap.set(arrow, {
            attr: { strokeDasharray: arrowLen, strokeDashoffset: arrowLen },
          });
        }
      }

      if (arrowColumn) {
        gsap.set(arrowColumn, { x: ARROW_COLUMN_X, opacity: 0, force3D: true });
      }
      if (contactCopy) {
        gsap.set(contactCopy, { y: COPY_ASSEMBLY_Y, opacity: 0, force3D: true });
      }
      if (tilt) {
        gsap.set(tilt, {
          rotation: POLAROID_TILT_SCROLL_DEG.from,
          scale: POLAROID_ASSEMBLY_SCALE.from,
          opacity: POLAROID_ASSEMBLY_OPACITY.from,
          force3D: true,
        });
      }

      /* Paused timeline + ScrollTrigger.create — matches GSAP’s recommended scrub pattern; `.to()` after `set` avoids fromTo/scrub edge cases */
      const assembly = gsap.timeline({
        paused: true,
        defaults: { ease: "none" },
      });

      if (arrowColumn) {
        assembly.to(
          arrowColumn,
          { x: 0, opacity: 1, duration: 0.16, force3D: true },
          0,
        );
      }

      if (curve && curveLen > 0) {
        assembly.to(curve, { attr: { strokeDashoffset: 0 }, duration: 0.2 }, 0.06);
      }

      if (arrow && arrowLen > 0) {
        assembly.to(arrow, { attr: { strokeDashoffset: 0 }, duration: 0.12 }, 0.18);
      }

      if (contactCopy) {
        assembly.to(
          contactCopy,
          { y: 0, opacity: 1, duration: 0.2, force3D: true },
          0.24,
        );
      }

      if (tilt) {
        assembly.to(
          tilt,
          {
            rotation: POLAROID_TILT_SCROLL_DEG.to,
            scale: POLAROID_ASSEMBLY_SCALE.to,
            opacity: POLAROID_ASSEMBLY_OPACITY.to,
            duration: 0.36,
            force3D: true,
          },
          0.34,
        );
      }

      const syncAssemblyProgress = (self: ScrollTrigger) => {
        assembly.progress(self.progress)
      }

      const st = ScrollTrigger.create({
        id: "contact-assembly",
        trigger: section,
        start: CONTACT_ASSEMBLY.start,
        end: CONTACT_ASSEMBLY.end,
        invalidateOnRefresh: true,
        onUpdate: syncAssemblyProgress,
        onRefresh: syncAssemblyProgress,
      })

      /* App.tsx calls ScrollTrigger.refresh() after work pin / hash — re-sync timeline to scroll progress (manual drive does not auto-update on refresh) */
      onScrollTriggerRefresh = () => {
        syncAssemblyProgress(st)
      }
      ScrollTrigger.addEventListener("refresh", onScrollTriggerRefresh)

      syncAfterLayout = () => {
        refreshAssembly()
        syncAssemblyProgress(st)
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncAfterLayout?.()
        })
      })
      window.addEventListener("load", syncAfterLayout, { once: true })
    }, section)

    return () => {
      if (onScrollTriggerRefresh) {
        ScrollTrigger.removeEventListener("refresh", onScrollTriggerRefresh)
      }
      if (syncAfterLayout) {
        window.removeEventListener("load", syncAfterLayout)
      }
      ctx.revert()
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="flex min-h-screen min-h-[100dvh] w-full flex-col justify-center scroll-mt-16 bg-[var(--bg)] mt-24 py-24 pb-16 font-sans text-[var(--text)] md:mt-16 md:py-16 md:pb-24 lg:mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="flex flex-col items-center gap-8 md:gap-16 lg:flex-row lg:items-center lg:justify-center lg:gap-44 xl:gap-56 2xl:gap-72">
          <div className="mt-0 flex shrink-0 -rotate-1 -skew-x-[8deg] flex-col items-center md:mt-4 md:-skew-x-[10deg]">
            <div
              ref={arrowColumnRef}
              className="flex flex-col items-center gap-6 md:gap-8 will-change-transform"
            >
              <p className="max-w-[14rem] text-center text-xs font-medium uppercase leading-snug tracking-[0.2em] text-[var(--text-muted)] md:text-sm">
                Drag the picture here
              </p>
              <svg
                className="h-10 w-24 text-[var(--text)]"
                viewBox="0 0 100 40"
                fill="none"
                aria-hidden
              >
                <path
                  ref={curvePathRef}
                  d="M6 34 Q 48 4 92 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  ref={arrowPathRef}
                  d="M86 14 L94 18 L88 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          <div className="relative mx-auto grid w-full max-w-lg min-h-[min(22rem,58vh)] place-items-center px-2 pt-20 md:min-h-[min(28rem,72vh)] md:px-8 md:pt-0 lg:w-auto lg:min-h-[min(32rem,78vh)] lg:shrink-0">
          {/* Back layer: copy + links — z-10 receives hits wherever the polaroid (z-20) does not */}
          <div
            ref={contactCopyRef}
            className="col-start-1 row-start-1 z-10 flex max-w-md flex-col items-center justify-center gap-2 px-4 text-center will-change-transform"
          >
            <p className="text-lg font-medium leading-snug text-[var(--text-soft)] md:text-xl">
              Let&apos;s work together!
            </p>
            <p className="text-lg font-medium leading-snug text-[var(--text-soft)] md:text-xl">
              Send me a DM
            </p>
            <div className="flex justify-center pt-1">
              <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 text-[0.65rem] font-semibold uppercase not-italic leading-tight tracking-[0.1em] text-[var(--text)] sm:gap-2 sm:text-xs md:gap-3 md:text-sm">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  aria-label={`Send email to ${CONTACT_EMAIL}`}
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-b border-[var(--text)] pb-px transition-colors hover:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  EMAIL
                </a>
                <span className="pointer-events-none select-none font-semibold not-italic text-[var(--text-muted)]" aria-hidden>
                  OR
                </span>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open LinkedIn profile"
                  className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center border-b border-[var(--text)] pb-px transition-colors hover:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  LINKEDIN
                </a>
              </span>
            </div>
          </div>

          {/* Wrapper must not capture hits — only the polaroid box does (otherwise the full grid cell blocks links) */}
          <div className="pointer-events-none col-start-1 row-start-1 z-20 max-w-fit shrink-0 self-center justify-self-center">
            {polaroidLiftActive ? (
              <div
                className="pointer-events-none shrink-0"
                style={{
                  width: polaroidLiftActive.width,
                  height: polaroidLiftActive.height,
                }}
                aria-hidden
              />
            ) : null}
            <div
              ref={polaroidDragRef}
              role="img"
              aria-label="Drag the photo to reveal contact options"
              style={
                polaroidLiftActive
                  ? {
                      position: "fixed",
                      top: polaroidLiftActive.top,
                      left: polaroidLiftActive.left,
                      width: polaroidLiftActive.width,
                      height: polaroidLiftActive.height,
                      zIndex: 10001,
                      transform: "translate(0px, 0px)",
                      touchAction: "none",
                    }
                  : {
                      transform: `translate(${offset.x}px, ${offset.y}px)`,
                      touchAction: "none",
                    }
              }
              className="pointer-events-auto cursor-none"
              onPointerEnter={(e) => onPolaroidHoverChange?.(true, e.clientX, e.clientY)}
              onPointerLeave={() => {
                if (!drag.current.active) onPolaroidHoverChange?.(false);
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div ref={polaroidTiltRef} className="origin-center will-change-transform">
                <PolaroidPhoto year={year} baseRotateDeg={POLAROID_BASE_ROTATE_DEG} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
