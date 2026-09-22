import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useApi } from '../lib/hooks';
import { Avatar } from './ui';

type MenuLink = { label: string; to: string; code?: string; ico?: string; isNew?: boolean };
type Menu = { key: string; label: string; wide?: boolean; groups: Array<{ title: string; links: MenuLink[] }>; foot?: MenuLink };
const MENUS: Menu[] = [
  { key: 'company', label: 'nav.company', groups: [
    { title: 'Our Story', links: [{ label: 'About Us', to: '/company/about' }, { label: 'What is Lawmads®', to: '/company/what-is-lawmads' }, { label: 'Mission & Vision', to: '/company/mission' }, { label: 'Our Team', to: '/company/team' }] },
    { title: 'Resources', links: [{ label: 'Legal Database', to: '/law' }, { label: 'Law Textbooks Library', to: '/company/textbooks' }, { label: 'Community', to: '/community' }, { label: 'Podcast', to: '/podcast' }, { label: 'Blog & News', to: '/blog' }, { label: 'Success Stories', to: '/company/success-stories' }] },
    { title: 'Support', links: [{ label: 'Help Center', to: '/company/help' }, { label: 'Contact Us', to: '/schedule' }, { label: 'FAQ', to: '/company/faq' }, { label: 'Partnerships', to: '/company/partnerships' }] },
    { title: 'Legal', links: [{ label: 'Terms of Service', to: '/company/terms' }, { label: 'Privacy Policy', to: '/company/privacy' }, { label: 'Accreditation', to: '/company/accreditation' }, { label: 'Careers', to: '/company/careers' }] }
  ], foot: { label: 'Learn more about Lawmads® →', to: '/company/about' } },
  { key: 'programs', label: 'nav.programs', wide: true, groups: [
    { title: 'Legal Design Thinking', links: [{ label: 'Design Thinking Foundations', to: '/programs/ldt', code: 'LDT®', ico: 'Fg' }, { label: 'Legal UI Designer', to: '/programs/luid', code: 'LUID®', ico: 'Fg' }, { label: 'Legal UX Designer', to: '/programs/luxd', code: 'LUxD®', ico: 'XD' }, { label: 'Legal System Designer', to: '/programs/lsd', code: 'LSD®', ico: 'UML' }] },
    { title: 'Technology & Web', links: [{ label: 'Legal Tech Specialist', to: '/programs/lts', code: 'LTS®', ico: 'VS' }, { label: 'Legal Tech Engineer', to: '/programs/lte', code: 'LTE®', ico: 'TS' }, { label: 'Front-End Developer', to: '/programs/lwd-f', code: 'LWD-F®', ico: 'H5' }, { label: 'Back-End Developer', to: '/programs/lwd-b', code: 'LWD-B®', ico: 'Nd' }, { label: 'Full Stack JS Developer', to: '/programs/lwd-fs', code: 'LWD-FS®', ico: 'JS' }, { label: 'Mobile App Developer', to: '/programs/lwd-m', code: 'LWD-M®', ico: 'Fl' }] },
    { title: 'Data · Blockchain · Cyber', links: [{ label: 'Legal Data Analyst', to: '/programs/lda', code: 'LDA®', ico: 'Py' }, { label: 'Legal Data Scientist', to: '/programs/lds', code: 'LDS®', ico: 'TF' }, { label: 'Blockchain Architect', to: '/programs/lba', code: 'LBA®', ico: 'Sol' }, { label: 'Blockchain Developer', to: '/programs/lbd', code: 'LBD®', ico: 'Sol' }, { label: 'OSINT Analyst', to: '/programs/losint', code: 'LOSINT®', ico: 'Ka' }, { label: 'Cyber Security Specialist', to: '/programs/lcs', code: 'LCS®', ico: 'Lx' }] },
    { title: 'Jurisdictions', links: [{ label: 'All badge exams', to: '/badges', code: '9' }, { label: 'Build a path', to: '/track-designer', isNew: true }, { label: 'Egypt', to: '/badges/egypt' }, { label: 'United Kingdom', to: '/badges/united-kingdom' }, { label: 'United Arab Emirates', to: '/badges/united-arab-emirates' }, { label: 'Saudi Arabia', to: '/badges/saudi-arabia' }, { label: 'Netherlands', to: '/badges/netherlands' }, { label: 'Germany', to: '/badges/germany' }] },
    { title: 'Diplomas & Careers', links: [{ label: 'E-Commerce Diploma', to: '/programs/ecom', ico: 'Wo' }, { label: 'AI Copilot Diploma', to: '/programs/aicp', code: 'AICP', ico: 'CL' }, { label: 'Career Certificates', to: '/programs/career' }, { label: 'Jurisdiction Badge Exams', to: '/badges' }] }
  ], foot: { label: 'View all programs →', to: '/programs' } },
  { key: 'courses', label: 'nav.courses', groups: [
    { title: 'Design Courses', links: [{ label: 'Figma for Legal Designers', to: '/courses/figma-for-legal-designers', ico: 'Fg' }, { label: 'Adobe XD Essentials', to: '/courses/adobe-xd-essentials', ico: 'XD' }, { label: 'Legal Prototyping', to: '/courses/legal-prototyping' }, { label: 'Design Systems', to: '/courses/design-systems' }] },
    { title: 'Development Courses', links: [{ label: 'JavaScript Fundamentals', to: '/courses/javascript-fundamentals', ico: 'JS' }, { label: 'React Development', to: '/courses/react-development', ico: 'Re' }, { label: 'TypeScript Mastery', to: '/courses/typescript-mastery', ico: 'TS' }, { label: 'Node.js & Express', to: '/courses/node-express', ico: 'Nd' }, { label: 'Python for Lawyers', to: '/courses/python-for-lawyers', ico: 'Py' }] },
    { title: 'Data & AI Courses', links: [{ label: 'Data Analysis with Pandas', to: '/courses/data-analysis-pandas', ico: 'Pd' }, { label: 'Machine Learning Basics', to: '/courses/machine-learning-basics', ico: 'TF' }, { label: 'Prompt Engineering', to: '/courses/prompt-engineering', ico: 'CL' }, { label: 'LLM Fine-Tuning', to: '/courses/llm-fine-tuning' }] },
    { title: 'Specialized Topics', links: [{ label: 'Smart Contracts', to: '/courses/smart-contracts', ico: 'Sol' }, { label: 'API Development', to: '/courses/api-development' }, { label: 'Database Design', to: '/courses/database-design', ico: 'Pg' }, { label: 'Legal Automation', to: '/courses/legal-automation', ico: 'n8n' }] }
  ], foot: { label: 'Browse all courses →', to: '/courses' } },
  { key: 'tools', label: 'nav.tools', groups: [
    { title: 'Learn & Practice', links: [{ label: 'IDE Playground — 18 languages', to: '/ide', ico: '</>' }, { label: 'Lesson Player', to: '/learn/luid/luid-a2-ui-design-patterns', ico: '▶' }, { label: 'My Dashboard & Transcript', to: '/dashboard', ico: '◈' }] },
    { title: 'Professional Tools', links: [{ label: 'AI Web Builder', to: '/builder', isNew: true, ico: '✦' }, { label: 'Lawyer Work Space AI', to: '/workspace', isNew: true, ico: '✎' }, { label: 'Bilingual Law Database', to: '/law', ico: '◉' }] },
    { title: 'Community', links: [{ label: 'Lawyer Who® Network', to: '/community', ico: '●' }, { label: 'Live Sessions & Workshops', to: '/community#sessions', ico: '◔' }, { label: 'E-Shop & Tees Projects', to: '/shop', ico: '👕' }] }
  ], foot: { label: 'Open the IDE Playground →', to: '/ide' } },
  { key: 'ai', label: 'nav.ai', groups: [
    { title: 'AI Programs', links: [{ label: 'AI Copilot Diploma', to: '/programs/aicp', code: 'AICP', ico: 'CL' }, { label: 'Claude for Beginners', to: '/programs/cfb', code: 'CFB®', ico: 'CL' }, { label: 'Claude Master', to: '/programs/cm', code: 'CM®', ico: 'CL+' }, { label: 'Agentic AI', to: '/programs/aai', code: 'AAI®', ico: 'MCP' }, { label: 'Automation with n8n', to: '/programs/lna', code: 'LNA®', ico: 'n8n' }, { label: 'Cursor Power User', to: '/programs/cur', code: 'CUR®', ico: 'Cur' }] },
    { title: 'Legal LLM Models', links: [{ label: 'Lawmad-Draft — AI drafting', to: '/ai#lawmad-draft' }, { label: 'Lawmad-Precedent — AI Wizard', to: '/ai#lawmad-precedent' }, { label: 'Lawmad-Tutor — Legal Code Tutor', to: '/ai#lawmad-tutor' }, { label: 'All models & supervision →', to: '/ai' }] },
    { title: 'Agentic Labs', links: [{ label: 'n8n Workflow Canvas', to: '/ide/n8n', ico: 'n8n' }, { label: 'Cursor — AI IDE Track', to: '/ide/cursor', ico: 'Cur' }, { label: 'AI Tutor inside the IDE', to: '/ide', ico: 'CL' }] }
  ], foot: { label: 'Explore the Lawmad® model family →', to: '/ai' } }
];

