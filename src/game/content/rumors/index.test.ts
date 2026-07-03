import { describe, expect, it } from "vitest";
import { buildRumorJournal, rumorDefinitions } from ".";
import { createInitialGameState } from "../../simulation/state";

describe("rumor definitions", () => {
  it("covers the full Pillador diary from Rumor 1 to Rumor 16", () => {
    expect(rumorDefinitions.map((rumor) => rumor.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it("maps standard rumors to their matching secret room and Rumor 16 to CP-G1", () => {
    for (const rumor of rumorDefinitions.filter((entry) => entry.id <= 15)) {
      expect(rumor.unlocksRoomId).toBe(`SS${rumor.id}`);
    }

    expect(rumorDefinitions.find((rumor) => rumor.id === 16)?.unlocksRoomId).toBe("CP-G1");
  });

  it("builds a rich journal while keeping numeric compatibility", () => {
    const journal = buildRumorJournal({
      ...createInitialGameState(),
      rumors: [3, 13],
      usedRumors: [3],
    });
    const rumor3 = journal.find((rumor) => rumor.id === 3);
    const rumor13 = journal.find((rumor) => rumor.key === "rumor_13");

    expect(journal.map((rumor) => rumor.key)).toEqual([
      "rumor_01",
      "rumor_02",
      "rumor_03",
      "rumor_04",
      "rumor_05",
      "rumor_06",
      "rumor_07",
      "rumor_08",
      "rumor_09",
      "rumor_10",
      "rumor_11",
      "rumor_12",
      "rumor_13",
      "rumor_14",
      "rumor_15",
      "rumor_16",
    ]);
    expect(rumor3).toMatchObject({
      title: "Rumor 3",
      sourceRoomId: "SR18",
      targetRoomId: "SS3",
      discovered: true,
      used: true,
    });
    expect(rumor13).toMatchObject({
      discovered: true,
      sourceRoomId: "Reloj",
      targetRoomId: "SS13",
    });
  });
});
