import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { useI18n } from '../lib/i18n';
import { usd } from '../lib/format';
import { Section, SectionHead, Eyebrow, Stat, Tiles } from '../components/ui';
import type { ProgramSummaryDto } from '@lawmads/shared';

export default function Home() {
  const { t } = useI18n();
  const stats = useApi<any>('/catalog/stats');
  const programs = useApi<{ programs: ProgramSummaryDto[] }>('/catalog/programs?featured=true');
  const plans = useApi<any>('/commerce/plans');
  const badges = useApi<any>('/badges/ladder');
  const community = useApi<any>('/community');
  const podcast = useApi<any>('/content/podcast');
  const blog = useApi<any>('/content/blog');
  const slots = useApi<any>('/bookings/slots');
  const press = useApi<any>('/content/press');
  const s = stats.data;
  return (
    <>
      <Section>
        <div className="split">
          <div>
            <Eyebrow>{t('hero.eyebrow')}</Eyebrow>
            <h1>{(() => { const title = t('hero.title').replace(/[.。]$/, ''); const hl = t('hero.highlight'); const [before, after = ''] = title.split(hl); return <>{before}<span style={{ textDecoration: 'underline', textDecorationColor: 'var(--red)', textDecorationThickness: 6, textUnderlineOffset: 8 }}>{hl}</span>{after}<span className="red">.</span></>; })()}</h1>
            <p className="lead" style={{ marginTop: 24 }}>{t('hero.sub')}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}><Link to="/programs" className="btn btn--lg">{t('cta.explore')}</Link><Link to="/ide" className="btn btn--lg btn--outline">{t('cta.ide')}</Link></div>
            <div className="trust"><span>{s?.jurisdictions ?? 9} jurisdictions</span><span>{s?.languages ?? 18} programming languages</span><span>{s?.certificationPrograms ?? '15+'} certification programs</span><span>{s?.creditSystems ?? 2} credit systems — tech & law</span></div>
          </div>
          <div className="codemock" aria-hidden>
            <div className="c">› exercise — IP Clause Validator</div>
            <div><span className="k">function</span> <span className="f">isValidIPClause</span>(clause) {'{'}</div>
            <div>&nbsp;&nbsp;<span className="k">const</span> required = [<span className="s">"assigns"</span>,</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="s">"copyright"</span>, <span className="s">"consideration"</span>];</div>
            <div>&nbsp;&nbsp;<span className="k">return</span> required.<span className="f">every</span>(t =&gt;</div>
            <div>&nbsp;&nbsp;&nbsp;&nbsp;clause.<span className="f">toLowerCase</span>().<span className="f">includes</span>(t));</div>
            <div>{'}'}</div>
            <div className="ok" style={{ marginTop: 10 }}>✓ 5/5 tests passed · +10 Tech Credits</div>
          </div>
        </div>
      </Section>
      <section className="section section--ink" style={{ paddingBlock: 36 }}><div className="wrap"><div style={{ textAlign: 'center', fontSize: 11, letterSpacing: '.14em', fontWeight: 800, marginBottom: 22 }}>AS FEATURED <span className="red">IN</span></div><div className="press">{(press.data?.featuredIn ?? ['Forbes', 'TechCrunch', 'Financial Times', 'Bloomberg', 'Wired']).map((p: string) => <span key={p} className={/Forbes|Financial/.test(p) ? 'serif' : ''}>{p.toUpperCase() === p ? p : /Wired/.test(p) ? 'WIRED' : /Financial/.test(p) ? 'FINANCIAL TIMES' : p}</span>)}</div></div></section>
      <Section tone="ink">
        <SectionHead eyebrow="What you'll build" title="One platform. Four products." />
        <div className="cards cards--4">
          {[['Λ', 'Academy', 'Blended law + tech curriculums with auto-graded labs and drafting exercises.', 'Explore programs →', '/programs'], ['●', 'Community', 'Lawyers Who Code®, Design®, Analyze Data & Trade® — showcase, verify, get hired.', 'Meet the Lawmads →', '/community'], ['✦', 'Lawyer Work Space', 'AI-assisted multilingual drafting (AR·EN·FR) built on a structured clause editor.', 'See the editor →', '/workspace'], ['◉', 'Law Database', 'Egyptian legislation & supreme-court merits, bilingual and API-ready.', 'Search the law →', '/law']].map(([ico, h, d, c, to]) => (
            <Link key={h} to={to!} className="card card--ink"><span className="red" style={{ fontSize: 28, fontWeight: 900 }}>{ico}</span><h3>{h}</h3><p className="muted">{d}</p><span className="link" style={{ marginTop: 'auto' }}>{c}</span></Link>
          ))}
        </div>
      </Section>
      <Section>
        <SectionHead eyebrow="Professional Certifications" title="One program. Two disciplines. One credential." sub="Every Lawmads program pairs a technology craft with the law that governs it — the structural guarantee of the hybrid Lawmad profile." action={<Link to="/programs" className="link">View all programs →</Link>} />
        <div className="cards">
          {(programs.data?.programs ?? []).slice(0, 6).map((p, i) => (
            <Link key={p.code} to={`/programs/${p.slug}`} className={`card${i === 5 ? ' card--ink' : ''}`}>
              <span className="arrowlink">→</span>
              <Tiles items={p.tools} />
              <span className="tag">{p.trackName}</span>
              <h3>{p.name} <span className="red">{p.code}{p.kind === 'diploma' ? '' : '®'}</span></h3>
              <p className="muted">{p.tagline}</p>
              <div className="meta"><span>{p.weeks} weeks</span><span>{p.tools.slice(0, 3).join(' · ')}</span><span>{p.techCredits}T / {p.lawCredits}L credits</span></div>
            </Link>
          ))}
        </div>
        <div className="callout" style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><div><strong>Not sure which combination is yours?</strong><div className="muted">Pick the two legal systems you actually work across and the craft you want examined. We will tell you what it qualifies you as — and what it does not.</div></div><Link to="/track-designer" className="btn">Design your track →</Link></div>
      </Section>
      <Section tone="stone">
        <div className="split">
          <div>
            <Eyebrow>The Lawmads IDE</Eyebrow>
            <h2>Learn by practice.<br />Graded in real time.</h2>
            <p className="lead" style={{ marginTop: 16 }}>Write, run, fix, again — a professional coding environment in your browser. Test cases judge your submission and sync your score straight to your transcript.</p>
            <Link to="/ide" className="btn" style={{ marginTop: 20 }}>Open the Playground →</Link>
            <div className="pills" style={{ marginTop: 24 }}><span className="chip">{s?.languages ?? 18} languages</span><span className="chip">{s?.gradedExercises ?? 57} graded exercises</span><span className="chip">n8n canvas · Cursor labs</span><span className="chip">AI tutor built-in</span></div>
          </div>
          <div className="codemock"><div className="c">// python — limitation period</div><div>elapsed, limitation = <span className="f">map</span>(int, <span className="f">input</span>().<span className="f">split</span>())</div><div><span className="f">print</span>(<span className="s">"TIME-BARRED"</span> <span className="k">if</span> elapsed &gt;= limitation <span className="k">else</span> <span className="s">"IN TIME"</span>)</div><div className="ok" style={{ marginTop: 10 }}>✓ 3/3 tests passed · +10 Tech Credits synced to your transcript</div></div>
        </div>
      </Section>
      <Section>
        <SectionHead eyebrow="The Verified Lawmad Ladder" title="Credentials that verify forever." sub="One jurisdiction and a craft makes you a Local Lawmad. Two makes you Regional — or International, if they sit in different regions, which is the rarer and more valuable of the two. Digitally signed, QR-verifiable, and honest about what it is not." action={<Link to="/track-designer" className="link">Design your track →</Link>} />
        <div className="ladder">
          {[['◆', '1 jurisdiction + 1 craft', 'Local Lawmad', 'Credentialed to build in the legal system you actually work in. Deep, useful, and honest that it does not travel.', `${usd(39000)} + ${usd(7900)}`, '/track-designer', 'Build →'], ['🥉', '2 jurisdictions · same region', 'Regional Lawmad', 'Two systems in one region. The profile is deep rather than broad — you know one market properly and can prove it.', `${usd(39000)} + ${usd(15800)}`, '/track-designer', 'Build →'], ['🌐', '2 jurisdictions · across regions', 'International Lawmad', 'MENA and Europe. Cross-border legal tech fails at exactly this boundary — which is why this is the profile clients ask for by name.', `${usd(39000)} + ${usd(15800)}`, '/track-designer', 'Build →'], ['🥇', '3 → Global · 4 → Master', 'Global & Master', `A third badge makes you Global. A fourth, with a reviewed capstone, makes you Master. ${badges.data ? `${badges.data.masterHolders} people hold it` : 'Fewer than 200 people hold it'}.`, `${usd(7900)} per badge`, '/badges', 'Badges →']].map(([e, k, h, d, pr, to, c], i) => (
            <div key={h} className={`rung${i === 3 ? ' rung--ink' : ''}`}><span className="emoji">{e}</span><span className="tag">{k}</span><h3>{h}</h3><p className="muted" style={{ fontSize: 14 }}>{d}</p><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}><span className="price">{pr}</span><Link to={to!} className="link">{c}</Link></div></div>
          ))}
        </div>
      </Section>
      <Section tone="stone">
        <div className="split">
          <div>
            <Eyebrow>The Lawmads Web Builder <span className="chip chip--red">NEW</span></Eyebrow>
            <h2>Describe your practice.<br />Ship the website.</h2>
            <p className="lead" style={{ marginTop: 16 }}>Tell it what your firm does and the builder generates the site — pages, copy, imagery and video, in Arabic, English and French. Built on Gemini, with image and video generation from Seedance and partner models. Publish to your own domain.</p>
            <Link to="/builder" className="btn" style={{ marginTop: 20 }}>Open the Web Builder →</Link>
            <div className="pills" style={{ marginTop: 24 }}><span className="chip">Gemini-powered</span><span className="chip">Image & video generation</span><span className="chip">AR · EN · FR</span><span className="chip">Publish to your domain</span></div>
          </div>
          <div className="codemock codemock--light"><div className="mono muted">https://elgendy-partners.law</div><div style={{ marginTop: 8 }}>a corporate law firm in Cairo, bilingual <span className="chip chip--ink">GENERATE</span></div><div style={{ fontFamily: 'var(--body)', fontWeight: 900, fontSize: 24, marginTop: 14 }}>ELGENDY & PARTNERS</div><div style={{ display: 'flex', gap: 8, marginTop: 10 }}><span className="tile">🖼</span><span className="tile">🎬</span><span className="tile">🖼</span></div><div className="ok" style={{ marginTop: 12, color: 'var(--green)' }}>✓ 6 pages · 4 images · 1 video generated · 18s</div></div>
        </div>
      </Section>
      <Section tone="ink">
        <SectionHead eyebrow="Global Network" title={<>Join the Lawyer Who®<br />Community</>} sub={`A global community of ${(community.data?.stats.members ?? 2941).toLocaleString()} legal professionals who code, design, analyze data, and build technology. Meet in 16 cities across ${s?.jurisdictions ?? 9} jurisdictions.`} />
        <div className="stats" style={{ marginBottom: 36 }}><Stat value={(community.data?.stats.members ?? 2941).toLocaleString()} label="Active Members" /><Stat value={community.data?.stats.cityChapters ?? 14} label="City Chapters" /><Stat value={community.data?.stats.eventsThisYear ?? 127} label="Events in 2025" /><Stat value={`${community.data?.stats.employmentRate ?? 96}%`} label="Employment Rate" /></div>
        <div className="cards cards--4">{(community.data?.chapters ?? []).map((c: any) => <Link key={c.slug} to="/community" className="card card--ink"><span style={{ fontSize: 26 }}>{c.icon}</span><h3>{c.name}</h3><span className="mono red">{Number(c.members).toLocaleString()} members</span><p className="muted">{c.blurb}</p></Link>)}</div>
        <div className="callout" style={{ marginTop: 32, background: '#1A1A1C', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}><div><strong>Ready to Join the Network?</strong><div className="muted">Membership is free and open to all legal professionals committed to learning technology.</div></div><Link to="/community" className="btn btn--white">Explore Community →</Link></div>
      </Section>
      <Section>
        <SectionHead title="Offers running now." />
        <div className="cards">{(plans.data?.offers ?? []).map((o: any) => <Link key={o.sku} to={`/checkout/${o.sku}`} className={`card${o.dark ? ' card--ink' : ''}`}><span className="tag tag--corner">{o.tag}</span><h3>{o.name}</h3><p className="muted">{o.blurb}</p><div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em' }}>{usd(o.priceCents)} <s className="muted" style={{ fontSize: 18, fontWeight: 600 }}>{usd(o.anchorCents)}</s></div>{o.chips && <div className="tiles">{o.chips.map((c: string) => <span key={c} className="tile">{c}</span>)}</div>}{o.note && <span className="muted" style={{ fontSize: 13 }}>{o.note}</span>}</Link>)}</div>
      </Section>
      <Section tone="stone">
        <div className="split split--even">
          <div><Eyebrow>Blog & News</Eyebrow><h2>Legal Tech Insights & Platform Updates</h2><div className="stats" style={{ marginTop: 24 }}><Stat value={blog.data?.stats.posts ?? '—'} label="Blog posts" /><Stat value={blog.data?.stats.categories ?? 4} label="Topics covered" /><Stat value="Weekly" label="New content" /><Stat value={`${blog.data?.stats.avgRead ?? 12}min`} label="Average read" /></div><Link to="/blog" className="link" style={{ display: 'inline-block', marginTop: 20 }}>View All Posts →</Link></div>
          <div><Eyebrow>The Lawmads Podcast</Eyebrow><h2>Law, code, and the people building both.</h2><p className="muted" style={{ marginTop: 12 }}>Every Thursday, a conversation with someone doing the hybrid work for real — legal engineers, regulators, founders and the occasional sceptic. No hype, no vendor pitches.</p>{podcast.data?.latest && <Link to={`/podcast/${podcast.data.latest.slug}`} className="card" style={{ marginTop: 12 }}><span className="tag">EP {podcast.data.latest.number} · Latest</span><h3>{podcast.data.latest.title}</h3><span className="muted">{podcast.data.latest.guest} · {podcast.data.latest.guestRole} · {Math.floor(podcast.data.latest.durationSec / 60)}:{String(podcast.data.latest.durationSec % 60).padStart(2, '0')}</span></Link>}<Link to="/podcast" className="link" style={{ display: 'inline-block', marginTop: 16 }}>All episodes →</Link></div>
        </div>
      </Section>
      <Section tone="ink">
        <div className="split split--even">
          <div><h2>Not sure where to start? Schedule a call.</h2><p className="muted" style={{ marginTop: 12 }}>Talk to a Lawmads advisor — free, 30 minutes.</p></div>
          <div><div className="slots" style={{ marginBottom: 16 }}>{(slots.data?.slots ?? []).map((sl: any) => <Link key={sl.at} to={`/schedule?slot=${encodeURIComponent(sl.at)}`} className="slot">{sl.label}</Link>)}</div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link to="/schedule" className="btn btn--red">📅 Schedule a Call</Link><a href={slots.data?.whatsapp ?? '#'} className="btn btn--white">💬 WhatsApp Us</a></div></div>
        </div>
      </Section>
      <Section tone="stone">
        <div style={{ textAlign: 'center', marginBottom: 28 }}><Eyebrow>Accreditation & Technology Partners</Eyebrow><p className="muted">Trusted by global institutions and technology leaders</p></div>
        <div className="marquee"><div className="marquee__track">{[...(press.data?.partners ?? []), ...(press.data?.partners ?? [])].map(([n, r]: [string, string], i: number) => <div key={i} className="logo-card"><strong>{n}</strong><span>{r}</span></div>)}</div></div>
      </Section>
    </>
  );
}
