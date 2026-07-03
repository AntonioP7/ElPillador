import { NpcDefinition, RoomRewardDefinition } from "./types";

export const roomRewards: RoomRewardDefinition[] = [
  reward("room.SR2.espada", "SR2", "Cofre: Espada + Rumor 9", {
    items: ["Espada"],
    rumors: [9],
  }),
  reward("room.SR1.varita-sauco", "SR1", "Cofre: Varita de Sauco", {
    items: ["Varita de Sauco"],
  }),
  secretOpen("room.SR20.open-SS2", "SR20", "SS2", ["SECRET-SS2"], {
    description: "Rumor 2 + Bombas",
    rumors: [2],
    items: ["Bombas"],
  }),
  reward("room.SS1.interruptor-azul", "SS1", "Secreto: Interruptor Azul", {
    items: ["Interruptor Azul"],
  }),
  secretOpen("room.DS-M2.open-SS3", "DS-M2", "SS3", ["SECRET-SS3"], {
    description: "Rumor 3 + Bombas",
    rumors: [3],
    items: ["Bombas"],
  }),
  secretOpen("room.DS-L2.open-SS4", "DS-L2", "SS4", ["SECRET-SS4"], {
    description: "Rumor 4 + Bombas",
    rumors: [4],
    items: ["Bombas"],
  }),
  secretOpen("room.DS-P2.open-SS5", "DS-P2", "SS5", ["SECRET-SS5"], {
    description: "Rumor 5 + Pan superior",
    rumors: [5],
  }),
  secretOpen("room.PZ-Y3.open-SS6", "PZ-Y3", "SS6", ["SECRET-SS6"], {
    description: "Rumor 6 + records secretos",
    rumors: [6],
  }),
  secretOpen("room.SR4.open-SS7", "SR4", "SS7", ["SECRET-SS7"], {
    description: "Rumor 7 + estatuas",
    rumors: [7],
  }),
  reward("room.SS8.item-hermano", "SS8", "Secreto: Item Hermano", {
    items: ["Item Hermano"],
  }),
  secretOpen("room.DS-R3.open-SS8", "DS-R3", "SS8", ["SECRET-SS8"], {
    description: "Rumor 8 + Zapatillas Guillem",
    rumors: [8],
    items: ["Zapatillas Guillem"],
  }),
  secretOpen("room.PZ-C3.open-SS9", "PZ-C3", "SS9", ["SECRET-SS9"], {
    description: "Rumor 9 + combinacion de ingredientes",
    rumors: [9],
  }),
  reward("room.SS10.codigo", "SS10", "Secreto: Codigo numerico", {
    items: ["Codigo numerico"],
  }),
  secretOpen("room.DS-R2.open-SS10", "DS-R2", "SS10", ["SECRET-SS10"], {
    description: "Rumor 10 + Lupa + Zapatillas Guillem",
    rumors: [10],
    items: ["Lupa", "Zapatillas Guillem"],
  }),
  reward("room.SR14.objeto-xavi", "SR14", "Cofre: Objeto Xavi + Rumor 11", {
    items: ["Objeto Xavi"],
    rumors: [11],
  }),
  secretOpen("room.DS-K2.open-SS11", "DS-K2", "SS11", ["SECRET-SS11"], {
    description: "Rumor 11 + orden de enemigos",
    rumors: [11],
  }),
  reward("room.SS11.zapatillas", "SS11", "Secreto: Zapatillas Guillem", {
    items: ["Zapatillas Guillem"],
  }),
  reward("room.SR9.item-npc7", "SR9", "Cofre: Item NPC7", {
    items: ["Item NPC7"],
  }),
  reward("room.SR6.valvula", "SR6", "Cofre: Valvula remota", {
    items: ["Valvula remota"],
  }),
  reward("room.MG-M1.puzzle", "MG-M1", "Puzzle: activa las escaleras hacia Correr", {
    flags: ["puzzle.MG-M1.resolved"],
    openGates: ["B7B"],
  }),
  reward("room.SR11.control", "SR11", "Consola: Interruptor sala control + Rumor 14", {
    items: ["Interruptor sala control"],
    rumors: [14],
  }),
  secretOpen("room.BOSS-Antonio.open-SS14", "BOSS-Antonio", "SS14", ["SECRET-SS14"], {
    description: "Rumor 14 + Bombas",
    rumors: [14],
    items: ["Bombas"],
  }),
  reward("room.SR5.trufa", "SR5", "Cofre: Trufa + Rumor 8", {
    items: ["Trufa"],
    rumors: [8],
  }),
  reward("room.SR13.dedos", "SR13", "Cofre: Dedos Magicos + Rumor 6", {
    items: ["Dedos Magicos"],
    rumors: [6],
  }),
  reward("room.SR7.item-npc6", "SR7", "Cofre: Item NPC6", {
    items: ["Item NPC6"],
  }),
  reward("room.SS15.resurreccion", "SS15", "Secreto: Item Resurreccion", {
    items: ["Item Resurreccion"],
  }),
  reward("room.SS3.fragmento-1", "SS3", "Secreto: Fragmento Trifuerza 1", {
    items: ["Fragmento Trifuerza 1"],
  }),
  reward("room.SR21.fragmento-3", "SR21", "Cofre: Fragmento Trifuerza 3", {
    items: ["Fragmento Trifuerza 3"],
  }),
  reward("room.SS5.ingrediente-1", "SS5", "Secreto: Ingrediente legendario 1", {
    items: ["Ingrediente legendario 1"],
  }),
  reward("room.SS6.ingrediente-2", "SS6", "Secreto: Ingrediente legendario 2", {
    items: ["Ingrediente legendario 2"],
  }),
  reward("room.SS14.cebo-especial", "SS14", "Secreto: Cebo especial + Rumor 16", {
    items: ["Cebo especial"],
    rumors: [16],
    flags: ["secret.CP-G1.open"],
    openGates: ["SECRET-CP-G1"],
  }),
  reward("room.CP-G1.cebo", "CP-G1", "Usar Cebo especial", {
    flags: ["beast.CP-G1.summoned"],
  }, {
    description: "Cebo especial",
    items: ["Cebo especial"],
  }),
  reward("room.SS2.interruptor-1", "SS2", "Secreto: Interruptor sellado 1", {
    items: ["Interruptor sellado 1"],
  }),
  reward("room.SS7.interruptor-2", "SS7", "Secreto: Interruptor sellado 2", {
    items: ["Interruptor sellado 2"],
  }),
  reward("room.SS12.interruptor-3", "SS12", "Secreto: Interruptor sellado 3", {
    items: ["Interruptor sellado 3"],
  }),
  secretOpen("room.PZ-G2.open-SS12", "PZ-G2", "SS12", ["SECRET-SS12"], {
    description: "Rumor 12 + silencio ante la pregunta",
    rumors: [12],
  }),
  reward("room.SS9.pista-loteria-1", "SS9", "Secreto: Pista Loteria 1", {
    items: ["Pista Loteria 1"],
  }),
  reward("room.SS4.palabra-secreta", "SS4", "Secreto: Palabra secreta", {
    items: ["Palabra secreta"],
  }),
  reward("room.PZ-C3.rumor-7", "PZ-C3", "Lupa: Rumor estatuas", {
    rumors: [7],
  }, {
    description: "Lupa",
    items: ["Lupa"],
  }),
  reward("room.MG-G1.rumor-12", "MG-G1", "Pista: Rumor 12", {
    rumors: [12],
  }),
  reward("room.BOSS-Mascle.rumor-15", "BOSS-Mascle", "Resolver Mascle: Rumor 15 + premio de Loteria", {
    rumors: [15],
    flags: ["lottery.million_won"],
  }),
  secretOpen("room.PZ-L1.open-SS15", "PZ-L1", "SS15", ["SECRET-SS15"], {
    description: "Rumor 15 + Moneda de la Muerte",
    rumors: [15],
  }),
  reward("room.SABIOS-1.varita", "SABIOS-1", "Sabio 1: Varita", {
    items: ["Varita"],
  }),
  reward("room.SABIOS-2.bombas", "SABIOS-2", "Sabio 2: Bombas + Rumor 1", {
    items: ["Bombas"],
    rumors: [1],
  }),
  reward("room.SABIOS-4.fragmento-2", "SABIOS-4", "Sabio 4: Fragmento Trifuerza 2", {
    items: ["Fragmento Trifuerza 2"],
  }),
  reward(
    "room.SR18.ingrediente-5",
    "SR18",
    "Tienda: Ingrediente legendario 5",
    {
      items: ["Ingrediente legendario 5"],
    },
    {
      description: "1M monedas de la Loteria",
      flags: ["lottery.million_won"],
    },
  ),
  secretOpen("room.SR18.open-SS13", "SR18", "SS13", ["LOCAL-SS13"], {
    description: "Rumor 13 + Lupa",
    rumors: [13],
    items: ["Lupa"],
  }),
];

