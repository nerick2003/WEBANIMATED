import brimsImage from "./assets/BRIMS.png";
import oldPortfolioImage from "./assets/OLDPORT.png";

/** Used by Contact and can be shared with header / mail links */
export const CONTACT_EMAIL = "nerickjanio77@gmail.com";
export const LINKEDIN_URL = "https://www.linkedin.com/in/nerick-edward-macapayag-b72922381";

export const navItems = [
  { label: "Home", id: "hero" },
  { label: "About", id: "about" },
  { label: "Skills", id: "skills" },
  { label: "Projects", id: "projects" },
  { label: "Education", id: "education" },
  { label: "Contact", id: "contact" },
];

export const skills = [
  { name: "React", level: 88 },
  { name: "JavaScript", level: 85 },
  { name: "TypeScript", level: 74 },
  { name: "Python", level: 80 },
  { name: "Tailwind CSS", level: 82 },
  { name: "Node.js", level: 70 },
  { name: "Dart", level: 76 },
  { name: "Flutter", level: 78 },
];

export type Project = {
  title: string;
  description: string;
  tech: string[];
  demo: string;
  github: string;
  image?: string;
};

export const projects: Project[] = [
  {
    title: "Student Task Manager",
    description:
      "A productivity app for managing assignments, deadlines, and course schedules with reminders.",
    tech: ["React", "Firebase", "Tailwind"],
    demo: "#",
    github: "#",
  },
  {
    title: "Campus Event Portal",
    description:
      "A responsive portal to browse and register for university events with role-based access.",
    tech: ["React", "Node.js", "MongoDB"],
    demo: "#",
    github: "#",
  },
  {
    title: "Expense Tracker",
    description:
      "A clean dashboard that tracks spending categories and visualizes monthly budget trends.",
    tech: ["React", "Chart.js", "Express"],
    demo: "#",
    github: "#",
  },
  {
    title: "BRIMS (Web System)",
    description:
      "A role-based barangay resident information system built with Angular + Firebase, including admin/staff dashboards, resident certificate requests, and in-app notifications.",
    tech: ["Angular", "Firebase", "TypeScript"],
    demo: "https://brims-2028e.web.app/",
    github: "#",
    image: brimsImage,
  },
  {
    title: "Portfolio v1",
    description:
      "My first personal website focused on clean UI, responsive behavior, and project storytelling.",
    tech: ["HTML", "CSS", "JavaScript"],
    demo: "https://nerick2003.github.io/WEB-PORTFOLIO/",
    github: "#",
    image: oldPortfolioImage,
  },
];
