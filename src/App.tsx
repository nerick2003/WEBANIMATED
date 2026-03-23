import type { AnimationEvent, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import About from "./components/About";
import Contact from "./components/Contact";
import { IntroOverlay } from "./components/IntroOverlay";
import { CONTACT_EMAIL } from "./data";
import brimsImage from "./assets/BRIMS.png";
import oldPortfolioImage from "./assets/OLDPORT.png";
import techfixImage from "./assets/TECHFIX.png";
import pythonLogoImage from "./assets/PYTHON_LOGO.svg";
import flutterDartLogoImage from "./assets/FLUTTER_DART_LOGO.svg";

gsap.registerPlugin(ScrollTrigger);

const sections = [
  { id: "index", label: "Index" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

const workItems = [
  {
    title: "BRIMS",
    kind: "Web System",
    demo: "https://brims-2028e.web.app/",
    image: brimsImage,
    description:
      "A role-based barangay resident information system built with Angular + Firebase for admin/staff dashboards, resident certificate requests, and in-app notifications.",
  },
  {
    title: "Portfolio v1",
    kind: "Personal Website",
    demo: "https://nerick2003.github.io/WEB-PORTFOLIO/",
    image: oldPortfolioImage,
    description:
      "An earlier version of my portfolio showcasing UI design, responsive layout, and selected projects.",
  },
  {
    title: "TechFix Accounting System",
    kind: "Desktop Accounting App",
    demo: "https://github.com/nerick2003/TECHFIX.git",
    image: techfixImage,
    description:
      "A desktop accounting practice application with SQLite storage and a Tkinter GUI, implementing double-entry bookkeeping, the full accounting cycle, financial statements, document management, and export tools (Excel/CSV/PDF).",
  },
  {
    title: "Project Nexus POS system",
    kind: "Point-of-Sale System",
    demo: "https://github.com/nerick2003/PROJECT-NEXUS.git",
    image: pythonLogoImage,
    description:
      "A Python-based POS system project focused on sales workflow, transaction handling, and inventory-oriented business operations.",
  },
  {
    title: "HabitMate",
    kind: "Mobile Habit Tracker",
    demo: "https://github.com/nerick2003/HabitMate.git",
    image: flutterDartLogoImage,
    description:
      "A Flutter habit and routine tracker for Android and iOS with daily checklists, streak tracking, reminders, and progress analytics powered by local storage.",
  },
];

const HERE_LABEL = "YOU ARE HERE";
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const scrambleText = (value: string) =>
  value
    .split("")
    .map((char) => {
      if (!/[a-z0-9]/i.test(char)) return char;
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    })
    .join("");

/** Same fragment → section id as scroll/nav logic; polaroid intro only on index landing/reload */
const getHashSectionId = () => {
  if (typeof window === "undefined") return "index";
  return window.location.hash.replace(/^#/, "").trim() || "index";
};

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = window.localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return "dark";
  });
  const [activeSection, setActiveSection] = useState("index");
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [openWorkTitle, setOpenWorkTitle] = useState<string | null>(null);
  const [displayEmail, setDisplayEmail] = useState(CONTACT_EMAIL);
  const [displayHereLabel, setDisplayHereLabel] = useState(HERE_LABEL);
  const [isBackToTopHovered, setIsBackToTopHovered] = useState(false);
  const [isThemeToggleHovered, setIsThemeToggleHovered] = useState(false);
  const [themeWipeTarget, setThemeWipeTarget] = useState<"light" | "dark" | null>(null);
  /** Strip invert before unmounting overlay so the compositor never pops invert → normal in one step */
  const [themeWipeBackdropClear, setThemeWipeBackdropClear] = useState(false);
  const [isIntroTextHovered, setIsIntroTextHovered] = useState(false);
  const [isEmailHovered, setIsEmailHovered] = useState(false);
  const [isPolaroidHovered, setIsPolaroidHovered] = useState(false);
  const [showIntroOverlay, setShowIntroOverlay] = useState(
    () => getHashSectionId() === "index",
  );
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const backToTopLabelRef = useRef<HTMLSpanElement | null>(null);
  const themeToggleLabelRef = useRef<HTMLSpanElement | null>(null);
  const dragLabelRef = useRef<HTMLSpanElement | null>(null);
  const backToTopHoverRef = useRef(false);
  const themeToggleHoverRef = useRef(false);
  const polaroidHoverRef = useRef(false);
  const themeWipeTargetRef = useRef<"light" | "dark" | null>(null);
  const emailScrambleRef = useRef<number | null>(null);
  const hereLabelScrambleRef = useRef<number | null>(null);
  const encryptedEmailRef = useRef(CONTACT_EMAIL);
  const encryptedHereLabelRef = useRef(HERE_LABEL);
  const introRef = useRef<HTMLDivElement | null>(null);
  const workSectionRef = useRef<HTMLElement | null>(null);
  const workInnerRef = useRef<HTMLDivElement | null>(null);
  const workTrackRef = useRef<HTMLDivElement | null>(null);
  /** Programmatic section scroll (same as hash handler); exposed for nav when hash is unchanged. */
  const scrollToSectionRef = useRef<((id: string, behavior: ScrollBehavior) => void) | null>(null);
  /** True while a nav-driven scroll animation runs (syncNavFromScroll skips — avoids re-render jank). */
  const scrollAnimatingRef = useRef(false);
  /** requestAnimationFrame id for in-flight smooth scroll (index + work + contact). */
  const smoothScrollRafRef = useRef<number | null>(null);
  /** Hero intro runs after polaroid overlay — ref set in main GSAP layout effect */
  const heroIntroTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const heroIntroPlayedRef = useRef(false);

  const handleIntroComplete = useCallback(() => {
    setShowIntroOverlay(false);
  }, []);

  const toggleWorkPreview = useCallback((title: string) => {
    setOpenWorkTitle((prev) => (prev === title ? null : title));
  }, []);

  /** When intro unmounts, play the paused hero timeline once (not while overlay covered the screen) */
  useEffect(() => {
    if (showIntroOverlay) return;
    if (heroIntroPlayedRef.current) return;
    const tl = heroIntroTimelineRef.current;
    if (!tl) return;
    heroIntroPlayedRef.current = true;
    requestAnimationFrame(() => {
      tl.play(0);
      ScrollTrigger.refresh();
    });
  }, [showIntroOverlay]);

  useEffect(() => {
    if (!showIntroOverlay) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showIntroOverlay]);

  const navigateToSection = (e: ReactMouseEvent<HTMLAnchorElement>, sectionId: string) => {
    /* Let modified clicks open the real href (e.g. new tab) without hijacking scroll. */
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const next = `#${sectionId}`;
    if (window.location.hash === next) {
      scrollToSectionRef.current?.(sectionId, "smooth");
      return;
    }
    /*
     * `location.hash = …` triggers the browser’s own instant fragment scroll, so scrollY
     * jumps before GSAP runs (same start/end → no visible animation). pushState updates the
     * URL without scrolling; hashchange does not fire (back/forward still fires hashchange).
     */
    history.pushState(null, "", next);
    /* Call immediately so scrollToSectionRef is always used (no frame where nav updates but scroll hasn’t started). */
    scrollToSectionRef.current?.(sectionId, "smooth");
  };

  useLayoutEffect(() => {
    const intro = introRef.current;
    if (!intro) return;

    const paragraphs = gsap.utils.toArray<HTMLElement>(intro.querySelectorAll("p"));
    if (!paragraphs.length) return;

    const hiddenFrom = {
      opacity: 0,
      scale: 0.72,
      filter: "blur(10px)",
      transformOrigin: "50% 50%",
    };

    gsap.set(paragraphs, hiddenFrom);

    const tl = gsap.timeline({ paused: true });
    tl.to(paragraphs, {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      duration: 1.35,
      ease: "power3.out",
      stagger: 0.18,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          tl.restart();
        } else {
          tl.pause(0);
          gsap.set(paragraphs, hiddenFrom);
        }
      },
      { threshold: 0 },
    );

    observer.observe(intro);

    return () => {
      observer.disconnect();
      tl.kill();
    };
  }, []);

  useLayoutEffect(() => {
    const elBack = backToTopLabelRef.current;
    const elTheme = themeToggleLabelRef.current;
    const elDrag = dragLabelRef.current;
    if (!elBack && !elTheme && !elDrag) return;

    const xBack = elBack
      ? gsap.quickTo(elBack, "x", { duration: 0.05, ease: "none" })
      : null;
    const yBack = elBack
      ? gsap.quickTo(elBack, "y", { duration: 0.05, ease: "none" })
      : null;

    const handleFloatingLabelsMove = (event: PointerEvent) => {
      if (backToTopHoverRef.current && xBack && yBack) {
        xBack(event.clientX + 18);
        yBack(event.clientY - 14);
      }
      /* Drag label: use left/top only (GSAP x/y + CSS transform conflicted and stuck at 0,0) */
      if (polaroidHoverRef.current && elDrag) {
        const gapX = 22;
        const gapY = -30;
        elDrag.style.left = `${event.clientX + gapX}px`;
        elDrag.style.top = `${event.clientY + gapY}px`;
      }
      if (themeToggleHoverRef.current && elTheme) {
        const pad = 8;
        const gap = 18;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rect = elTheme.getBoundingClientRect();
        const w = Math.max(rect.width, elTheme.scrollWidth, elTheme.offsetWidth, 1);
        const h = Math.max(rect.height, elTheme.offsetHeight, 1);

        /* Prefer full label to the left of the pointer; clamp so nothing clips off-screen */
        let left = event.clientX - gap - w;
        let top = event.clientY - 14;
        left = Math.max(pad, Math.min(left, vw - pad - w));
        top = Math.max(pad, Math.min(top, vh - pad - h));

        elTheme.style.left = `${left}px`;
        elTheme.style.top = `${top}px`;
      }
    };

    window.addEventListener("pointermove", handleFloatingLabelsMove);
    return () => {
      window.removeEventListener("pointermove", handleFloatingLabelsMove);
    };
  }, []);

  useLayoutEffect(() => {
    let removeCursorPointerListener: (() => void) | undefined;
    const htmlRootEl = document.documentElement
    const bgBeforeHero =
      getComputedStyle(htmlRootEl).getPropertyValue("--bg").trim() || "#050505"

    /** Nav highlight: pinned horizontal work breaks simple ScrollTrigger onToggle ranges */
    const syncNavFromScroll = () => {
      if (scrollAnimatingRef.current) return;

      const scrollY = window.scrollY;
      const mid = scrollY + window.innerHeight * 0.45;
      const pageH = document.documentElement.scrollHeight;
      const vh = window.innerHeight;

      if (scrollY + vh >= pageH - 6) {
        setActiveSection("contact");
        return;
      }

      const priority: Array<(typeof sections)[number]["id"]> = ["contact", "work", "index"];
      for (const id of priority) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const topDoc = rect.top + scrollY;
        const bottomDoc = rect.bottom + scrollY;
        if (mid >= topDoc && mid < bottomDoc) {
          setActiveSection(id);
          return;
        }
      }
    };

    const onStRefresh = () => syncNavFromScroll();

    const ctx = gsap.context(() => {
      if (cursorDotRef.current) {
        const el = cursorDotRef.current;
        /* Animate left/top — not x/y — so CSS transform: translate(-50%,-50%) on .cursor-dot is never overwritten */
        const xTo = gsap.quickTo(el, "left", {
          duration: 0.18,
          ease: "power3.out",
        });
        const yTo = gsap.quickTo(el, "top", {
          duration: 0.18,
          ease: "power3.out",
        });

        const handlePointerMove = (event: PointerEvent) => {
          xTo(event.clientX);
          yTo(event.clientY);
        };

        window.addEventListener("pointermove", handlePointerMove);
        removeCursorPointerListener = () => {
          window.removeEventListener("pointermove", handlePointerMove);
        };
      }

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches

      /* Black → page bg reads as “dim” on reload; skip for saved light theme (inline script already set data-theme). */
      const skipDarkBgHeroIntro =
        !prefersReducedMotion &&
        window.localStorage.getItem("theme") === "light"

      const heroIntroTimeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
      });
      heroIntroTimelineRef.current = heroIntroTimeline;

      if (!prefersReducedMotion && !skipDarkBgHeroIntro) {
        heroIntroTimeline.set(htmlRootEl, { "--bg": "#000000" }, 0)
        heroIntroTimeline.eventCallback("onComplete", () => {
          gsap.to(htmlRootEl, {
            "--bg": bgBeforeHero,
            duration: 0.55,
            ease: "power2.inOut",
            onComplete: () => {
              /* Inline --bg beats html[data-theme]; drop it so theme CSS variables apply (fixes light mode). */
              htmlRootEl.style.removeProperty("--bg")
            },
          })
        })
      }

      heroIntroTimeline
        .fromTo(
          ".hero-track",
          {
            scale: 0.28,
            yPercent: 36,
            opacity: 0,
            filter: "blur(14px)",
            transformOrigin: "50% 50%",
          },
          {
            scale: 1,
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.25,
          },
        )
        .from(
          ".hero-line",
          {
            yPercent: 110,
            opacity: 0,
            duration: 0.95,
            stagger: 0.1,
          },
          "-=0.7",
        );

      gsap.to(".hero-track", {
        /* Narrow screens: smaller drift so motion stays inside the gutters */
        xPercent: () => (window.matchMedia("(max-width: 900px)").matches ? 14 : 72),
        ease: "none",
        scrollTrigger: {
          trigger: "#index",
          start: "top top",
          end: "bottom top",
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      });

      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 80, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: () =>
                window.matchMedia("(max-width: 900px)").matches
                  ? "top 100%"
                  : "top 85%",
              once: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      const aboutParallax = document.querySelector<HTMLElement>("#about .about-parallax");
      if (
        aboutParallax &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const aboutNarrow = () => window.matchMedia("(max-width: 900px)").matches;
        gsap.fromTo(
          aboutParallax,
          {
            y: () => (aboutNarrow() ? 28 : 48),
          },
          {
            y: () => (aboutNarrow() ? -28 : -48),
            ease: "none",
            scrollTrigger: {
              trigger: "#about",
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      const section = workSectionRef.current;
      const inner = workInnerRef.current;
      const track = workTrackRef.current;
      if (section && inner && track) {
        const getScrollDistance = () => Math.max(0, track.scrollWidth - inner.clientWidth);

        const horizontalTween = gsap.to(track, {
          x: () => -getScrollDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${getScrollDistance()}`,
            pin: true,
            scrub: 0.85,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        gsap.utils
          .toArray<HTMLElement>(track.querySelectorAll(".work-horizontal-panel"))
          .forEach((panel) => {
            const innerEl = panel.querySelector<HTMLElement>(".work-panel-inner");
            if (!innerEl) return;

            gsap.fromTo(
              innerEl,
              {
                y: 48,
                opacity: 0.35,
                rotateX: 6,
                filter: "blur(6px)",
                transformPerspective: 900,
              },
              {
                y: 0,
                opacity: 1,
                rotateX: 0,
                filter: "blur(0px)",
                ease: "none",
                scrollTrigger: {
                  trigger: panel,
                  containerAnimation: horizontalTween,
                  start: "left 88%",
                  end: "left 42%",
                  scrub: true,
                },
              },
            );
          });
      }

    });

    window.addEventListener("scroll", syncNavFromScroll, { passive: true });
    ScrollTrigger.addEventListener("refresh", onStRefresh);

    /** After pin/scroll distances are measured, re-apply #hash so refresh on #contact doesn’t land in work. */
    const forceDocumentScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const d = document.documentElement;
      const b = document.body;
      if (d) d.scrollTop = 0;
      if (b) b.scrollTop = 0;
      const se = document.scrollingElement;
      if (se) se.scrollTop = 0;
    };

    /** After instant jump to top (load / reduced motion): pin math may need hard snaps. */
    const finalizeScrollToIndexInstant = () => {
      ScrollTrigger.refresh();
      forceDocumentScrollTop();
      requestAnimationFrame(() => {
        forceDocumentScrollTop();
        ScrollTrigger.refresh();
        requestAnimationFrame(() => {
          forceDocumentScrollTop();
          syncNavFromScroll();
        });
      });
    };

    /** After smooth scroll to top: no refresh() — only nudge + update (refresh caused end-of-tween slam). */
    const finalizeScrollToIndexSmooth = () => {
      requestAnimationFrame(() => {
        if (window.scrollY > 0.5) {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
        ScrollTrigger.update();
        syncNavFromScroll();
      });
    };

    const cancelSmoothScroll = () => {
      if (smoothScrollRafRef.current !== null) {
        cancelAnimationFrame(smoothScrollRafRef.current);
        smoothScrollRafRef.current = null;
      }
    };

    const scrollSectionIntoView = (id: string, behavior: ScrollBehavior) => {
      if (!id) return;
      const targetEl = id === "index" ? null : document.getElementById(id);
      if (id !== "index" && !targetEl) return;

      setActiveSection(id);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /** rAF smooth scroll uses setScrollY; avoid ScrollTrigger.refresh() after the tween (pin recalc = visible slam). */
      const getScrollY = () =>
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      const setScrollY = (y: number) => {
        const top = Math.max(0, y);
        window.scrollTo({ top, left: 0, behavior: "instant" });
        const se = document.scrollingElement ?? document.documentElement;
        if (Math.abs(se.scrollTop - top) > 0.5) se.scrollTop = top;
      };

      const maxScrollY = () => {
        const se = document.scrollingElement ?? document.documentElement;
        return Math.max(0, se.scrollHeight - window.innerHeight);
      };

      const measureTargetY = (element: HTMLElement) => {
        const y = Math.round(element.getBoundingClientRect().top + getScrollY());
        return Math.min(Math.max(0, y), maxScrollY());
      };

      /** After smooth scroll ends: do NOT call ScrollTrigger.refresh() here — it recalculates pins and jumps scroll (the “slam”). */
      const afterSmoothSectionScroll = (onDone?: () => void) => {
        requestAnimationFrame(() => {
          ScrollTrigger.update();
          requestAnimationFrame(() => {
            scrollAnimatingRef.current = false;
            syncNavFromScroll();
            onDone?.();
          });
        });
      };

      /** Instant / reduced-motion: scroll first, then refresh so pin spacers match — keep both passes sync so first paint isn’t index then #hash. */
      const finalizeInstantSectionScroll = (el: HTMLElement) => {
        el.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
        ScrollTrigger.refresh();
        /* Second pass after pin math — same tick, before paint, when called from useLayoutEffect. */
        el.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
        ScrollTrigger.refresh();
        syncNavFromScroll();
      };

      /** easeOutQuad — matches a snappy nav feel without GSAP ticker quirks */
      const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

      const smoothScrollToY = (targetY: number, durationMs: number, onArrive?: () => void) => {
        cancelSmoothScroll();
        scrollAnimatingRef.current = true;
        const start = getScrollY();
        const ty = Math.max(0, Math.round(targetY));
        if (Math.abs(ty - start) < 0.5) {
          scrollAnimatingRef.current = false;
          onArrive?.();
          return;
        }
        const t0 = performance.now();
        const tick = (now: number) => {
          const elapsed = now - t0;
          const t = Math.min(1, elapsed / durationMs);
          const y = start + (ty - start) * easeOutQuad(t);
          setScrollY(y);
          if (t < 1) {
            smoothScrollRafRef.current = requestAnimationFrame(tick);
          } else {
            smoothScrollRafRef.current = null;
            onArrive?.();
          }
        };
        smoothScrollRafRef.current = requestAnimationFrame(tick);
      };

      if (id === "index") {
        if (behavior === "instant" || reducedMotion) {
          cancelSmoothScroll();
          scrollAnimatingRef.current = false;
          forceDocumentScrollTop();
          finalizeScrollToIndexInstant();
          return;
        }
        smoothScrollToY(0, 880, () => {
          scrollAnimatingRef.current = false;
          finalizeScrollToIndexSmooth();
        });
        return;
      }

      const el = targetEl!;
      if (behavior === "instant" || reducedMotion) {
        cancelSmoothScroll();
        scrollAnimatingRef.current = false;
        finalizeInstantSectionScroll(el);
        return;
      }

      scrollAnimatingRef.current = true;
      requestAnimationFrame(() => {
        const targetY = measureTargetY(el);
        const start = getScrollY();
        const dist = Math.abs(targetY - start);
        const durationMs = Math.min(1600, Math.max(520, Math.round(dist * 0.58)));
        smoothScrollToY(targetY, durationMs, () => {
          afterSmoothSectionScroll();
        });
      });
    };

    const scrollToHashThenSync = (behavior: ScrollBehavior) => {
      const id = window.location.hash.replace(/^#/, "") || "index";
      scrollSectionIntoView(id, behavior);
    };

    scrollToSectionRef.current = scrollSectionIntoView;

    const onHashChange = () => {
      const id = window.location.hash.replace(/^#/, "") || "index";
      setActiveSection(id);
      requestAnimationFrame(() => {
        scrollToHashThenSync("smooth");
      });
    };
    window.addEventListener("hashchange", onHashChange);

    /* Hide root until scroll applied (Strict Mode remount: inline HTML hide only runs on first load). */
    const rootEl = document.getElementById("root");
    if (rootEl) rootEl.style.visibility = "hidden";
    try {
      scrollToHashThenSync("instant");
    } finally {
      if (rootEl) rootEl.style.visibility = "visible";
    }

    return () => {
      if (smoothScrollRafRef.current !== null) {
        cancelAnimationFrame(smoothScrollRafRef.current);
        smoothScrollRafRef.current = null;
      }
      scrollAnimatingRef.current = false;
      scrollToSectionRef.current = null;
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("scroll", syncNavFromScroll);
      ScrollTrigger.removeEventListener("refresh", onStRefresh);
      if (emailScrambleRef.current !== null) {
        window.clearInterval(emailScrambleRef.current);
      }
      if (hereLabelScrambleRef.current !== null) {
        window.clearInterval(hereLabelScrambleRef.current);
      }
      removeCursorPointerListener?.();
      htmlRootEl.style.removeProperty("--bg");
      heroIntroTimelineRef.current = null;
      ctx.revert();
    };
  }, []);

  const startEmailScramble = () => {
    if (emailScrambleRef.current !== null) return;
    encryptedEmailRef.current = scrambleText(CONTACT_EMAIL);
    setDisplayEmail(encryptedEmailRef.current);
    let step = 0;

    emailScrambleRef.current = window.setInterval(() => {
      step += 1;
      const revealedEmail = `${CONTACT_EMAIL.slice(0, step)}${encryptedEmailRef.current.slice(step)}`;
      setDisplayEmail(revealedEmail);

      if (step >= CONTACT_EMAIL.length && emailScrambleRef.current !== null) {
        window.clearInterval(emailScrambleRef.current);
        emailScrambleRef.current = null;
      }
    }, 45);
  };

  const stopEmailScramble = () => {
    if (emailScrambleRef.current !== null) {
      window.clearInterval(emailScrambleRef.current);
      emailScrambleRef.current = null;
    }
    setDisplayEmail(CONTACT_EMAIL);
  };

  const startHereLabelScramble = () => {
    if (hereLabelScrambleRef.current !== null) return;
    encryptedHereLabelRef.current = scrambleText(HERE_LABEL);
    setDisplayHereLabel(encryptedHereLabelRef.current);
    let step = 0;

    hereLabelScrambleRef.current = window.setInterval(() => {
      step += 1;
      const revealedLabel = `${HERE_LABEL.slice(0, step)}${encryptedHereLabelRef.current.slice(step)}`;
      setDisplayHereLabel(revealedLabel);

      if (step >= HERE_LABEL.length && hereLabelScrambleRef.current !== null) {
        window.clearInterval(hereLabelScrambleRef.current);
        hereLabelScrambleRef.current = null;
      }
    }, 45);
  };

  const stopHereLabelScramble = () => {
    if (hereLabelScrambleRef.current !== null) {
      window.clearInterval(hereLabelScrambleRef.current);
      hereLabelScrambleRef.current = null;
    }
    setDisplayHereLabel(HERE_LABEL);
  };

  useEffect(() => {
    if (activeSection === "index") {
      backToTopHoverRef.current = false;
      setIsBackToTopHovered(false);
    }
  }, [activeSection]);

  useEffect(() => {
    stopHereLabelScramble();
  }, [activeSection]);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
    document.documentElement.style.removeProperty("--bg")
  }, [theme]);

  useEffect(() => {
    if (themeWipeTarget) {
      document.documentElement.classList.add("is-theme-wiping");
    } else {
      document.documentElement.classList.remove("is-theme-wiping");
    }
    return () => {
      document.documentElement.classList.remove("is-theme-wiping");
    };
  }, [themeWipeTarget]);

  const toggleTheme = () => {
    if (themeWipeTargetRef.current !== null) return;
    const next = theme === "dark" ? "light" : "dark";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(next);
      return;
    }
    themeWipeTargetRef.current = next;
    setThemeWipeBackdropClear(false);
    setThemeWipeTarget(next);
  };

  const handleThemeWipeEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName !== "theme-wipe-expand") return;
    const next = themeWipeTargetRef.current;
    if (!next) return;

    flushSync(() => {
      setTheme(next);
      setThemeWipeBackdropClear(true);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        themeWipeTargetRef.current = null;
        setThemeWipeBackdropClear(false);
        setThemeWipeTarget(null);
      });
    });
  };

  return (
    <>
      {themeWipeTarget ? (
        <div
          className={`theme-wipe-overlay ${themeWipeBackdropClear ? "theme-wipe-overlay--no-backdrop" : ""}`}
          onAnimationEnd={handleThemeWipeEnd}
          aria-hidden="true"
        />
      ) : null}

      <div className="portfolio-root" inert={showIntroOverlay ? true : undefined}>
      <div
        ref={cursorDotRef}
        className={`cursor-dot ${isIntroTextHovered || isEmailHovered || isPolaroidHovered ? "is-enlarged" : ""}`}
        aria-hidden="true"
      />

      {activeSection !== "index" && (
        <a
          href="#index"
          className="back-to-top"
          aria-label="Back to top"
          onClick={(e) => navigateToSection(e, "index")}
          onMouseEnter={() => {
            backToTopHoverRef.current = true;
            setIsBackToTopHovered(true);
          }}
          onMouseLeave={() => {
            backToTopHoverRef.current = false;
            setIsBackToTopHovered(false);
          }}
          onFocus={() => {
            backToTopHoverRef.current = true;
            setIsBackToTopHovered(true);
          }}
          onBlur={() => {
            backToTopHoverRef.current = false;
            setIsBackToTopHovered(false);
          }}
        >
          <span className="back-to-top-icon" aria-hidden="true">
            ↑
          </span>
        </a>
      )}
      <span
        ref={backToTopLabelRef}
        className={`back-to-top-floating-label ${isBackToTopHovered ? "is-visible" : ""}`}
        aria-hidden="true"
      >
        Back to top
      </span>

      <span
        ref={themeToggleLabelRef}
        className={`theme-toggle-floating-label ${isThemeToggleHovered ? "is-visible" : ""}`}
        aria-hidden="true"
      >
        {theme === "dark" ? "Toggle to light mode" : "Toggle to dark mode"}
      </span>

      <span
        ref={dragLabelRef}
        className={`cursor-drag-floating-label ${isPolaroidHovered ? "is-visible" : ""}`}
        aria-hidden="true"
      >
        Drag
      </span>

      <aside className="ui-right">
        <button
          type="button"
          className="theme-toggle"
          disabled={themeWipeTarget !== null}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onMouseEnter={() => {
            themeToggleHoverRef.current = true;
            setIsThemeToggleHovered(true);
          }}
          onMouseLeave={() => {
            themeToggleHoverRef.current = false;
            setIsThemeToggleHovered(false);
          }}
          onFocus={() => {
            themeToggleHoverRef.current = true;
            setIsThemeToggleHovered(true);
          }}
          onBlur={() => {
            themeToggleHoverRef.current = false;
            setIsThemeToggleHovered(false);
          }}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </aside>

      <header className="site-header">
        <div className="header-identity">
          <a
            className="mail mail-link"
            href={`mailto:${CONTACT_EMAIL}`}
            onMouseEnter={() => {
              setIsEmailHovered(true);
              startEmailScramble();
            }}
            onMouseLeave={() => {
              setIsEmailHovered(false);
              stopEmailScramble();
            }}
            onFocus={() => {
              setIsEmailHovered(true);
              startEmailScramble();
            }}
            onBlur={() => {
              setIsEmailHovered(false);
              stopEmailScramble();
            }}
          >
            {displayEmail}
          </a>
          <span className={`header-programmer ${activeSection !== "index" ? "is-visible" : ""}`}>
            PROGRAMMER
          </span>
        </div>
        <nav>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={activeSection === section.id ? "is-active" : ""}
              onClick={(e) => navigateToSection(e, section.id)}
              onMouseEnter={() => {
                setHoveredSection(section.id);
                if (activeSection === section.id) startHereLabelScramble();
              }}
              onMouseLeave={() => {
                setHoveredSection(null);
                stopHereLabelScramble();
              }}
              onFocus={() => {
                setHoveredSection(section.id);
                if (activeSection === section.id) startHereLabelScramble();
              }}
              onBlur={() => {
                setHoveredSection(null);
                stopHereLabelScramble();
              }}
            >
              {activeSection === section.id && hoveredSection === section.id
                ? displayHereLabel
                : section.label}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <section id="index" className="hero-section">
          <div className="hero-track">
            {Array.from({ length: 5 }).map((_, idx) => (
              <h1 key={idx} className="hero-line">
                PROGRAMMER
              </h1>
            ))}
          </div>

          <div className="intro" ref={introRef}>
            <p
              className="intro-fade"
              onMouseEnter={() => setIsIntroTextHovered(true)}
              onMouseLeave={() => setIsIntroTextHovered(false)}
              onFocus={() => setIsIntroTextHovered(true)}
              onBlur={() => setIsIntroTextHovered(false)}
            >
              I am Nerick Edward J. Macapayag, a dedicated Information Technology student at
              the University of Science and Technology of Southern Philippines. I have a strong passion
              for technology and enjoy building web applications, computer software, and mobile apps. I
              am also a database enthusiast, constantly improving my skills in data management and
              system design.
            </p>
            <p
              className="intro-fade"
              onMouseEnter={() => setIsIntroTextHovered(true)}
              onMouseLeave={() => setIsIntroTextHovered(false)}
              onFocus={() => setIsIntroTextHovered(true)}
              onBlur={() => setIsIntroTextHovered(false)}
            >
              Driven by curiosity and a desire to innovate, I love turning ideas into functional and
              efficient digital solutions. My journey in IT reflects both my commitment to learning and
              my hands-on approach to developing real-world projects.
            </p>
          </div>
        </section>

        <About />

        <section id="work" ref={workSectionRef} className="work-horizontal-section">
          <div ref={workInnerRef} className="work-horizontal-inner">
            <div ref={workTrackRef} className="work-horizontal-track">
              {workItems.map((item, index) => (
                <article key={item.title} className="work-horizontal-panel">
                  <div className="work-panel-inner">
                    {index === 0 && !openWorkTitle ? (
                      <h2 className="work-horizontal-heading">SELECTED WORK</h2>
                    ) : null}
                    <div
                      className={
                        openWorkTitle === item.title
                          ? "work-card flex-col items-start justify-start gap-3"
                          : "work-card"
                      }
                    >
                      <p>{item.kind}</p>
                      {item.image || item.demo || item.description ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleWorkPreview(item.title)}
                            aria-expanded={openWorkTitle === item.title}
                            className="flex items-center gap-2"
                          >
                            <h3 className="text-left">{item.title}</h3>
                            <span aria-hidden className="text-xs text-slate-400">
                              {openWorkTitle === item.title ? "[-]" : "[+]"}
                            </span>
                          </button>

                          <div
                            className={`work-preview ${openWorkTitle === item.title ? "is-open" : ""}`}
                            aria-hidden={openWorkTitle !== item.title}
                          >
                            <div className="work-preview-inner w-full">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={`${item.title} preview`}
                                  loading="lazy"
                                  className="mb-3 aspect-[16/9] w-full rounded-xl border border-slate-700/70 object-cover"
                                />
                              ) : null}
                              {item.description ? (
                                <p className="mb-3 text-sm leading-relaxed text-slate-300/90">
                                  {item.description}
                                </p>
                              ) : null}
                              {item.demo ? (
                                <a
                                  href={item.demo}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex w-fit items-center justify-center rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-200/90 transition hover:border-sky-500/50 hover:bg-slate-900/60 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                                >
                                  Visit site
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </>
                      ) : (
                        <h3>{item.title}</h3>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

      <Contact
          isThemeWiping={themeWipeTarget !== null}
          onPolaroidHoverChange={(hovered, cx, cy) => {
            const el = dragLabelRef.current;
            if (el) {
              if (hovered && cx !== undefined && cy !== undefined) {
                el.style.left = `${cx + 22}px`;
                el.style.top = `${cy - 30}px`;
                el.style.transform = "";
              } else if (!hovered) {
                el.style.left = "-9999px";
                el.style.top = "-9999px";
                el.style.transform = "";
              }
            }
            polaroidHoverRef.current = hovered;
            setIsPolaroidHovered(hovered);
          }}
        />
      </main>
    </div>

      {showIntroOverlay ? (
        <IntroOverlay theme={theme} onComplete={handleIntroComplete} />
      ) : null}
    </>
  );
}
