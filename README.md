# El Pillador

RPG top-down estilo Zelda para navegador. El primer objetivo jugable es una
mazmorra navegable con salas, conexiones, escaleras, bloqueos, secretos
terminales y guardado persistente.

## Estado del repositorio

M0, M1, M2, M3 y M3.5 estan implementados: el proyecto ya tiene scaffold Vite, TypeScript,
Phaser 3, shell HTML/CSS, escenas base, estado serializable, adapter de
`localStorage`, tests iniciales, grafo navegable de la mazmorra desde `Doc`,
items, rumores, NPCs, bloqueos principales, cronometro de Guille, Giratiempo y
validaciones anti-softlock, exploracion top-down sala a sala y menus de partida.

## Stack

- Phaser 3 para render, escenas, input de bajo nivel, camara y animaciones.
- TypeScript para codigo de juego, datos versionados y validaciones.
- Vite como entorno de desarrollo y build.
- HTML/CSS para shell, HUD, menus, overlays y textos densos.
- `localStorage` para guardado local con clave `el-pillador.save.v1`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run test
```

Tambien se puede usar `pnpm install`, `pnpm dev`, `pnpm build` y `pnpm test`;
este workspace incluye `pnpm-lock.yaml` porque la primera instalacion se hizo
con el runtime embebido de Codex.

`npm run dev` levanta la version local jugable. `npm run build` valida
TypeScript y genera el bundle de produccion. `npm run test` ejecuta las pruebas
automatizadas.

## GitHub Pages

El repositorio despliega automaticamente a GitHub Pages con GitHub Actions al
hacer push a `main`.

URL esperada:

```text
https://antoniop7.github.io/ElPillador/
```

Para generar el build local equivalente a Pages:

```bash
npm run build
```

En entornos Codex/Windows sin `node` o `npm` global en el `PATH`, usar:

```bat
scripts\start-dev.cmd
scripts\game.cmd sync-tiled
scripts\game.cmd dev
scripts\game.cmd build
scripts\game.cmd test
scripts\game.cmd typecheck
```

Ese wrapper usa el runtime embebido de Codex y evita repetir la configuracion
del `PATH` en cada comando.

Antes de `dev`, `build` y `test`, el wrapper sincroniza automaticamente assets
externos desde estas carpetas fuente:

- Mundo Tiled: `H:\Tiled\ElPillador\Mazmorra.world`
- Animacion del personaje: `H:\Tiled\GameAssets\AnimacionPersonaje`

Los mapas referenciados por el `.world` se copian normalizados a
`public/assets/game/data/tiled/rooms`, se genera
`public/assets/game/data/tiled/Mazmorra.world.json` y se actualiza
`src/game/content/tiledRooms/worldManifest.generated.ts`. Si un mapa referencia tilesets TSX
externos, el sync los incrusta en el JSON publico y reescribe las imagenes a
`public/assets/game/tilesets`. El tileset virtual `:/automap-tiles.tsx` de Tiled
se ignora. `Spikes.tsx` ya no es necesario.

Para trabajar con Tiled en caliente:

```bash
npm run tiled:sync
npm run tiled:watch
```

El contrato de capas esta en `Doc/TILED_WORKFLOW.md`.

Para arrancar el juego en segundo plano, usar siempre `scripts\start-dev.cmd`.
Deja logs en `tmp/vite-dev.out.log` y `tmp/vite-dev.err.log`, comprueba si el
puerto `5173` ya esta abierto y falla con el log visible si Vite no arranca.

## Controles actuales

- Flechas o WASD: mover en modo top-down.
- `Space`: interactuar con contenido de sala o NPC.
- `G`: guardar en `localStorage`.
- `L`: cargar desde `localStorage`.
- `I`: abrir/cerrar Items.
- `C`: abrir/cerrar Companeros.
- `J`: abrir/cerrar Diario.
- `Esc`: cerrar menu abierto.
- `F2`: alternar modo grafo debug.
- Boton `Items`: abrir/cerrar el menu con todos los items definidos.
- Boton `Comp.`: abrir/cerrar el menu de companeros.
- Boton `Diario`: abrir/cerrar el Diario del Pillador con rumores.
- Boton `R`: reiniciar la partida tras confirmacion.

## Fuentes de documentacion

Fuente de verdad principal:

- `H:/Codex/Game/Doc/02_PROJECT_BRIEF_CODEX.md`
- `H:/Codex/Game/Doc/01_GDD_EL_PILLADOR.md`
- `H:/Codex/Game/Doc/documentacion_mazmorra_rpg_completa.md`
- `H:/Codex/Game/Doc/piso1_conexiones_simple_actualizado.md`
- `H:/Codex/Game/Doc/piso2_conexiones_simple_actualizado.md`

Fuente visual auxiliar:

- `H:/Codex/Game/Doc/piso1_layout_completo_confirmado.drawio`
- `H:/Codex/Game/Doc/piso2_layout_completo_confirmado.drawio`

Regla de conflicto: el Markdown manda sobre los `.drawio`. Los `.drawio` se
usan para posicion, color y geometria visual, no como autoridad de progresion.
Las etiquetas obsoletas de escalera en `PZ-C4`, `DS-K1`, `PZ-L1` y `PZ-P2` no
deben cargarse como escaleras activas.

Revision local del `Doc`:

- Hay 14 escaleras activas y 4 escaleras eliminadas en los Markdown simples.
- Los `.drawio` locales ya no etiquetan como activas las 4 escaleras eliminadas.
- Hay 114 filas de conexion entre Piso 1 y Piso 2.
- Ninguna sala secreta `SS` aparece como origen de una conexion posterior.
- El GDD menciona `Santuario Final`, pero no hay grafo/layout confirmado para
  esa zona.
- La documentacion larga referencia `SR3`, `SR8`, `SR10` y `SR15` en Sabios,
  pero no hay archivo de conexiones/layout dedicado para el Piso Sabios. Hasta
  tenerlo, `Sabios 1..4` deben tratarse como destinos de escalera o nodos de
  contenido, no como un mapa interno inventado.

## Arquitectura

La logica de gameplay vive fuera de Phaser. Las escenas son adaptadores que
leen el estado, pintan el mundo y emiten acciones de input.

```text
src/
  game/
    simulation/
      state.ts
      systems/
      rules/
    content/
      encounters/
      items/
      maps/
    input/
      actions.ts
      bindings.ts
    assets/
      manifest.ts
  phaser/
    boot/
    scenes/
      BootScene.ts
      MenuScene.ts
      GameplayScene.ts
    view/
      sprites/
      fx/
      camera/
    adapters/
      sceneBridge.ts
  ui/
    hud/
    menus/
    overlays/

