import type { GameState } from "../../simulation/state";

export type RumorId =
  | "rumor_01"
  | "rumor_02"
  | "rumor_03"
  | "rumor_04"
  | "rumor_05"
  | "rumor_06"
  | "rumor_07"
  | "rumor_08"
  | "rumor_09"
  | "rumor_10"
  | "rumor_11"
  | "rumor_12"
  | "rumor_13"
  | "rumor_14"
  | "rumor_15"
  | "rumor_16";

export type RumorDefinition = {
  id: number;
  key: RumorId;
  title: string;
  text: string;
  unlocksRoomId: string;
  source: string;
  sourceRoomId: string;
  targetRoomId: string;
  note: string;
};

export type RumorJournalEntry = RumorDefinition & {
  discovered: boolean;
  used: boolean;
};

export const rumorDefinitions: RumorDefinition[] = [
  rumor(1, "Rumor Alfre, innecesario pero util", "Una pared de Entrada suena hueca si llevas Bombas.", "SS1", "SABIOS-2 / Bombas", "SABIOS-2", "Revela el muro B1 hacia Interruptor Azul"),
  rumor(2, "Rumor 2 hermano", "El hermano recuerda una grieta escondida en Cocina.", "SS2", "SR17 / NPC2", "SR17", "Hace volver a Cocina bloqueada"),
  rumor(3, "Rumor 3", "Mireia habla de una pared oculta en Magia Oscura.", "SS3", "SR18 / NPC3", "SR18", "Hace volver a Magia bloqueada"),
  rumor(4, "Rumor NPC 4", "NPC4 deja una pista hacia el secreto de Loteria.", "SS4", "SR16 / NPC4", "SR16", "Hace volver a Loteria"),
  rumor(5, "Pan superior", "Un pan perfecto revela el secreto de Panaderia.", "SS5", "SR20 / NPC7", "SR20", "Hace volver a Panaderia"),
  rumor(6, "Records de boxeo", "Los cinco records secretos del Gym abren una sala oculta.", "SS6", "SR13", "SR13", "Hace volver a Gym"),
  rumor(7, "Rumor estatuas", "Los dibujos ocultos de PZ-C3 revelan el orden secreto de las estatuas.", "SS7", "PZ-C3 / Lupa", "PZ-C3", "Hace volver a Grecia"),
  rumor(8, "Rumor correr", "Un interruptor temporal aparece si corres con las Zapatillas Guillem.", "SS8", "SR5", "SR5", "Hace volver a Correr"),
  rumor(9, "Rumor ingredientes", "La combinacion especial de ingredientes en PZ-C3 abre SS9.", "SS9", "SR2", "SR2", "Hace volver a Cocina"),
  rumor(10, "Mago hexadecimal", "El sombrero y el timer esconden el codigo de DS-R2.", "SS10", "SR12 / NPC8", "SR12", "Mantiene la pista de NPC8"),
  rumor(11, "Rumor orden enemigos", "Los enemigos de Catacumbas deben caer en un orden concreto.", "SS11", "SR14", "SR14", "Pista interna de Catacumbas"),
  rumor(12, "HxH", "Callar ante la pregunta de Grecia abre el tercer interruptor sellado.", "SS12", "MG-G1", "MG-G1", "Pista interna de Grecia"),
  rumor(13, "Lupa sobre el reloj", "El reloj senala una marca en la tienda de SR18.", "SS13", "Reloj / Lupa", "Reloj", "Pista del Giratiempo"),
  rumor(14, "Rumor cebo", "El diario de Antonio apunta a una pared secreta junto a un boss.", "SS14", "SR11", "SR11", "Pista interna de Magia bloqueada"),
  rumor(15, "Moneda de la Muerte", "La Loteria esconde una prueba de lapidas y velas.", "SS15", "BOSS-Mascle", "BOSS-Mascle", "Pista final de Loteria bloqueada"),
  rumor(16, "Rumor bestia legendaria", "El cebo especial invoca una bestia oculta en Grecia.", "CP-G1", "SS14", "SS14", "Pista del combate Pokemon oculto en Grecia"),
];

export function buildRumorJournal(state: GameState): RumorJournalEntry[] {
  return rumorDefinitions.map((rumorDefinition) => ({
    ...rumorDefinition,
    discovered: state.rumors.includes(rumorDefinition.id),
    used: state.usedRumors.includes(rumorDefinition.id),
  }));
}

export function getRumorDefinition(id: number): RumorDefinition | undefined {
  return rumorDefinitions.find((rumorDefinition) => rumorDefinition.id === id);
}

export function rumorKey(id: number): RumorId {
  return `rumor_${String(id).padStart(2, "0")}` as RumorId;
}

function rumor(
  id: number,
  title: string,
  text: string,
  unlocksRoomId: string,
  source: string,
  sourceRoomId: string,
  note: string,
): RumorDefinition {
  return {
    id,
    key: rumorKey(id),
    title,
    text,
    unlocksRoomId,
    targetRoomId: unlocksRoomId,
    source,
    sourceRoomId,
    note,
  };
}
