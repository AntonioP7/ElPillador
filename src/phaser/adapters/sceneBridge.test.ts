import { describe, expect, it } from "vitest";
import { SceneBridge } from "./sceneBridge";
import { createInitialGameState } from "../../game/simulation/state";
import { getTopDownDoors } from "../../game/simulation/topDown";
import { saveGame, SAVE_KEY, StorageLike } from "../../game/simulation/storage";
import { SR2_SLIME_ENEMY_ID } from "../../game/content/enemies";
import type { TiledRoomDefinition } from "../../game/content/tiledRooms/generic";

class CountingStorage implements StorageLike {
  readonly values = new Map<string, string>();
  writes = 0;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("scene bridge", () => {
  it("does not write localStorage while polling snapshots for HUD refreshes", () => {
    const storage = new CountingStorage();
    const bridge = new SceneBridge(storage);

    expect(storage.writes).toBe(1);
    bridge.getSnapshot();
    bridge.getSnapshot();
    bridge.getSnapshot();

    expect(storage.writes).toBe(1);
    expect(storage.getItem(SAVE_KEY)).toContain("PZ-E1");
  });

  it("marks world-changing actions so Phaser can avoid full redraws for HUD-only updates", () => {
    const bridge = new SceneBridge(new CountingStorage());

    expect(bridge.dispatch({ type: "confirm" }).worldChanged).toBe(false);
    expect(bridge.dispatch({ type: "move", direction: "right" }).worldChanged).toBe(true);
  });

  it("resets the game to the initial room and persists the new save", () => {
    const storage = new CountingStorage();
    const bridge = new SceneBridge(storage);

    bridge.dispatch({ type: "move", direction: "right" });
    const reset = bridge.dispatch({ type: "reset" });
    const snapshot = bridge.getSnapshot();

    expect(reset.worldChanged).toBe(true);
    expect(snapshot.state.currentRoomId).toBe("PZ-E1");
    expect(snapshot.state.inventory).toEqual(["Reloj"]);
    expect(snapshot.state.equipment).toEqual({});
    expect(storage.getItem(SAVE_KEY)).toContain("PZ-E1");
  });

  it("equips an owned item and uses the active slot through the bridge", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        inventory: ["Reloj", "Espada", "Lupa"],
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const sword = bridge.dispatch({ type: "equip-item", itemName: "Espada" });
    const lens = bridge.dispatch({ type: "equip-item", itemName: "Lupa" });
    const used = bridge.dispatch({ type: "use-equipped-item" });
    const snapshot = bridge.getSnapshot();

    expect(sword.handled).toBe(true);
    expect(lens.handled).toBe(true);
    expect(used.message).toContain("Lupa");
    expect(snapshot.state.equipment).toEqual({ weapon: "Espada", activeItem: "Lupa" });
  });

  it("does not request a full redraw when a top-down door is blocked", () => {
    const storage = new CountingStorage();
    const state = {
      ...createInitialGameState(),
      currentRoomId: "MG-R1",
      currentFloor: "piso1" as const,
      currentZone: "Correr",
    };
    const door = getTopDownDoors(state).find((entry) => entry.exit.target.id === "SR17");

    if (!door) {
      throw new Error("Missing MG-R1 -> SR17 test door");
    }

    saveGame(
      {
        ...state,
        playerPose: {
          x: door.x + door.width / 2,
          y: door.y + door.height / 2,
          facing: door.direction,
        },
      },
      storage,
    );

    const bridge = new SceneBridge(storage);

    const blocked = bridge.tryTopDownDoorTransition();

    expect(blocked.handled).toBe(true);
    expect(blocked.message).toContain("B7");
    expect(blocked.worldChanged).toBe(false);
  });

  it("does not expose SR2 encounter enemies before the chest is opened", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const snapshot = bridge.getSnapshot();

    expect(snapshot.combatEnemies).toEqual([]);
  });

  it("spawns inside the destination Tiled room in front of the door direction", () => {
    const bridge = new SceneBridge(new CountingStorage());
    const moved = bridge.dispatch({ type: "move", direction: "right" }, { viewMode: "topdown" });
    const snapshot = bridge.getSnapshot();

    expect(moved.worldChanged).toBe(true);
    expect(snapshot.state.currentRoomId).toBe("PZ-E2");
    expect(snapshot.state.playerPose).toEqual({ x: 16, y: 192, facing: "right" });
  });

