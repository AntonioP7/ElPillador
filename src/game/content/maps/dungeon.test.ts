import { describe, expect, it } from "vitest";
import { dungeonMap, removedStairRoomIds, roomsById, secretRumorForRoom } from "./dungeon";

describe("dungeon map", () => {
  it("loads the documented Piso 1 and Piso 2 graph", () => {
    expect(dungeonMap.connections).toHaveLength(114);
    expect(dungeonMap.rooms.length).toBeGreaterThanOrEqual(108);
    expect(roomsById.get("PZ-E1")?.zone).toBe("Entrada");
    expect(roomsById.get("DS-M1")?.zone).toBe("Magia Oscura");
    expect(roomsById.get("SABIOS-1")?.floor).toBe("sabios");
    expect(roomsById.has("PZ-C4")).toBe(false);
  });

  it("does not reintroduce removed stairs as active stairs", () => {
    const removedStairsSet = new Set<string>(removedStairRoomIds);
    const removedStairs = dungeonMap.connections.filter(
      (connection) =>
        connection.kind === "escalera" &&
        (removedStairsSet.has(connection.from) || removedStairsSet.has(connection.to)),
    );

    expect(removedStairs).toEqual([]);
  });

  it("keeps secret rooms terminal in the authored graph", () => {
    const secretRooms = dungeonMap.rooms.filter((room) => room.kind === "secret");

    expect(secretRooms).toHaveLength(16);

    for (const room of secretRooms) {
      const connections = dungeonMap.connections.filter(
        (connection) => connection.from === room.id || connection.to === room.id,
      );

      expect(connections, `${room.id} should be terminal`).toHaveLength(1);
      expect(secretRumorForRoom(room.id)).toBeGreaterThan(0);
    }
  });

  it("adds CP-G1 as the Pokemon combat secret beside PZ-G1", () => {
    expect(roomsById.get("CP-G1")).toEqual(
      expect.objectContaining({
        floor: "piso1",
        zone: "Grecia",
        kind: "secret",
      }),
    );
    expect(secretRumorForRoom("CP-G1")).toBe(16);
    expect(dungeonMap.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "PZ-G1", to: "CP-G1", kind: "secreto" }),
      ]),
    );
  });

  it("connects documented stairs to concrete room ids", () => {
    expect(dungeonMap.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "DS-C2", to: "DS-M1", kind: "escalera" }),
        expect.objectContaining({ from: "SR4", to: "MG-L1", kind: "escalera" }),
        expect.objectContaining({ from: "DS-G1", to: "PZ-P1", kind: "escalera" }),
        expect.objectContaining({ from: "SR6", to: "SABIOS-1", kind: "escalera" }),
        expect.objectContaining({ from: "PZ-R4", to: "PZ-Y1", kind: "escalera" }),
        expect.objectContaining({ from: "PZ-Y1", to: "PZ-R4", kind: "escalera" }),
      ]),
    );

    expect(dungeonMap.connections).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "DS-K1", to: "MG-Y1", kind: "escalera" }),
        expect.objectContaining({ from: "MG-Y1", to: "DS-K1", kind: "escalera" }),
        expect.objectContaining({ from: "DS-K2", to: "MG-Y1", kind: "escalera" }),
        expect.objectContaining({ from: "MG-Y1", to: "DS-K2", kind: "escalera" }),
      ]),
    );
  });

  it("keeps SS9 in the former PZ-C4 slot and connects SR9 from PZ-G2", () => {
    expect(roomsById.get("SS9")).toEqual(
      expect.objectContaining({
        floor: "piso1",
        zone: "Cocina",
        kind: "secret",
      }),
    );
    expect(dungeonMap.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "PZ-C3", to: "SS9", kind: "secreto" }),
        expect.objectContaining({ from: "PZ-G2", to: "SR9", kind: "normal" }),
      ]),
    );
    expect(dungeonMap.connections).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "DS-C2", to: "SS9" }),
        expect.objectContaining({ from: "PZ-C3", to: "PZ-C4" }),
      ]),
    );
  });

  it("keeps the swapped Loteria topology around SR16 and PZ-L1", () => {
    expect(dungeonMap.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "PZ-L3", to: "SR16", kind: "normal" }),
        expect.objectContaining({ from: "PZ-L1", to: "PZ-L4", kind: "normal" }),
        expect.objectContaining({ from: "PZ-L1", to: "SS15", kind: "secreto" }),
        expect.objectContaining({ from: "SR16", to: "SABIOS-2", kind: "escalera" }),
      ]),
    );
    expect(dungeonMap.connections).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "PZ-L3", to: "PZ-L1" }),
        expect.objectContaining({ from: "PZ-L4", to: "SR16" }),
        expect.objectContaining({ from: "SR16", to: "SS15" }),
      ]),
    );
  });
});
