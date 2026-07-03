import { ActionResult, Direction, GameAction } from "../../game/input/actions";
import { getCurrentRoom, getRoomExits, normalizeStateRoom, moveInDirection, moveToRoom, ExitDefinition } from "../../game/simulation/navigation";
import { roomsById } from "../../game/content/maps/dungeon";
import type { EnemySpawnDefinition } from "../../game/content/enemies/types";
import { getRoomInteractions, grantProgress, interactWithCurrentRoom } from "../../game/simulation/progression";
import { createInitialGameState, GameState, touchGameState } from "../../game/simulation/state";
import { damagePlayer } from "../../game/simulation/player";
import { loadGame, saveGame, StorageLike } from "../../game/simulation/storage";
import { RoomDefinition } from "../../game/content/maps/types";
import { RoomInteraction } from "../../game/content/progression";
import { equipItem, inspectItemWithLupa, useEquippedItem } from "../../game/simulation/equipment";
import { GUILLE_TIMER_SAFE_ROOM_ID, refreshGuilleCircuitTimer } from "../../game/simulation/timer";
import {
  Rect,
  TILED_PLAYER_RADIUS,
  TiledRoomDefinition,
  TiledChestObject,
  TiledInteractObject,
  TiledStairsObject,
  spawnTiledFromExitDirection,
  stepTiledMovement,
  tiledRoomColliders,
} from "../../game/content/tiledRooms/generic";
import { getAdjacentTiledWorldRoomId, getRoomRuntimeDefinition, RoomRuntimeDefinition } from "../../game/content/rooms";
import {
  applyPlayerKnockback,
  BreakableWall,
  CombatCollisionBounds,
  CombatEnemy,
  CombatEvent,
  EnemyAnimationState,
  EnemyMotionState,
  getActiveBomb,
  getBreakableWalls,
  getRoomEnemies,
  fireMagicProjectile,
  placeBomb,
  resetRespawningEnemiesForRoom,
  resolveBombFuse,
  resolveProjectileHit,
  stepCombatSystems,
  swingSword,
} from "../../game/simulation/combat";
import { ActiveBombState } from "../../game/simulation/state";
import {
  getTopDownDoors,
  getTopDownInteractables,
  TOP_DOWN_PLAYER_RADIUS,
  TOP_DOWN_INTERACTION_RANGE,
  TOP_DOWN_ROOM_HEIGHT,
  TOP_DOWN_ROOM_WIDTH,
  interactWithNearestTopDownObject,
  stepTopDownMovement,
  TopDownDoor,
  TopDownInputState,
  TopDownInteractable,
  tryTopDownDoorTransition,
} from "../../game/simulation/topDown";
import {
  progressRoomEncounter,
  roomEncounterForChest,
  shouldRoomEncounterBlockDoor,
  startRoomEncounter,
} from "../../game/simulation/roomEncounters";

export type SceneBridgeSnapshot = {
  state: GameState;
  room: RoomDefinition;
  roomContent: RoomRuntimeDefinition;
  exits: ExitDefinition[];
  interactions: RoomInteraction[];
  topDownDoors: TopDownDoor[];
  topDownInteractables: TopDownInteractable[];
  combatEnemies: CombatEnemy[];
  breakableWalls: BreakableWall[];
  activeBomb?: ActiveBombState;
  activeProjectiles: GameState["activeProjectiles"];
  activeAreaAttacks: GameState["activeAreaAttacks"];
  enemyAnimationState: Record<string, EnemyAnimationState>;
  tiledDoorTestOpenOverride: boolean | null;
  message: string;
};

export type SceneBridgeDispatchOptions = {
  viewMode?: "graph" | "topdown";
};

export type SceneBridgeEnemyAiResult = ActionResult & {
  enemyMotion: Record<string, EnemyMotionState>;
  enemyAnimationState: Record<string, EnemyAnimationState>;
};

export type SceneBridgeCombatResult = ActionResult & {
  events: CombatEvent[];
};

export type SceneBridgeActionResult = ActionResult & {
  events?: CombatEvent[];
};

type EntryDoorAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  isLocked?: boolean;
  isBlock?: boolean;
  isSecret?: boolean;
  targetRoom?: string;
  targetSpawn?: string;
};

