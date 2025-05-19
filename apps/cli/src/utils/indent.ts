export function indent(line: string, indentation: number, char = " ") {
  const indent = char.repeat(indentation);

  return line
    .split("\n")
    .map((value) => indent + value)
    .join("\n");
}