  it("preserves the door coordinate when spawning from a top-down transition", () => {
    const storage = new CountingStorage();
    const base = createInitialGameState();
    const door = getTopDownDoors(base).find((entry) => entry.exit.target.id === "PZ-E2");

    if (!door) {
      throw new Error("Missing PZ-E1 -> PZ-E2 test door");
    }

    saveGame(
      {
        ...base,
        playerPose: {
          x: door.x + door.width / 2,
          y: door.y + door.height / 2,
          facing: door.direction,
        },
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const moved = bridge.tryTopDownDoorTransition();
    const snapshot = bridge.getSnapshot();

    expect(moved.worldChanged).toBe(true);
    expect(snapshot.state.currentRoomId).toBe("PZ-E2");
    expect(snapshot.state.playerPose).toEqual({ x: 16, y: 192, facing: "right" });
  });

  it("spawns Tiled world entries from the matching destination door, not the source world coordinate", () => {
    const storage = new CountingStorage();

    saveGame(createInitialGameState(), storage);

    const bridge = new SceneBridge(storage);
    bridge.registerTiledRoomDefinition(tiledRoomWithDoors("PZ-E2", [
      {
        id: "door.back-to-pz-e1",
        direction: "left",
        x: 16,
        y: 80,
        width: 32,
        height: 32,
        isLocked: false,
        rotation: 0,
        targetRoom: "PZ-E1",
      },
    ]));

    const moved = bridge.tryTiledWorldDoorTransition("right", {
      x: 336,
      y: 240,
      width: 32,
      height: 32,
      targetRoom: "PZ-E2",
    });
    const snapshot = bridge.getSnapshot();

    expect(moved.worldChanged).toBe(true);
    expect(snapshot.state.currentRoomId).toBe("PZ-E2");
    expect(snapshot.state.playerPose).toEqual({ x: 64, y: 96, facing: "right" });
  });

  it("loads SR2 from the Tiled world when entering from the physically adjacent room", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "PZ-E3",
        currentFloor: "piso1",
        currentZone: "Entrada",
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const moved = bridge.tryTiledWorldDoorTransition("down", { x: 176, y: 368, width: 32, height: 16 });
    const snapshot = bridge.getSnapshot();

    expect(moved.worldChanged).toBe(true);
    expect(snapshot.state.currentRoomId).toBe("SR2");
    expect(snapshot.roomContent.hasTiledWorldMap).toBe(true);
    expect(snapshot.combatEnemies).toEqual([]);
  });

  it("keeps the enemy attack animation while slime attack logic continues after damage", () => {
    const storage = new CountingStorage();
    const now = Date.parse("2026-06-18T10:00:00.000Z");

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
        flags: {
          "encounter.SR2.chest-waves.started": true,
          "encounter.SR2.chest-waves.wave.1": true,
        },
        playerPose: { x: 650, y: 400, facing: "up" },
        enemyStunUntil: {
          [SR2_SLIME_ENEMY_ID]: new Date(now + 1000).toISOString(),
        },
        enemyCombat: {
          [SR2_SLIME_ENEMY_ID]: {
            recoverUntil: new Date(now + 1400).toISOString(),
          },
        },
        activeAreaAttacks: [
          {
            id: `area.${SR2_SLIME_ENEMY_ID}.${now}`,
            roomId: "SR2",
            ownerId: SR2_SLIME_ENEMY_ID,
            x: 252,
            y: 214,
            radius: 44,
            damage: 2,
            startedAt: new Date(now).toISOString(),
            windupMs: 650,
            activeFromMs: 650,
            activeToMs: 1000,
            hitPlayer: false,
          },
        ],
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    bridge.stepCombat(16, { width: 384, height: 384, playerRadius: 14, colliders: [] }, new Date(now + 300));
    const snapshot = bridge.getSnapshot();

    expect(snapshot.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("area_attack");
    expect(snapshot.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("attackWindup");
  });

  it("keeps a locked Tiled door collidable until its gameplay gate opens", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const door = { x: 368, y: 176, width: 16, height: 32, isLocked: true, rotation: 0, targetRoom: "SS1" };
    const room = {
      id: "SR2",
      width: 384,
      height: 384,
      tileWidth: 16,
      tileHeight: 16,
      missingLayers: [],
      colliders: [],
      doors: [{ id: "door.test", direction: "right" as const, ...door }],
      hazards: [],
      chests: [],
      interacts: [],
      stairs: [],
      enemies: [],
    };

    expect(bridge.getTiledWorldCombatCollisionBounds(room).colliders).toEqual([
      { x: 368, y: 176, width: 16, height: 32 },
    ]);
    expect(bridge.tryTiledWorldDoorTransition("right", door).worldChanged).toBe(false);
  });

  it("keeps a block Tiled door collidable until it is unlocked", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const door = { x: 368, y: 176, width: 16, height: 32, isLocked: false, isBlock: true, rotation: 0, targetRoom: "SS1" };
    const room = {
      id: "SR2",
      width: 384,
      height: 384,
      tileWidth: 16,
      tileHeight: 16,
      missingLayers: [],
      colliders: [],
      doors: [{ id: "door.block", direction: "right" as const, ...door }],
      hazards: [],
      chests: [],
      interacts: [],
      stairs: [],
      enemies: [],
    };

    expect(bridge.getTiledWorldCombatCollisionBounds(room).colliders).toEqual([
      { x: 368, y: 176, width: 16, height: 32 },
    ]);
    expect(bridge.tryTiledWorldDoorTransition("right", door).message).toBe("No hay paso");
  });

  it("can force Tiled doors open and closed for animation testing", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const door = { x: 368, y: 176, width: 16, height: 32, isLocked: false, rotation: 0, targetRoom: "SS1" };
    const room = {
      id: "SR2",
      width: 384,
      height: 384,
      tileWidth: 16,
      tileHeight: 16,
      missingLayers: [],
      colliders: [],
      doors: [{ id: "door.test", direction: "right" as const, ...door }],
      hazards: [],
      chests: [],
      interacts: [],
      stairs: [],
      enemies: [],
    };

    bridge.setTiledDoorTestOpenOverride(false);
    expect(bridge.getTiledWorldCombatCollisionBounds(room).colliders).toEqual([
      { x: 368, y: 176, width: 16, height: 32 },
    ]);

    bridge.setTiledDoorTestOpenOverride(true);
    expect(bridge.getTiledWorldCombatCollisionBounds(room).colliders).toEqual([]);
  });

