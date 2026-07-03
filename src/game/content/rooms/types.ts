import type { FloorId, RoomDefinition as GraphRoomDefinition, RoomKind } from "../maps/types";
import type { NpcDefinition, RoomRewardDefinition, ProgressGrants, ProgressRequirement } from "../progression/types";
import type { EnemySpecies } from "../enemies/types";
import type { TiledWorldRoomManifestEntry } from "../tiledRooms/worldManifest.generated";

export type RoomContentType = "normal" | "puzzle" | "combat" | "secret" | "boss" | "shop" | "npc" | "special";

export type RoomContentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoomEnemyPlacement = {
  id: string;
  species: EnemySpecies;
  x: number;
  y: number;
  hp?: number;
  kind?: "minion" | "boss";
  radius?: number;
  respawnOnEntry?: boolean;
  requiresFlag?: string;
  excludedByFlag?: string;
};

export type RoomNpcPlacement = {
  id: string;
  name: string;
  x?: number;
  y?: number;
  requirement?: ProgressRequirement;
  grants?: ProgressGrants;
  sourceNpcId?: string;
};

export type RoomObjectDefinition = {
  id: string;
  kind: "chest" | "interactable" | "breakable" | "inspection" | "pickup";
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  requirement?: ProgressRequirement;
  grants?: ProgressGrants;
  flag?: string;
};

export type RoomTriggerDefinition = {
  id: string;
  kind: "enter-area" | "inspect" | "timer" | "combat-cleared" | "custom";
  area?: RoomContentRect;
  requirement?: ProgressRequirement;
  grants?: ProgressGrants;
  message?: string;
};

export type RoomPuzzleDefinition = {
  id: string;
  label: string;
  requirement?: ProgressRequirement;
  solvedFlag?: string;
  grants?: ProgressGrants;
};

export type RoomLockDefinition = {
  id: string;
  gateId?: string;
  label?: string;
  requirement?: ProgressRequirement;
  openedFlag?: string;
};

export type RoomLifecycleAction = {
  kind: "grant" | "setFlag" | "clearFlag" | "message" | "startTimer" | "custom";
  id?: string;
  grants?: ProgressGrants;
  flag?: string;
  message?: string;
};

export type RoomContentDefinition = {
  id: string;
  name: string;
  floor: FloorId;
  zone: string;
  type: RoomContentType;
  music?: string;
  enemies: RoomEnemyPlacement[];
  npcs: RoomNpcPlacement[];
  items: RoomObjectDefinition[];
  objects: RoomObjectDefinition[];
  triggers: RoomTriggerDefinition[];
  puzzles: RoomPuzzleDefinition[];
  locks: RoomLockDefinition[];
  rewards: RoomRewardDefinition[];
  flags: string[];
  entryConditions: ProgressRequirement[];
  exitConditions: ProgressRequirement[];
  onEnter: RoomLifecycleAction[];
  onExit: RoomLifecycleAction[];
};

export type RoomRuntimeDefinition = {
  id: string;
  name: string;
  floor: FloorId;
  zone: string;
  type: RoomContentType;
  music?: string;
  content: RoomContentDefinition;
  graph?: GraphRoomDefinition;
  world?: TiledWorldRoomManifestEntry;
  graphKind?: RoomKind;
  hasTiledWorldMap: boolean;
  usesFallbackView: boolean;
  enemies: RoomEnemyPlacement[];
  npcs: RoomNpcPlacement[];
  rewards: RoomRewardDefinition[];
};
