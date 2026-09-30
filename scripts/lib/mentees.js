export function matchStudent(authorString, mentees) {
  for (const m of mentees) {
    if (m.canonicalName === authorString) return m;
    if (Array.isArray(m.aliases) && m.aliases.includes(authorString)) return m;
  }
  return null;
}
