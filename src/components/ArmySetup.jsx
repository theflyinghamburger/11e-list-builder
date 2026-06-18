import { useRef, useState } from 'react';
import { addFaction, getFactionKeys } from '../data';
import { listArmies, deleteArmy } from '../utils/storage';

export default function ArmySetup({ faction, onSetFaction, pointLimit, onSetPointLimit, onLoadArmy }) {
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(listArmies());

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

  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const key = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || 'custom';
        const result = addFaction(key, data);
        if (result.ok) {
          onSetFaction(key);
          setSaved(listArmies());
        } else {
          alert(result.reason);
        }
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
        <button className="load-btn" onClick={() => fileInputRef.current?.click()}>
          Load JSON
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleJsonUpload} />
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
