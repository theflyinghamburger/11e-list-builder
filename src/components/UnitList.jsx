import { useState } from 'react';
import { getUnitPoints } from '../utils/costs';
import { canAddUnit } from '../utils/validate';

export default function UnitList({ data, units, onAddUnit, onShowDatasheet }) {
  const [search, setSearch] = useState('');
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [addForm, setAddForm] = useState(null);

  const filtered = data.units.filter((u) =>
    u.modelOptions?.length && u.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddForm = (unitData) => {
    const defaultOpt = unitData.modelOptions[0];
    setAddForm({
      unitName: unitData.name,
      modelCount: defaultOpt.count,
      modelCost: getUnitPoints(unitData, defaultOpt.count, units.filter((u) => u.unitName === unitData.name).length + 1, {}),
      wargear: {},
    });
    setExpandedUnit(unitData.name);
  };

  const handleModelChange = (unitData, option) => {
    setAddForm((prev) => ({
      ...prev,
      modelCount: option.count,
      modelCost: getUnitPoints(unitData, option.count, units.filter((u) => u.unitName === unitData.name).length + 1, prev.wargear),
    }));
  };

  const handleAdd = () => {
    if (!addForm) return;
    onAddUnit({
      id: crypto.randomUUID(),
      unitName: addForm.unitName,
      modelCount: addForm.modelCount,
      wargear: { ...addForm.wargear },
    });
    setAddForm(null);
    setExpandedUnit(null);
  };

  return (
    <div className="unit-list">
      <h3>Units</h3>
      <input
        type="text"
        placeholder="Search units..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      <div className="unit-browser">
        {filtered.map((unitData) => {
          const isExpanded = expandedUnit === unitData.name;
          const form = addForm?.unitName === unitData.name ? addForm : null;
          const nextOrdinal = units.filter((u) => u.unitName === unitData.name).length + 1;

          return (
            <div key={unitData.name} className="unit-card">
              <div className="unit-header" onClick={() => openAddForm(unitData)}>
                <span className="unit-name">{unitData.name}</span>
                <button
                  className="info-btn"
                  title="View datasheet"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDatasheet(unitData.name);
                  }}
                >
                  &#9432;
                </button>
                <span className="unit-cost">
                  {getUnitPoints(unitData, unitData.modelOptions[0].count, nextOrdinal, {})} pts
                </span>
              </div>

              {isExpanded && (
                <div className="unit-config">
                  <div className="model-options">
                    {unitData.modelOptions.map((opt) => {
                      const tieredCost = form ? getUnitPoints(unitData, opt.count, nextOrdinal, form.wargear) : opt.cost;
                      return (
                        <button
                          key={opt.count}
                          className={`model-btn ${form?.modelCount === opt.count ? 'active' : ''}`}
                          onClick={() => handleModelChange(unitData, opt)}
                        >
                          {opt.count} model{opt.count > 1 ? 's' : ''} ({tieredCost} pts)
                        </button>
                      );
                    })}
                  </div>

                  {unitData.wargearOptions && (
                    <div className="wargear-options">
                      {unitData.wargearOptions.map((wg) => (
                        <div key={wg.name} className="wargear-row">
                          <span>{wg.name} (+{wg.costPerModel}/model)</span>
                          <input
                            type="range"
                            min="0"
                            max={form?.modelCount || 1}
                            value={form?.wargear[wg.name] || 0}
                            onChange={(e) =>
                              setAddForm((prev) => ({
                                ...prev,
                                wargear: {
                                  ...prev.wargear,
                                  [wg.name]: parseInt(e.target.value),
                                },
                              }))
                            }
                          />
                          <span>{form?.wargear[wg.name] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {form && (
                    <div className="add-footer">
                      <span className="total-cost">
                        {getUnitPoints(unitData, form.modelCount, nextOrdinal, form.wargear)} pts
                        {unitData.tiered && (
                          <span className="tier-label">
                            {' '}(#{units.filter((u) => u.unitName === unitData.name).length + 1})
                          </span>
                        )}
                      </span>
                      {(() => {
                        const validation = canAddUnit(unitData.name, units, data);
                        if (!validation.ok) {
                          return <span className="validation-error">{validation.reason}</span>;
                        }
                        return (
                          <button className="add-btn" onClick={handleAdd}>
                            Add to Army
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
