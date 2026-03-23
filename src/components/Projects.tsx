import { projects } from "../data";
import SectionTitle from "./SectionTitle";

export default function Projects() {
  return (
    <section id="projects" className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8">
      <SectionTitle
        eyebrow="Projects"
        title="Selected work and case studies"
        description="These projects demonstrate my skills in building responsive, user-friendly
        solutions for real problems."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.title}
            className="project-card section-card group flex h-full flex-col p-6 transition"
          >
            {project.image ? (
              <a
                href={project.demo}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.title} - Live demo`}
                className="block"
              >
                <img
                  src={project.image}
                  alt={`${project.title} preview`}
                  className="mb-4 aspect-[16/9] w-full rounded-xl border border-slate-700/70 object-cover"
                  loading="lazy"
                />
              </a>
            ) : null}
            <h3 className="text-xl font-semibold text-white">{project.title}</h3>
            <p className="mt-3 flex-grow text-slate-300">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tech.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="mt-5 flex gap-4 text-sm">
              <a href={project.demo} className="text-primary transition hover:text-sky-300">
                Live Demo
              </a>
              <a href={project.github} className="text-primary transition hover:text-sky-300">
                GitHub
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
