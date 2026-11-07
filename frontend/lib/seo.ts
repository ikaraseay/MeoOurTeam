import { site } from './site.ts';
/** Public identity metadata. Authored articles supply their own BlogPosting. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': new URL('/#organization', site.url).href,
    name: site.lab.name,
    description: site.description,
    url: new URL('/', site.url).href,
    parentOrganization: {
      '@type': 'CollegeOrUniversity',
      name: site.institutions[0].name,
      url: site.institutions[0].href,
      department: { '@type': 'Organization', name: site.academy.name, url: site.academy.homepage },
    },
  };
}
export const siteIcons = {
  svg: site.branding.favicon,
  png: site.branding.faviconPng,
  ico: site.branding.faviconIco,
  apple: site.branding.appleIcon,
} as const;
/** A custom share image is normalized to the standard 1200×630 card. */
export const socialImage = site.branding.socialImage
  ? { src: site.branding.socialImage, width: 1200, height: 630, alt: site.name }
  : site.researchVisuals.robotics;
export function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
}
