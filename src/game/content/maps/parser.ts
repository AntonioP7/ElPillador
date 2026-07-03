import {
  ConnectionDefinition,
  ConnectionKind,
  FloorId,
  GateDefinition,
  LayoutRect,
  RoomDefinition,
  RoomKind,
} from "./types";

type ParsedConnectionRow = {
  from: string;
  to: string;
  kind: ConnectionKind;
  zone: string;
};

type LayoutEntry = {
  id: string;
  floor: FloorId;
  layout: LayoutRect;
};

const stairTargetBySource: Record<string, string> = {
  "DS-C2": "DS-M1",
  SR4: "MG-L1",
  "DS-G1": "PZ-P1",
  "DS-R1": "MG-M1",
  "PZ-R4": "PZ-Y1",
  "DS-M1": "DS-C2",
  "MG-M1": "DS-R1",
  "MG-L1": "SR4",
  "PZ-P1": "DS-G1",
  "PZ-Y1": "PZ-R4",
  SR6: "SABIOS-1",
  SR16: "SABIOS-2",
  SR13: "SABIOS-3",
  SR19: "SABIOS-4",
};

const bossLayoutIdByDrawioId: Record<string, string> = {
  "BOSS-T": "BOSS-Tuto",
  "BOSS-P": "BOSS-Pintor",
  "BOSS-G": "BOSS-Guille",
  "BOSS-C": "BOSS-Carlos",
  "BOSS-A": "BOSS-Antonio",
  "BOSS-M": "BOSS-Mascle",
  "BOSS-X": "BOSS-Xavi",
  "BOSS-E": "BOSS-Enric",
};

const gateDefinitions: GateDefinition[] = [
  gate("B2", "DS-G1", "PZ-G3", { description: "Varita", items: ["Varita"] }),
  gate("B3", "PZ-Y1", "SR12", { description: "Lupa", items: ["Lupa"] }),
  gate("B4", "DS-K1", "PZ-K3", { description: "cualquier companero", anyCompanion: true }),
  gate("B5", "DS-C1", "SR20", {
    description: "Valvula remota",
    items: ["Valvula remota"],
  }),
  gate("B6", "PZ-L2", "BOSS-Mascle", {
    description: "Codigo numerico",
    items: ["Codigo numerico"],
  }),
  gate("B7", "MG-R1", "SR17", {
    description: "Interruptor Azul",
    items: ["Interruptor Azul"],
  }),
  gate("B7B", "DS-R1", "MG-M1", {
    description: "Puzzle MG-M1 resuelto",
    flags: ["puzzle.MG-M1.resolved"],
  }),
  gate("B8", "SR6", "PZ-M4", {
    description: "Interruptores sellados 1 + 2 + 3",
    items: ["Interruptor sellado 1", "Interruptor sellado 2", "Interruptor sellado 3"],
  }),
  gate("B9", "MG-P1", "SR7", {
    description: "Interruptor sala control",
    items: ["Interruptor sala control"],
  }),
  gate("LOCAL-SS13", "SR18", "SS13", {
    description: "SS13 abierta con Lupa en SR18",
    flags: ["secret.SS13.open"],
  }),
  gate("B1", "SR2", "SS1", {
    description: "Muro agrietado: usa Bombas",
    flags: ["wall.B1.destroyed"],
  }),
  secretGate("SECRET-SS2", "SR20", "SS2"),
  secretGate("SECRET-SS3", "DS-M2", "SS3"),
  secretGate("SECRET-SS4", "DS-L2", "SS4"),
  secretGate("SECRET-SS5", "DS-P2", "SS5"),
  secretGate("SECRET-SS6", "PZ-Y3", "SS6"),
  secretGate("SECRET-SS7", "SR4", "SS7"),
  secretGate("SECRET-SS8", "DS-R3", "SS8"),
  secretGate("SECRET-SS9", "PZ-C3", "SS9"),
  secretGate("SECRET-SS10", "DS-R2", "SS10"),
  secretGate("SECRET-SS11", "DS-K2", "SS11"),
  secretGate("SECRET-SS12", "PZ-G2", "SS12"),
  secretGate("SECRET-SS14", "BOSS-Antonio", "SS14"),
  secretGate("SECRET-SS15", "PZ-L1", "SS15"),
  secretGate("SECRET-CP-G1", "PZ-G1", "CP-G1"),
];

const manualSabiosRooms: RoomDefinition[] = [
  sabiosRoom("SABIOS-1", "Sabios 1", 220, 170),
  sabiosRoom("SABIOS-2", "Sabios 2", 420, 170),
  sabiosRoom("SABIOS-3", "Sabios 3", 220, 330),
  sabiosRoom("SABIOS-4", "Sabios 4", 420, 330),
];

