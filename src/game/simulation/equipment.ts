import { itemDefinitions, ItemDefinition } from "../content/items";
import { getRumorDefinition } from "../content/rumors";
import { unlockRumor } from "./progression";
import { GameState, touchGameState } from "./state";

export type EquipmentResult = {
  state: GameState;
  changed: boolean;
  handled: boolean;
  message: string;
};

const itemByName = new Map(itemDefinitions.map((item) => [item.name, item] as const));
export const CLOCK_INSPECTION_RUMOR_ID = 13;

export function getItemDefinition(itemName: string): ItemDefinition | undefined {
  return itemByName.get(itemName);
}

export function equipItem(state: GameState, itemName: string, now = new Date()): EquipmentResult {
  const item = getItemDefinition(itemName);

  if (!item) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: `${itemName}: item desconocido`,
    };
  }

  if (!state.inventory.includes(item.name)) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: `${item.name}: aun no lo tienes`,
    };
  }

  if (!item.equipSlot) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: `${item.name}: no es equipable`,
    };
  }

  const nextEquipment =
    item.equipSlot === "weapon"
      ? { ...state.equipment, weapon: item.name }
      : { ...state.equipment, activeItem: item.name };

  return {
    state: touchGameState(
      {
        ...state,
        equipment: nextEquipment,
      },
      now,
    ),
    changed: true,
    handled: true,
    message: `${item.name} equipado`,
  };
}

export function useEquippedItem(state: GameState, now = new Date()): EquipmentResult {
  const activeItem = state.equipment.activeItem ? getItemDefinition(state.equipment.activeItem) : undefined;
  const weapon = state.equipment.weapon ? getItemDefinition(state.equipment.weapon) : undefined;
  const item = activeItem ?? weapon;

  if (!item) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: "No hay item equipado para usar",
    };
  }

  if (!state.inventory.includes(item.name)) {
    return {
      state: touchGameState(
        {
          ...state,
          equipment: {
            weapon: state.equipment.weapon === item.name ? undefined : state.equipment.weapon,
            activeItem: state.equipment.activeItem === item.name ? undefined : state.equipment.activeItem,
          },
        },
        now,
      ),
      changed: true,
      handled: false,
      message: `${item.name}: ya no esta en inventario`,
    };
  }

  return {
    state: touchGameState(state, now),
    changed: false,
    handled: true,
    message: `${item.actionLabel ?? "Usar"}: ${item.name}`,
  };
}

export function inspectItemWithLupa(state: GameState, itemName: string, now = new Date()): EquipmentResult {
  const item = getItemDefinition(itemName);

  if (!item) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: `${itemName}: item desconocido`,
    };
  }

  if (!state.inventory.includes(item.name)) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: `${item.name}: aun no lo tienes`,
    };
  }

  if (state.equipment.activeItem !== "Lupa") {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: false,
      message: "Equipa la Lupa para inspeccionar items",
    };
  }

  if (item.name !== "Reloj") {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: true,
      message: `La Lupa no revela nada nuevo en ${item.name}`,
    };
  }

  if (state.rumors.includes(CLOCK_INSPECTION_RUMOR_ID)) {
    return {
      state: touchGameState(state, now),
      changed: false,
      handled: true,
      message: "El Reloj ya revelo su pista",
    };
  }

  return {
    state: touchGameState(unlockRumor(state, CLOCK_INSPECTION_RUMOR_ID), now),
    changed: true,
    handled: true,
    message: `Nuevo rumor añadido al diario: ${getRumorDefinition(CLOCK_INSPECTION_RUMOR_ID)?.title ?? `Rumor ${CLOCK_INSPECTION_RUMOR_ID}`}`,
  };
}