  it("opens a Tiled chest and grants its parsed reward item", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
        playerPose: { x: 192, y: 192, facing: "down" },
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const room = {
      id: "SR2",
      width: 384,
      height: 384,
      tileWidth: 16,
      tileHeight: 16,
      missingLayers: [],
      colliders: [],
      doors: [],
      hazards: [],
      chests: [{ id: "chest.43", x: 176, y: 176, width: 32, height: 32, item: "Espada", reward: "Sword", isOpen: false }],
      interacts: [],
      stairs: [],
      enemies: [],
    };

    const result = bridge.interactWithTiledRoom(room);
    const state = bridge.getSnapshot().state;

    expect(result.worldChanged).toBe(true);
    expect(state.inventory).toContain("Espada");
    expect(state.flags["chest.chest.43.opened"]).toBe(true);
  });

  it("repairs an already-open Tiled chest if a newly parsed reward is missing", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
        playerPose: { x: 192, y: 192, facing: "down" },
        flags: { "chest.chest.43.opened": true },
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const room = {
      id: "SR2",
      width: 384,
      height: 384,
      tileWidth: 16,
      tileHeight: 16,
      missingLayers: [],
      colliders: [],
      doors: [],
      hazards: [],
      chests: [{ id: "chest.43", x: 176, y: 176, width: 32, height: 32, item: "Espada", reward: "Sword", isOpen: false }],
      interacts: [],
      stairs: [],
      enemies: [],
    };

    const result = bridge.interactWithTiledRoom(room);
    const state = bridge.getSnapshot().state;

    expect(result.worldChanged).toBe(true);
    expect(state.inventory).toContain("Espada");
  });

  it("removes a locked Tiled door collider once the gameplay gate is open", () => {
    const storage = new CountingStorage();

    saveGame(
      {
        ...createInitialGameState(),
        currentRoomId: "SR2",
        currentFloor: "piso1",
        currentZone: "Entrada",
        rumors: [1],
        flags: { "wall.B1.destroyed": true, "secret.SS1.open": true },
        openGates: ["B1"],
      },
      storage,
    );

    const bridge = new SceneBridge(storage);
    const door = { x: 368, y: 176, width: 16, height: 32, isLocked: true, rotation: 0, targetRoom: "SS1" };
    const room = {
      id: "SR2",
      width: 384,
      height: 384,
      tileWidth: 16,
      tileHeight: 16,
      missingLayers: [],
      colliders: [],
      doors: [{ id: "door.test", direction: "right" as const, ...door }],
      hazards: [],
      chests: [],
      interacts: [],
      stairs: [],
      enemies: [],
    };

    expect(bridge.getTiledWorldCombatCollisionBounds(room).colliders).toEqual([]);
    expect(bridge.tryTiledWorldDoorTransition("right", door).worldChanged).toBe(true);
    expect(bridge.getSnapshot().state.currentRoomId).toBe("SS1");
  });
});

function tiledRoomWithDoors(
  id: string,
  doors: TiledRoomDefinition["doors"],
): TiledRoomDefinition {
  return {
    id,
    width: 384,
    height: 384,
    tileWidth: 16,
    tileHeight: 16,
    missingLayers: [],
    colliders: [],
    doors,
    hazards: [],
    chests: [],
    interacts: [],
    stairs: [],
    enemies: [],
  };
}