export class SceneBridge {
  private state: GameState;
  private message = "Base inicial lista";
  private readonly tiledEnemySpawnsByRoom = new Map<string, EnemySpawnDefinition[]>();
  private readonly tiledRoomDefinitionsById = new Map<string, TiledRoomDefinition>();
  private lastRegisteredTiledRoomId: string | null = null;
  private lastEnemyAnimationState: Record<string, EnemyAnimationState> = {};
  private tiledDoorTestOpenOverride: boolean | null = null;

  constructor(private readonly storage: StorageLike) {
    this.state = normalizeStateRoom(loadGame(storage) ?? createInitialGameState());
    saveGame(this.state, this.storage);
  }

  getSnapshot(): SceneBridgeSnapshot {
    this.state = refreshGuilleCircuitTimer(this.state);

    return {
      state: this.state,
      room: getCurrentRoom(this.state),
      roomContent: getRoomRuntimeDefinition(this.state.currentRoomId),
      exits: getRoomExits(this.state),
      interactions: getRoomInteractions(this.state),
      topDownDoors: getTopDownDoors(this.state),
      topDownInteractables: getTopDownInteractables(this.state),
      combatEnemies: getRoomEnemies(this.state, this.currentTiledEnemySpawns()),
      breakableWalls: getBreakableWalls(this.state),
      activeBomb: getActiveBomb(this.state),
      activeProjectiles: this.state.activeProjectiles.filter((projectile) => projectile.roomId === this.state.currentRoomId),
      activeAreaAttacks: this.state.activeAreaAttacks.filter((attack) => attack.roomId === this.state.currentRoomId),
      enemyAnimationState: this.lastEnemyAnimationState,
      tiledDoorTestOpenOverride: this.tiledDoorTestOpenOverride,
      message: this.message,
    };
  }

  setTiledDoorTestOpenOverride(isOpen: boolean | null): ActionResult {
    this.tiledDoorTestOpenOverride = isOpen;
    this.message = isOpen === null
      ? "Prueba de puertas desactivada"
      : `Prueba de puertas: ${isOpen ? "abiertas" : "cerradas"}`;

    return { handled: true, message: this.message, worldChanged: true };
  }

  refreshTimedSystems(now = new Date()): ActionResult {
    const previousRoomId = this.state.currentRoomId;
    const previousOpen = this.state.timerState.guilleCircuitOpen;
    const previousStatus = this.state.timerState.guilleCircuitStatus;

    this.state = refreshGuilleCircuitTimer(this.state, now);

    if (this.state.currentRoomId !== previousRoomId) {
      this.message = `Cronometro agotado: vuelves a ${GUILLE_TIMER_SAFE_ROOM_ID}`;
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: true };
    }

    if (
      (previousOpen || previousStatus === "running") &&
      !this.state.timerState.guilleCircuitOpen &&
      this.state.timerState.guilleCircuitStatus === "expired"
    ) {
      this.message = "Cronometro agotado: los accesos de Correr se han cerrado";
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    return { handled: false, worldChanged: false };
  }

  stepTopDown(input: TopDownInputState, deltaMs: number): ActionResult {
    const timerResult = this.refreshTimedSystems();

    if (timerResult.handled) {
      return timerResult;
    }

    const result = stepTopDownMovement(this.state, input, deltaMs);
    this.state = this.progressCurrentRoomEncounter(result.state);

    return { handled: result.moved, worldChanged: result.moved };
  }

  stepTiledWorldRoom(input: TopDownInputState, deltaMs: number, room: TiledRoomDefinition): ActionResult {
    this.registerTiledRoomDefinition(room);
    const timerResult = this.refreshTimedSystems();

    if (timerResult.handled) {
      return timerResult;
    }

    const result = stepTiledMovement(this.state, input, deltaMs, {
      ...room,
      colliders: this.tiledRoomColliders(room),
    });
    this.state = this.progressCurrentRoomEncounter(result.state);

    return { handled: result.moved, worldChanged: result.moved };
  }

