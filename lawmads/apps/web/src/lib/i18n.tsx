/** EN/AR shell strings with RTL direction switching. Content from the API is bilingual where the data is. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
type Locale = 'en' | 'ar';
const DICT: Record<string, { en: string; ar: string }> = {
  'nav.company': { en: 'Company', ar: 'الشركة' }, 'nav.programs': { en: 'Programs', ar: 'البرامج' }, 'nav.courses': { en: 'Courses', ar: 'الدورات' }, 'nav.tools': { en: 'Tools', ar: 'الأدوات' }, 'nav.ai': { en: 'AI', ar: 'الذكاء الاصطناعي' }, 'nav.pricing': { en: 'Pricing', ar: 'الأسعار' },
  'nav.signin': { en: 'Sign In', ar: 'تسجيل الدخول' }, 'nav.getstarted': { en: 'Get Started', ar: 'ابدأ الآن' }, 'nav.track': { en: '◈ Design your track', ar: '◈ صمّم مسارك' }, 'nav.dashboard': { en: 'Dashboard', ar: 'لوحتي' }, 'nav.signout': { en: 'Sign out', ar: 'تسجيل الخروج' },
  'hero.eyebrow': { en: 'The Legal Technology Academy — by Law Tech Labs', ar: 'أكاديمية التكنولوجيا القانونية — من Law Tech Labs' },
  'hero.title': { en: 'Legal training for the Delta Generation of lawyers.', ar: 'تدريب قانوني لجيل دلتا من المحامين.' },
  'hero.highlight': { en: 'Delta Generation', ar: 'جيل دلتا' },
  'hero.sub': { en: 'Learn design, development and data science by practice — blended with the law that governs them. Earn digitally signed, QR-verifiable certifications recognized across nine jurisdictions.', ar: 'تعلّم التصميم والتطوير وعلم البيانات بالممارسة — ممزوجًا بالقانون الذي يحكمها. واحصل على شهادات موقّعة رقميًا وقابلة للتحقق عبر QR في تسع ولايات قضائية.' },
  'cta.explore': { en: 'Explore Certifications →', ar: 'استكشف الشهادات ←' }, 'cta.ide': { en: 'Try the IDE Playground', ar: 'جرّب بيئة البرمجة' },
  'footer.tagline': { en: 'The Legal Technology Academy. Training the Delta Generation of lawyers in design, code and data science.', ar: 'أكاديمية التكنولوجيا القانونية. تدريب جيل دلتا من المحامين في التصميم والبرمجة وعلم البيانات.' },
  'loading': { en: 'Loading…', ar: 'جارٍ التحميل…' }, 'error': { en: 'Something went wrong.', ar: 'حدث خطأ ما.' }
};
const Ctx = createContext<{ locale: Locale; setLocale(l: Locale): void; t(k: string): string; dir: 'ltr' | 'rtl' }>(null as any);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => { try { return (localStorage.getItem('lawmads.locale') as Locale) || 'en'; } catch { return 'en'; } });
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = dir; }, [locale, dir]);
  const setLocale = (l: Locale) => { setLocaleState(l); try { localStorage.setItem('lawmads.locale', l); } catch { /* ignore */ } };
  const t = (k: string) => DICT[k]?.[locale] ?? DICT[k]?.en ?? k;
  return <Ctx.Provider value={{ locale, setLocale, t, dir }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
