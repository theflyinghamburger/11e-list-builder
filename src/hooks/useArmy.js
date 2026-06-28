import { useReducer } from 'react';
import { getDpBudget } from '../utils/dpBudget';

function armyReducer(state, action) {
  switch (action.type) {
    case 'SET_POINT_LIMIT': {
      const next = { ...state, pointLimit: action.payload };
      const budget = getDpBudget(action.payload);
      const spent = next.detachments.reduce((s, d) => {
        const det = state._data?.detachments?.find((x) => x.name === d.name);
        return s + (det?.dpCost || 0);
      }, 0);
      if (spent > budget) {
        console.warn(`DP budget exceeded: ${spent}/${budget}`);
      }
      return next;
    }
    case 'SET_FACTION':
      return { ...initialState, faction: action.payload };
    case 'ADD_DETACHMENT': {
      const { name, enhancements } = action.payload;
      if (state.detachments.some((d) => d.name === name)) return state;
      const det = state._data?.detachments?.find((d) => d.name === name);
      if (!det) return state;
      const currentDp = state.detachments.reduce((s, d) => {
        const dd = state._data?.detachments?.find((x) => x.name === d.name);
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
    case 'LOAD_ARMY': {
      const payload = { ...action.payload };
      if (payload.detachment && !payload.detachments) {
        payload.detachments = [{ name: payload.detachment.name, enhancements: payload.detachment.enhancements || [] }];
        delete payload.detachment;
      }
      if (!payload.detachments) payload.detachments = [];
      return { ...initialState, ...payload };
    }
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_DATA':
      return { ...state, _data: action.payload };
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
  _data: null,
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
    setData: (data) => dispatch({ type: 'SET_DATA', payload: data }),
  };
}
