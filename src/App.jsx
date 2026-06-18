import { useState } from 'react';
import { useArmy } from './hooks/useArmy';
import ArmySetup from './components/ArmySetup';
import UnitList from './components/UnitList';
import ArmyList from './components/ArmyList';
import './App.css';

function App() {
  const { state, setPointLimit, setDetachment, addUnit, removeUnit } = useArmy();
  const [detachment, setLocalDetachment] = useState(null);

  const handleSetDetachment = (det) => {
    setLocalDetachment(det);
    setDetachment(det);
  };

  const army = { ...state, detachment };

  return (
    <div className="app">
      <header className="app-header">
        <h1>11e List Builder</h1>
        <ArmySetup pointLimit={state.pointLimit} onSetPointLimit={setPointLimit} />
      </header>

      <div className="app-body">
        <div className="left-panel">
          <UnitList units={state.units} onAddUnit={addUnit} />
        </div>
        <div className="right-panel">
          <ArmyList army={army} onRemoveUnit={removeUnit} />
        </div>
      </div>
    </div>
  );
}

export default App;
