import { dungeonMap, roomsById } from "../../game/content/maps/dungeon";
import { ConnectionDefinition, FloorId, RoomDefinition } from "../../game/content/maps/types";
import { GameState } from "../../game/simulation/state";

export type MapFloorId = FloorId;

export type MapRoomNode = {
  id: string;
  zone: string;
  kind: RoomDefinition["kind"];
  current: boolean;
  discovered: boolean;
  hasStair: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapConnectionEdge = {
  id: string;
  kind: ConnectionDefinition["kind"];
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  visible: boolean;
};

export type MapZoneMarker = {
  zone: string;
  x: number;
  y: number;
};

export type MapModel = {
  floor: MapFloorId;
  title: string;
  subtitle: string;
  rooms: MapRoomNode[];
  connections: MapConnectionEdge[];
  zones: MapZoneMarker[];
  currentZone: string;
  currentVisible: boolean;
};

const MAP_VIEWBOX_WIDTH = 1000;
const MAP_VIEWBOX_HEIGHT = 620;
const MAP_PADDING = 56;

export const MAP_FLOORS: MapFloorId[] = ["piso1", "piso2", "sabios"];

const floorMeta: Record<MapFloorId, { title: string; subtitle: string }> = {
  piso1: {
    title: "Piso 1",
    subtitle: "Entrada, Cocina, Grecia, Correr y Catacumbas",
  },
  piso2: {
    title: "Piso 2",
    subtitle: "Magia Oscura, Loteria, Panaderia y Gym",
  },
  sabios: {
    title: "Sabios",
    subtitle: "Camino superior pendiente de mapa interno",
  },
};

export function defaultMapFloorForState(state: GameState): MapFloorId {
  return MAP_FLOORS.includes(state.currentFloor) ? state.currentFloor : "piso1";
}

export function nextMapFloor(current: MapFloorId, direction: -1 | 1): MapFloorId {
  const index = MAP_FLOORS.indexOf(current);
  const nextIndex = (index + direction + MAP_FLOORS.length) % MAP_FLOORS.length;

  return MAP_FLOORS[nextIndex];
}

export function buildMapModel(state: GameState, floor: MapFloorId): MapModel {
  const rooms = dungeonMap.rooms.filter((room) => room.floor === floor);
  const transform = mapTransform(rooms);
  const currentRoomId = state.currentRoomId;
  const roomNodes = rooms.map((room) => roomToNode(room, state, transform));
  const visibleRoomIds = new Set(roomNodes.filter((room) => room.discovered).map((room) => room.id));
  const connections = dungeonMap.connections
    .filter((connection) => sameFloorConnection(connection, floor))
    .map((connection) => connectionToEdge(connection, transform, visibleRoomIds));
  const zones = zoneMarkers(roomNodes);
  const meta = floorMeta[floor];

  return {
    floor,
    title: meta.title,
    subtitle: meta.subtitle,
    rooms: roomNodes,
    connections,
    zones,
    currentZone: canonicalZoneName(roomsById.get(currentRoomId)?.zone ?? state.currentZone),
    currentVisible: roomNodes.some((room) => room.current),
  };
}

export function renderMapOverlay(container: HTMLElement, state: GameState, floor: MapFloorId): void {
  const model = buildMapModel(state, floor);
  const locationTitle = model.currentVisible ? model.currentZone : "Otro piso";
  const locationText = model.currentVisible
    ? "La marca luminosa senala tu sala actual. Las salas veladas son secretos pendientes de descubrir."
    : "Estas consultando una planta distinta. Cambia de piso para volver a ver tu posicion actual.";

  container.hidden = false;
  setStableHtml(container, `
    <section class="map-screen" aria-label="Mapa del juego">
      <div class="map-screen__frame">
        <header class="map-screen__header">
          <span class="map-screen__emblem" aria-hidden="true"></span>
          <div>
            <h2>Mapa de la mazmorra</h2>
            <p>${escapeHtml(model.title)} - ${escapeHtml(model.subtitle)}</p>
          </div>
          <button class="map-screen__close" type="button" data-map-close aria-label="Cerrar mapa">X</button>
        </header>
        <div class="map-screen__tabs" role="tablist" aria-label="Pisos del mapa">
          ${MAP_FLOORS.map((entry) => renderFloorTab(entry, model.floor)).join("")}
        </div>
        <div class="map-screen__body">
          <div class="map-screen__map" aria-label="${escapeHtml(model.title)}">
            ${renderMapSvg(model)}
          </div>
          <aside class="map-screen__codex" aria-label="Leyenda del mapa">
            <div class="map-screen__portrait" aria-hidden="true">
              <span></span>
            </div>
            <div class="map-screen__chapter">
              <span>Ubicacion</span>
              <strong>${escapeHtml(locationTitle)}</strong>
              <p>${escapeHtml(locationText)}</p>
            </div>
            <div class="map-screen__legend">
              ${model.zones.map((zone) => renderZoneChip(zone.zone)).join("")}
            </div>
            <div class="map-screen__runes">
              <span><i class="map-screen__rune map-screen__rune--stair"></i>Escalera</span>
              <span><i class="map-screen__rune map-screen__rune--gate"></i>Bloqueo</span>
              <span><i class="map-screen__rune map-screen__rune--secret"></i>Secreto</span>
            </div>
          </aside>
        </div>
        <footer class="map-screen__footer">
          <span>M / Esc cerrar</span>
          <span>Flechas izquierda/derecha cambiar piso</span>
        </footer>
      </div>
    </section>
  `);
}

export function clearMapOverlay(container: HTMLElement): void {
  if (container.hidden && container.innerHTML === "") {
    return;
  }

  container.hidden = true;
  container.innerHTML = "";
}

function setStableHtml(container: HTMLElement, html: string): void {
  if (container.innerHTML === html) {
    return;
  }

  container.innerHTML = html;
}

function renderFloorTab(floor: MapFloorId, activeFloor: MapFloorId): string {
  const active = floor === activeFloor;

  return `
    <button class="${active ? "map-screen__tab map-screen__tab--active" : "map-screen__tab"}" type="button" role="tab" aria-selected="${active}" data-map-floor="${floor}">
      ${escapeHtml(floorMeta[floor].title)}
    </button>
  `;
}

function renderMapSvg(model: MapModel): string {
  return `
    <svg class="map-screen__svg" viewBox="0 0 ${MAP_VIEWBOX_WIDTH} ${MAP_VIEWBOX_HEIGHT}" role="img" aria-label="${escapeHtml(model.title)}">
      <defs>
        <filter id="map-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect class="map-screen__parchment" x="18" y="18" width="964" height="584" rx="18"></rect>
      <g class="map-screen__connections">
        ${model.connections.map(renderConnection).join("")}
      </g>
      <g class="map-screen__rooms">
        ${model.rooms.map(renderRoomNode).join("")}
      </g>
      <g class="map-screen__zone-labels">
        ${model.zones.map(renderZoneLabel).join("")}
      </g>
    </svg>
  `;
}

function renderConnection(connection: MapConnectionEdge): string {
  if (!connection.visible) {
    return "";
  }

  return `
    <line class="map-link map-link--${connection.kind}" x1="${connection.fromX.toFixed(1)}" y1="${connection.fromY.toFixed(1)}" x2="${connection.toX.toFixed(1)}" y2="${connection.toY.toFixed(1)}"></line>
  `;
}

function renderRoomNode(room: MapRoomNode): string {
  if (!room.discovered) {
    return "";
  }

  return `
    <g class="${roomNodeClass(room)}">
      <rect x="${room.x.toFixed(1)}" y="${room.y.toFixed(1)}" width="${room.width.toFixed(1)}" height="${room.height.toFixed(1)}" rx="8"></rect>
      ${room.hasStair ? renderStairMarker(room) : ""}
      ${room.current ? renderCurrentMarker(room) : ""}
    </g>
  `;
}

function renderStairMarker(room: MapRoomNode): string {
  const x = room.x + room.width - 14;
  const y = room.y + 13;

  return `
    <path class="map-room-node__stair" d="M ${(x - 9).toFixed(1)} ${(y + 6).toFixed(1)} h18 M ${(x - 6).toFixed(1)} ${y.toFixed(1)} h12 M ${(x - 3).toFixed(1)} ${(y - 6).toFixed(1)} h6"></path>
  `;
}

function renderCurrentMarker(room: MapRoomNode): string {
  const cx = room.x + room.width / 2;
  const cy = room.y + room.height / 2;

  return `
    <circle class="map-room-node__pulse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="21" filter="url(#map-glow)"></circle>
    <path class="map-room-node__marker" d="M ${cx.toFixed(1)} ${(cy - 18).toFixed(1)} L ${(cx + 13).toFixed(1)} ${(cy + 12).toFixed(1)} L ${cx.toFixed(1)} ${(cy + 5).toFixed(1)} L ${(cx - 13).toFixed(1)} ${(cy + 12).toFixed(1)} Z"></path>
  `;
}

function renderZoneLabel(zone: MapZoneMarker): string {
  return `
    <text class="map-zone-label" x="${zone.x.toFixed(1)}" y="${zone.y.toFixed(1)}">${escapeHtml(zone.zone)}</text>
  `;
}

function renderZoneChip(zone: string): string {
  return `
    <button class="map-zone-chip map-zone-chip--${zoneClass(zone)}" type="button" disabled>
      <span></span>${escapeHtml(zone)}
    </button>
  `;
}

function roomNodeClass(room: MapRoomNode): string {
  const classes = [
    "map-room-node",
    `map-room-node--${zoneClass(room.zone)}`,
    `map-room-node--${room.kind}`,
  ];

  if (room.current) {
    classes.push("map-room-node--current");
  }

  return classes.join(" ");
}

function roomToNode(
  room: RoomDefinition,
  state: GameState,
  transform: ReturnType<typeof mapTransform>,
): MapRoomNode {
  const discovered = isRoomDiscovered(room, state);

  return {
    id: room.id,
    zone: canonicalZoneName(room.zone),
    kind: room.kind,
    current: room.id === state.currentRoomId,
    discovered,
    hasStair: roomHasStair(room.id),
    x: transform.offsetX + (room.layout.x - transform.minX) * transform.scale,
    y: transform.offsetY + (room.layout.y - transform.minY) * transform.scale,
    width: Math.max(26, room.layout.width * transform.scale),
    height: Math.max(18, room.layout.height * transform.scale),
  };
}

function connectionToEdge(
  connection: ConnectionDefinition,
  transform: ReturnType<typeof mapTransform>,
  visibleRoomIds: Set<string>,
): MapConnectionEdge {
  const from = roomsById.get(connection.from);
  const to = roomsById.get(connection.to);

  if (!from || !to) {
    throw new Error(`Missing map room for ${connection.id}`);
  }

  const fromCenter = roomCenter(from, transform);
  const toCenter = roomCenter(to, transform);

  return {
    id: connection.id,
    kind: connection.kind,
    fromX: fromCenter.x,
    fromY: fromCenter.y,
    toX: toCenter.x,
    toY: toCenter.y,
    visible: visibleRoomIds.has(connection.from) && visibleRoomIds.has(connection.to),
  };
}

function zoneMarkers(rooms: MapRoomNode[]): MapZoneMarker[] {
  const byZone = new Map<string, MapRoomNode[]>();

  for (const room of rooms.filter((entry) => entry.discovered)) {
    byZone.set(room.zone, [...(byZone.get(room.zone) ?? []), room]);
  }

  return [...byZone.entries()]
    .map(([zone, entries]) => ({
      zone,
      x: average(entries.map((room) => room.x + room.width / 2)),
      y: average(entries.map((room) => room.y + room.height / 2)),
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone, "es"));
}

function sameFloorConnection(connection: ConnectionDefinition, floor: FloorId): boolean {
  const from = roomsById.get(connection.from);
  const to = roomsById.get(connection.to);

  return Boolean(from && to && from.floor === floor && to.floor === floor);
}

function isRoomDiscovered(room: RoomDefinition, state: GameState): boolean {
  if (room.id === state.currentRoomId) {
    return true;
  }

  return state.discoveredRooms.includes(room.id);
}

function roomHasStair(roomId: string): boolean {
  return dungeonMap.connections.some(
    (connection) => connection.kind === "escalera" && (connection.from === roomId || connection.to === roomId),
  );
}

function mapTransform(rooms: RoomDefinition[]): {
  minX: number;
  minY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
} {
  const bounds = rooms.reduce(
    (acc, room) => ({
      minX: Math.min(acc.minX, room.layout.x),
      minY: Math.min(acc.minY, room.layout.y),
      maxX: Math.max(acc.maxX, room.layout.x + room.layout.width),
      maxY: Math.max(acc.maxY, room.layout.y + room.layout.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((MAP_VIEWBOX_WIDTH - MAP_PADDING * 2) / width, (MAP_VIEWBOX_HEIGHT - MAP_PADDING * 2) / height);

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    scale,
    offsetX: (MAP_VIEWBOX_WIDTH - width * scale) / 2,
    offsetY: (MAP_VIEWBOX_HEIGHT - height * scale) / 2,
  };
}

function roomCenter(room: RoomDefinition, transform: ReturnType<typeof mapTransform>): { x: number; y: number } {
  return {
    x: transform.offsetX + (room.layout.x - transform.minX + room.layout.width / 2) * transform.scale,
    y: transform.offsetY + (room.layout.y - transform.minY + room.layout.height / 2) * transform.scale,
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function canonicalZoneName(zone: string): string {
  return {
    "Lotería": "Loteria",
    "Panadería": "Panaderia",
  }[zone] ?? zone;
}

function zoneClass(zone: string): string {
  return canonicalZoneName(zone)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
