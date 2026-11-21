export const T = {
  ROAD: 0,
  PAVEMENT: 1,
  BUILDING: 2,
  CITY_WALL: 3,
  BARRICADE: 4,
  GATE: 5,
  DOORWAY: 6,
  EXIT: 7,
}

export const SOLID = new Set([T.BUILDING, T.CITY_WALL, T.BARRICADE])
export const HIDING = new Set([T.DOORWAY])
