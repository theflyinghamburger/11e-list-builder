import { useEffect, useRef, useState } from 'react';
import { getUnitPoints } from '../utils/costs';
import { validateArmy } from '../utils/validate';

export default function ArmyList({ data, army, onRemoveUnit, onLoadArmy, onSetName }) {
  const fileInputRef = useRef(null);
  const [name, setName] = useState(army.name || '');
  const prevNameRef = useRef(army.name);
  if (army.name !== prevNameRef.current) { prevNameRef.current = army.name; setName(army.name || ''); }
  const [menuOpen, setMenuOpen] = useState(false);
  // ponytail: naive click-outside, no ref needed for the menu element itself
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);
  const totalPoints = army.units.reduce((sum, u) => {
    const unitData = data.units.find((d) => d.name === u.unitName);
    return unitData ? sum + getUnitPoints(unitData, u.modelCount, army.units, u.wargear) : sum;
  }, 0);
  const isOver = totalPoints > army.pointLimit;
  const issues = validateArmy(army, data);
  const issueIds = new Set(issues.map((i) => i.unitId));

  const detPts = (army.detachments || []).reduce((sum, det) => {
    const detData = data.detachments.find((d) => d.name === det.name);
    if (!detData) return sum;
    return sum + detData.enhancements.filter((e) => det.enhancements?.includes(e.name)).reduce((s, e) => s + e.pts, 0);
  }, 0);
  const grandTotal = totalPoints + detPts;

  return (
    <div className="army-list">
      <div className="army-header">
       <div className="army-title">
          <h3>{name || 'Army List'}</h3>
          <div className="army-title-row">
            <input
              className="army-name-input"
              type="text"
              placeholder="Army name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { if (name !== army.name) onSetName(name); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onSetName(name); e.target.blur(); } }}
            />
            <button
              className="mobile-kebab-btn"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              &#x22EE;
            </button>
          </div>
          {menuOpen && (
            <div className="mobile-kebab-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => {
                onSetName(name);
                const exportData = { name: name || army.name, faction: army.faction, pointLimit: army.pointLimit, detachments: army.detachments, units: army.units };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${(name || army.name || army.faction).replace(/[^a-zA-Z0-9_-]/g, '_')}-army.json`;
                a.click();
                URL.revokeObjectURL(url);
                setMenuOpen(false);
              }}>Save</button>
              <button onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }}>Load</button>
              <button onClick={() => { window.print(); setMenuOpen(false); }}>Print</button>
            </div>
          )}
        </div>
        <div className="army-actions">
          <button className="save-btn" onClick={() => {
            onSetName(name);
            const exportData = { name: name || army.name, faction: army.faction, pointLimit: army.pointLimit, detachments: army.detachments, units: army.units };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(name || army.name || army.faction).replace(/[^a-zA-Z0-9_-]/g, '_')}-army.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            Save
          </button>
          <button className="load-btn" onClick={() => fileInputRef.current?.click()}>
            Load
          </button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const parsed = JSON.parse(ev.target.result);
                if (parsed.faction && parsed.units) {
                  setName(parsed.name || '');
                  onLoadArmy(parsed);
                } else {
                  alert('Invalid army list file');
                }
              } catch {
                alert('Invalid JSON file');
              }
            };
            reader.readAsText(file);
            e.target.value = '';
          }} />
          <button className="print-btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>

      {(army.detachments || []).length > 0 && (
        <div className="detachment-info">
          {(army.detachments || []).map((det) => {
            const detData = data.detachments.find((d) => d.name === det.name);
            if (!detData) return null;
            return (
              <div key={det.name} className="det-entry">
                <strong>{det.name}</strong>
                <span>DP: {detData.dpCost}</span>
                {det.enhancements?.length > 0 && (
                  <div className="det-enhancements">
                    {det.enhancements.map((e) => (
                      <span key={e} className="enh-tag">{e}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <table className="army-table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Models</th>
            <th>Points</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {army.units.map((unit) => {
            const unitData = data.units.find((u) => u.name === unit.unitName);
            const pts = unitData ? getUnitPoints(unitData, unit.modelCount, army.units, unit.wargear) : 0;
            const sameCount = army.units.filter((u) => u.unitName === unit.unitName).length;
            const tierLabel =
              unitData?.tiered && sameCount > 2 ? ' (3rd+)' : '';

return (
               <tr key={unit.id} className={`${isOver ? 'over-budget' : ''} ${issueIds.has(unit.id) ? 'orphaned' : ''}`}>
                <td>
                  {unit.unitName}
                  {tierLabel}
                  {unit.wargear &&
                    Object.entries(unit.wargear)
                      .filter(([, c]) => c > 0)
                      .map(([name, count]) => (
                        <div key={name} className="wargear-detail">
                          {name} x{count}
                        </div>
                      ))}
                </td>
                <td>{unit.modelCount}</td>
                <td>{pts}</td>
                <td>
                  <button className="remove-btn" onClick={() => onRemoveUnit(unit.id)}>
                    &times;
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={isOver ? 'over-budget' : ''}>
            <td colSpan="2">
              <strong>Total</strong>
              {detPts > 0 && (
                <span className="det-pts"> (incl. {detPts} pts enhancements)</span>
              )}
            </td>
            <td>
              <strong>{grandTotal}</strong> / {army.pointLimit}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {isOver && (
        <div className="over-warning">
          Over budget by {grandTotal - army.pointLimit} points!
        </div>
      )}

      {!isOver && (
        <div className="remaining">
          {army.pointLimit - grandTotal} points remaining
        </div>
      )}

     {issues.length > 0 && (
        <div className="validation-issues">
          {issues.map((issue) => (
            <div key={issue.unitId} className="validation-issue">
              <strong>{issue.unitName}</strong> — {issue.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