export function buildDungeonMapFromRawDocuments(input: {
  floor1ConnectionsMarkdown: string;
  floor2ConnectionsMarkdown: string;
  floor1LayoutDrawio: string;
  floor2LayoutDrawio: string;
}): {
  rooms: RoomDefinition[];
  connections: ConnectionDefinition[];
  gates: GateDefinition[];
} {
  const parsedConnections = [
    ...parseConnectionsMarkdown(input.floor1ConnectionsMarkdown, "piso1"),
    ...parseConnectionsMarkdown(input.floor2ConnectionsMarkdown, "piso2"),
  ];
  const layouts = new Map<string, LayoutEntry>([
    ...parseDrawioLayouts(input.floor1LayoutDrawio, "piso1").map((entry) => [entry.id, entry] as const),
    ...parseDrawioLayouts(input.floor2LayoutDrawio, "piso2").map((entry) => [entry.id, entry] as const),
  ]);
  const zoneByRoom = new Map<string, string>();

  for (const connection of parsedConnections) {
    zoneByRoom.set(connection.from, connection.zone);
    if (!zoneByRoom.has(connection.to)) {
      zoneByRoom.set(connection.to, zoneForTarget(connection.to, connection.zone));
    }
  }

  const roomsById = new Map<string, RoomDefinition>();

  for (const [id, entry] of layouts) {
    roomsById.set(id, {
      id,
      floor: entry.floor,
      zone: zoneByRoom.get(id) ?? "Sin zona",
      kind: roomKindForId(id),
      layout: entry.layout,
    });
  }

  for (const room of manualSabiosRooms) {
    roomsById.set(room.id, room);
  }

  const connections = parsedConnections.map((connection, index) => {
    const gateId = gateDefinitions.find((gateDefinition) =>
      sameUndirectedConnection(gateDefinition.connection, connection),
    )?.id;

    return {
      ...connection,
      id: `C${String(index + 1).padStart(3, "0")}`,
      gateId,
    };
  });

  ensureConnectedRoomsExist(connections, roomsById);

  return {
    rooms: [...roomsById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    connections,
    gates: gateDefinitions,
  };
}

function parseConnectionsMarkdown(markdown: string, floor: FloorId): ParsedConnectionRow[] {
  const rows: ParsedConnectionRow[] = [];
  let section = "";

  for (const line of markdown.split(/\r?\n/)) {
    const sectionMatch = /^##\s+(.+)$/.exec(line);

    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }

    if (section.includes("Escaleras")) {
      continue;
    }

    const tableMatch = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*(normal|bloqueo|secreto|escalera)\s*\|\s*$/.exec(
      line,
    );

    if (!tableMatch) {
      continue;
    }

    const from = tableMatch[1];
    const rawTarget = tableMatch[2].trim();
    const kind = tableMatch[3] as ConnectionKind;
    const codedTarget = /`([^`]+)`/.exec(rawTarget);
    const to = kind === "escalera" ? stairTargetBySource[from] : codedTarget?.[1];

    if (!to) {
      throw new Error(`Missing target for ${from} (${rawTarget}) on ${floor}`);
    }

    rows.push({
      from,
      to,
      kind,
      zone: section,
    });
  }

  return rows;
}

function parseDrawioLayouts(drawioXml: string, floor: FloorId): LayoutEntry[] {
  const entries: LayoutEntry[] = [];
  const cellPattern = /<mxCell\b([^>]*)>([\s\S]*?)<\/mxCell>/g;
  let match: RegExpExecArray | null;

  while ((match = cellPattern.exec(drawioXml))) {
    const attrs = parseAttributes(match[1]);
    const id = normalizeDrawioRoomId(attrs.id ?? "");

    if (!attrs.vertex || !id || id === "title" || id === "legend" || id.startsWith("zl")) {
      continue;
    }

    const geometryMatch = /<mxGeometry\b([^>]*)\s+as="geometry"\s*\/?>/.exec(match[2]);

    if (!geometryMatch) {
      continue;
    }

    const geometry = parseAttributes(geometryMatch[1]);
    const x = Number(geometry.x ?? 0);
    const y = Number(geometry.y ?? 0);
    const width = Number(geometry.width ?? 96);
    const height = Number(geometry.height ?? 52);

    entries.push({
      id,
      floor,
      layout: { x, y, width, height },
    });
  }

  return entries;
}

function normalizeDrawioRoomId(id: string): string {
  return bossLayoutIdByDrawioId[id] ?? id;
}

function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([\w:-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(input))) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function roomKindForId(id: string): RoomKind {
  if (/^SS\d+$/.test(id) || id.startsWith("CP-")) {
    return "secret";
  }

  if (id.startsWith("BOSS-")) {
    return "boss";
  }

  if (id.startsWith("SABIOS-")) {
    return "special";
  }

  return "normal";
}

function zoneForTarget(roomId: string, fallback: string): string {
  if (roomId.startsWith("SABIOS-")) {
    return `Sabios ${roomId.slice("SABIOS-".length)}`;
  }

  return fallback;
}

function sameUndirectedConnection(
  a: { from: string; to: string },
  b: { from: string; to: string },
): boolean {
  return (a.from === b.from && a.to === b.to) || (a.from === b.to && a.to === b.from);
}

function ensureConnectedRoomsExist(
  connections: ConnectionDefinition[],
  roomsById: Map<string, RoomDefinition>,
): void {
  for (const connection of connections) {
    if (!roomsById.has(connection.from)) {
      throw new Error(`Missing room layout for ${connection.from}`);
    }

    if (!roomsById.has(connection.to)) {
      throw new Error(`Missing room layout for ${connection.to}`);
    }
  }
}

function gate(
  id: string,
  from: string,
  to: string,
  requirement: GateDefinition["requirement"],
): GateDefinition {
  return {
    id,
    requirement,
    connection: { from, to },
  };
}

function secretGate(id: string, from: string, to: string): GateDefinition {
  return gate(id, from, to, {
    description: `${to} abierta`,
    flags: [`secret.${to}.open`],
  });
}

function sabiosRoom(id: string, zone: string, x: number, y: number): RoomDefinition {
  return {
    id,
    floor: "sabios",
    zone,
    kind: "special",
    layout: {
      x,
      y,
      width: 120,
      height: 62,
    },
  };
}
