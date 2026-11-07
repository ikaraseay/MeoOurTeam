import { t } from './text-config.ts';
import { normalizeSiteIdentity } from './site-identity.ts';
import identitySnapshot from '../../data/runtime/site-identity.json' with { type: 'json' };

const identity = normalizeSiteIdentity(identitySnapshot);

/** Responsive renditions of curated public images; widths describe real files. */
const imageAsset = (name: string, width: number, height: number) => ({
  src: `/images/showcase/${name}.webp`,
  srcSet: `/images/showcase/${name}-640.webp 640w, /images/showcase/${name}.webp ${width}w`,
  width,
  height,
});
const images = {
  campus: imageAsset("academy-campus", 1138, 759),
  robotics: imageAsset("robotics-lab", 1200, 675),
  vision: imageAsset("research-vision", 1440, 960),
  agriculture: imageAsset("agriculture-platform", 1000, 492),
};

const primaryNavigation = [
    { href: "/", label: t("site.label004") },
    { href: "/members/", label: t("site.label005") },
    { href: "/research/", label: t("hero.text003") },
    { href: "/projects/", label: t("projects.title001") },
    { href: "/outcomes/", label: t("outcomes.title001") },
    { href: "/contact/", label: t("site.label006") },
    { href: "/news/", label: t("news.text004") },
] as const;

/**
 * Central site configuration — the single source of truth for all
 * content that appears in more than one place across the site.
 *
 * Why this file exists:
 *   The site name, navigation links, professor info, and contact
 *   details were previously duplicated across Navbar.astro,
 *   Hero.astro, Contact.astro, Layout.astro, and rss.xml.ts.
 *   Editing one place (e.g. the contact email) required touching
 *   five files and forgetting one produced drift.
 *
 *   Now every component imports what it needs from here.
 */
export const site = {
  /** Display name used in the navbar brand and page titles. */
  name: t("site.name001"),
  /** Full title used in the <title> tag and RSS feed. */
  fullTitle: t("site.fulltitle002"),
  /** Meta description / RSS description. */
  description: t("site.description003"),
  /** Canonical base URL. Replace with the real production domain. */
  url: process.env.SITE_URL ?? "https://example.com",
  /** ISO language code for <html lang> and RSS. */
  language: "zh-CN",

  /** Branding assets are editable in the admin and published at build time. */
  branding: {
    favicon: identity.favicon,
    faviconPng: identity.faviconPng,
    faviconIco: identity.faviconIco,
    appleIcon: identity.appleIcon,
    socialImage: identity.socialImage,
    themeColor: identity.themeColor,
  },

  /** Local identity assets; use the existing theme-aware presentation without distortion. */
  institutions: [
    { name: t("identity.university"), href: "https://example.com/", logo: identity.universityLogo, width: 442, height: 72 },
    { name: t("site.name020"), href: "https://example.com/academy", logo: identity.academyLogo, width: 495, height: 113 },
  ],
  /** Transparent footer mark; replace the file or override it in the admin. */
  footerLogo: { src: identity.footerLogo, width: 225, height: 144 },
  /** Replace image paths/captions here, then publish a fresh build. */
  showcase: [
    { ...images.campus, alt: t("visuals.campusAlt"), title: t("visuals.campusTitle"), caption: t("visuals.campusCaption"), href: "https://example.com/academy" },
    { ...images.robotics, alt: t("visuals.robotAlt"), title: t("visuals.robotTitle"), caption: t("visuals.robotCaption"), href: "/outcomes/" },
    { ...images.vision, alt: t("visuals.visionAlt"), title: t("visuals.visionTitle"), caption: t("visuals.visionCaption"), href: "/research/" },
  ],
  researchVisuals: {
    vision: { ...images.vision, alt: t("visuals.visionAlt"), caption: t("visuals.visionCaption") },
    robotics: { ...images.robotics, alt: t("visuals.robotAlt"), caption: t("visuals.robotCaption") },
    agriculture: { ...images.agriculture, alt: t("visuals.agricultureAlt"), caption: t("visuals.agricultureCaption") },
  },

  /** Primary navigation (used by Navbar). */
  nav: primaryNavigation,

  /** Keep public navigation labels and routes aligned. */
  footerNav: primaryNavigation,

  lab: {
    name: t("site.name001"),
    shortName: t("site.shortname007"),
    intro: t("site.intro008"),
    mission: t("site.mission009"),
    advisor: t("site.advisor010"),
    platform: t("site.platform011"),
  },

  professor: {
    name: t("site.name012"),
    englishName: t("site.professorEnglishName"),
    role: t("home.text009"),
    /** One-line summary used in the footer tagline. */
    affiliation: t("site.affiliation013"),
    /** Full biography paragraph shown in the Hero. */
    bio: t("site.bio014"),
    /** Quick stats shown under the hero CTA. */
    stats: [
      { label: t("site.label015"), value: t("site.value016") },
      { label: t("site.label017"), value: t("site.platform011") },
      { label: t("site.label018"), value: t("site.value019") },
    ],
  },

  academy: {
    name: t("site.name020"),
    /** 学院与研究院分别保留官方入口，避免混用。 */
    homepage: "https://example.com/academy",
    institute: {
      name: t("identity.institute"),
      homepage: "https://example.com/institute",
      logo: identity.academyLogo,
      width: 495,
      height: 113,
    },
    /** Facts listed in the "about" section. */
    facts: [
      { label: t("hero.text003"), value: t("site.value021") },
      { label: t("site.label022"), value: t("site.value023") },
      { label: t("site.label024"), value: t("site.value025") },
    ],
  },

  contact: {
    /** Replace with the public academic contact for this installation. */
    email: "contact@example.com",
    /** Optional additional recipients for graduate applications. */
    graduateCc: [],
    /** 学院通讯地址（示例占位）。 */
    address: t("site.address026"),
    homepage: "https://example.com/academy",
  },

  /** RSS feed metadata. */
  rss: {
    title: t("site.title027"),
    description: t("site.description028"),
  },
} as const;

export type SiteConfig = typeof site;
