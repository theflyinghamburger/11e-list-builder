import data from '../data/adeptus-mechanicus.json';

function getUnitPoints(unit, allUnits) {
  const unitData = data.units.find((u) => u.name === unit.unitName);
  if (!unitData) return 0;

  let cost = unitData.modelOptions.find((o) => o.count === unit.modelCount)?.cost || 0;

  if (unitData.tiered) {
    const sameUnitCount = allUnits.filter((u) => u.unitName === unit.unitName).length;
    const tierOptions =
      sameUnitCount <= 2 ? unitData.tiered.primary : unitData.tiered.secondary;
    cost = tierOptions.find((o) => o.count === unit.modelCount)?.cost || cost;
  }

  if (unit.wargear) {
    for (const [name, count] of Object.entries(unit.wargear)) {
      const wg = unitData.wargearOptions?.find((w) => w.name === name);
      if (wg) cost += wg.costPerModel * count;
    }
  }

  return cost;
}

export default function ArmyList({ army, onRemoveUnit }) {
  const totalPoints = army.units.reduce(
    (sum, u) => sum + getUnitPoints(u, army.units),
    0
  );
  const isOver = totalPoints > army.pointLimit;

  const getDetachmentPoints = () => {
    if (!army.detachment) return 0;
    const detData = data.detachments.find((d) => d.name === army.detachment.name);
    if (!detData) return 0;
    return (
      detData.enhancements
        .filter((e) => army.detachment.enhancements.includes(e.name))
        .reduce((sum, e) => sum + e.pts, 0)
    );
  };

  const grandTotal = totalPoints + getDetachmentPoints();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="army-list">
      <div className="army-header">
        <h3>Army List</h3>
        <button className="print-btn" onClick={handlePrint}>
          Print
        </button>
      </div>

      {army.detachment && (
        <div className="detachment-info">
          <strong>{army.detachment.name}</strong>
          <span>DP: {data.detachments.find((d) => d.name === army.detachment.name)?.dpCost}</span>
          {army.detachment.enhancements.length > 0 && (
            <div className="det-enhancements">
              {army.detachment.enhancements.map((e) => (
                <span key={e} className="enh-tag">{e}</span>
              ))}
            </div>
          )}
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
            const pts = getUnitPoints(unit, army.units);
            const sameCount = army.units.filter((u) => u.unitName === unit.unitName).length;
            const tierLabel =
              unitData?.tiered && sameCount > 2 ? ' (3rd+)' : '';

            return (
              <tr key={unit.id} className={isOver ? 'over-budget' : ''}>
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
              {getDetachmentPoints() > 0 && (
                <span className="det-pts"> (incl. {getDetachmentPoints()} pts enhancements)</span>
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
    </div>
  );
}
