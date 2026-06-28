import { getFactionKeys } from '../data';

export default function ArmySetup({ faction, onSetFaction, pointLimit, onSetPointLimit }) {
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
    </div>
  );
}
