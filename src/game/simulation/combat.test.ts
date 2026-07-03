import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./state";
import {
  BOMB_CONFIG,
  getBreakableWalls,
  getRoomEnemies,
  MAGIC_PROJECTILE_CONFIG,
  placeBomb,
  resetRespawningEnemiesForRoom,
  resolveBombFuse,
  resolveProjectileHit,
  SLIME1_ATTACK_CONFIG,
  SR2_SLIME_ENEMY_ID,
  fireMagicProjectile,
  stepCombatSystems,
  stepSr2SlimeAi,
  swingSword,
} from "./combat";

function sr2EncounterState() {
  return {
    ...createInitialGameState(),
    currentRoomId: "SR2",
    currentFloor: "piso1" as const,
    currentZone: "Entrada",
    flags: {
      "encounter.SR2.chest-waves.started": true,
      "encounter.SR2.chest-waves.wave.1": true,
    },
  };
}

describe("top-down combat tools", () => {
  it("defeats an enemy with a sword swing in front of the player", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "BOSS-Tuto",
      currentFloor: "piso1" as const,
      currentZone: "Cocina",
      inventory: ["Reloj", "Espada"],
      equipment: { weapon: "Espada" },
      enemyHealth: {
        "enemy.BOSS-Tuto.0": 2,
      },
      playerPose: { x: 400, y: 200, facing: "up" as const },
    };
    const result = swingSword(state, new Date("2026-06-18T10:00:00.000Z"));
    const enemyAfterFirstHit = getRoomEnemies(result.state).find((enemy) => enemy.id === "enemy.BOSS-Tuto.0");
    const defeated = swingSword(
      { ...result.state, playerPose: { x: enemyAfterFirstHit!.x, y: enemyAfterFirstHit!.y + 45, facing: "up" as const } },
      new Date("2026-06-18T10:00:01.000Z"),
    );

    expect(result.handled).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.worldChanged).toBe(false);
    expect(result.state.enemyHealth["enemy.BOSS-Tuto.0"]).toBe(1);
    expect(result.state.enemyPositions["enemy.BOSS-Tuto.0"]?.y).toBeLessThan(155);
    expect(defeated.worldChanged).toBe(true);
    expect(defeated.state.defeatedEnemies).toContain("enemy.BOSS-Tuto.0");
  });

  it("damages every enemy caught in the same sword swing", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "BOSS-Tuto",
      currentFloor: "piso1" as const,
      currentZone: "Cocina",
      inventory: ["Reloj", "Espada"],
      equipment: { weapon: "Espada" },
      enemyHealth: {
        "enemy.test.1": 2,
        "enemy.test.2": 2,
      },
      playerPose: { x: 400, y: 200, facing: "up" as const },
    };
    const result = swingSword(state, new Date("2026-06-18T10:00:00.000Z"), undefined, [
      { id: "enemy.test.1", roomId: "BOSS-Tuto", species: "generic-minion", x: 394, y: 172 },
      { id: "enemy.test.2", roomId: "BOSS-Tuto", species: "generic-minion", x: 406, y: 172 },
    ]);

    expect(result.state.enemyHealth["enemy.test.1"]).toBe(1);
    expect(result.state.enemyHealth["enemy.test.2"]).toBe(1);
    expect(result.events?.filter((event) =>
      event.type === "damage" && event.target === "enemy" && event.targetId.startsWith("enemy.test."),
    )).toHaveLength(2);
  });

  it("defines wand projectile parameters and resolves enemy hits", () => {
    const state = {
      ...createInitialGameState(),
      currentRoomId: "BOSS-Tuto",
      currentFloor: "piso1" as const,
      currentZone: "Cocina",
      inventory: ["Reloj", "Varita"],
      equipment: { activeItem: "Varita" },
    };
    const result = resolveProjectileHit(
      {
        ...state,
        enemyHealth: {
          "enemy.BOSS-Tuto.0": 1,
        },
      },
      400,
      155,
      new Date("2026-06-18T10:00:00.000Z"),
    );

    expect(MAGIC_PROJECTILE_CONFIG.speedPxPerSecond).toBeGreaterThan(0);
    expect(MAGIC_PROJECTILE_CONFIG.cooldownMs).toBeGreaterThan(0);
    expect(MAGIC_PROJECTILE_CONFIG.damage).toBeGreaterThan(0);
    expect(result.hit).toBe(true);
    expect(result.state.defeatedEnemies).toContain("enemy.BOSS-Tuto.0");
  });

  it("keeps wand projectiles in simulation state and resolves them during combat step", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "BOSS-Tuto",
      currentFloor: "piso1" as const,
      currentZone: "Cocina",
      inventory: ["Reloj", "Varita"],
      equipment: { activeItem: "Varita" },
      playerPose: { x: 400, y: 200, facing: "up" as const },
      enemyHealth: {
        "enemy.BOSS-Tuto.0": 1,
      },
    };
    const fired = fireMagicProjectile(base, new Date("2026-06-18T10:00:00.000Z"));
    const stepped = stepCombatSystems(fired.state, 50, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date("2026-06-18T10:00:00.050Z"));

    expect(fired.state.activeProjectiles).toHaveLength(1);
    expect(stepped.state.activeProjectiles).toHaveLength(0);
    expect(stepped.state.defeatedEnemies).toContain("enemy.BOSS-Tuto.0");
  });

  it("adds a respawning slime in SR2 with active attack frames for sword testing", () => {
    const state = {
      ...sr2EncounterState(),
      inventory: ["Reloj", "Espada"],
      equipment: { weapon: "Espada" },
      playerPose: { x: 252, y: 240, facing: "up" as const },
    };
    const slime = getRoomEnemies(state).find((enemy) => enemy.id === SR2_SLIME_ENEMY_ID);
    const firstHit = swingSword(state, new Date("2026-06-24T10:00:00.000Z"));
    const slimeAfterFirstHit = getRoomEnemies(firstHit.state).find((enemy) => enemy.id === SR2_SLIME_ENEMY_ID);
    const secondHit = swingSword(
      { ...firstHit.state, playerPose: { x: slimeAfterFirstHit!.x, y: slimeAfterFirstHit!.y + 26, facing: "up" as const } },
      new Date("2026-06-24T10:00:01.000Z"),
    );
    const slimeAfterSecondHit = getRoomEnemies(secondHit.state).find((enemy) => enemy.id === SR2_SLIME_ENEMY_ID);
    const thirdHit = swingSword(
      { ...secondHit.state, playerPose: { x: slimeAfterSecondHit!.x, y: slimeAfterSecondHit!.y + 26, facing: "up" as const } },
      new Date("2026-06-24T10:00:02.000Z"),
    );
    const slimeAfterThirdHit = getRoomEnemies(thirdHit.state).find((enemy) => enemy.id === SR2_SLIME_ENEMY_ID);
    const defeated = swingSword(
      { ...thirdHit.state, playerPose: { x: slimeAfterThirdHit!.x, y: slimeAfterThirdHit!.y + 26, facing: "up" as const } },
      new Date("2026-06-24T10:00:03.000Z"),
    );
    const respawned = resetRespawningEnemiesForRoom(defeated.state, "SR2");

    expect(slime).toEqual(
      expect.objectContaining({
        species: "slime1",
        hp: 4,
        respawnOnEntry: true,
        contactDamage: expect.objectContaining({ damage: 1, cooldownMs: 700 }),
        attack: expect.objectContaining({ hitFrames: [6, 7, 8], damage: 2 }),
      }),
    );
    expect(SLIME1_ATTACK_CONFIG.hitFrames).toEqual([6, 7, 8]);
    expect(firstHit.worldChanged).toBe(false);
    expect(firstHit.state.enemyHealth[SR2_SLIME_ENEMY_ID]).toBe(3);
    expect(firstHit.state.enemyPositions[SR2_SLIME_ENEMY_ID]?.y).toBeLessThan(slime!.y);
    expect(thirdHit.state.enemyHealth[SR2_SLIME_ENEMY_ID]).toBe(1);
    expect(defeated.state.defeatedEnemies).toContain(SR2_SLIME_ENEMY_ID);
    expect(defeated.state.enemyHealth[SR2_SLIME_ENEMY_ID]).toBeUndefined();
    expect(respawned.defeatedEnemies).not.toContain(SR2_SLIME_ENEMY_ID);
    expect(respawned.enemyHealth[SR2_SLIME_ENEMY_ID]).toBeUndefined();
  });

  it("places only one bomb and opens breakable blockade walls when it explodes", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "MG-R1",
      currentFloor: "piso1" as const,
      currentZone: "Correr",
      inventory: ["Reloj", "Bombas"],
      equipment: { activeItem: "Bombas" },
    };
    const wall = getBreakableWalls(base).find((entry) => entry.gateId === "B7");

    expect(wall).toBeDefined();

    const placed = placeBomb(
      {
        ...base,
        playerPose: { x: wall!.x + wall!.width / 2, y: wall!.y + wall!.height / 2, facing: "right" as const },
      },
      new Date("2026-06-18T10:00:00.000Z"),
    );
    const blockedSecondBomb = placeBomb(placed.state, new Date("2026-06-18T10:00:01.000Z"));
    const exploded = resolveBombFuse(
      placed.state,
      new Date(new Date(placed.state.activeBomb!.placedAt).getTime() + BOMB_CONFIG.fuseMs + 1),
    );

    expect(blockedSecondBomb.changed).toBe(false);
    expect(exploded.handled).toBe(true);
    expect(exploded.state.activeBomb).toBeUndefined();
    expect(exploded.state.openGates).toContain("B7");
    expect(exploded.state.brokenWalls).toContain("wall.B7");
  });

  it("bomb explosion damages the player through the combat health component", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "PZ-E1",
      inventory: ["Reloj", "Bombas"],
      equipment: { activeItem: "Bombas" },
    };
    const placed = placeBomb(base, new Date("2026-06-18T10:00:00.000Z"));
    const exploded = resolveBombFuse(
      placed.state,
      new Date(new Date(placed.state.activeBomb!.placedAt).getTime() + BOMB_CONFIG.fuseMs + 1),
    );

    expect(exploded.state.playerHealth).toBe(98);
    expect(exploded.state.playerCombat.health).toBe(98);
  });

  it("slime creates a data-driven area attack and combat step applies its damage once", () => {
    const base = {
      ...sr2EncounterState(),
      playerPose: { x: 252, y: 240, facing: "up" as const },
      playerCombat: {
        ...createInitialGameState().playerCombat,
        invulnerableUntil: "2026-06-18T10:00:05.000Z",
      },
    };
    const ai = stepSr2SlimeAi(base, 16, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date("2026-06-18T10:00:00.000Z").getTime());
    const attack = ai.state.activeAreaAttacks[0];
    const active = stepCombatSystems(ai.state, 16, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date(Date.parse(attack.startedAt) + attack.activeFromMs + 1));
    const finishedArea = stepCombatSystems(active.state, 16, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date(Date.parse(attack.startedAt) + attack.activeToMs + 1));
    const finished = stepCombatSystems(finishedArea.state, 16, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date(Date.parse(attack.startedAt) + (attack.visualToMs ?? attack.activeToMs) + 1));

    expect(attack.radius).toBe(SLIME1_ATTACK_CONFIG.areaRadius);
    expect(active.state.playerHealth).toBe(98);
    expect(active.state.activeAreaAttacks[0]?.hitPlayer).toBe(true);
    expect(finishedArea.state.activeAreaAttacks).toHaveLength(0);
    expect(finishedArea.state.playerHealth).toBe(98);
    expect(finished.state.activeAreaAttacks).toHaveLength(0);
  });

  it("multiple non-contact area attacks can damage the player in the same frame", () => {
    const startedAt = "2026-06-18T10:00:00.000Z";
    const base = {
      ...sr2EncounterState(),
      playerPose: { x: 252, y: 240, facing: "up" as const },
      playerCombat: {
        ...createInitialGameState().playerCombat,
        invulnerableUntil: "2026-06-18T10:00:05.000Z",
      },
      activeAreaAttacks: [1, 2, 3].map((index) => ({
        id: `area.test.${index}`,
        roomId: "SR2",
        ownerId: `enemy.test.${index}`,
        x: 252,
        y: 240,
        radius: 44,
        damage: 2,
        startedAt,
        windupMs: 100,
        activeFromMs: 100,
        activeToMs: 500,
        hitPlayer: false,
      })),
    };

    const result = stepCombatSystems(base, 16, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date("2026-06-18T10:00:00.150Z"));

    expect(result.state.playerHealth).toBe(94);
    expect(result.events?.filter((event) => event.type === "damage" && event.target === "player")).toHaveLength(3);
  });

  it("removes a slime area attack immediately when its owner dies", () => {
    const state = {
      ...sr2EncounterState(),
      inventory: ["Reloj", "Espada"],
      equipment: { weapon: "Espada" },
      playerPose: { x: 252, y: 240, facing: "up" as const },
      enemyHealth: {
        [SR2_SLIME_ENEMY_ID]: 1,
      },
      activeAreaAttacks: [
        {
          id: `area.${SR2_SLIME_ENEMY_ID}.test`,
          roomId: "SR2",
          ownerId: SR2_SLIME_ENEMY_ID,
          x: 252,
          y: 214,
          radius: 44,
          damage: 2,
          startedAt: "2026-06-18T10:00:00.000Z",
          windupMs: 650,
          activeFromMs: 650,
          activeToMs: 1000,
          hitPlayer: false,
        },
      ],
    };

    const result = swingSword(state, new Date("2026-06-18T10:00:00.000Z"));

    expect(result.state.defeatedEnemies).toContain(SR2_SLIME_ENEMY_ID);
    expect(result.state.activeAreaAttacks).toEqual([]);
  });

  it("slime contact damages the player with cooldown", () => {
    const base = {
      ...sr2EncounterState(),
      playerPose: { x: 252, y: 220, facing: "up" as const },
      enemyPositions: {
        [SR2_SLIME_ENEMY_ID]: { x: 252, y: 214 },
      },
      enemyCombat: {
        [SR2_SLIME_ENEMY_ID]: {
          lastAttackAt: "2026-06-18T10:00:00.000Z",
        },
      },
    };
    const hit = stepCombatSystems(base, 0, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date("2026-06-18T10:00:00.100Z"));
    const cooldown = stepCombatSystems(hit.state, 0, {
      width: 800,
      height: 450,
      playerRadius: 14,
      colliders: [],
    }, new Date("2026-06-18T10:00:00.200Z"));

    expect(hit.state.playerHealth).toBe(99);
    expect(hit.state.playerPose).toEqual(base.playerPose);
    expect(hit.worldChanged).toBe(false);
    expect(hit.events).toContainEqual(expect.objectContaining({
      type: "damage",
      target: "player",
      amount: 1,
      source: "Contacto de slime",
    }));
    expect(cooldown.state.playerHealth).toBe(99);
  });

  it("opens B1 to SS1 by breaking the wall with bombs", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "SR2",
      currentFloor: "piso1" as const,
      currentZone: "Entrada",
      inventory: ["Reloj", "Bombas"],
      equipment: { activeItem: "Bombas" },
    };
    const wall = getBreakableWalls(base).find((entry) => entry.gateId === "B1");

    expect(wall).toBeDefined();

    const placed = placeBomb(
      {
        ...base,
        playerPose: { x: wall!.x + wall!.width / 2, y: wall!.y + wall!.height / 2, facing: "right" as const },
      },
      new Date("2026-06-18T10:00:00.000Z"),
    );
    const exploded = resolveBombFuse(
      placed.state,
      new Date(new Date(placed.state.activeBomb!.placedAt).getTime() + BOMB_CONFIG.fuseMs + 1),
    );

    expect(exploded.state.openGates).toContain("B1");
    expect(exploded.state.brokenWalls).toContain("wall.B1");
    expect(exploded.state.flags["wall.B1.destroyed"]).toBe(true);
  });

  it("spawns the CP-G1 legendary beast only after bait and grants ingredient 4 on defeat", () => {
    const base = {
      ...createInitialGameState(),
      currentRoomId: "CP-G1",
      currentFloor: "piso1" as const,
      currentZone: "Grecia",
      inventory: ["Reloj", "Espada", "Cebo especial"],
      equipment: { weapon: "Espada" },
      playerPose: { x: 400, y: 205, facing: "up" as const },
    };
    const summoned = {
      ...base,
      enemyHealth: {
        "enemy.CP-G1.legendary-beast": 2,
      },
      flags: {
        ...base.flags,
        "beast.CP-G1.summoned": true,
      },
    };
    const result = swingSword(summoned, new Date("2026-06-18T10:00:00.000Z"));
    const defeated = swingSword(
      { ...result.state, playerPose: { x: 400, y: 205, facing: "up" as const } },
      new Date("2026-06-18T10:00:01.000Z"),
    );

    expect(getRoomEnemies(base)).toEqual([]);
    expect(getRoomEnemies(summoned).map((enemy) => enemy.id)).toEqual(["enemy.CP-G1.legendary-beast"]);
    expect(defeated.state.defeatedEnemies).toContain("enemy.CP-G1.legendary-beast");
    expect(defeated.state.inventory).toContain("Ingrediente legendario 4");
    expect(defeated.state.flags["beast.CP-G1.defeated"]).toBe(true);
  });
});
