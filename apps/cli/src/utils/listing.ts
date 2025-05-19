import { gray } from "ansis";

export function listing(data: Record<string, unknown>) {
  const max = Math.max(...Object.keys(data).map((key) => key.length));

  return Object.entries(data)
    .map(([key, value]) => {
      const paddedKey = key.padEnd(max + 2, " ");
      return `${gray(paddedKey)}${value}`;
    })
    .join("\n");
}
