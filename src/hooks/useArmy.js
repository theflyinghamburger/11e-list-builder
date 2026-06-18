import { useReducer } from 'react';

function armyReducer(state, action) {
  switch (action.type) {
    case 'SET_POINT_LIMIT':
      return { ...state, pointLimit: action.payload };
    case 'SET_FACTION':
      return { ...initialState, faction: action.payload };
    case 'SET_DETACHMENT':
      return { ...state, detachment: action.payload };
    case 'ADD_UNIT':
      return { ...state, units: [...state.units, action.payload] };
    case 'REMOVE_UNIT':
      return { ...state, units: state.units.filter((u) => u.id !== action.payload) };
    case 'UPDATE_UNIT':
      return {
        ...state,
        units: state.units.map((u) =>
          u.id === action.payload.id ? { ...u, ...action.payload } : u
        ),
      };
    default:
      return state;
  }
}

const initialState = {
  faction: 'adeptus-mechanicus',
  pointLimit: 2000,
  detachment: null,
  units: [],
};

export function useArmy() {
  const [state, dispatch] = useReducer(armyReducer, initialState);

  return {
    state,
    setPointLimit: (limit) => dispatch({ type: 'SET_POINT_LIMIT', payload: limit }),
    setFaction: (faction) => dispatch({ type: 'SET_FACTION', payload: faction }),
    setDetachment: (det) => dispatch({ type: 'SET_DETACHMENT', payload: det }),
    addUnit: (unit) => dispatch({ type: 'ADD_UNIT', payload: unit }),
    removeUnit: (id) => dispatch({ type: 'REMOVE_UNIT', payload: id }),
    updateUnit: (unit) => dispatch({ type: 'UPDATE_UNIT', payload: unit }),
  };
}
