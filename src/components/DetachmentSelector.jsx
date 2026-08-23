import { useMemo, useState } from 'react';
import { getDpBudget } from '../utils/dpBudget';

const norm = (s) => s.toUpperCase().replace(/[’'.,\-\s]+/g, '');

// ponytail: bidirectional substring handles Wahapedia/MFM name drift ("The X", "(Aura)", "(Upgrade)")
const matchName = (hay, needle) =>
  hay === needle || hay.includes(needle) || needle.includes(hay);

function ErrataList({ errata }) {
  if (!errata?.length) return null;
  return errata.map((e, i) => (
    <div key={i} className="errata-block">
      {e.scope && <div className="rule-name">{e.scope}</div>}
      <div className="rule-text">{e.text}</div>
    </div>
  ));
}

function RuleBlocks({ rules }) {
  return rules
    .filter((r) => r.name || r.text)
    .map((r, i) => (
      <div key={i} className="rule-block">
        {r.name && <div className="rule-name">{r.name}</div>}
        {r.text && <div className="rule-text">{r.text}</div>}
        <ErrataList errata={r.errata} />
      </div>
    ));
}

export default function DetachmentSelector({ data, detachments, pointLimit, rules, onAddDetachment, onRemoveDetachment, onUpdateEnhancements }) {
  const [showBrowser, setShowBrowser] = useState(false);
  const [expandedEnh, setExpandedEnh] = useState(null);
  const [showArmyRules, setShowArmyRules] = useState(false);
  const [openRules, setOpenRules] = useState(null);
  const budget = getDpBudget(pointLimit);

  const rulesByDet = useMemo(() => {
    const m = {};
    for (const [name, det] of Object.entries(rules?.detachments || {})) m[norm(name)] = det;
    return m;
  }, [rules]);

  const findDetBlock = (name) => {
    const n = norm(name);
    if (rulesByDet[n]) return rulesByDet[n];
    const hit = Object.entries(rulesByDet).find(([k]) => matchName(k, n));
    return hit ? hit[1] : null;
  };

  const findEnh = (detBlock, name) =>
    detBlock?.enhancements.find((e) => matchName(norm(e.name), norm(name))) || null;

  const currentDp = detachments.reduce((s, d) => {
    const det = data.detachments.find((x) => x.name === d.name);
    return s + (det?.dpCost || 0);
  }, 0);

  const handleAdd = (detData) => {
    if (currentDp + detData.dpCost > budget) return;
    onAddDetachment({ name: detData.name, enhancements: [] });
  };

  const toggleEnhancement = (detName, enhName) => {
    const current = detachments.find((d) => d.name === detName)?.enhancements || [];
    const next = current.includes(enhName)
      ? current.filter((e) => e !== enhName)
      : [...current, enhName];
    onUpdateEnhancements(detName, next);
  };

  const canAddMore = currentDp < budget;
  const armyRules = rules?.armyRules || [];

  return (
    <div className="detachment-selector">
      <div className="det-header">
        <h3>Detachments</h3>
        <div className="det-header-actions">
          {rules?.source && (
            <a className="wahapedia-link" href={rules.source} target="_blank" rel="noreferrer">
              Wahapedia
            </a>
          )}
          {armyRules.length > 0 && (
            <button className="army-rules-btn" onClick={() => setShowArmyRules(!showArmyRules)}>
              Army Rules {showArmyRules ? '\u25B2' : '\u25BC'}
            </button>
          )}
          <span className="dp-budget">DP: {currentDp}/{budget}</span>
        </div>
      </div>

      {showArmyRules && armyRules.length > 0 && (
        <div className="army-rules-panel">
          <RuleBlocks rules={armyRules} />
        </div>
      )}

      {detachments.length > 0 && (
        <div className="det-selected-list">
          {detachments.map((det) => {
            const detData = data.detachments.find((d) => d.name === det.name);
            if (!detData) return null;
            const detBlock = findDetBlock(det.name);
            const hasRules =
              detBlock &&
              (detBlock.rules.some((r) => r.name || r.text) ||
                detBlock.stratagems.length > 0 ||
                detBlock.errata.length > 0);
            const rulesOpen = openRules === det.name;
            const enhTotal = detData.enhancements.filter((e) => det.enhancements.includes(e.name)).reduce((s, e) => s + e.pts, 0);
            const isExpanded = expandedEnh === det.name;

            return (
              <div key={det.name} className="det-selected-block">
                <div className="det-selected-row">
                  <div className="det-selected-info">
                    <strong>{det.name}</strong>
                    <span className="det-meta-inline">
                      <span className="dp-badge">DP {detData.dpCost}</span>
                      <span className="doctrine">{detData.doctrine}</span>
                      {enhTotal > 0 && <span className="enh-pts">+{enhTotal} pts</span>}
                    </span>
                  </div>
                  <button className="remove-det-btn" onClick={() => onRemoveDetachment(det.name)}>&times;</button>
                </div>

                {detData.enhancements.length > 0 && (
                  <div className="enhancements-section">
                    <h4 onClick={() => setExpandedEnh(isExpanded ? null : det.name)} className="enh-toggle">
                      Enhancements {isExpanded ? '\u25B2' : '\u25BC'}
                    </h4>
                    {isExpanded && (
                      <div className="enh-list">
                        {detData.enhancements.map((enh) => {
                          const active = det.enhancements.includes(enh.name);
                          const enhInfo = findEnh(detBlock, enh.name);
                          return (
                            <label
                              key={enh.name}
                              className={`enh-item ${active ? 'active' : ''}`}
                              title={enhInfo ? (enhInfo.flavor ? enhInfo.flavor + '\n\n' : '') + enhInfo.text : undefined}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => toggleEnhancement(det.name, enh.name)}
                              />
                              <span className="enh-name">{enh.name}</span>
                              <span className="enh-cost">+{enh.pts} pts</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {hasRules && (
                  <div className="det-rules-section">
                    <h4
                      onClick={() => setOpenRules(rulesOpen ? null : det.name)}
                      className="enh-toggle"
                    >
                      Rules &amp; Stratagems {rulesOpen ? '\u25B2' : '\u25BC'}
                    </h4>
                    {rulesOpen && (
                      <div className="det-rules-panel">
                        <RuleBlocks rules={detBlock.rules} />
                        <ErrataList errata={detBlock.errata} />
                        <div className="str-list">
                          {detBlock.stratagems.map((s) => (
                            <details key={s.name} className="str-item">
                              <summary>
                                <span className="str-name">{s.name}</span>
                                {s.kind && <span className="str-kind">{s.kind}</span>}
                                <span className="cp-badge">{s.cp}CP</span>
                              </summary>
                              {s.flavor && <div className="str-flavor">{s.flavor}</div>}
                              <div className="str-text">{s.text}</div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showBrowser ? (
        <div>
          {!canAddMore && <div className="dp-limit-msg">DP limit reached ({currentDp}/{budget})</div>}
          <div className="det-list">
            {data.detachments
              .filter((d) => !detachments.some((sel) => sel.name === d.name))
              .map((det) => {
                const wouldExceed = currentDp + det.dpCost > budget;
                return (
                  <div
                    key={det.name}
                    className={`det-card ${wouldExceed ? 'det-card-disabled' : ''}`}
                    onClick={() => !wouldExceed && handleAdd(det)}
                  >
                    <span className="det-name">{det.name}</span>
                    <span className="det-meta">
                      <span className="dp-badge">DP {det.dpCost}</span>
                      <span className="doctrine">{det.doctrine}</span>
                    </span>
                  </div>
                );
              })}
          </div>
          <button className="change-det-btn" onClick={() => setShowBrowser(false)}>Close</button>
        </div>
      ) : (
        <button className="add-det-btn" onClick={() => setShowBrowser(true)}>Add Detachment</button>
      )}
    </div>
  );
}
