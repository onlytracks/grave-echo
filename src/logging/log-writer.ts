import { mkdirSync, writeFileSync } from "fs";
import type { TaggedMessage } from "../ecs/systems/messages.ts";

export interface RunMeta {
  turns: number;
  kills: number;
  result: "death" | "quit";
}

export function writeRunLog(
  messages: readonly TaggedMessage[],
  meta: RunMeta,
): void {
  mkdirSync("logs", { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const filename = `logs/${timestamp}.log`;

  const header = [
    `=== Grave Echo Run Log ===`,
    `Date: ${now.toISOString()}`,
    `Turns: ${meta.turns}`,
    `Kills: ${meta.kills}`,
    `Result: ${meta.result}`,
    `===========================`,
    ``,
  ].join("\n");

  const lines = messages.map((m) => {
    const prefix = m.category === "debug" ? "[DBG]" : "[GAM]";
    const turn = m.turn > 0 ? `T${String(m.turn).padStart(4)}` : "T   0";
    return `${turn} ${prefix} ${m.text}`;
  });

  writeFileSync(filename, header + lines.join("\n") + "\n");
}
