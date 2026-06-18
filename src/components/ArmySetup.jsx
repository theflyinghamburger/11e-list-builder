import { useState } from 'react';
import { getFactionKeys } from '../data';
import { listArmies, deleteArmy } from '../utils/storage';

export default function ArmySetup({ faction, onSetFaction, pointLimit, onSetPointLimit, onLoadArmy }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(listArmies);

  const handleLoad = (name) => {
    if (confirm('Discard unsaved changes and load this list?')) {
      onLoadArmy(name);
      setOpen(false);
      setSaved(listArmies());
    }
  };

  const handleDelete = (e, name) => {
    e.stopPropagation();
    deleteArmy(name);
    setSaved(listArmies());
  };

  return (
    <div className="army-setup">
      <div className="faction-select">
        <label>Faction: </label>
        <select value={faction} onChange={(e) => onSetFaction(e.target.value)}>
          {getFactionKeys().map((key) => (
            <option key={key} value={key}>{key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      </div>
      <h3>Point Limit</h3>
      <div className="point-buttons">
        {[1000, 2000, 3000].map((pts) => (
          <button
            key={pts}
            className={`point-btn ${pointLimit === pts ? 'active' : ''}`}
            onClick={() => onSetPointLimit(pts)}
          >
            {pts} pts
          </button>
        ))}
      </div>
      <div className="load-section">
        <button className="load-btn" onClick={() => { setSaved(listArmies()); setOpen(!open); }}>
          Load
        </button>
        {open && (
          <div className="saved-lists">
            {saved.length === 0 && <div className="no-saved">No saved lists</div>}
            {saved.map((item) => (
              <div key={item.name} className="saved-item">
                <div className="saved-info" onClick={() => handleLoad(item.name)}>
                  <span className="saved-name">{item.name}</span>
                  <span className="saved-date">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                <button className="delete-saved-btn" onClick={(e) => handleDelete(e, item.name)}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
