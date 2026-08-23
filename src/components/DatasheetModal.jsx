import { useEffect, useState } from 'react';
import { getDatasheets } from '../data';

function Chips({ list, extraCls }) {
  if (!list?.length) return null;
  return (
    <>
      {list.map((k, i) => (
        <span key={`${k}-${i}`} className={`ds-chip ${extraCls || ''}`}>{k}</span>
      ))}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="ds-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function ProfileTable({ p }) {
  return (
    <table className="ds-table">
      <thead>
        <tr>{p.headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {p.rows.map((r, i) => (
          <tr key={i}>
            <td className="ds-weapon-name">{r.name}</td>
            {p.headers.map((h) => (
              <td key={h}>{r[h.toLowerCase()] ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DatasheetModal({ factionKey, unitName, onClose }) {
  const [view, setView] = useState('loading'); // 'loading' | 'ready' | 'missing'
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    let alive = true;
    getDatasheets(factionKey)
      .then((chunk) => {
        if (!alive) return;
        const found = chunk[unitName.toUpperCase()] || null;
        if (found) { setSheet(found); setView('ready'); }
        else setView('missing');
      })
      .catch(() => {
        if (alive) setView('missing');
      });
    return () => { alive = false; };
  }, [factionKey, unitName]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="ds-backdrop" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-head">
          <div>
            <h2>{unitName}</h2>
            {view === 'ready' && sheet.base && (
              <div className="ds-base">
                base {sheet.base}{sheet.baseNote ? ` (${sheet.baseNote})` : ''}
              </div>
            )}
          </div>
          <div className="ds-modal-actions">
            {view === 'ready' && sheet.url && (
              <a className="ds-link" href={sheet.url} target="_blank" rel="noreferrer">View on Wahapedia</a>
            )}
            <button className="ds-close" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className="ds-modal-body">
          {view === 'loading' && <div className="ds-missing">Loading…</div>}
          {view === 'missing' && <div className="ds-missing">Not in scraped data</div>}
          {view === 'ready' && (
            <>
              {sheet.characteristics && (
                <div className="ds-chars">
                  {Object.entries(sheet.characteristics).map(([k, v]) => (
                    <div key={k} className="ds-char">
                      <span className="ds-char-key">{k}</span>
                      <span className="ds-char-val">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {(sheet.keywords?.length > 0 || sheet.factionKeywords?.length > 0) && (
                <div className="ds-keywords">
                  <Chips list={sheet.keywords} />
                  <Chips list={sheet.factionKeywords} extraCls="ds-chip-faction" />
                </div>
              )}

              {sheet.profiles?.map((p, i) => (
                <Section key={i} title={p.title}>
                  <ProfileTable p={p} />
                </Section>
              ))}

              {sheet.composition?.length > 0 && (
                <Section title="Unit composition">
                  <ul className="ds-list">
                    {sheet.composition.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                  {(sheet.costs || []).map((c, i) => (
                    <div key={i} className="ds-cost-row">
                      <span>{c.label}</span>
                      <strong>{c.pts} pts</strong>
                    </div>
                  ))}
                </Section>
              )}

              {sheet.wargear?.length > 0 && (
                <Section title="Wargear options">
                  <ul className="ds-list">
                    {sheet.wargear.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </Section>
              )}

              {sheet.abilities?.length > 0 && (
                <Section title="Abilities">
                  <ul className="ds-list">
                    {sheet.abilities.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </Section>
              )}

              {sheet.wargearAbilities?.length > 0 && (
                <Section title="Wargear abilities">
                  <ul className="ds-list">
                    {sheet.wargearAbilities.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </Section>
              )}

              {(sheet.ledBy?.length > 0 || sheet.supportedBy?.length > 0) && (
                <div className="ds-keys">
                  {sheet.ledBy?.length > 0 && (
                    <div className="ds-keyline">
                      <span className="ds-keyline-label">Led by</span>
                      <Chips list={sheet.ledBy} />
                    </div>
                  )}
                  {sheet.supportedBy?.length > 0 && (
                    <div className="ds-keyline">
                      <span className="ds-keyline-label">Supported by</span>
                      <Chips list={sheet.supportedBy} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
