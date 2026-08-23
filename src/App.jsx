import { useState } from 'react';
import { useArmy } from './hooks/useArmy';
import { getData } from './data';
import ArmySetup from './components/ArmySetup';
import DetachmentSelector from './components/DetachmentSelector';
import UnitList from './components/UnitList';
import ArmyList from './components/ArmyList';
import DatasheetModal from './components/DatasheetModal';
import './App.css';

function App() {
  const { state, setPointLimit, setFaction, addDetachment, removeDetachment, updateDetachmentEnhancements, addUnit, removeUnit, setName, loadArmy } = useArmy();
  const [activeTab, setActiveTab] = useState('army');
  const [dsView, setDsView] = useState(null);

  const data = getData(state.faction);
  if (!data) return <div className="app"><h1>Unknown faction: {state.faction}</h1></div>;

  return (
    <div className="app-layout">
      <div className="side-banner" />
      <div className="app">
      <header className="app-header">
        <h1>11e List Builder</h1>
        <ArmySetup
          faction={state.faction}
          onSetFaction={setFaction}
          pointLimit={state.pointLimit}
          onSetPointLimit={setPointLimit}
        />
      </header>

      <div className="detachment-bar">
        <DetachmentSelector
          data={data}
          detachments={state.detachments}
          pointLimit={state.pointLimit}
          onAddDetachment={addDetachment}
          onRemoveDetachment={removeDetachment}
          onUpdateEnhancements={updateDetachmentEnhancements}
        />
      </div>

      <div className="mobile-tabs">
        <button
          className={`tab-btn ${activeTab === 'units' ? 'active' : ''}`}
          onClick={() => setActiveTab('units')}
        >
          Units
        </button>
        <button
          className={`tab-btn ${activeTab === 'army' ? 'active' : ''}`}
          onClick={() => setActiveTab('army')}
        >
          Army List
        </button>
      </div>

      <div className="app-body">
        <div className={`left-panel ${activeTab === 'units' ? 'tab-active' : ''}`}>
          <UnitList data={data} factionKey={state.faction} units={state.units} onAddUnit={addUnit} onShowDatasheet={setDsView} />
        </div>
        <div className={`right-panel ${activeTab === 'army' ? 'tab-active' : ''}`}>
          <ArmyList data={data} army={state} onRemoveUnit={removeUnit} onLoadArmy={loadArmy} onSetName={setName} onShowDatasheet={setDsView} />
        </div>
      </div>
      {dsView && (
        <DatasheetModal
          key={dsView}
          factionKey={state.faction}
          unitName={dsView}
          onClose={() => setDsView(null)}
        />
      )}
      </div>
      <div className="side-banner" />
      <footer className="bottom-banner" />
    </div>
  );
}

export default App;
