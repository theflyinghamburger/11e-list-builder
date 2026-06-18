export default function ArmySetup({ pointLimit, onSetPointLimit }) {
  return (
    <div className="army-setup">
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
