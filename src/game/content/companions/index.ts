export type CompanionDefinition = {
  id: string;
  itemName: string;
  name: string;
  role: string;
  ability: string;
  stats: {
    vida: number;
    fuerza: number;
    magia: number;
    velocidad: number;
  };
};

export const companionDefinitions: CompanionDefinition[] = [
  companion("trufa", "Trufa", "Trufa", "criatura mitologica", "Rastro mitologico", 2, 2, 4, 2),
  companion("tostarica1", "TostaRica1", "TostaRica1", "apoyo defensivo", "Miga protectora", 3, 2, 2, 2),
  companion("tostarica2", "TostaRica2", "TostaRica2", "apoyo rapido", "Crujido doble", 2, 3, 1, 3),
  companion("choco", "Choco", "Choco", "rescate", "Pulso de resurreccion", 4, 1, 4, 2),
];

function companion(
  id: string,
  itemName: string,
  name: string,
  role: string,
  ability: string,
  vida: number,
  fuerza: number,
  magia: number,
  velocidad: number,
): CompanionDefinition {
  return {
    id,
    itemName,
    name,
    role,
    ability,
    stats: { vida, fuerza, magia, velocidad },
  };
}
