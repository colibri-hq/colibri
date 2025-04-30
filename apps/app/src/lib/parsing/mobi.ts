export async function isMobiFile(file: File) {
  const buffer = await file.slice(60, 68).arrayBuffer();
  const fingerprint = new TextDecoder().decode(buffer);

  return fingerprint === "BOOKMOBI";
}
