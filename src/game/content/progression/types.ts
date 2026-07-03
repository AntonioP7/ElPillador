export type ProgressRequirement = {
  description: string;
  items?: string[];
  rumors?: number[];
  flags?: string[];
};

export type ProgressGrants = {
  items?: string[];
  rumors?: number[];
  flags?: string[];
  openGates?: string[];
};

export type RoomRewardDefinition = {
  id: string;
  roomId: string;
  label: string;
  grants: ProgressGrants;
  requirement?: ProgressRequirement;
};

export type NpcDefinition = {
  id: string;
  roomId: string;
  name: string;
  requirement?: ProgressRequirement;
  grants: ProgressGrants;
};

export type InteractionKind = "room-reward" | "npc" | "special";

export type InteractionStatus = "available" | "blocked" | "completed";

export type RoomInteraction = {
  id: string;
  kind: InteractionKind;
  label: string;
  status: InteractionStatus;
  grants?: ProgressGrants;
  requirement?: ProgressRequirement;
  missing?: string[];
};
