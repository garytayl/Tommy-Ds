/**
 * Crew display name: derived from members (e.g. "Joe & Michael") when available,
 * otherwise fallback to the stored crew name.
 */

export type CrewMemberWithProfile = {
  user_id: string;
  profiles?:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

export type CrewForDisplay = {
  name: string;
  crew_members?: CrewMemberWithProfile[] | null | unknown;
};

function getMemberName(m: CrewMemberWithProfile): string {
  const p = m.profiles;
  const fullName = Array.isArray(p) ? (p[0] as { full_name?: string | null })?.full_name : (p as { full_name?: string | null } | null)?.full_name;
  return fullName?.trim() || m.user_id;
}

/**
 * Returns a display name for the crew:
 * - If the crew has members with names: "Name1 & Name2" or "Name1, Name2 and Name3"
 * - Otherwise: the crew's stored name
 */
export function getCrewDisplayName(crew: CrewForDisplay): string {
  const raw = crew.crew_members;
  const list = Array.isArray(raw) ? (raw as CrewMemberWithProfile[]) : [];
  const names = list.map(getMemberName).filter(Boolean);
  if (names.length === 0) return crew.name?.trim() || "Unnamed crew";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  const last = names[names.length - 1];
  const rest = names.slice(0, -1);
  return `${rest.join(", ")} and ${last}`;
}