public/
  assets/
    game/
      sprites/
        characters/
          main-character/
          npcs/
        enemies/
      tiles/
      environment/
      ui/
      fx/
      audio/
      data/
```

Responsabilidades:

- `game/simulation`: fuente de verdad serializable para salas, inventario,
  rumores, flags, bloqueos, cronometro, companeros y progresion.
- `game/content`: datos versionados de pisos, zonas, salas, conexiones, items,
  NPCs, bosses, rumores y dependencias.
- `game/input`: acciones de juego y bindings fisicos.
- `game/assets`: manifiesto estable de assets; el codigo no debe depender de
  rutas sueltas.
- `public/assets/game`: ficheros servidos por Vite, ordenados por sprites,
  tiles, entorno, UI, FX, audio y datos. El personaje principal de prueba vive
  en `public/assets/game/sprites/characters/main-character`.
- `phaser/scenes`: arranque, preload, menu y escena jugable. No contienen reglas
  de progresion.
- `phaser/view`: sprites, efectos, camara y presentacion visual descartable.
- `phaser/adapters`: puente unico entre escena Phaser y simulacion.
- `ui`: HUD, menus, paneles narrativos, pausa, opciones y debug DOM.

## Modelo de datos previsto

Los datos de contenido deben declararse como TypeScript o JSON versionado, no
hardcodeados en escenas.

```ts
export type FloorId = "piso1" | "piso2" | "sabios";
export type ConnectionKind = "normal" | "bloqueo" | "secreto" | "escalera";

export interface RoomDefinition {
  id: string;
  floor: FloorId;
  zone: string;
  kind: "normal" | "secret" | "boss" | "special";
  layout?: { x: number; y: number; width: number; height: number };
  content?: string[];
}

export interface ConnectionDefinition {
  from: string;
  to: string;
  kind: ConnectionKind;
  gateId?: string;
}

export interface GateDefinition {
  id: string;
  requirement: string;
  connection: { from: string; to: string };
}

