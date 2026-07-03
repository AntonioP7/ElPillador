import { describe, expect, it } from "vitest";
import { SR2_SLIME_ENEMY_ID } from "../content/enemies";
import { getRoomEnemies, stepCombatSystems } from "../simulation/combat";
import { createInitialGameState } from "../simulation/state";
import { stepRoomEnemies } from "./EnemyAiSystem";

const bounds = {
  width: 800,
  height: 450,
  playerRadius: 14,
  colliders: [],
};

function sr2State() {
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

describe("EnemyAiSystem", () => {
  it("puts slime in wander when the player is outside detection range", () => {
    const state = {
      ...sr2State(),
      playerPose: { x: 650, y: 400, facing: "up" as const },
    };
    const result = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, Date.parse("2026-06-18T10:00:00.000Z"));

    expect(result.enemyMotion[SR2_SLIME_ENEMY_ID]).toBe("walk");
    expect(result.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("walk");
    expect(result.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("wander");
  });

  it("puts slime in chase when the player is inside detection range but outside attack range", () => {
    const state = {
      ...sr2State(),
      playerPose: { x: 252, y: 300, facing: "up" as const },
    };
    const result = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, Date.parse("2026-06-18T10:00:00.000Z"));

    expect(result.enemyMotion[SR2_SLIME_ENEMY_ID]).toBe("run");
    expect(result.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("run");
    expect(result.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("chase");
  });

  it("stops slime and creates a warning area when the player is inside attack range", () => {
    const state = {
      ...sr2State(),
      playerPose: { x: 252, y: 240, facing: "up" as const },
    };
    const result = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, Date.parse("2026-06-18T10:00:00.000Z"));

    expect(result.moved).toBe(false);
    expect(result.enemyMotion[SR2_SLIME_ENEMY_ID]).toBe("attack");
    expect(result.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("area_attack");
    expect(result.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("attackWindup");
    expect(result.state.activeAreaAttacks).toHaveLength(1);
  });

  it("chases instead of attacking while its area attack is on cooldown", () => {
    const now = Date.parse("2026-06-18T10:00:00.000Z");
    const state = {
      ...sr2State(),
      playerPose: { x: 252, y: 240, facing: "up" as const },
      enemyCombat: {
        [SR2_SLIME_ENEMY_ID]: {
          lastAttackAt: new Date(now - 200).toISOString(),
        },
      },
    };
    const result = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, now);

    expect(result.enemyMotion[SR2_SLIME_ENEMY_ID]).toBe("run");
    expect(result.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("run");
    expect(result.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("chase");
    expect(result.state.activeAreaAttacks).toHaveLength(0);
  });

  it("keeps the slime attack animation when damaged during an attack", () => {
    const now = Date.parse("2026-06-18T10:00:00.000Z");
    const state = {
      ...sr2State(),
      playerPose: { x: 252, y: 240, facing: "up" as const },
    };
    const attack = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, now);
    const activeAttack = attack.state.activeAreaAttacks[0];
    const attackingWhileFar = {
      ...attack.state,
      playerPose: { x: 650, y: 400, facing: "up" as const },
      enemyStunUntil: {
        [SR2_SLIME_ENEMY_ID]: new Date(now + 1000).toISOString(),
      },
    };
    const damagedDuringAttack = stepRoomEnemies(
      attackingWhileFar,
      getRoomEnemies(attackingWhileFar),
      100,
      bounds,
      Date.parse(activeAttack.startedAt) + 300,
    );
    const afterAttack = stepRoomEnemies(
      attackingWhileFar,
      getRoomEnemies(attackingWhileFar),
      100,
      bounds,
      Date.parse(activeAttack.startedAt) + 1100,
    );

    expect(damagedDuringAttack.enemyMotion[SR2_SLIME_ENEMY_ID]).toBe("attack");
    expect(damagedDuringAttack.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("area_attack");
    expect(damagedDuringAttack.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("attackWindup");
    expect(afterAttack.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("walk");
    expect(afterAttack.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("wander");
  });

  it("returns to chase immediately after an area attack finishes", () => {
    const now = Date.parse("2026-06-18T10:00:00.000Z");
    const state = {
      ...sr2State(),
      playerPose: { x: 252, y: 240, facing: "up" as const },
    };
    const attack = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, now);
    const activeAttack = attack.state.activeAreaAttacks[0];
    const afterAttack = stepRoomEnemies(
      attack.state,
      getRoomEnemies(attack.state),
      100,
      bounds,
      Date.parse(activeAttack.startedAt) + activeAttack.activeToMs + 20,
    );
    const cleaned = stepCombatSystems(
      afterAttack.state,
      16,
      bounds,
      new Date(Date.parse(activeAttack.startedAt) + activeAttack.activeToMs + 20),
    );
    const afterRecover = stepRoomEnemies(
      { ...cleaned.state, playerPose: { x: 252, y: 300, facing: "up" as const } },
      getRoomEnemies({ ...cleaned.state, playerPose: { x: 252, y: 300, facing: "up" as const } }),
      100,
      bounds,
      Date.parse(activeAttack.startedAt) + activeAttack.activeToMs + 800,
    );

    expect(afterAttack.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("chase");
    expect(afterAttack.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("run");
    expect(afterRecover.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("chase");
  });

  it("forces hurt while the slime is stunned after receiving damage", () => {
    const state = {
      ...sr2State(),
      playerPose: { x: 252, y: 250, facing: "up" as const },
      enemyStunUntil: {
        [SR2_SLIME_ENEMY_ID]: "2026-06-18T10:00:01.000Z",
      },
    };
    const result = stepRoomEnemies(state, getRoomEnemies(state), 100, bounds, Date.parse("2026-06-18T10:00:00.000Z"));

    expect(result.moved).toBe(false);
    expect(result.enemyAnimationState[SR2_SLIME_ENEMY_ID]).toBe("hurt");
    expect(result.state.enemyCombat[SR2_SLIME_ENEMY_ID]?.aiState).toBe("hurt");
  });
});
