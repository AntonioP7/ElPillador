# Flujo Tiled: Mazmorra.world

Este documento define como usamos los mapas de Tiled dentro de El Pillador.

## Fuente de verdad visual

La fuente editable esta en:

```txt
H:\Tiled\ElPillador\Mazmorra.world
```

El `.world` lista las salas de la mazmorra. Cada sala debe tener como nombre de archivo el `roomId` logico del juego:

```txt
PZ-E1.tmx -> PZ-E1
SR2.tmx -> SR2
SS1.tmx -> SS1
```

Las reglas de gameplay no viven en Tiled. Tiled define geometria, capas visuales, puertas, colisiones, peligros y puntos de interaccion. La simulacion del juego decide si una puerta se puede cruzar, si un bloqueo esta abierto, que recompensa se da o si un rumor esta descubierto.

## Sincronizacion

Comando manual:

```bash
npm run tiled:sync
```

Modo vigilancia mientras Tiled esta abierto:

```bash
npm run tiled:watch
```

Tambien se sincroniza automaticamente antes de:

```bash
scripts\game.cmd dev
scripts\game.cmd test
scripts\game.cmd build
```

El sincronizador lee `Mazmorra.world`, convierte/copìa las salas referenciadas y genera:

```txt
public/assets/game/data/tiled/Mazmorra.world.json
public/assets/game/data/tiled/rooms/<roomId>.json
src/game/content/tiledRooms/worldManifest.generated.ts
```

`worldManifest.generated.ts` es generado. No se edita a mano.

## Contenido logico fuera de Tiled

El gameplay de cada sala se define en TypeScript, no en Tiled:

```txt
src/game/content/rooms/
```

La estructura principal es `RoomContentDefinition`. Cada entrada usa el mismo `roomId` que el world y el grafo:

```ts
{
  id: "PZ-E1",
  name: "Entrada de la Mazmorra",
  floor: "piso1",
  zone: "Entrada",
  type: "normal",
  enemies: [],
  npcs: [],
  items: [],
  objects: [],
  triggers: [],
  puzzles: [],
  locks: [],
  rewards: [],
  flags: [],
  entryConditions: [],
  exitConditions: [],
  onEnter: [],
  onExit: [],
}
```

El selector `getRoomRuntimeDefinition(roomId)` combina:

- mapa fisico de `Mazmorra.world`;
- grafo/documentacion de `content/maps`;
- contenido logico de `content/rooms`;
- adaptadores actuales de recompensas y NPCs.

Si una sala todavia no existe en `Mazmorra.world`, el runtime la marca como `usesFallbackView=true` para que siga funcionando con la vista provisional hasta que tenga mapa Tiled.

Regla importante: Tiled puede poner la posicion fisica de una puerta, colision o marcador, pero no decide recompensas, rumores, puzzles, NPCs, enemigos ni condiciones. Esas reglas viven en `RoomContentDefinition` y en los sistemas de `simulation`.

## Capas actuales

### Tile layers visuales

Estas capas se renderizan en Phaser en orden visual:

| Capa | Uso |
| --- | --- |
| `Floor` | Suelo base transitable. |
| `Walls` | Muros y limites visuales principales. |
| `FloorDark` | Variantes oscuras/decorativas de suelo. |
| `Objects` | Decoracion, trampas pintadas y objetos visuales. |
| `Doors` | Tiles visuales de puertas. |

Las capas visuales no deciden reglas por si solas. Por ejemplo, una puerta pintada en `Doors` necesita un objeto en la capa `Doors` para tener zona de salida.

### Object layers jugables

| Capa | Uso en runtime |
| --- | --- |
| `Collision` | Rectangulos o poligonos con propiedad `IsWall=true`. Bloquean jugador, enemigos, proyectiles y knockback. |
| `Doors` | Zonas rectangulares de salida. Pueden tener `direction`, `targetRoom`, `targetSpawn` e `IsLocked`. Si falta `direction`, se infiere por su posicion en el borde. |
| `Hazards` | Peligros de sala. Por ahora se soporta `type=SpikeTrap`. |
| `Chest` | Cofres/recompensas. Pueden tener `chestId` e `item`. |
| `Interact` | Zonas de interaccion/NPC/dialogo. Pueden tener `type` y `dialogueId`. |

## Propiedades soportadas

### Collision

```txt
IsWall: bool = true
```

Solo los objetos con `IsWall=true` se convierten en colision.

### Doors

```txt
direction: string = up | down | left | right
targetRoom: string opcional
targetSpawn: string opcional
IsLocked: bool opcional = false
```

Si `targetRoom` no existe, el world/grafo de juego siguen siendo la fuente de destino. Esto permite que Tiled ponga la zona fisica y la simulacion conserve bloqueos, secretos y cronometros.

`IsLocked=true` marca una puerta como cerrable por reglas de gameplay. Mientras la conexion logica este cerrada, esa puerta se anade a colision y el jugador no puede cruzarla. Cuando la simulacion abre la conexion, deja de ser colisionable y funciona como salida.

Para puertas secretas, usa tambien `IsLocked=true`: asi la puerta se comporta como pared hasta descubrir/abrir el secreto y el jugador no ve una salida transitable antes de tiempo.

### Hazards

Para pinchos:

```txt
type: SpikeTrap
damage: int opcional
damageCooldown: int opcional
cycleMs: int opcional
activeFromMs: int opcional
activeToMs: int opcional
```

### Chest

```txt
chestId: string opcional
item: string opcional
```

Si una sala necesita recompensa especial, la simulacion puede mapear `chestId` a reglas propias.

### Interact

```txt
type: string opcional
dialogueId: string opcional
```

## Capas futuras

Cuando anadamos capas nuevas, seguiremos esta regla:

1. Si es visual, sera una tile layer y solo la renderiza Phaser.
2. Si afecta al juego, sera una object layer con propiedades documentadas aqui.
3. Si desbloquea contenido, da items, consume rumores o cambia progresion, la regla vive en `simulation` o `content`, no en Phaser.

Capas previstas:

| Capa futura | Intencion |
| --- | --- |
| `Enemies` | Spawns de enemigos por sala, con `enemyId`, `species`, `spawnMode`. |
| `Breakables` | Muros quebrados, vasijas y objetos destructibles. |
| `Stairs` | Escaleras fisicas si necesitamos posicionarlas visualmente desde Tiled. |
| `Secrets` | Zonas o puertas secretas visuales. La apertura seguira en simulacion. |
| `Camera` | Zonas especiales de camara si alguna sala deja de ser fija. |
| `Spawn` | Puntos de aparicion con nombre, por ejemplo `fromLeft`, `fromStairsA`. |

## Convenciones

- Las salas deben ser de `384 x 384` por ahora, salvo que acordemos cambiar el tamano base.
- El tile base actual es `16 x 16`.
- Los nombres de capa son sensibles para el parser: usa exactamente los nombres documentados.
- Evita duplicar una sala con el mismo `roomId` en el `.world`.
- Los assets de tilesets se normalizan hacia `public/assets/game/tilesets`.
- Los cambios en Tiled deben guardarse antes de que `tiled:watch` pueda sincronizarlos.
