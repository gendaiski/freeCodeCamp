import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Loading } from '../components/ui';
export default function IdeLauncher() {
  const { user } = useAuth();
  const l = useApi<any>('/ide/languages', [user?.id]);
  const dash = useApi<any>(user ? '/me/dashboard' : null, [user?.id]);
  const langs = l.data?.languages ?? [];
  return (
    <div className="ide">
      <div className="ide__bar"><Link to="/">← Home</Link><span className="muted">⊞ Languages</span><strong>Lawmads IDE · Choose a language</strong><span className="spacer" /><span>Attempts: {l.data?.attempts ?? 0}</span><span className="chip chip--red">⚡ Tech Credits {dash.data?.credits.tech ?? 0}</span></div>
      <div className="wrap" style={{ paddingBlock: 36 }}>
        <h1 style={{ fontSize: 40, color: '#fff' }}>Choose your language.</h1>
        <p style={{ color: '#97A2B0', maxWidth: 720 }}>Eighteen languages plus two agentic-AI tracks (n8n · Cursor) · three graded exercises each: two fundamentals building up to a legal-themed capstone. Pick your icon to enter the IDE.</p>
        {l.loading ? <Loading /> : <div className="launcher" style={{ marginTop: 28 }}>
          {langs.map((x: any) => <Link key={x.slug} to={`/ide/${x.slug}`} className={`lang${x.agentic ? ' lang--agentic' : ''}`}><span className="ico">{x.short}</span><strong>{x.name}</strong><span className="seq">{x.sequence.join(' → ')}</span><span className="n">{x.exercises} exercises{x.agentic ? ' · agentic ai' : ''}{x.solved ? ` · ${x.solved} solved` : ''}{!x.runnable ? ' · runs on Judge0' : ''}</span></Link>)}
        </div>}
      </div>
    </div>
  );
}
