import { useState } from 'react';
import { getDpBudget } from '../utils/dpBudget';

export default function DetachmentSelector({ data, detachments, pointLimit, onAddDetachment, onRemoveDetachment, onUpdateEnhancements }) {
  const [showBrowser, setShowBrowser] = useState(false);
  const [expandedEnh, setExpandedEnh] = useState(null);
  const budget = getDpBudget(pointLimit);

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

  return (
    <div className="detachment-selector">
      <div className="det-header">
        <h3>Detachments</h3>
        <span className="dp-budget">DP: {currentDp}/{budget}</span>
      </div>

      {detachments.length > 0 && (
        <div className="det-selected-list">
          {detachments.map((det) => {
            const detData = data.detachments.find((d) => d.name === det.name);
            if (!detData) return null;
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
                          return (
                            <label key={enh.name} className={`enh-item ${active ? 'active' : ''}`}>
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