  tryTiledWorldDoorTransition(direction: Direction, door: EntryDoorAnchor): ActionResult {
    const blockedReason = this.tiledDoorBlockedReason(direction, door);

    if (blockedReason) {
      this.message = blockedReason;
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    const targetRoomId = door.targetRoom ?? getAdjacentTiledWorldRoomId(this.state.currentRoomId, direction);

    if (targetRoomId) {
      const previousRoomId = this.state.currentRoomId;
      const result = moveToRoom(this.state, targetRoomId);
      this.state = withRoomSpecificSpawn(
        result.state,
        previousRoomId,
        direction,
        door,
        this.tiledRoomDefinitionsById.get(result.state.currentRoomId),
      );
      this.resetTiledRoomRegistrationIfChanged(previousRoomId);
      this.message = result.message;
      saveGame(this.state, this.storage);

      return { handled: result.moved, message: this.message, worldChanged: result.moved };
    }

    const hasExit = getRoomExits(this.state).some((exit) => exit.direction === direction);

    if (!hasExit) {
      this.message = "No hay salida definida en esa direccion";
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    const previousRoomId = this.state.currentRoomId;
    const result = this.dispatch({ type: "move", direction }, { viewMode: "topdown" });

    if (result.worldChanged) {
      this.state = touchGameState({
        ...this.state,
        playerPose: spawnPoseForRoomEntry(
          this.state.currentRoomId,
          direction,
          door,
          previousRoomId,
          this.tiledRoomDefinitionsById.get(this.state.currentRoomId),
        ),
      });
      this.resetTiledRoomRegistrationIfChanged(previousRoomId);
      saveGame(this.state, this.storage);
    }

    return result;
  }

  tryTiledWorldStairsTransition(stairs: TiledStairsObject): ActionResult {
    if (getRoomEnemies(this.state, this.currentTiledEnemySpawns()).length > 0) {
      this.message = "Completa la sala para activar las escaleras";
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    const exit = this.tiledStairsExit(stairs);

    if (!exit) {
      this.message = "No hay escalera definida en esta sala";
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    if (!exit.access.open) {
      this.message = exit.access.reason ?? "Escalera bloqueada";
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    const previousRoomId = this.state.currentRoomId;
    const result = moveToRoom(this.state, exit.target.id);
    this.state = withRoomSpecificSpawn(result.state, previousRoomId, stairs.direction, stairs);
    this.resetTiledRoomRegistrationIfChanged(previousRoomId);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: result.moved, message: this.message, worldChanged: result.moved };
  }

  private tiledStairsExit(stairs: Pick<TiledStairsObject, "targetRoom">): ExitDefinition | undefined {
    const exits = getRoomExits(this.state).filter((exit) => exit.connection.kind === "escalera");

    if (stairs.targetRoom) {
      return exits.find((exit) => exit.target.id === stairs.targetRoom);
    }

    return exits[0];
  }

  getTiledWorldCombatCollisionBounds(room: TiledRoomDefinition): CombatCollisionBounds {
    return {
      width: room.width,
      height: room.height,
      playerRadius: TILED_PLAYER_RADIUS,
      colliders: this.tiledRoomColliders(room),
    };
  }

  registerTiledRoomDefinition(room: TiledRoomDefinition): void {
    this.tiledRoomDefinitionsById.set(room.id, room);

    const spawns = room.enemies.map((enemy) => ({
      ...enemy,
      roomId: room.id,
    }));

    this.tiledEnemySpawnsByRoom.set(room.id, spawns);

    if (this.state.currentRoomId === room.id && this.lastRegisteredTiledRoomId !== room.id) {
      this.state = resetRespawningEnemiesForRoom(this.state, room.id, spawns);
      this.lastRegisteredTiledRoomId = room.id;
      saveGame(this.state, this.storage);
    }
  }

  interactWithTiledRoom(room: TiledRoomDefinition, now = new Date()): ActionResult {
    this.registerTiledRoomDefinition(room);

    const nearest = nearestTiledInteraction(this.state.playerPose, room);

    if (!nearest || nearest.distance > TOP_DOWN_INTERACTION_RANGE) {
      this.message = "No hay nada al alcance";
      this.state = touchGameState(this.state, now);
      saveGame(this.state, this.storage);
      return { handled: false, message: this.message, worldChanged: false };
    }

    if (nearest.kind === "chest") {
      const result = this.openTiledChest(nearest.object, now);
      return result;
    }

    const result = this.activateTiledInteract(nearest.object, now);
    return result;
  }

  damagePlayer(amount: number, source: string): ActionResult {
    const result = damagePlayer(this.state, amount, source);
    this.state = this.progressCurrentRoomEncounter(result.state);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: false };
  }

  damagePlayerWithKnockback(
    amount: number,
    source: string,
    knockbackSource: { x: number; y: number },
    distance: number,
    bounds: CombatCollisionBounds,
  ): ActionResult {
    const result = damagePlayer(this.state, amount, source);
    this.state = applyPlayerKnockback(result.state, knockbackSource, distance, bounds);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: false };
  }

  setMessage(message: string): ActionResult {
    this.message = message;
    this.state = touchGameState(this.state);
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: false };
  }

  startAtRoom(roomId: string): ActionResult {
    const runtime = getRoomRuntimeDefinition(roomId);
    const room = runtime.graph ?? (runtime.world
      ? {
          id: runtime.id,
          floor: runtime.floor,
          zone: runtime.zone,
          kind: runtime.graphKind ?? "normal" as const,
          layout: {
            x: runtime.world.worldX,
            y: runtime.world.worldY,
            width: runtime.world.width,
            height: runtime.world.height,
          },
        }
      : undefined);

    if (!room) {
      this.message = `Sala debug desconocida: ${roomId}`;
      return { handled: false, message: this.message, worldChanged: false };
    }

    this.state = touchGameState({
      ...this.state,
      currentRoomId: room.id,
      currentFloor: room.floor,
      currentZone: room.zone,
      playerPose: this.state.playerPose,
      discoveredRooms: [...new Set([...this.state.discoveredRooms, room.id])],
    });
    this.state = resetRespawningEnemiesForRoom(this.state, room.id);
    this.lastRegisteredTiledRoomId = null;
    this.message = `Inicio debug en ${room.id}`;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: true };
  }

