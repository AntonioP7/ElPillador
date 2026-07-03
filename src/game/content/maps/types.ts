export type FloorId = "piso1" | "piso2" | "sabios";

export type ConnectionKind = "normal" | "bloqueo" | "secreto" | "escalera";

export type RoomKind = "normal" | "secret" | "boss" | "special";

export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoomDefinition = {
  id: string;
  floor: FloorId;
  zone: string;
  kind: RoomKind;
  layout: LayoutRect;
};

export type RequirementDefinition = {
  description: string;
  items?: string[];
  rumors?: number[];
  flags?: string[];
  anyCompanion?: boolean;
};

export type GateDefinition = {
  id: string;
  requirement: RequirementDefinition;
  connection: {
    from: string;
    to: string;
  };
};

export type ConnectionDefinition = {
  id: string;
  from: string;
  to: string;
  kind: ConnectionKind;
  zone: string;
  gateId?: string;
};

export type DungeonMapDefinition = {
  rooms: RoomDefinition[];
  connections: ConnectionDefinition[];
  gates: GateDefinition[];
  removedStairRoomIds: readonly string[];
};
