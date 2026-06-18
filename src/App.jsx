import { useArmy } from './hooks/useArmy';
import { getData } from './data';
import { loadArmy as loadArmyFromStorage } from './utils/storage';
import ArmySetup from './components/ArmySetup';
import DetachmentSelector from './components/DetachmentSelector';
import UnitList from './components/UnitList';
import ArmyList from './components/ArmyList';
import './App.css';

function App() {
  const { state, setPointLimit, setFaction, setDetachment, addUnit, removeUnit, loadArmy } = useArmy();
  const data = getData(state.faction);
  const handleLoadArmy = (name) => {
    const saved = loadArmyFromStorage(name);
    if (saved) loadArmy(saved);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>11e List Builder</h1>
        <ArmySetup
          faction={state.faction}
          onSetFaction={setFaction}
          pointLimit={state.pointLimit}
          onSetPointLimit={setPointLimit}
          onLoadArmy={handleLoadArmy}
        />
      </header>

      <div className="detachment-bar">
        <DetachmentSelector
          data={data}
          detachment={state.detachment}
          onSetDetachment={setDetachment}
        />
      </div>

      <div className="app-body">
        <div className="left-panel">
          <UnitList data={data} units={state.units} onAddUnit={addUnit} />
        </div>
        <div className="right-panel">
          <ArmyList data={data} army={state} onRemoveUnit={removeUnit} />
        </div>
      </div>
    </div>
  );
}

export default App;
