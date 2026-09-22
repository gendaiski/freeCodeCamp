import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { PageHead, Section, Filters, Loading, ErrorBox, Tiles } from '../components/ui';
import type { ProgramSummaryDto, TrackDto } from '@lawmads/shared';

export default function Programs() {
  const [sp] = useSearchParams();
  const [track, setTrack] = useState<string>(sp.get('track') ?? 'all');
  const tracks = useApi<{ tracks: TrackDto[] }>('/catalog/tracks');
  const progs = useApi<{ programs: ProgramSummaryDto[] }>('/catalog/programs');
  const list = (progs.data?.programs ?? []).filter((p) => track === 'all' || p.track === track);
  return (
    <>
      <PageHead eyebrow="Program Catalog" title="Certifications & Diplomas" sub="Every program blends one area of law with one area of technology — the Lawmads signature. Filter by track." />
      <Section>
        <Filters items={[['all', 'All Tracks'], ...(tracks.data?.tracks ?? []).map((t) => [t.slug, t.name] as [string, string])]} active={track} onChange={setTrack} />
        <div className="callout" style={{ marginBlock: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><div><strong>A program is only half of it.</strong><div className="muted">Every credential pairs a craft with the law that governs it. Pick your two jurisdictions and see what the combination qualifies you as.</div></div><Link to="/track-designer" className="btn">Design your track →</Link></div>
        <ErrorBox error={progs.error} />
        {progs.loading ? <Loading /> : (
          <div className="cards">
            {list.map((p) => (
              <Link key={p.code} to={`/programs/${p.slug}`} className={`card${p.kind === 'diploma' ? ' card--ink' : ''}`}>
                <span className="arrowlink">→</span>
                <Tiles items={p.tools} />
                <span className="tag">{p.trackName}{p.isNew ? ' · NEW' : ''}</span>
                <h3>{p.name} <span className="red">{p.code}{p.kind === 'certificate' || p.kind === 'course_certificate' ? '®' : ''}</span></h3>
                <p className="muted">{p.tagline}</p>
                <div className="meta"><span>{p.weeks} weeks</span><span>{p.level}</span><span>{p.techCredits}T / {p.lawCredits}L</span></div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted" style={{ marginTop: 20 }}>{list.length} of {progs.data?.programs.length ?? 0} programs.</p>
      </Section>
    </>
  );
}
