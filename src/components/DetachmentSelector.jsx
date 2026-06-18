import { useState } from 'react';

export default function DetachmentSelector({ data, detachment, onSetDetachment }) {
  const [expanded, setExpanded] = useState(null);

  const toggleDetachment = (detData) => {
    if (expanded === detData.name) {
      setExpanded(null);
      return;
    }
    setExpanded(detData.name);
    if (!detachment || detachment.name !== detData.name) {
      onSetDetachment({ name: detData.name, enhancements: [] });
    }
  };

  const toggleEnhancement = (detName, enhName) => {
    const current = detachment?.enhancements || [];
    const next = current.includes(enhName)
      ? current.filter((e) => e !== enhName)
      : [...current, enhName];
    onSetDetachment({ name: detName, enhancements: next });
  };

  if (!detachment) {
    return (
      <div className="detachment-selector">
        <h3>Detachment</h3>
        <p className="det-placeholder">Select a detachment to begin</p>
        <div className="det-list">
          {data.detachments.map((det) => (
            <div
              key={det.name}
              className="det-card"
              onClick={() => toggleDetachment(det)}
            >
              <span className="det-name">{det.name}</span>
              <span className="det-meta">
                <span className="dp-badge">DP {det.dpCost}</span>
                <span className="doctrine">{det.doctrine}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const detData = data.detachments.find((d) => d.name === detachment.name);
  const enhTotal = detData.enhancements.filter((e) => detachment.enhancements.includes(e.name)).reduce((s, e) => s + e.pts, 0);

  return (
    <div className="detachment-selector">
      <div className="det-selected">
        <h3>{detachment.name}</h3>
        <div className="det-selected-meta">
          <span className="dp-badge">DP {detData.dpCost}</span>
          <span className="doctrine">{detData.doctrine}</span>
          {enhTotal > 0 && <span className="enh-pts">+{enhTotal} pts</span>}
        </div>
      </div>

      <div className="enhancements-section">
        <h4 onClick={() => setExpanded(expanded ? null : 'enhancements')} className="enh-toggle">
          Enhancements {expanded === 'enhancements' ? '▲' : '▼'}
        </h4>
        {expanded === 'enhancements' && (
          <div className="enh-list">
            {detData.enhancements.map((enh) => {
              const active = detachment.enhancements.includes(enh.name);
              return (
                <label
                  key={enh.name}
                  className={`enh-item ${active ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleEnhancement(detData.name, enh.name)}
                  />
                  <span className="enh-name">{enh.name}</span>
                  <span className="enh-cost">+{enh.pts} pts</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <button className="change-det-btn" onClick={() => { setExpanded(null); onSetDetachment(null); }}>
        Change Detachment
      </button>
    </div>
  );
}