  refreshCombatSystems(now = new Date()): ActionResult {
    const result = stepCombatSystems(this.state, 0, {
      width: TOP_DOWN_ROOM_WIDTH,
      height: TOP_DOWN_ROOM_HEIGHT,
      playerRadius: 14,
      colliders: [],
    }, now, this.currentTiledEnemySpawns());

    if (!result.handled) {
      return { handled: false, worldChanged: false };
    }

    this.state = this.progressCurrentRoomEncounter(result.state);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: result.worldChanged ?? result.changed };
  }

  swingSwordInTiledRoom(bounds: CombatCollisionBounds): SceneBridgeActionResult {
    const result = swingSword(this.state, new Date(), bounds, this.currentTiledEnemySpawns());
    this.state = this.progressCurrentRoomEncounter(result.state);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: result.handled, message: this.message, worldChanged: result.worldChanged ?? result.changed, events: result.events ?? [] };
  }

  resolveMagicProjectileHit(x: number, y: number, now = new Date()): SceneBridgeActionResult {
    const result = resolveProjectileHit(this.state, x, y, now, this.currentTiledEnemySpawns());

    if (!result.hit) {
      return { handled: false, worldChanged: false, events: result.events ?? [] };
    }

    this.state = this.progressCurrentRoomEncounter(result.state);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: result.worldChanged ?? result.changed, events: result.events ?? [] };
  }

  fireMagicProjectile(now = new Date()): ActionResult {
    const result = fireMagicProjectile(this.state, now);
    this.state = this.progressCurrentRoomEncounter(result.state);
    this.message = result.message;
    saveGame(this.state, this.storage);

    return { handled: result.handled, message: this.message, worldChanged: result.worldChanged ?? result.changed };
  }

  stepCombat(deltaMs: number, bounds: CombatCollisionBounds, now = new Date()): SceneBridgeCombatResult {
    const result = stepCombatSystems(this.state, deltaMs, bounds, now, this.currentTiledEnemySpawns());

    if (!result.handled) {
      return { handled: false, worldChanged: false, events: result.events ?? [] };
    }

    this.state = this.progressCurrentRoomEncounter(result.state);
    this.lastEnemyAnimationState = result.enemyAnimationState ?? {};
    this.message = result.message || this.message;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: result.worldChanged ?? result.changed, events: result.events ?? [] };
  }

  tryTopDownDoorTransition(): ActionResult {
    const timerResult = this.refreshTimedSystems();

    if (timerResult.handled) {
      return timerResult;
    }

    const previousRoomId = this.state.currentRoomId;
    const result = tryTopDownDoorTransition(this.state);
    this.state = result.transitioned && result.door
      ? withRoomSpecificSpawn(result.state, previousRoomId, result.door.direction, result.door)
      : result.state;

    if (result.message) {
      this.message = result.message;
    }

    if (result.transitioned) {
      saveGame(this.state, this.storage);
    }

    return {
      handled: result.transitioned || result.blocked,
      message: this.message,
      worldChanged: result.transitioned,
    };
  }

  dispatch(action: GameAction, options: SceneBridgeDispatchOptions = {}): SceneBridgeActionResult {
    const timerResult = this.refreshTimedSystems();

    if (timerResult.handled && action.type !== "save" && action.type !== "load" && action.type !== "reset") {
      return timerResult;
    }

    switch (action.type) {
      case "move": {
        const previousRoomId = this.state.currentRoomId;
        const result = moveInDirection(this.state, action.direction);
        this.state = withRoomSpecificSpawn(result.state, previousRoomId, action.direction);
        this.resetTiledRoomRegistrationIfChanged(previousRoomId);
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.moved, message: this.message, worldChanged: result.moved };
      }
      case "confirm":
        this.message = "Usa flechas/WASD para cruzar salidas";
        break;
      case "cancel":
        this.message = "Sin menu de pausa todavia";
        break;
      case "pause":
        this.message = "Pausa preparada";
        break;
      case "interact":
      {
        const result =
          options.viewMode === "topdown"
            ? interactWithNearestTopDownObject(this.state)
            : interactWithCurrentRoom(this.state);
        this.state = result.state;
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.changed, message: this.message, worldChanged: result.changed };
      }
      case "equip-item":
      {
        const result = equipItem(this.state, action.itemName);
        this.state = result.state;
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.handled, message: this.message, worldChanged: false };
      }
      case "inspect-item":
      {
        const result = inspectItemWithLupa(this.state, action.itemName);
        this.state = result.state;
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.handled, message: this.message, worldChanged: false };
      }
      case "swing-sword":
      {
        const result = swingSword(this.state);
        this.state = result.state;
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.handled, message: this.message, worldChanged: result.worldChanged ?? result.changed, events: result.events ?? [] };
      }
      case "place-bomb":
      {
        const result = placeBomb(this.state);
        this.state = result.state;
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.handled, message: this.message, worldChanged: result.worldChanged ?? result.changed };
      }
      case "use-equipped-item":
      {
        const result = useEquippedItem(this.state);
        this.state = result.state;
        this.message = result.message;
        saveGame(this.state, this.storage);
        return { handled: result.handled, message: this.message, worldChanged: false };
      }
      case "save":
        saveGame(this.state, this.storage);
        this.message = "Partida guardada";
        return { handled: true, message: this.message, worldChanged: false };
      case "load": {
        const loaded = loadGame(this.storage);
        if (loaded) {
          this.state = normalizeStateRoom(loaded);
          this.message = "Partida cargada";
          saveGame(this.state, this.storage);
          return { handled: true, message: this.message, worldChanged: true };
        }

        this.message = "No hay guardado";
        return { handled: false, message: this.message };
      }
      case "reset":
        this.state = createInitialGameState();
        this.lastRegisteredTiledRoomId = null;
        this.message = "Partida reiniciada";
        saveGame(this.state, this.storage);
        return { handled: true, message: this.message, worldChanged: true };
      default:
        return { handled: false };
    }

    this.state = touchGameState(this.state);
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: false };
  }

  private tiledRoomColliders(room: TiledRoomDefinition): Rect[] {
    return tiledRoomColliders(room, (door) => this.tiledDoorBlocksMovement(door.direction, door));
  }

  private tiledDoorBlocksMovement(direction: Direction, door: EntryDoorAnchor): boolean {
    return Boolean(this.tiledDoorBlockedReason(direction, door));
  }

  private tiledDoorBlockedReason(direction: Direction, door: EntryDoorAnchor): string | null {
    if (this.tiledDoorTestOpenOverride !== null) {
      return this.tiledDoorTestOpenOverride
        ? null
        : door.isBlock || door.isSecret
          ? "No hay paso"
          : "Puerta cerrada";
    }

    if (shouldRoomEncounterBlockDoor(this.state, door)) {
      return "Las puertas se han cerrado";
    }

    const exit = this.tiledDoorExit(direction, door);

    if (door.isBlock) {
      return this.isBlockDoorAccessOpen(exit) ? null : "No hay paso";
    }

    if (door.isSecret) {
      return exit?.access.open === true ? null : "No hay paso";
    }

    if (!door.isLocked) {
      return null;
    }

    if (!exit) {
      return "Puerta cerrada";
    }

    if (exit.access.open) {
      return null;
    }

    return exit.connection.kind === "secreto"
      ? "No hay paso"
      : exit.access.reason ?? "Puerta cerrada";
  }

  private isBlockDoorAccessOpen(exit: ExitDefinition | undefined): boolean {
    return Boolean(exit?.connection.gateId && exit.access.open);
  }

  private tiledDoorExit(direction: Direction, door: EntryDoorAnchor): ExitDefinition | undefined {
    const targetRoomId = door.targetRoom ?? getAdjacentTiledWorldRoomId(this.state.currentRoomId, direction);
    const exits = getRoomExits(this.state);

    if (targetRoomId) {
      return exits.find((exit) => exit.target.id === targetRoomId);
    }

    return exits.find((exit) => exit.direction === direction);
  }

  private currentTiledEnemySpawns(): EnemySpawnDefinition[] {
    return this.tiledEnemySpawnsByRoom.get(this.state.currentRoomId) ?? [];
  }

  private resetTiledRoomRegistrationIfChanged(previousRoomId: string): void {
    if (this.state.currentRoomId !== previousRoomId) {
      this.lastRegisteredTiledRoomId = null;
    }
  }

  private openTiledChest(chest: TiledChestObject, now: Date): ActionResult {
    const openedFlag = tiledChestOpenedFlag(chest);

    if (this.state.flags[openedFlag] || chest.isOpen) {
      if (chest.item && !this.state.inventory.includes(chest.item)) {
        this.state = touchGameState(grantProgress(this.state, {
          items: [chest.item],
        }), now);
        this.message = `Cofre abierto: ${chest.item} obtenido`;
        saveGame(this.state, this.storage);
        return { handled: true, message: this.message, worldChanged: true };
      }

      this.message = "El cofre ya esta abierto";
      this.state = touchGameState(this.state, now);
      saveGame(this.state, this.storage);
      return { handled: true, message: this.message, worldChanged: false };
    }

    this.state = touchGameState(grantProgress(this.state, {
      items: chest.item ? [chest.item] : [],
      flags: [openedFlag],
    }), now);
    const encounter = roomEncounterForChest(this.state.currentRoomId, chest.id);
    if (encounter) {
      this.state = startRoomEncounter(this.state, encounter, this.currentTiledEnemySpawns());
    }
    this.message = chest.item ? `Cofre abierto: ${chest.item} obtenido` : "Cofre abierto";
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: true };
  }

  private progressCurrentRoomEncounter(state: GameState): GameState {
    return progressRoomEncounter(state, this.currentTiledEnemySpawns());
  }

  private activateTiledInteract(interact: TiledInteractObject, now: Date): ActionResult {
    const flag = interact.flag ?? `interact.${this.state.currentRoomId}.${interact.id}.used`;
    const alreadyUsed = this.state.flags[flag];
    const itemWasNew = Boolean(interact.item && !this.state.inventory.includes(interact.item));
    const message = interact.message ?? interact.dialogueId ?? interact.type ?? "Has interactuado";

    this.state = touchGameState(grantProgress(this.state, {
      items: interact.item ? [interact.item] : [],
      flags: alreadyUsed ? [] : [flag],
    }), now);
    this.message = interact.item && itemWasNew
      ? `${message}: ${interact.item} obtenido`
      : message;
    saveGame(this.state, this.storage);

    return { handled: true, message: this.message, worldChanged: !alreadyUsed || Boolean(interact.item) };
  }
}

