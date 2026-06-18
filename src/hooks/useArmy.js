import { useReducer, useCallback } from 'react';

function armyReducer(state, action) {
  switch (action.type) {
    case 'SET_POINT_LIMIT':
      return { ...state, pointLimit: action.payload };
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

  const setPointLimit = useCallback(
    (limit) => dispatch({ type: 'SET_POINT_LIMIT', payload: limit }),
    []
  );
  const setDetachment = useCallback(
    (det) => dispatch({ type: 'SET_DETACHMENT', payload: det }),
    []
  );
  const addUnit = useCallback(
    (unit) => dispatch({ type: 'ADD_UNIT', payload: unit }),
    []
  );
  const removeUnit = useCallback(
    (id) => dispatch({ type: 'REMOVE_UNIT', payload: id }),
    []
  );
  const updateUnit = useCallback(
    (unit) => dispatch({ type: 'UPDATE_UNIT', payload: unit }),
    []
  );

  return { state, setPointLimit, setDetachment, addUnit, removeUnit, updateUnit };
}
