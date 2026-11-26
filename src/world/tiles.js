export const T = {
  ROAD: 0,
  PAVEMENT: 1,
  BUILDING: 2,
  CITY_WALL: 3,
  BARRICADE: 4,
  GATE: 5,
  DOORWAY: 6,
  EXIT: 7,
  PROP: 8,
  FOREST: 9,
  TREE: 10,
  WATER: 11,
  FORD: 12,
  HEDGE: 13,
  BRIDGE: 14,
};

export const SOLID = new Set([
  T.BUILDING,
  T.CITY_WALL,
  T.BARRICADE,
  T.PROP,
  T.TREE,
  T.WATER,
  T.HEDGE,
]);
export const HIDING = new Set([T.DOORWAY]);
