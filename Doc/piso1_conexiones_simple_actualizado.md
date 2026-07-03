# Piso 1 — conexiones simples actualizadas

Leyenda: `normal`, `bloqueo`, `secreto`, `escalera`.

## Escaleras activas

| Sala | Destino |
|---|---|
| `DS-C2` | Piso 2 / Magia Oscura |
| `SR4` | Piso 2 / Lotería |
| `DS-G1` | Piso 2 / Panadería |
| `DS-R1` | Piso 2 / Magia Oscura |
| `PZ-R4` | Piso 2 / Gym |

## Escaleras eliminadas

| Sala | Destino eliminado |
|---|---|
| `PZ-C4` | Piso 2 / Lotería |
| `DS-K1` | Piso 2 / Panadería |

## Entrada

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-E1` | `PZ-E2` | normal |
| `PZ-E1` | `PZ-E3` | normal |
| `PZ-E1` | `PZ-E4` | normal |
| `PZ-E1` | `DS-E1` | normal |
| `PZ-E2` | `SR18` | normal |
| `PZ-E2` | `PZ-R1` | normal |
| `SR18` | `SS13` | bloqueo |
| `PZ-E3` | `SR2` | normal |
| `SR2` | `SS1` | bloqueo |
| `PZ-E4` | `DS-E2` | normal |
| `DS-E2` | `PZ-C1` | normal |
| `DS-E2` | `PZ-G1` | normal |

## Cocina

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-C1` | `SR1` | normal |
| `PZ-C1` | `DS-C1` | normal |
| `DS-C1` | `MG-C1` | normal |
| `DS-C1` | `SR20` | bloqueo |
| `SR20` | `SS2` | secreto |
| `MG-C1` | `BOSS-Tuto` | normal |
| `MG-C1` | `PZ-C2` | normal |
| `PZ-C2` | `PZ-C3` | normal |
| `PZ-C3` | `DS-C2` | normal |
| `PZ-C3` | `SS9` | secreto |
| `DS-C2` | Piso 2 / Magia Oscura | escalera |

## Grecia

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-G1` | `CP-G1` | secreto |
| `PZ-G1` | `PZ-G2` | normal |
| `PZ-G2` | `SS12` | secreto |
| `PZ-G2` | `DS-G1` | normal |
| `PZ-G2` | `SR9` | normal |
| `DS-G1` | `MG-G1` | normal |
| `DS-G1` | `PZ-G3` | bloqueo |
| `DS-G1` | Piso 2 / Panadería | escalera |
| `PZ-G3` | `PZ-G4` | normal |
| `PZ-G4` | `DS-G2` | normal |
| `DS-G2` | `BOSS-Pintor` | normal |
| `MG-G1` | `SR9` | normal |
| `MG-G1` | `SR4` | normal |
| `SR4` | `SS7` | secreto |
| `SR4` | Piso 2 / Lotería | escalera |

## Correr

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-R1` | `PZ-R2` | normal |
| `PZ-R2` | `PZ-K1` | normal |
| `PZ-R2` | `PZ-R3` | normal |
| `PZ-R2` | `MG-R1` | normal |
| `MG-R1` | `DS-R1` | normal |
| `DS-R1` | Piso 2 / Magia Oscura | escalera |
| `MG-R1` | `SR17` | bloqueo |
| `SR17` | `SR21` | normal |
| `PZ-R3` | `PZ-R4` | normal |
| `PZ-R4` | Piso 2 / Gym | escalera |
| `PZ-R4` | `MG-R2` | normal |
| `MG-R2` | `DS-R3` | normal |
| `DS-R3` | `DS-R2` | normal |
| `DS-R2` | `BOSS-Guille` | normal |
| `DS-R3` | `SS8` | secreto |
| `DS-R2` | `SS10` | secreto |

## Catacumbas

| Sala | Conecta con | Tipo |
|---|---|---|
| `PZ-K1` | `PZ-K2` | normal |
| `PZ-K2` | `SR14` | normal |
| `SR14` | `MG-K1` | normal |
| `MG-K1` | `DS-K1` | normal |
| `DS-K1` | `PZ-K3` | bloqueo |
| `PZ-K3` | `PZ-K4` | normal |
| `PZ-K4` | `DS-K2` | normal |
| `DS-K2` | `BOSS-Carlos` | normal |
| `DS-K2` | `SS11` | secreto |
