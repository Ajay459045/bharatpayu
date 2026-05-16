import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function readEnvValue(name: string) {
  const configured = process.env[name];
  if (configured !== undefined) return configured;

  for (const file of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (!existsSync(file)) continue;

    const line = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${name}=`));

    if (!line) continue;

    return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
  }

  return undefined;
}

export function isBullMqDisabled() {
  return readEnvValue("DISABLE_BULLMQ") === "true";
}

