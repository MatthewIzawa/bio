import { formatCitation, renderRunsAsMarkdown } from './citation.js';

const AUDIENCE_LABEL = {
  academic: 'Academic',
  industry: 'Industry',
  all: 'Complete',
};

function renderYearBlock(year, entries, mentees) {
  const lines = [`### ${year}`];
  entries.forEach((entry, i) => {
    const { runs } = formatCitation(entry, mentees);
    lines.push(`${i + 1}. ${renderRunsAsMarkdown(runs)}`);
  });
  return lines.join('\n\n');
}

function renderSection(heading, yearGroups, mentees) {
  if (yearGroups.length === 0) return `## ${heading}\n\n_(none)_\n`;
  const parts = [`## ${heading}`];
  for (const g of yearGroups) parts.push(renderYearBlock(g.year, g.entries, mentees));
  return parts.join('\n\n') + '\n';
}

export function renderMarkdown(sections) {
  const label = AUDIENCE_LABEL[sections.audience] ?? sections.audience;
  const header = [
    `# Publication List — ${label}`,
    `Generated: ${sections.generatedOn} from https://github.com/MatthewIzawa/bio`,
  ].join('\n');

  const pubs  = renderSection('Peer-Reviewed Publications', sections.publications, sections.mentees);
  const confs = renderSection('Conference Presentations',   sections.conferences,  sections.mentees);

  const parts = [header, pubs, confs];
  if (sections.hasStudents) {
    parts.push('---\n† Current graduate/MSc student mentee. ‡ Former graduate/MSc student mentee.\n');
  }
  return parts.join('\n\n');
}
