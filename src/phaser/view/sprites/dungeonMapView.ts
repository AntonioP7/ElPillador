import Phaser from "phaser";
import { dungeonMap, roomsById } from "../../../game/content/maps/dungeon";
import { ConnectionKind, FloorId, RoomDefinition } from "../../../game/content/maps/types";
import { SceneBridgeSnapshot } from "../../adapters/sceneBridge";

const zoneColors: Record<string, number> = {
  Entrada: 0xffe699,
  Cocina: 0xf4cccc,
  Grecia: 0xcfe2f3,
  Correr: 0xd9ead3,
  Catacumbas: 0xd9d2e9,
  "Magia Oscura": 0xb4a7d6,
  Lotería: 0xf6b26b,
  Panadería: 0x9fc5e8,
  Gym: 0x93c47d,
  "Sabios 1": 0xd7be7d,
  "Sabios 2": 0xd7be7d,
  "Sabios 3": 0xd7be7d,
  "Sabios 4": 0xd7be7d,
};

const connectionColors: Record<ConnectionKind, number> = {
  normal: 0x61c17c,
  bloqueo: 0xc95050,
  secreto: 0x4f8fd8,
  escalera: 0xd7be7d,
};

type Transform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function renderDungeonMap(scene: Phaser.Scene, snapshot: SceneBridgeSnapshot): void {
  const graphics = scene.add.graphics();
  const rooms = dungeonMap.rooms.filter((room) => room.floor === snapshot.room.floor);
  const transform = getFloorTransform(scene, rooms);

  scene.add
    .text(scene.scale.width / 2, 24, floorTitle(snapshot.room.floor), {
      color: "#f5f3e8",
      fontFamily: "monospace",
      fontSize: "18px",
    })
    .setOrigin(0.5);

  drawConnections(graphics, snapshot.room.floor, snapshot.state.currentRoomId, transform);
  drawRooms(scene, graphics, rooms, snapshot.state.currentRoomId, transform);
  drawPlayer(scene, snapshot.room, transform);
}

function drawConnections(
  graphics: Phaser.GameObjects.Graphics,
  floor: FloorId,
  currentRoomId: string,
  transform: Transform,
): void {
  for (const connection of dungeonMap.connections) {
    const from = roomsById.get(connection.from);
    const to = roomsById.get(connection.to);

    if (!from || !to || from.floor !== floor || to.floor !== floor) {
      continue;
    }

    const active = connection.from === currentRoomId || connection.to === currentRoomId;
    const fromCenter = toScreenCenter(from, transform);
    const toCenter = toScreenCenter(to, transform);
    graphics.lineStyle(active ? 4 : 2, connectionColors[connection.kind], active ? 0.95 : 0.45);
    graphics.lineBetween(fromCenter.x, fromCenter.y, toCenter.x, toCenter.y);
  }
}

function drawRooms(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  rooms: RoomDefinition[],
  currentRoomId: string,
  transform: Transform,
): void {
  const stairRoomIds = roomsWithStairs();

  for (const room of rooms) {
    const rect = toScreenRect(room, transform);
    const current = room.id === currentRoomId;
    const hasStair = stairRoomIds.has(room.id);
    const fill = room.kind === "secret" ? 0x26384d : zoneColors[room.zone] ?? 0x51616b;
    const stroke = current ? 0xffffff : room.kind === "boss" ? 0xd35f5f : 0x1a2028;

    graphics.fillStyle(fill, current ? 1 : 0.82);
    graphics.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 6);
    graphics.lineStyle(current ? 4 : 2, stroke, current ? 1 : 0.7);
    graphics.strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 6);

    scene.add
      .text(rect.x + rect.width / 2, rect.y + rect.height / 2, room.id, {
        color: room.kind === "secret" ? "#f5f3e8" : "#101217",
        fontFamily: "monospace",
        fontSize: current ? "13px" : "10px",
        fontStyle: current ? "700" : "600",
      })
      .setOrigin(0.5);

    if (hasStair) {
      scene.add
        .text(rect.x + rect.width / 2, rect.y + rect.height - 6, "ESCALERA", {
          color: room.kind === "secret" ? "#d7be7d" : "#4a3511",
          fontFamily: "monospace",
          fontSize: current ? "9px" : "7px",
          fontStyle: "700",
        })
        .setOrigin(0.5, 1);
    }
  }
}

function drawPlayer(scene: Phaser.Scene, currentRoom: RoomDefinition, transform: Transform): void {
  const center = toScreenCenter(currentRoom, transform);
  scene.add.circle(center.x, center.y, 18, 0xf5f3e8, 0.95).setStrokeStyle(3, 0x111318);
}

function getFloorTransform(scene: Phaser.Scene, rooms: RoomDefinition[]): Transform {
  const bounds = rooms.reduce(
    (acc, room) => ({
      minX: Math.min(acc.minX, room.layout.x),
      minY: Math.min(acc.minY, room.layout.y),
      maxX: Math.max(acc.maxX, room.layout.x + room.layout.width),
      maxY: Math.max(acc.maxY, room.layout.y + room.layout.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const availableWidth = scene.scale.width - 120;
  const availableHeight = scene.scale.height - 100;
  const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  return {
    scale,
    offsetX: (scene.scale.width - contentWidth * scale) / 2 - bounds.minX * scale,
    offsetY: 70 + (availableHeight - contentHeight * scale) / 2 - bounds.minY * scale,
  };
}

function toScreenRect(room: RoomDefinition, transform: Transform): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(
    transform.offsetX + room.layout.x * transform.scale,
    transform.offsetY + room.layout.y * transform.scale,
    Math.max(34, room.layout.width * transform.scale),
    Math.max(22, room.layout.height * transform.scale),
  );
}

function toScreenCenter(room: RoomDefinition, transform: Transform): { x: number; y: number } {
  const rect = toScreenRect(room, transform);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function roomsWithStairs(): Set<string> {
  const roomIds = new Set<string>();

  for (const connection of dungeonMap.connections) {
    if (connection.kind !== "escalera") {
      continue;
    }

    roomIds.add(connection.from);
    roomIds.add(connection.to);
  }

  return roomIds;
}

function floorTitle(floor: FloorId): string {
  return {
    piso1: "Piso 1",
    piso2: "Piso 2",
    sabios: "Piso Sabios",
  }[floor];
}
