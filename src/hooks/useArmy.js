import { useReducer } from 'react';
import { getDpBudget } from '../utils/dpBudget';
import { getData } from '../data';

function armyReducer(state, action) {
  switch (action.type) {
    case 'SET_POINT_LIMIT': {
      return { ...state, pointLimit: action.payload };
    }
    case 'SET_FACTION':
      return { ...initialState, faction: action.payload };
    case 'ADD_DETACHMENT': {
      const { name, enhancements } = action.payload;
      if (state.detachments.some((d) => d.name === name)) return state;
      const factionData = getData(state.faction);
      const det = factionData?.detachments?.find((d) => d.name === name);
      if (!det) return state;
      const currentDp = state.detachments.reduce((s, d) => {
        const dd = factionData?.detachments?.find((x) => x.name === d.name);
        return s + (dd?.dpCost || 0);
      }, 0);
      if (currentDp + det.dpCost > getDpBudget(state.pointLimit)) return state;
      return { ...state, detachments: [...state.detachments, { name, enhancements: enhancements || [] }] };
    }
    case 'REMOVE_DETACHMENT':
      return { ...state, detachments: state.detachments.filter((d) => d.name !== action.payload) };
    case 'UPDATE_DETACHMENT_ENHANCEMENTS':
      return {
        ...state,
        detachments: state.detachments.map((d) =>
          d.name === action.payload.name ? { ...d, enhancements: action.payload.enhancements } : d
        ),
      };
    case 'ADD_UNIT':
      return { ...state, units: [...state.units, action.payload] };
    case 'REMOVE_UNIT':
      return { ...state, units: state.units.filter((u) => u.id !== action.payload) };
    case 'LOAD_ARMY':
      return { ...initialState, ...action.payload, detachments: action.payload.detachments || [] };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    default:
      return state;
  }
}

const initialState = {
  faction: 'adeptus-mechanicus',
  pointLimit: 2000,
  name: '',
  detachments: [],
  units: [],
};

export function useArmy() {
  const [state, dispatch] = useReducer(armyReducer, initialState);

  return {
    state,
    setPointLimit: (limit) => dispatch({ type: 'SET_POINT_LIMIT', payload: limit }),
    setFaction: (faction) => dispatch({ type: 'SET_FACTION', payload: faction }),
    addDetachment: (det) => dispatch({ type: 'ADD_DETACHMENT', payload: det }),
    removeDetachment: (name) => dispatch({ type: 'REMOVE_DETACHMENT', payload: name }),
    updateDetachmentEnhancements: (name, enhancements) => dispatch({ type: 'UPDATE_DETACHMENT_ENHANCEMENTS', payload: { name, enhancements } }),
    addUnit: (unit) => dispatch({ type: 'ADD_UNIT', payload: unit }),
    removeUnit: (id) => dispatch({ type: 'REMOVE_UNIT', payload: id }),
    setName: (n) => dispatch({ type: 'SET_NAME', payload: n }),
    loadArmy: (s) => dispatch({ type: 'LOAD_ARMY', payload: s }),
  };
}