export interface SaveGame {
  version: 1;
  currentRoomId: string;
  inventory: string[];
  rumors: number[];
  flags: Record<string, boolean>;
  openGates: string[];
  companions: string[];
  timerState: {
    guilleCircuitOpen: boolean;
    guilleCircuitStatus: "idle" | "running" | "expired" | "completed";
    durationMs: number;
    remainingMs?: number;
    startedAt?: string;
    deadlineAt?: string;
    lastClosedAt?: string;
    reopenCount: number;
  };
}
```

## MVP: mazmorra navegable

El primer hito no exige combate completo. Ya permite:

- recorrer salas de Piso 1 y Piso 2 segun el grafo documentado;
- acceder a `Sabios 1..4` como destinos de escalera, sin inventar conexiones
  internas del Piso Sabios;
- usar conexiones normales y escaleras activas;
- impedir conexiones bloqueadas si falta el requisito;
- descubrir salas secretas solo con el rumor correspondiente;
- mantener las salas `SS` como terminales;
- guardar y cargar sala actual, inventario, rumores, flags, bloqueos abiertos y
  estado del cronometro;
- mostrar un HUD DOM minimo con sala, zona, piso, items/rumores y acciones.

## Progresion implementada

M2 permite interactuar con salas y NPCs para obtener items, rumores y flags de
progreso. Los rumores tienen diario rico (`rumor_01..rumor_16`) con
compatibilidad numerica de guardado, y los secretos se abren con la regla
`Rumor + flag` cuando tienen puzzle o minijuego pendiente. Los bloqueos
`B2..B11` usan requisitos de inventario/rumores/flags y se marcan como abiertos
al cruzarlos. El HUD muestra contenido disponible, contenido completado,
requisitos pendientes, menu de items y Diario del Pillador.

Casos cubiertos:

- `NPC1` en `SR4`: Lupa.
- `SABIOS-2`: Bombas + Rumor 1.
- Rumores `1..16` definidos: `1..15` desbloquean `SS1..SS15` y Rumor 16 desbloquea `CP-G1`.
- Rumor 3 lo da Mireia/NPC3 en `SR18`; NPC4 en `SR16` da Rumor 4; NPC6 en `SR19` solo entrega `Pista Loteria 2`.
- Rumor 7 se descubre con la Lupa en `PZ-C3`.
- Rumor 13 se descubre inspeccionando el `Reloj` con la Lupa y abre `SS13` usando la Lupa en `SR18`.
- `B1` es el muro agrietado entre `SR2` y `SS1`; se abre rompiendolo con Bombas.
- Secretos con recompensas como Interruptor Azul, Codigo numerico,
  interruptores sellados, ingredientes y Fragmentos de Trifuerza.
- `SS14` entrega `Cebo especial`, Rumor 16 y abre `CP-G1`; `CP-G1` usa ese cebo para invocar una bestia legendaria que entrega `Ingrediente legendario 4`.
- `B11` es el precio de 1M de monedas para comprar `Ingrediente legendario 5` en `SR18`; el flag se marca al resolver `BOSS-Mascle`.
- `B10` queda documentado como pendiente en `PZ-E3`, sin sala ni recompensa todavia.
- NPCs con requisito: NPC2, NPC4, NPC5, NPC6 y NPC7.
- Contenido de Sabios modelado como nodos `SABIOS-1..4` hasta tener mapa
  interno dedicado.

## Cronometro de Guille implementado

M3 activa un estado serializable del circuito de Correr. Al entrar en una sala
cronometrada de `Correr`, el circuito se inicia con una duracion de 180
segundos. Si el tiempo se agota, el jugador vuelve a `PZ-R2` y se cierran los
accesos de entrada/salida de la zona cronometrada, incluidas puertas y escaleras.
La ruta segura `DS-C2 <-> DS-M1` desde Cocina a Magia Oscura permanece abierta.

`SS13` contiene el Giratiempo como interactuable fijo. No se obtiene como item:
activarlo en esa sala reabre y reinicia el circuito. El HUD muestra el estado
del circuito y las pruebas cubren expiracion, expulsion, reapertura y rutas
anti-softlock.

## Exploracion top-down implementada

M3.5 convierte la mazmorra en una experiencia sala a sala. El juego arranca en
modo top-down con movimiento libre, puertas generadas desde el grafo, cofres/NPCs
placeholder y `Space` para interactuar cerca. El modo grafo se mantiene como
debug con `F2` o `?view=graph`.

Los menus DOM pausan el movimiento mientras estan abiertos. Items y Diario usan
los datos de progresion existentes; Companeros muestra Choco, Trufa,
TostaRica1 y TostaRica2 como fichas placeholder desbloqueadas por inventario.
El jugador empieza con `Reloj`, que habilita la hora en la UI superior derecha.
El menu de Items permite equipar `Espada` como arma libre y herramientas como
`Lupa` o `Varita` en la ranura de accion; el boton `Usar` ejecuta el item activo.

## Criterios de aceptacion iniciales

- El grafo no referencia salas inexistentes.
- Las salas secretas `SS` y `CP-G1` no tienen salidas normales posteriores.
- Las escaleras eliminadas no aparecen activas.
- Hay acceso seguro a Magia Oscura desde Cocina.
- El circuito cronometrado de Correr no puede cerrarse permanentemente.
- `SS13` permite reabrir o reiniciar el circuito cronometrado.
- `Sabios 1..4` existen como destinos, pero sus salas internas quedan pendientes
  de documentacion especifica.
- `npm run build` pasa.
- El guardado se recupera desde `localStorage` con la clave
  `el-pillador.save.v1`.

## Agentes

No hace falta crear agentes para esta fase documental. Cuando exista el MVP
jugable, conviene usar:

- un agente de validacion de grafo/progresion para detectar softlocks;
- un agente de playtest visual para revisar navegador, HUD, camara y flujo.
