// Excel saves "CSV UTF-8" as UTF-8, but plain "CSV" in the Windows code page,
// which for Croatian is windows-1250. Try UTF-8 strictly first.
export const readTextFile = async (file: Blob): Promise<string> => {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1250").decode(bytes);
  }
};