export const npcDefinitions: NpcDefinition[] = [
  npc("NPC1", "SR4", "NPC1", undefined, {
    items: ["Lupa"],
  }),
  npc("NPC2", "SR17", "NPC2", { description: "Item Hermano", items: ["Item Hermano"] }, {
    items: ["TostaRica2"],
    rumors: [2],
  }),
  npc("NPC3", "SR18", "Mireia", undefined, {
    items: ["Pocion"],
    rumors: [3],
  }),
  npc("NPC4", "SR16", "NPC4", { description: "Pocion", items: ["Pocion"] }, {
    items: ["TostaRica1"],
    rumors: [4],
  }),
  npc(
    "NPC5",
    "SABIOS-3",
    "NPC5",
    { description: "Item Resurreccion", items: ["Item Resurreccion"] },
    {
      items: ["Choco"],
    },
  ),
  npc("NPC6", "SR19", "NPC6", { description: "Item NPC6", items: ["Item NPC6"] }, {
    items: ["Pista Loteria 2"],
  }),
  npc("NPC7", "SR20", "NPC7", { description: "Item NPC7", items: ["Item NPC7"] }, {
    items: ["Ingrediente legendario 3"],
    rumors: [5],
  }),
  npc("NPC8", "SR12", "NPC8", undefined, {
    rumors: [10],
  }),
];

function reward(
  id: string,
  roomId: string,
  label: string,
  grants: RoomRewardDefinition["grants"],
  requirement?: RoomRewardDefinition["requirement"],
): RoomRewardDefinition {
  return {
    id,
    roomId,
    label,
    grants,
    requirement,
  };
}

function secretOpen(
  id: string,
  roomId: string,
  targetRoomId: string,
  openGates: string[],
  requirement: RoomRewardDefinition["requirement"],
): RoomRewardDefinition {
  return reward(
    id,
    roomId,
    `Secreto: abrir ${targetRoomId}`,
    {
      flags: [`secret.${targetRoomId}.open`],
      openGates,
    },
    requirement,
  );
}

function npc(
  id: string,
  roomId: string,
  name: string,
  requirement: NpcDefinition["requirement"],
  grants: NpcDefinition["grants"],
): NpcDefinition {
  return {
    id,
    roomId,
    name,
    requirement,
    grants,
  };
}