type NearestTiledInteraction =
  | { kind: "chest"; object: TiledChestObject; distance: number }
  | { kind: "interact"; object: TiledInteractObject; distance: number };

function nearestTiledInteraction(
  pose: GameState["playerPose"],
  room: Pick<TiledRoomDefinition, "chests" | "interacts">,
): NearestTiledInteraction | null {
  const candidates: NearestTiledInteraction[] = [
    ...room.chests.map((chest) => ({ kind: "chest" as const, object: chest, distance: distanceToRectCenter(pose, chest) })),
    ...room.interacts.map((interact) => ({ kind: "interact" as const, object: interact, distance: distanceToRectCenter(pose, interact) })),
  ];

  return candidates.sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function tiledChestOpenedFlag(chest: TiledChestObject): string {
  return chest.openedFlag ?? `chest.${chest.id}.opened`;
}

function distanceToRectCenter(pose: GameState["playerPose"], rect: Pick<Rect, "x" | "y" | "width" | "height">): number {
  return Math.hypot(pose.x - (rect.x + rect.width / 2), pose.y - (rect.y + rect.height / 2));
}

let defaultBridge: SceneBridge | null = null;

export function getDefaultSceneBridge(): SceneBridge {
  defaultBridge ??= new SceneBridge(window.localStorage);
  return defaultBridge;
}

function withRoomSpecificSpawn(
  state: GameState,
  previousRoomId: string,
  direction: Direction,
  door?: EntryDoorAnchor,
  destinationRoom?: TiledRoomDefinition,
): GameState {
  if (state.currentRoomId !== previousRoomId) {
    return resetRespawningEnemiesForRoom({
      ...state,
      playerPose: spawnPoseForRoomEntry(state.currentRoomId, direction, door, previousRoomId, destinationRoom),
    }, state.currentRoomId);
  }

  return state;
}

function spawnPoseForRoomEntry(
  roomId: string,
  direction: Direction,
  door?: EntryDoorAnchor,
  previousRoomId?: string,
  destinationRoom?: TiledRoomDefinition,
): GameState["playerPose"] {
  const runtime = getRoomRuntimeDefinition(roomId);

  if (runtime.world) {
    return spawnTiledFromExitDirection(
      destinationRoom ?? runtime.world,
      direction,
      destinationRoom ? destinationDoorForEntry(destinationRoom, previousRoomId, direction, door) : undefined,
    );
  }

  const inset = TOP_DOWN_PLAYER_RADIUS + 42;
  const doorCenterX = door ? door.x + door.width / 2 : TOP_DOWN_ROOM_WIDTH / 2;
  const doorCenterY = door ? door.y + door.height / 2 : TOP_DOWN_ROOM_HEIGHT / 2;

  if (direction === "left") {
    return { x: TOP_DOWN_ROOM_WIDTH - inset, y: doorCenterY, facing: "left" };
  }

  if (direction === "right") {
    return { x: inset, y: doorCenterY, facing: "right" };
  }

  if (direction === "up") {
    return { x: doorCenterX, y: TOP_DOWN_ROOM_HEIGHT - inset, facing: "up" };
  }

  return { x: doorCenterX, y: inset, facing: "down" };
}

function destinationDoorForEntry(
  destinationRoom: TiledRoomDefinition,
  previousRoomId: string | undefined,
  direction: Direction,
  door?: EntryDoorAnchor,
): EntryDoorAnchor | undefined {
  if (door?.targetSpawn) {
    const explicitDoor = destinationRoom.doors.find((candidate) => candidate.id === door.targetSpawn);

    if (explicitDoor) {
      return explicitDoor;
    }
  }

  if (previousRoomId) {
    const returnDoor = destinationRoom.doors.find((candidate) => candidate.targetRoom === previousRoomId);

    if (returnDoor) {
      return returnDoor;
    }
  }

  return destinationRoom.doors.find((candidate) => candidate.direction === oppositeDirection(direction));
}

function oppositeDirection(direction: Direction): Direction {
  if (direction === "left") {
    return "right";
  }

  if (direction === "right") {
    return "left";
  }

  if (direction === "up") {
    return "down";
  }

  return "up";
}
