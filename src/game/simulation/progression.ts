import { npcDefinitions, roomRewards } from "../content/progression";
import { getRumorDefinition } from "../content/rumors";
import {
  NpcDefinition,
  ProgressGrants,
  ProgressRequirement,
  RoomInteraction,
  RoomRewardDefinition,
} from "../content/progression/types";
import { GameState, touchGameState } from "./state";
import { reopenGuilleCircuitWithGiratiempo } from "./timer";

export type InteractionResult = {
  state: GameState;
  changed: boolean;
  message: string;
  interactions: RoomInteraction[];
};

const GIRATIEMPO_ROOM_ID = "SS13";
const GIRATIEMPO_INTERACTION_ID = "special.SS13.giratiempo";

export function getRoomInteractions(state: GameState): RoomInteraction[] {
  const rewards = roomRewards
    .filter((reward) => reward.roomId === state.currentRoomId)
    .map((reward) => roomRewardToInteraction(state, reward));
  const npcs = npcDefinitions
    .filter((npc) => npc.roomId === state.currentRoomId)
    .map((npc) => npcToInteraction(state, npc));
  const specials = state.currentRoomId === GIRATIEMPO_ROOM_ID ? [giratiempoToInteraction()] : [];

  return [...rewards, ...npcs, ...specials];
}

export function interactWithCurrentRoom(state: GameState, now = new Date()): InteractionResult {
  let nextState = state;
  const messages: string[] = [];
  let changed = false;

  for (const reward of roomRewards.filter((entry) => entry.roomId === state.currentRoomId)) {
    const flag = roomRewardFlag(reward);

    if (nextState.flags[flag]) {
      continue;
    }

    const missing = missingRequirement(nextState, reward.requirement);

    if (missing.length > 0) {
      messages.push(`${reward.label}: falta ${missing.join(", ")}`);
      continue;
    }

    const feedback = grantFeedback(reward.grants, nextState);
    nextState = grantProgress(nextState, {
      ...reward.grants,
      flags: [...(reward.grants.flags ?? []), flag],
    });
    messages.push(feedback);
    changed = true;
  }

  for (const npc of npcDefinitions.filter((entry) => entry.roomId === state.currentRoomId)) {
    const flag = npcCompletedFlag(npc);

    if (nextState.flags[flag]) {
      continue;
    }

    const missing = missingRequirement(nextState, npc.requirement);

    if (missing.length > 0) {
      messages.push(`${npc.name}: falta ${missing.join(", ")}`);
      continue;
    }

    const feedback = grantFeedback(npc.grants, nextState, npc.name);
    nextState = grantProgress(nextState, {
      ...npc.grants,
      flags: [...(npc.grants.flags ?? []), flag],
    });
    messages.push(feedback);
    changed = true;
  }

  if (nextState.currentRoomId === GIRATIEMPO_ROOM_ID) {
    nextState = reopenGuilleCircuitWithGiratiempo(nextState, now);
    messages.push("Giratiempo activado: circuito de Guille reabierto");
    changed = true;
  }

  const touched = touchGameState(nextState, now);

  return {
    state: touched,
    changed,
    message: messages.length > 0 ? messages.join(" | ") : "No hay nada nuevo en esta sala",
    interactions: getRoomInteractions(touched),
  };
}

export function grantProgress(state: GameState, grants: ProgressGrants): GameState {
  return {
    ...state,
    inventory: addUnique(state.inventory, grants.items ?? []),
    rumors: addUnique(state.rumors, grants.rumors ?? []).sort((a, b) => a - b),
    flags: {
      ...state.flags,
      ...Object.fromEntries((grants.flags ?? []).map((flag) => [flag, true])),
    },
    openGates: addUnique(state.openGates, grants.openGates ?? []),
  };
}

export function unlockRumor(state: GameState, rumorId: number): GameState {
  return grantProgress(state, { rumors: [rumorId] });
}

export function meetsRequirement(state: GameState, requirement?: ProgressRequirement): boolean {
  return missingRequirement(state, requirement).length === 0;
}

export function missingRequirement(state: GameState, requirement?: ProgressRequirement): string[] {
  if (!requirement) {
    return [];
  }

  const missingItems = (requirement.items ?? []).filter((item) => !state.inventory.includes(item));
  const missingRumors = (requirement.rumors ?? [])
    .filter((rumor) => !state.rumors.includes(rumor))
    .map((rumor) => `Rumor ${rumor}`);
  const missingFlags = (requirement.flags ?? []).filter((flag) => !state.flags[flag]);

  return [...missingItems, ...missingRumors, ...missingFlags];
}

function roomRewardToInteraction(state: GameState, reward: RoomRewardDefinition): RoomInteraction {
  const flag = roomRewardFlag(reward);
  const missing = missingRequirement(state, reward.requirement);

  return {
    id: reward.id,
    kind: "room-reward",
    label: reward.label,
    status: state.flags[flag] ? "completed" : missing.length > 0 ? "blocked" : "available",
    grants: reward.grants,
    requirement: reward.requirement,
    missing,
  };
}

function npcToInteraction(state: GameState, npc: NpcDefinition): RoomInteraction {
  const flag = npcCompletedFlag(npc);
  const missing = missingRequirement(state, npc.requirement);

  return {
    id: npc.id,
    kind: "npc",
    label: npc.name,
    status: state.flags[flag] ? "completed" : missing.length > 0 ? "blocked" : "available",
    grants: npc.grants,
    requirement: npc.requirement,
    missing,
  };
}

function giratiempoToInteraction(): RoomInteraction {
  return {
    id: GIRATIEMPO_INTERACTION_ID,
    kind: "special",
    label: "Giratiempo",
    status: "available",
  };
}

function roomRewardFlag(reward: RoomRewardDefinition): string {
  return `reward.${reward.id}`;
}

function npcCompletedFlag(npc: NpcDefinition): string {
  return `npc.${npc.id}.completed`;
}

function grantFeedback(grants: ProgressGrants, state: GameState, prefix?: string): string {
  const parts = [
    ...(grants.rumors ?? [])
      .filter((rumor) => !state.rumors.includes(rumor))
      .map((rumor) => `Nuevo rumor añadido al diario: ${getRumorDefinition(rumor)?.title ?? `Rumor ${rumor}`}`),
    ...(grants.flags ?? [])
      .filter((flag) => flag.startsWith("secret.") && flag.endsWith(".open") && !state.flags[flag])
      .map(() => "Se ha abierto una sala secreta."),
    ...(grants.openGates ?? [])
      .filter((gate) => !state.openGates.includes(gate))
      .map((gate) => `Bloqueo superado: ${gate}`),
    ...(grants.items ?? [])
      .filter((item) => !state.inventory.includes(item))
      .map((item) => `Objeto clave obtenido: ${item}`),
    ...(grants.flags ?? [])
      .filter((flag) => !flag.startsWith("secret.") && !state.flags[flag])
      .map(() => "Diario actualizado."),
  ];

  const message = parts.length > 0 ? parts.join(" | ") : "Diario actualizado.";

  return prefix ? `${prefix}: ${message}` : message;
}

function addUnique<T>(current: T[], added: T[]): T[] {
  return [...current, ...added.filter((item) => !current.includes(item))];
}