function Logo() { return <Link to="/" className="logo" aria-label="Lawmads home"><span className="cap">^</span>Lawmads<sup>®</sup></Link>; }

export default function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const closeTimer = useRef<number | null>(null);
  useEffect(() => { setOpen(null); setDrawer(false); }, [loc.pathname]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setDrawer(false); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  const enter = (k: string) => { if (closeTimer.current) window.clearTimeout(closeTimer.current); setOpen(k); };
  const leave = () => { closeTimer.current = window.setTimeout(() => setOpen(null), 380); };
  const stats = useApi<any>('/catalog/stats');
  const isIde = loc.pathname.startsWith('/ide/') || loc.pathname.startsWith('/workspace');
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      {!isIde && <div className="announce">New: The Lawmads IDE — {stats.data?.languages ?? 18} languages + agentic-AI tracks (n8n · Cursor), {stats.data?.gradedExercises ?? 57} graded exercises.<Link to="/ide">Try it now</Link></div>}
      {!isIde && <div className="promo">🎓 Founding Lawmads offer — 30% off Lawmad Pro annual for the first 500 members · code <span className="code">DELTA30</span><Link to="/checkout/plan_pro_annual?promo=DELTA30" className="btn btn--sm">Claim the offer →</Link></div>}
      <header className="header">
        <div className="wrap header__in">
          <Logo />
          <nav className="nav" aria-label="Primary">
            {MENUS.map((m) => (
              <div key={m.key} className="nav__item" data-open={open === m.key} onMouseEnter={() => enter(m.key)} onMouseLeave={leave}>
                <button className="nav__btn" aria-expanded={open === m.key} aria-haspopup="true" onClick={() => setOpen(open === m.key ? null : m.key)}>{t(m.label)} <span className="caret">▼</span></button>
                <div className={`mega${m.wide ? ' mega--wide' : ''}`} role="menu">
                  <div className="mega__cols">
                    {m.groups.map((g) => <div key={g.title} className="mega__group"><h4>{g.title}</h4>{g.links.map((l) => <Link key={l.to + l.label} className="mega__link" to={l.to} role="menuitem">{l.ico && <span className="ico">{l.ico}</span>}{l.label}{l.code && <sup>{l.code}</sup>}{l.isNew && <span className="new">NEW</span>}<span className="go">→</span></Link>)}</div>)}
                  </div>
                  {m.foot && <Link to={m.foot.to} className="mega__foot">{m.foot.label}</Link>}
                </div>
              </div>
            ))}
            <NavLink to="/pricing" className="nav__btn">{t('nav.pricing')}</NavLink>
          </nav>
          <div className="header__right">
            <Link to="/track-designer" className="nav__btn track">{t('nav.track')}</Link>
            <button className="nav__btn" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')} aria-label="Switch language" title="EN / العربية">{locale === 'en' ? 'ع' : 'EN'}</button>
            {user ? (
              <>
                <Link to="/dashboard" className="signin">{t('nav.dashboard')}</Link>
                <button className="nav__btn" style={{ padding: 0 }} onClick={() => nav('/dashboard/settings')} aria-label="Account"><Avatar initials={user.initials} /></button>
              </>
            ) : (
              <>
                <Link to="/signin" className="signin">{t('nav.signin')}</Link>
                <Link to="/get-started" className="btn btn--sm">{t('nav.getstarted')}</Link>
              </>
            )}
            <button className="burger" aria-label="Open menu" onClick={() => setDrawer(true)}>☰</button>
          </div>
        </div>
      </header>
      {drawer && (
        <div className="drawer" onClick={() => setDrawer(false)}>
          <div className="drawer__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Menu">
            <div className="drawer__head"><Logo /><button className="burger" aria-label="Close menu" onClick={() => setDrawer(false)}>×</button></div>
            <div className="drawer__group"><h4>Explore</h4><Link to="/programs">Programs & certifications</Link><Link to="/courses">Course library</Link><Link to="/track-designer">Design your track</Link><Link to="/pricing">Pricing</Link><Link to="/community">Community</Link></div>
            <div className="drawer__group"><h4>Build & practise</h4><Link to="/ide">IDE Playground</Link><Link to="/workspace">Lawyer Work Space</Link><Link to="/law">Legal database</Link><Link to="/ai">Legal AI models</Link><Link to="/builder">AI Web Builder</Link></div>
            <div className="drawer__group"><h4>Credentials & network</h4><Link to="/badges">Jurisdiction badge exams</Link><Link to="/dashboard">My dashboard</Link><Link to="/shop">Community shop</Link></div>
            <div className="drawer__group"><h4>Company & media</h4><Link to="/company/about">About Lawmads</Link><Link to="/blog">Blog & news</Link><Link to="/podcast">Podcast</Link><Link to="/schedule">Contact</Link></div>
            {user ? <button className="btn btn--outline" onClick={() => logout().then(() => nav('/'))}>{t('nav.signout')}</button> : <div style={{ display: 'grid', gap: 8 }}><Link to="/signin" className="btn btn--outline">{t('nav.signin')}</Link><Link to="/get-started" className="btn">{t('nav.getstarted')}</Link></div>}
          </div>
        </div>
      )}
      <main id="main">{children}</main>
      {!isIde && <Footer members={stats.data?.members} chapters={stats.data?.cityChapters} />}
    </>
  );
}

