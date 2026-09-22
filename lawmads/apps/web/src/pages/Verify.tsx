import { useParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { dateLong } from '../lib/format';
import { Loading, ErrorBox, Section } from '../components/ui';
export default function Verify() {
  const { id = '' } = useParams();
  const v = useApi<any>(`/verify/${id}`);
  const d = v.data;
  return (
    <Section>
      <div className="wrap--narrow" style={{ marginInline: 'auto' }}>
        <span className="eyebrow">Credential verification</span>
        <h1 style={{ fontSize: 40 }}>{id.toUpperCase()}</h1>
        {v.loading && <Loading />}
        <ErrorBox error={v.error} />
        {d && <div className="cert" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <span className="tag">{d.kind === 'certificate' ? 'Professional Certification · Digitally Signed' : `Jurisdiction Badge · ${d.jurisdictionName}`}</span>
              <h2 style={{ marginTop: 8 }}>{d.holder}</h2>
              <p className="lead">{d.kind === 'certificate' ? `${d.program}® — ${d.programName}` : `${d.flag} ${d.jurisdictionName} — ${d.score}%`}</p>
              <dl className="kv" style={{ marginTop: 16 }}>
                <dt>signed</dt><dd>{dateLong(d.issuedAt ?? d.earnedAt)}</dd>
                <dt>examined_by</dt><dd>{d.examinedBy}</dd>
                <dt>signature</dt><dd className={d.signatureValid ? 'mono' : 'mono red'}>{d.signatureValid ? 'valid ✓' : 'INVALID'}</dd>
                <dt>revoked</dt><dd className="mono">{String(d.revoked)}{d.revokedReason ? ` — ${d.revokedReason}` : ''}</dd>
                {d.capstoneScore != null && <><dt>capstone</dt><dd>{d.capstoneScore}%</dd></>}
                {d.ladder && <><dt>ladder</dt><dd>{d.ladder}</dd></>}
              </dl>
              {d.badges?.length > 0 && <div className="pills" style={{ marginTop: 12 }}>{d.badges.map((b: any) => <span key={b.jurisdiction} className="chip chip--green">{b.name} ✓ {b.score_pct}%</span>)}</div>}
            </div>
            <img className="qr" src={d.qr} alt="Verification QR" />
          </div>
          <p className="notice" style={{ marginTop: 20, fontSize: 13 }}>{d.notice ?? 'This certificate is awarded by The Legal Technology Academy. It certifies completion and assessment; it does not entitle the holder to practise, appear, or hold out as admitted anywhere.'}</p>
        </div>}
      </div>
    </Section>
  );
}
