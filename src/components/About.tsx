import type { IconType } from "react-icons";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, useRef } from "react";
import {
  SiAngular,
  SiCplusplus,
  SiCss,
  SiDart,
  SiFirebase,
  SiFlutter,
  SiGreensock,
  SiHtml5,
  SiJavascript,
  SiMongodb,
  SiMysql,
  SiOpenjdk,
  SiPostgresql,
  SiPython,
  SiReact,
  SiSharp,
  SiSupabase,
  SiTailwindcss,
} from "react-icons/si";

gsap.registerPlugin(ScrollTrigger);

type TechItem = { name: string; Icon: IconType };

const PROGRAMMING_LANGUAGES: TechItem[] = [
  { name: "HTML5", Icon: SiHtml5 },
  { name: "CSS3", Icon: SiCss },
  { name: "JavaScript", Icon: SiJavascript },
  { name: "C++", Icon: SiCplusplus },
  { name: "C#", Icon: SiSharp },
  { name: "Python", Icon: SiPython },
  { name: "Java", Icon: SiOpenjdk },
  { name: "Dart", Icon: SiDart },
];

const FRAMEWORKS: TechItem[] = [
  { name: "React", Icon: SiReact },
  { name: "Angular", Icon: SiAngular },
  { name: "Flutter", Icon: SiFlutter },
  { name: "Tailwind CSS", Icon: SiTailwindcss },
  { name: "GSAP", Icon: SiGreensock },
];

const DATABASES: TechItem[] = [
  { name: "MongoDB", Icon: SiMongodb },
  { name: "Firebase", Icon: SiFirebase },
  { name: "Supabase", Icon: SiSupabase },
  { name: "MySQL", Icon: SiMysql },
  { name: "PostgreSQL", Icon: SiPostgresql },
];

const TILE_CLASS =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-soft)] transition hover:border-[var(--line)] hover:text-[var(--text)] md:h-12 md:w-12";
const ICON_CLASS = "h-6 w-6 shrink-0 fill-current md:h-7 md:w-7";

function TechRow({ label, items }: { label: string; items: TechItem[] }) {
  return (
    <div className="tech-stack-row">
      <p className="tech-stack-label mb-3 text-center text-[0.65rem] font-medium uppercase tracking-[0.22em] text-[var(--text-dim)]">
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-3 md:gap-4">
        {items.map(({ name, Icon }) => (
          <span key={name} title={name} className={`${TILE_CLASS} tech-stack-tile`}>
            <Icon className={ICON_CLASS} aria-hidden />
            <span className="sr-only">{name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rows = gsap.utils.toArray<HTMLElement>(section.querySelectorAll(".tech-stack-row"));
    if (!rows.length) return;

    const ctx = gsap.context(() => {
      const hidden = { opacity: 0, y: 14 };
      rows.forEach((row) => {
        const label = row.querySelector<HTMLElement>(".tech-stack-label");
        const tiles = row.querySelectorAll<HTMLElement>(".tech-stack-tile");
        if (label) gsap.set(label, hidden);
        gsap.set(tiles, hidden);
      });

      const tl = gsap.timeline({ paused: true });
      rows.forEach((row) => {
        const label = row.querySelector<HTMLElement>(".tech-stack-label");
        const tiles = row.querySelectorAll<HTMLElement>(".tech-stack-tile");
        if (label) {
          tl.to(label, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
        }
        if (tiles.length) {
          tl.to(
            tiles,
            {
              opacity: 1,
              y: 0,
              duration: 0.42,
              stagger: 0.07,
              ease: "power2.out",
            },
            "-=0.15",
          );
        }
      });

      const applyHidden = () => {
        rows.forEach((row) => {
          const label = row.querySelector<HTMLElement>(".tech-stack-label");
          const tiles = row.querySelectorAll<HTMLElement>(".tech-stack-tile");
          if (label) gsap.set(label, hidden);
          gsap.set(tiles, hidden);
        });
        tl.pause(0);
      };

      const play = () => {
        tl.restart();
      };

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 80%",
        invalidateOnRefresh: true,
        onEnter: play,
        onEnterBack: play,
        onLeave: applyHidden,
        onLeaveBack: applyHidden,
      });

      const syncIfAlreadyInView = () => {
        ScrollTrigger.refresh();
        if (st.progress >= 1) {
          tl.progress(1);
        } else if (st.isActive) {
          play();
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(syncIfAlreadyInView);
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-12"
      aria-label="Technologies"
    >
      <div className="about-parallax flex flex-col gap-10 will-change-transform md:gap-12">
        <TechRow label="Programming languages" items={PROGRAMMING_LANGUAGES} />
        <TechRow label="Frameworks & libraries" items={FRAMEWORKS} />
        <TechRow label="Databases" items={DATABASES} />
      </div>
    </section>
  );
}
