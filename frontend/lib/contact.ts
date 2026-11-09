import { t } from './text-config.ts';
import { site } from './site.ts';

/** Graduate codes and application steps transcribed from the supplied 2026 PDF.
 * Update the year-specific copy and PDF together; these are not live vacancies.
 */
export const graduatePrograms = [
  { title: t('contact.masters'), items: [
    { code: '081200', name: t('contact.programComputerScience') },
    { code: '083900', name: t('contact.programCyberspace') },
    { code: '085404', name: t('contact.programComputerTechnology') },
    { code: '085405', name: t('contact.programSoftware') },
    { code: '085410', name: t('contact.programAI') },
    { code: '085411', name: t('contact.programBigData') },
    { code: '085412', name: t('contact.programInformationSecurity') },
  ] },
  { title: t('contact.doctoral'), items: [
    { code: '083900', name: t('contact.programCyberspace') },
    { code: '085412', name: t('contact.programInformationSecurity') },
  ] },
];
export const applicationMaterials = [t('contact.materialResume'), t('contact.materialTranscript'), t('contact.materialExam')];
export const interviewPreparation = [t('contact.interviewPresentation'), t('contact.interviewCode'), t('contact.interviewTranslation')];
export const recruitmentDocument = site.contact.recruitmentDocument;
export const facultyMailto = `mailto:${site.contact.email}?subject=${encodeURIComponent(t('contact.facultySubject'))}`;
export const graduateMailto = `mailto:${site.contact.email}?cc=${encodeURIComponent(site.contact.graduateCc.join(','))}&subject=${encodeURIComponent(t('contact.studentSubject'))}`;

export const contactFaq = [
  { question: t('contact.questionResearch'), answer: t('contact.answerResearch') },
  { question: t('contact.questionCampus'), answer: t('contact.answerCampus') },
  { question: t('contact.questionMaterials'), answer: t('contact.answerMaterials') },
  { question: t('contact.questionOpenings'), answer: t('contact.answerOpenings') },
];
