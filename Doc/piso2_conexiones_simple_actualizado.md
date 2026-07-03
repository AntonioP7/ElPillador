# Piso 2 — conexiones simples actualizadas

Leyenda: `normal`, `bloqueo`, `secreto`, `escalera`.

Nota de layout y topologia: `SR16` y `PZ-L1` tienen sus posiciones visuales
intercambiadas en el layout confirmado. `SR16` conserva NPC4 y la escalera a
Sabios 2; `PZ-L1` conserva su estado de escalera eliminada y ahora aloja el
acceso secreto a `SS15`.

## Escaleras activas

| Sala | Destino |
|---|---|
| `DS-M1` | Piso 1 / Cocina |
| `MG-M1` | Piso 1 / Correr |
| `SR6` | Sabios 1 |
| `MG-L1` | Piso 1 / Grecia |
| `SR16` | Sabios 2 |
| `PZ-P1` | Piso 1 / Grecia |
| `SR13` | Sabios 3 |
| `PZ-Y1` | Piso 1 / Correr |
| `SR19` | Sabios 4 |

## Escaleras eliminadas

| Sala | Destino eliminado |
|---|---|
| `PZ-L1` | Piso 1 / Cocina |
| `PZ-P2` | Piso 1 / Catacumbas |

## Magia Oscura

| Sala | Conecta con | Tipo |
|---|---|---|
| `SR6` | `PZ-M2` | normal |
| `SR6` | `PZ-M1` | normal |
| `SR6` | `PZ-M4` | bloqueo |
| `SR6` | Sabios 1 | escalera |
| `PZ-M1` | `DS-M1` | normal |
| `DS-M1` | Piso 1 / Cocina | escalera |
| `PZ-M2` | `MG-M1` | normal |
| `MG-M1` | Piso 1 / Correr tras resolver puzzle MG-M1 | escalera |
| `PZ-M4` | `DS-M2` | normal |
| `DS-M2` | `SS3` | secreto |
| `PZ-M4` | `SR11` | normal |
| `PZ-M4` | `PZ-M3` | normal |
| `PZ-M3` | `BOSS-Antonio` | normal |
| `BOSS-Antonio` | `SS14` | secreto |

## Lotería

| Sala | Conecta con | Tipo |
|---|---|---|
| `MG-L1` | `DS-L1` | normal |
| `MG-L1` | Piso 1 / Grecia | escalera |
| `DS-L1` | `PZ-L2` | normal |
| `PZ-L2` | `PZ-L3` | normal |
| `PZ-L3` | `SR16` | normal |
| `PZ-L2` | `BOSS-Mascle` | bloqueo |
| `BOSS-Mascle` | `PZ-L4` | normal |
| `PZ-L1` | `PZ-L4` | normal |
| `SR16` | Sabios 2 | escalera |
| `PZ-L1` | `SS15` | secreto |
| `PZ-L4` | `DS-L2` | normal |
| `DS-L2` | `SS4` | secreto |
| `DS-L2` | `SR5` | normal |

## Panadería

| Sala | Conecta con | Tipo |
|---|---|---|
| `DS-P1` | `PZ-P1` | normal |
| `PZ-P1` | Piso 1 / Grecia | escalera |
| `PZ-P1` | `PZ-P2` | normal |
| `PZ-P2` | `MG-P1` | normal |
| `MG-P1` | `SR7` | bloqueo |
| `SR7` | `PZ-P3` | normal |
| `PZ-P3` | `PZ-P4` | normal |
| `PZ-P4` | `DS-P2` | normal |
| `DS-P2` | `BOSS-Xavi` | normal |
| `DS-P2` | `SS5` | secreto |
| `DS-P2` | `SR13` | normal |
| `SR13` | Sabios 3 | escalera |

## Gym

| Sala | Conecta con | Tipo |
|---|---|---|
| `MG-Y1` | `DS-Y1` | normal |
| `DS-Y1` | `PZ-Y2` | normal |
| `PZ-Y2` | `PZ-Y1` | normal |
| `PZ-Y1` | Piso 1 / Correr | escalera |
| `PZ-Y1` | `SR12` | bloqueo |
| `SR12` | `PZ-Y3` | normal |
| `PZ-Y3` | `SS6` | secreto |
| `PZ-Y3` | `DS-Y2` | normal |
| `DS-Y2` | `BOSS-Enric` | normal |
| `DS-Y2` | `PZ-Y4` | normal |
| `PZ-Y4` | `SR19` | normal |
| `SR19` | Sabios 4 | escalera |
