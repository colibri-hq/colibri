export function hyperlink(target: URL, label?: string) {
  label ??= target.hostname + target.pathname;

  return `\u001B]8;;${target}\u0007${label}\u001B]8;;\u0007`;
}

type ImageDimension = "auto" | `${number}%` | `${number}px` | number;
type ImageOptions = {
  download?: boolean;
  filename?: string;
  height?: ImageDimension;
  preserveAspectRatio?: boolean;
  width?: ImageDimension;
};

export async function image(
  image: Blob | File,
  {
    download = false,
    filename,
    height = "auto",
    preserveAspectRatio = true,
    width = "auto",
  }: ImageOptions = {},
) {
  const parameters = Object.entries({
    height: height === "auto" ? "auto" : `${height}`,
    inline: download ? "0" : "1",
    name: Buffer.from(filename ?? (image instanceof File ? image.name : "Unnamed Image")).toString(
      "base64",
    ),
    preserveAspectRatio: preserveAspectRatio ? "1" : "0",
    size: image.size,
    width: width === "auto" ? "auto" : `${width}`,
  })
    .map(([key, value]) => `${key}=${value}`)
    .join(";");

  const base64Image = Buffer.from(await image.bytes()).toString("base64");

  return `\u001B]1337;File=${parameters}:${base64Image}\u0007`;
}
