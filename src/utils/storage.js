const KEY = 'army-lists';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function saveArmy(name, state) {
  const lists = read();
  lists[name] = { timestamp: Date.now(), name, state };
  localStorage.setItem(KEY, JSON.stringify(lists));
}

export function loadArmy(name) {
  const lists = read();
  return lists[name]?.state || null;
}

export function listArmies() {
  const lists = read();
  return Object.values(lists).sort((a, b) => b.timestamp - a.timestamp);
}

export function deleteArmy(name) {
  const lists = read();
  delete lists[name];
  localStorage.setItem(KEY, JSON.stringify(lists));
}
