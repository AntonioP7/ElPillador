export const documentationSources = {
  brief: "Doc/02_PROJECT_BRIEF_CODEX.md",
  gdd: "Doc/01_GDD_EL_PILLADOR.md",
  dungeon: "Doc/documentacion_mazmorra_rpg_completa.md",
  floor1Connections: "Doc/piso1_conexiones_simple_actualizado.md",
  floor2Connections: "Doc/piso2_conexiones_simple_actualizado.md",
  floor1Layout: "Doc/piso1_layout_completo_confirmado.drawio",
  floor2Layout: "Doc/piso2_layout_completo_confirmado.drawio",
} as const;

export const firstPlayableRoom = {
  id: "PZ-E1",
  floor: "piso1",
  zone: "Entrada",
} as const;

export { dungeonMap, removedStairRoomIds, roomsById, connectionsById, gatesById } from "./dungeon";
export type {
  ConnectionDefinition,
  ConnectionKind,
  DungeonMapDefinition,
  FloorId,
  GateDefinition,
  LayoutRect,
  RequirementDefinition,
  RoomDefinition,
  RoomKind,
} from "./types";
