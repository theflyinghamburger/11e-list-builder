import { useEffect, useState } from 'react';
import { getDatasheets } from '../data';
import { getUnitPoints } from '../utils/costs';

const factionName = (key) => key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const norm = (s) => s.toUpperCase().replace(/[’'.,\-\s]+/g, '');
// ponytail: copy of DetachmentSelector's matchers, not a shared module
const matchName = (hay, needle) => hay === needle || hay.includes(needle) || needle.includes(hay);

function findDetBlock(rules, name) {
  const n = norm(name);
  for (const [key, det] of Object.entries(rules?.detachments || {})) {
    if (matchName(norm(key), n)) return det;
  }
  return null;
}

function findEnh(detBlock, name) {
  return (detBlock?.enhancements || []).find((e) => matchName(norm(e.name), norm(name))) || null;
}

function ErrataList({ errata }) {
  if (!errata?.length) return null;
  return errata.map((e, i) => (
    <div key={i} className="ps-errata">
      {e.scope && <div className="ps-rule-name">{e.scope}</div>}
      <div className="ps-pre">{e.text}</div>
    </div>
  ));
}

function RuleBlocks({ rules }) {
  return (rules || [])
    .filter((r) => r.name || r.text)
    .map((r, i) => (
      <div key={i} className="ps-rule-block">
        {r.name && <div className="ps-rule-name">{r.name}</div>}
        {r.text && <div className="ps-pre">{r.text}</div>}
        <ErrataList errata={r.errata} />
      </div>
    ));
}

function ordinal(n) {
  return (n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
}

function unitPts(data, army, u) {
  const unitData = data.units.find((d) => d.name === u.unitName);
  if (!unitData) return 0;
  const ordinalN = army.units.filter((x) => x.unitName === u.unitName).indexOf(u) + 1;
  return getUnitPoints(unitData, u.modelCount, ordinalN, u.wargear);
}

function Summary({ data, army, factionKey }) {
  const unitPtsTotal = army.units.reduce((s, u) => s + unitPts(data, army, u), 0);
  const detPts = (army.detachments || []).reduce((sum, det) => {
    const detData = data.detachments.find((d) => d.name === det.name);
    if (!detData) return sum;
    return sum + detData.enhancements.filter((e) => det.enhancements?.includes(e.name)).reduce((s, e) => s + e.pts, 0);
  }, 0);

  return (
    <div className="ps-summary">
      <div className="ps-title-row">
        <h1 className="ps-title">{army.name || 'Army List'}</h1>
        <span className="ps-pts">{army.pointLimit} pts</span>
      </div>
      <div className="ps-faction">{factionName(factionKey)}</div>

      {(army.detachments || []).length > 0 && (
        <>
          <h2 className="ps-h">Detachments</h2>
          <table className="ps-table">
            <thead>
              <tr>
                <th>Detachment</th>
                <th>DP</th>
                <th>Doctrine</th>
                <th>Enhancements</th>
              </tr>
            </thead>
            <tbody>
              {army.detachments.map((det) => {
                const detData = data.detachments.find((d) => d.name === det.name);
                if (!detData) return null;
                const enh = (det.enhancements || []).map((e) => {
                  const pts = detData.enhancements.find((x) => x.name === e)?.pts;
                  return pts != null ? `${e} (+${pts})` : e;
                });
                return (
                  <tr key={det.name}>
                    <td>{det.name}</td>
                    <td>{detData.dpCost}</td>
                    <td>{detData.doctrine}</td>
                    <td>{enh.join('; ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <h2 className="ps-h">Units</h2>
      <table className="ps-table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Models</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {army.units.map((u) => {
            const unitData = data.units.find((d) => d.name === u.unitName);
            const ordinalN = army.units.filter((x) => x.unitName === u.unitName).indexOf(u) + 1;
            const split = unitData?.tiered?.split ?? 2;
            const tierLabel = unitData?.tiered && ordinalN > split ? ` (${split + 1}${ordinal(split + 1)}+)` : '';
            return (
              <tr key={u.id}>
                <td>
                  {u.unitName}
                  {tierLabel}
                  {u.wargear &&
                    Object.entries(u.wargear)
                      .filter(([, c]) => c > 0)
                      .map(([name, c]) => (
                        <div key={name} className="ps-wargear">{name} x{c}</div>
                      ))}
                </td>
                <td>{u.modelCount}</td>
                <td>{unitPts(data, army, u)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>
              <strong>Total</strong>
              {detPts > 0 && <span className="ps-dim"> (incl. {detPts} pts enhancements)</span>}
            </td>
            <td></td>
            <td>
              <strong>{unitPtsTotal + detPts}</strong> / {army.pointLimit}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DetachmentRules({ data, det, detBlock }) {
  const detData = data.detachments.find((d) => d.name === det.name);
  return (
    <div className="ps-det">
      <h3 className="ps-det-head">
        {det.name} <span className="ps-dim">({detData.dpCost} DP{detData.doctrine ? `, ${detData.doctrine}` : ''})</span>
      </h3>
      {!detBlock && <span className="ps-dim">No rules data for this detachment.</span>}
      {detBlock && (
        <>
          <RuleBlocks rules={detBlock.rules} />
          <ErrataList errata={detBlock.errata} />
          {(det.enhancements || []).length > 0 && (
            <div className="ps-sub">
              <h4 className="ps-subh">Enhancements</h4>
              {det.enhancements.map((name) => {
                const enh = findEnh(detBlock, name);
                const pts = detData.enhancements.find((x) => x.name === name)?.pts;
                return (
                  <div key={name} className="ps-enh">
                    <div className="ps-rule-name">{name}{pts != null ? ` (+${pts} pts)` : ''}</div>
                    {enh?.text && <div className="ps-pre">{enh.text}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {(detBlock.stratagems || []).length > 0 && (
            <div className="ps-sub">
              <h4 className="ps-subh">Stratagems</h4>
              {detBlock.stratagems.map((s) => (
                <div key={s.name} className="ps-strat">
                  <div className="ps-strat-head">
                    <strong>{s.name}</strong>
                    <span> {s.cp} CP</span>
                    {s.kind && <span className="ps-dim"> — {s.kind}</span>}
                  </div>
                  <div className="ps-pre">{s.text}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RulesPage({ data, army, rules }) {
  if (!rules) {
    return (
      <div className="ps-page">
        <div className="ps-dim">No rules data for this faction.</div>
      </div>
    );
  }
  return (
    <div className="ps-page">
      <h2 className="ps-h">Army Rules</h2>
      <RuleBlocks rules={rules.armyRules} />
      {(army.detachments || []).map((det) => {
        const detData = data.detachments.find((d) => d.name === det.name);
        if (!detData) return null;
        return <DetachmentRules key={det.name} data={data} det={det} detBlock={findDetBlock(rules, det.name)} />;
      })}
    </div>
  );
}

function DsProfileTable({ p }) {
  const headers = p.headers.includes('WS') ? p.headers.filter((h) => h !== 'RANGE') : p.headers;
  return (
    <table className="ps-table ps-ds-table">
      <thead>
        <tr>
          <th>WEAPON</th>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {p.rows.map((r, i) => (
          <tr key={i}>
            <td className="ps-weapon-name">{r.name}</td>
            {headers.map((h) => (
              <td key={h}>{r[h.toLowerCase()] ?? '—'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DatasheetPage({ unit, pts, sheet }) {
  return (
    <div className="ps-page">
      <h2 className="ps-ds-name">{unit.unitName}</h2>
      <div className="ps-ds-meta">
        {unit.modelCount} model{unit.modelCount > 1 ? 's' : ''} · {pts} pts
      </div>
      {sheet && (
        <>
          {sheet.keywords?.length > 0 && (
            <div className="ps-keywords">
              {sheet.keywords.join(' ')}
              {sheet.factionKeywords?.length > 0 && <> — {sheet.factionKeywords.join(' ')}</>}
            </div>
          )}
          {sheet.characteristics && (
            <div className="ps-attrs">
              {Object.entries(sheet.characteristics).map(([k, v]) => (
                <span key={k} className="ps-attr">{k} {v}</span>
              ))}
            </div>
          )}
          {sheet.profiles?.map((p, i) => (
            <div key={i} className="ps-sub">
              <h4 className="ps-subh">{p.title}</h4>
              <DsProfileTable p={p} />
            </div>
          ))}
          {sheet.composition?.length > 0 && (
            <div className="ps-sub">
              <h4 className="ps-subh">Unit Composition</h4>
              <ul className="ps-list">
                {sheet.composition.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              {(sheet.costs || []).map((c, i) => (
                <div key={i} className="ps-cost-row">
                  <span>{c.label}</span>
                  <span><strong>{c.pts} pts</strong></span>
                </div>
              ))}
            </div>
          )}
          {sheet.wargear?.length > 0 && (
            <div className="ps-sub">
              <h4 className="ps-subh">Wargear</h4>
              <ul className="ps-list">
                {sheet.wargear.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {sheet.wargearAbilities?.length > 0 && (
            <div className="ps-sub">
              <h4 className="ps-subh">Wargear Abilities</h4>
              <ul className="ps-list">
                {sheet.wargearAbilities.map((w, i) => (
                  <li key={i} className="ps-pre">{w}</li>
                ))}
              </ul>
            </div>
          )}
          {sheet.abilities?.length > 0 && (
            <div className="ps-sub">
              <h4 className="ps-subh">Abilities</h4>
              <ul className="ps-list">
                {sheet.abilities.map((a, i) => (
                  <li key={i} className="ps-pre">{a}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {!sheet && <div className="ps-dim">Datasheet not in scraped data.</div>}
    </div>
  );
}

export default function PrintSheet({ data, army, rules, factionKey }) {
  const [sheets, setSheets] = useState(null);

  useEffect(() => {
    const names = [...new Set(army.units.map((u) => u.unitName))];
    if (names.length === 0) { setSheets({}); return; }
    let alive = true;
    setSheets(null);
    getDatasheets(factionKey)
      .then((chunk) => {
        if (!alive) return;
        const m = {};
        for (const n of names) m[n] = chunk[n.toUpperCase()] || null;
        setSheets(m);
      })
      .catch(() => { if (alive) setSheets({}); });
    return () => { alive = false; };
    // ponytail: join the key so the effect re-runs only when the unit set actually changes
  }, [factionKey, army.units.map((u) => u.unitName).join('|')]);

  return (
    <div className="print-sheet">
      <Summary data={data} army={army} factionKey={factionKey} />
      <RulesPage data={data} army={army} rules={rules} />
      {army.units.map((u) => (
        <DatasheetPage
          key={u.id}
          unit={u}
          pts={unitPts(data, army, u)}
          sheet={sheets ? sheets[u.unitName] || null : null}
        />
      ))}
    </div>
  );
}
