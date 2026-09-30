import { matchStudent } from './mentees.js';

const IZAWA = 'M. R. M. Izawa';

function studentMarker(mentee) {
  if (!mentee) return null;
  // Only formal students (supervisor/co-supervisor relationship) get a marker.
  // People with relationship === "mentee" are tracked for records but not flagged
  // in citations, since Izawa was not their formal advisor.
  if (mentee.relationship !== 'student') return null;
  if (mentee.status === 'in_progress') return '†';
  if (mentee.status === 'completed')   return '‡';
  return null;
}

export function formatCitation(entry, mentees) {
  const runs = [];

  // Authors (comma-separated, no "and" before last)
  entry.authors.forEach((author, i) => {
    if (author === IZAWA) {
      runs.push({ text: author, bold: true });
    } else {
      runs.push({ text: author });
    }
    const marker = studentMarker(matchStudent(author, mentees));
    if (marker) runs.push({ text: marker, superscript: true });
    if (i < entry.authors.length - 1) runs.push({ text: ', ' });
  });

  // ", year. title. "
  runs.push({ text: `, ${entry.year}. ${entry.title}. ` });

  // Venue — journal name (paper) or venue string (conference) — italicized
  const venueText = entry.journal ?? entry.venue ?? '';
  if (venueText) runs.push({ text: venueText, italic: true });

  // DOI preferred, else URL, else nothing
  if (entry.doi) {
    runs.push({ text: `. doi:${entry.doi}` });
  } else if (entry.url) {
    runs.push({ text: `. ${entry.url}` });
  } else {
    runs.push({ text: '.' });
  }

  return { runs };
}

export function renderRunsAsMarkdown(runs) {
  return runs.map(r => {
    if (r.bold)   return `**${r.text}**`;
    if (r.italic) return `*${r.text}*`;
    return r.text;
  }).join('');
}
