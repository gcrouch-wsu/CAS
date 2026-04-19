export type CasProfile = "gradcas" | "engineeringcas";

export function inferCasProfile(input: {
  programId?: string;
  sourceProfile?: string;
  sourceFileName?: string;
}): CasProfile {
  const explicit = input.sourceProfile?.trim().toLowerCase();
  if (explicit === "gradcas" || explicit === "engineeringcas") return explicit;

  const programId = input.programId?.trim() ?? "";
  if (programId.startsWith("557")) return "engineeringcas";
  if (programId.startsWith("547")) return "gradcas";

  const source = input.sourceFileName?.toLowerCase() ?? "";
  if (source.includes("engineeringcas") || source.includes("engcas")) return "engineeringcas";
  if (source.includes("gradcas")) return "gradcas";

  return "gradcas";
}
