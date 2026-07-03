import { npcDefinitions, roomRewards } from "../progression";

export type ItemEquipSlot = "weapon" | "active";

export type ItemDefinition = {
  id: string;
  name: string;
  description: string;
  sources: string[];
  uses: string[];
  equipSlot?: ItemEquipSlot;
  actionLabel?: string;
};

type ItemMetadata = {
  description: string;
  equipSlot?: ItemEquipSlot;
  actionLabel?: string;
  source?: string;
  use?: string;
};

const itemMetadataByName: Record<string, ItemMetadata> = {
  Reloj: {
    description: "Reloj inicial. Permite ver la hora actual en la interfaz.",
    source: "Equipo inicial",
    use: "Mostrar la hora",
  },
  Espada: {
    description: "Arma basica del Pillador. Se equipa sin ocupar la ranura de accion.",
    equipSlot: "weapon",
    actionLabel: "Blandir espada",
  },
  Lupa: {
    description: "Herramienta para examinar detalles, pistas y mecanismos ocultos.",
    equipSlot: "active",
    actionLabel: "Examinar",
  },
  Varita: {
    description: "Canaliza magia sencilla para activar mecanismos arcanos.",
    equipSlot: "active",
    actionLabel: "Lanzar magia",
  },
  "Varita de Sauco": {
    description: "Varita poderosa vinculada a rumores y sellos avanzados.",
    equipSlot: "active",
    actionLabel: "Lanzar magia mayor",
  },
  Bombas: {
    description: "Objeto usable para romper obstaculos fragiles cuando esa regla exista.",
    equipSlot: "active",
    actionLabel: "Usar bomba",
  },
  Pocion: {
    description: "Pocion de apoyo guardada en la bolsa de intercambio.",
  },
  "Zapatillas Guillem": {
    description: "Zapatillas ligadas al circuito de Guille y a la movilidad.",
    equipSlot: "active",
    actionLabel: "Impulsarse",
  },
  "Dedos Magicos": {
    description: "Artefacto raro para interactuar con trucos y magia menor.",
    equipSlot: "active",
    actionLabel: "Chasquear",
  },
  "Interruptor Azul": {
    description: "Activa el bloqueo B7 para alcanzar la zona bloqueada de Correr.",
  },
  "Item Hermano": {
    description: "Objeto de intercambio necesario para completar la peticion de NPC2.",
  },
  "Codigo numerico": {
    description: "Clave que permite abrir el bloqueo B6 hacia la Loteria.",
  },
  "Objeto Xavi": {
    description: "Objeto de progresion asociado a Xavi y sus rutas de rumores.",
  },
  "Item NPC7": {
    description: "Objeto de intercambio para avanzar la cadena de NPC7.",
  },
  "Valvula remota": {
    description: "Mecanismo remoto necesario para abrir rutas bloqueadas.",
  },
  "Interruptor sala control": {
    description: "Consola activada que abre rutas de control posteriores.",
  },
  Trufa: {
    description: "Companera mitologica. Al obtenerla aparece en el menu de companeros.",
  },
  "Item NPC6": {
    description: "Objeto de intercambio para completar la peticion de NPC6.",
  },
  "Item Resurreccion": {
    description: "Objeto necesario para desbloquear a Choco como companero.",
  },
  "Fragmento Trifuerza 1": {
    description: "Primer fragmento de la cadena principal de Trifuerza.",
  },
  "Fragmento Trifuerza 2": {
    description: "Segundo fragmento de la cadena principal de Trifuerza.",
  },
  "Fragmento Trifuerza 3": {
    description: "Tercer fragmento de la cadena principal de Trifuerza.",
  },
  "Ingrediente legendario 1": {
    description: "Ingrediente de la receta legendaria.",
  },
  "Ingrediente legendario 2": {
    description: "Ingrediente de la receta legendaria.",
  },
  "Ingrediente legendario 3": {
    description: "Ingrediente de la receta legendaria.",
  },
  "Ingrediente legendario 4": {
    description: "Ingrediente de la receta legendaria.",
  },
  "Ingrediente legendario 5": {
    description: "Ingrediente de la receta legendaria.",
  },
  "Interruptor sellado 1": {
    description: "Primer interruptor necesario para abrir el bloqueo B8.",
  },
  "Interruptor sellado 2": {
    description: "Segundo interruptor necesario para abrir el bloqueo B8.",
  },
  "Interruptor sellado 3": {
    description: "Tercer interruptor necesario para abrir el bloqueo B8.",
  },
  "Pista Loteria 1": {
    description: "Pista de la cadena de Loteria.",
  },
  "Pista Loteria 2": {
    description: "Pista avanzada de la cadena de Loteria.",
  },
  "Palabra secreta": {
    description: "Clave secreta para una ruta posterior.",
  },
  "Cebo especial": {
    description: "Cebo raro que atrae a una bestia legendaria en la sala CP-G1.",
  },
  TostaRica1: {
    description: "Companero defensivo. Al obtenerlo aparece en el menu de companeros.",
  },
  TostaRica2: {
    description: "Companero rapido. Al obtenerlo aparece en el menu de companeros.",
  },
  Choco: {
    description: "Companero de rescate. Al obtenerlo aparece en el menu de companeros.",
  },
  "Reliquia de Tuto": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Tuto.",
  },
  "Reliquia del Pintor": {
    description: "Objeto legendario provisional obtenido al superar el encuentro del Pintor.",
  },
  "Reliquia de Guille": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Guille.",
  },
  "Reliquia de Carlos": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Carlos.",
  },
  "Reliquia de Antonio": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Antonio.",
  },
  "Reliquia de Mascle": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Mascle.",
  },
  "Reliquia de Xavi": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Xavi.",
  },
  "Reliquia de Enric": {
    description: "Objeto legendario provisional obtenido al superar el encuentro de Enric.",
  },
};

const items = new Map<string, ItemDefinition>();

for (const [name, metadata] of Object.entries(itemMetadataByName)) {
  const item = ensureItem(name);

  if (metadata.source) {
    item.sources.push(metadata.source);
  }

  if (metadata.use) {
    item.uses.push(metadata.use);
  }
}

for (const reward of roomRewards) {
  for (const item of reward.grants.items ?? []) {
    ensureItem(item).sources.push(`${reward.label} (${reward.roomId})`);
  }

  const requirement = reward.requirement;

  if (requirement?.items) {
    for (const item of requirement.items) {
      ensureItem(item).uses.push(requirement.description);
    }
  }
}

for (const npc of npcDefinitions) {
  for (const item of npc.grants.items ?? []) {
    ensureItem(item).sources.push(`${npc.name} (${npc.roomId})`);
  }

  const requirement = npc.requirement;

  if (requirement?.items) {
    for (const item of requirement.items) {
      ensureItem(item).uses.push(requirement.description);
    }
  }
}

export const itemDefinitions: ItemDefinition[] = [...items.values()]
  .map((item) => ({
    ...item,
    sources: unique(item.sources),
    uses: unique(item.uses),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "es"));

function ensureItem(name: string): ItemDefinition {
  const current = items.get(name);

  if (current) {
    return current;
  }

  const metadata = itemMetadataByName[name];
  const created = {
    id: name,
    name,
    description: metadata?.description ?? "Objeto de progresion pendiente de descripcion especifica.",
    sources: [],
    uses: [],
    equipSlot: metadata?.equipSlot,
    actionLabel: metadata?.actionLabel,
  };

  items.set(name, created);
  return created;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
