export function log(
  channel: string,
  level: "error",
  error: Error,
  context?: Record<string, unknown>,
);
export function log(
  channel: string,
  level: string,
  message: string,
  context?: Record<string, unknown>,
);
export function log(
  channel: string,
  level: "error" | string,
  message: string | Error,
  context?: Record<string, unknown>,
) {
  const time = new Date().toLocaleTimeString();
  const prefix = `\x1b[2m${time}\x1b[0m \x1b[36;1m[${channel}]\x1b[0m `;

  if (level === "error") {
    let line: string;

    if (message instanceof Error) {
      const indent = " ".repeat(prefix.length / 2);
      line =
        `${prefix}\x1b[31m${message}\x1b[0m\n\x1b[2m` +
        (message.stack
          ? message.stack
              .split("\n")
              .slice(1)
              .map((l) => `${indent}${l}`)
              .join("\n")
          : message) +
        "\x1b[0m";
    } else {
      line = `${prefix}\x1b[31m${message}\x1b[0m`;
    }

    console.error(line, context ?? "");
  } else {
    console.debug(`${prefix}${message}`, context ?? "");
  }
}