function Footer({ members, chapters }: { members?: number; chapters?: number }) {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div><Logo /><p className="muted" style={{ marginTop: 14, maxWidth: 300 }}>{t('footer.tagline')}</p><p className="mono" style={{ fontSize: 12, color: '#B9B9B6' }}>{members?.toLocaleString() ?? '—'} members · {chapters ?? 14} chapters</p></div>
          <div><h4>Platform</h4><Link to="/ide">IDE Playground</Link><Link to="/learn/luid/luid-a2-ui-design-patterns">Lesson Player</Link><Link to="/builder">AI Web Builder</Link><Link to="/workspace">Lawyer Work Space AI</Link><Link to="/law">Law Database</Link><Link to="/law/explorer">Bilingual Law Explorer</Link><Link to="/ai">AI Models</Link></div>
          <div><h4>Certifications</h4><Link to="/programs/luid">LUID® — UI Designer</Link><Link to="/programs/lts">LTS® — Tech Specialist</Link><Link to="/programs/lds">LDS® — Data Scientist</Link><Link to="/programs/lwd-fs">LWD-FS® — Full Stack</Link><Link to="/programs/aicp">AI Copilot Diploma</Link><Link to="/badges">Badge Exams</Link></div>
          <div><h4>Learn</h4><Link to="/track-designer">◈ Design your track</Link><Link to="/badges">Badge exams</Link><Link to="/courses">All Courses</Link><Link to="/programs">All Programs</Link><Link to="/podcast">Podcast</Link><Link to="/blog">Blog & News</Link><Link to="/community">Community</Link><Link to="/shop">E-Shop</Link></div>
          <div><h4>Company</h4><Link to="/company/about">About Us</Link><Link to="/company/mission">Mission & Vision</Link><Link to="/company/team">Our Team</Link><Link to="/company/careers">Careers</Link><Link to="/company/partnerships">Partnerships</Link><Link to="/pricing">Pricing</Link><Link to="/schedule">Book a Call</Link><Link to="/signin">Sign In</Link></div>
        </div>
        <div className="footer__legal"><span>© 2026 Lawmads® · The Legal Technology Academy · Lawmads® is a registered trademark.</span><span><Link to="/company/privacy" style={{ display: 'inline' }}>Privacy Policy</Link> · <Link to="/company/terms" style={{ display: 'inline' }}>Terms of Service</Link> · <Link to="/company/accreditation" style={{ display: 'inline' }}>Accreditation</Link></span><span>Created & developed by <strong>Law Tech Labs</strong></span></div>
      </div>
    </footer>
  );
}
