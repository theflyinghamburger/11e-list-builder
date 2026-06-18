import { useState } from 'react';
import data from '../data/adeptus-mechanicus.json';

export default function UnitList({ units, onAddUnit }) {
  const [search, setSearch] = useState('');
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [addForm, setAddForm] = useState(null);

  const filtered = data.units.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddForm = (unitData) => {
    const defaultOpt = unitData.modelOptions[0];
    setAddForm({
      unitName: unitData.name,
      modelCount: defaultOpt.count,
      modelCost: defaultOpt.cost,
      wargear: {},
    });
    setExpandedUnit(unitData.name);
  };

  const handleModelChange = (unitData, option) => {
    setAddForm((prev) => ({
      ...prev,
      modelCount: option.count,
      modelCost: option.cost,
    }));
  };

  const handleWargearChange = (wargear, count) => {
    setAddForm((prev) => {
      const current = prev.wargear[wargear.name] || 0;
      const next = current >= count ? 0 : current + 1;
      return {
        ...prev,
        wargear: { ...prev.wargear, [wargear.name]: next },
      };
    });
  };

  const handleAdd = () => {
    if (!addForm) return;
    onAddUnit({
      id: Date.now().toString(),
      unitName: addForm.unitName,
      modelCount: addForm.modelCount,
      wargear: { ...addForm.wargear },
    });
    setAddForm(null);
    setExpandedUnit(null);
  };

  const calculateCost = (unitData, modelCost, wargear, modelCount) => {
    let cost = modelCost;
    if (wargear) {
      for (const [name, count] of Object.entries(wargear)) {
        const wg = unitData.wargearOptions?.find((w) => w.name === name);
        if (wg) cost += wg.costPerModel * count;
      }
    }
    return cost;
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

          return (
            <div key={unitData.name} className="unit-card">
              <div className="unit-header" onClick={() => openAddForm(unitData)}>
                <span className="unit-name">{unitData.name}</span>
                <span className="unit-cost">
                  {unitData.modelOptions[0].cost} pts
                </span>
              </div>

              {isExpanded && (
                <div className="unit-config">
                  <div className="model-options">
                    {unitData.modelOptions.map((opt) => (
                      <button
                        key={opt.count}
                        className={`model-btn ${form?.modelCount === opt.count ? 'active' : ''}`}
                        onClick={() => handleModelChange(unitData, opt)}
                      >
                        {opt.count} model{opt.count > 1 ? 's' : ''} ({opt.cost} pts)
                      </button>
                    ))}
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
                        {calculateCost(unitData, form.modelCost, form.wargear, form.modelCount)} pts
                      </span>
                      <button className="add-btn" onClick={handleAdd}>
                        Add to Army
                      </button>
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
