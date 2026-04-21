import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
} from 'docx';
import { formatCitation } from './citation.js';

const AUDIENCE_LABEL = {
  academic: 'Academic',
  industry: 'Industry',
  all: 'Complete',
};

function runsToTextRuns(runs) {
  return runs.map(r => new TextRun({
    text: r.text,
    bold: !!r.bold,
    italics: !!r.italic,
    superScript: !!r.superscript,
  }));
}

// Numbering is rendered as a literal text prefix ("1. ", "2. ", ...) so it
// restarts per year without the complexity of dynamic docx numbering refs.
function yearParagraphs(year, entries, mentees) {
  const out = [
    new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(String(year))] }),
  ];
  entries.forEach((entry, i) => {
    const { runs } = formatCitation(entry, mentees);
    const prefix = new TextRun(`${i + 1}. `);
    out.push(new Paragraph({
      spacing: { after: 160 }, // ~8 pt after each citation so entries breathe
      children: [prefix, ...runsToTextRuns(runs)],
    }));
  });
  return out;
}

function sectionParagraphs(heading, yearGroups, mentees) {
  const out = [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(heading)] }),
  ];
  if (yearGroups.length === 0) {
    out.push(new Paragraph({ children: [new TextRun({ text: '(none)', italics: true })] }));
    return out;
  }
  for (const g of yearGroups) out.push(...yearParagraphs(g.year, g.entries, mentees));
  return out;
}

export async function renderDocx(sections) {
  const label = AUDIENCE_LABEL[sections.audience] ?? sections.audience;

  const children = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`Publication List — ${label}`)] }),
    new Paragraph({ children: [new TextRun({
      text: `Generated: ${sections.generatedOn} from https://github.com/MatthewIzawa/bio`,
      italics: true,
    })] }),
    ...sectionParagraphs('Peer-Reviewed Publications', sections.publications, sections.mentees),
    ...sectionParagraphs('Conference Presentations',   sections.conferences,  sections.mentees),
  ];

  if (sections.hasStudents) {
    children.push(new Paragraph({ children: [new TextRun('')] }));
    children.push(new Paragraph({ children: [new TextRun('† Current graduate/MSc student mentee. ‡ Former graduate/MSc student mentee.')] }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
