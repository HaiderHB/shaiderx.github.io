// A real .docx with tracked changes, written by hand (no dependency): WordprocessingML parts
// zipped with a tiny STORE-only zip writer. Pending changes become <w:del>/<w:ins> revisions
// with the playbook reason as a Word comment, so Word's Review tab can accept or reject them;
// changes already accepted or rejected on the page are written as plain text.

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// --- zip (STORE, no compression) -------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Zips [{ name, text }] with no compression; returns the archive bytes. */
export function zipStore(files, when = new Date()) {
  const encoder = new TextEncoder();
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.text);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, time, true);
    entry.setUint16(14, date, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);

    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const bytes = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of all) {
    bytes.set(part, at);
    at += part.length;
  }
  return bytes;
}

// --- WordprocessingML ----------------------------------------------------------------------

const escapeXml = value =>
  String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const run = (text, props = '') =>
  text ? `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>` : '';

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/**
 * Builds the .docx.
 * contract: { title, parties, clauses: [{ n, heading, text }] }
 * edits: anchored edits [{ id, anchor: { clause, start, end, original }, insert, state, rule, why }]
 * comment(edit): the comment text for a pending change (or null for none)
 */
export function buildDocx({ contract, edits, comment, author = 'Redline assistant', date = new Date() }) {
  const stamp = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const revision = `w:author="${escapeXml(author)}" w:date="${stamp}"`;
  let revisionId = 100;
  const comments = [];

  function clauseBody(clause) {
    const changes = edits
      .filter(edit => edit.anchor.clause === clause.n)
      .sort((a, b) => a.anchor.start - b.anchor.start);
    let cursor = 0;
    let xml = '';
    for (const edit of changes) {
      const { start, end } = edit.anchor;
      xml += run(clause.text.slice(cursor, start));
      const original = clause.text.slice(start, end);
      if (edit.state === 'accepted') xml += run(edit.insert);
      else if (edit.state === 'rejected') xml += run(original);
      else {
        const note = comment?.(edit);
        const commentId = note ? comments.length : null;
        if (note) comments.push(note);
        if (commentId != null) xml += `<w:commentRangeStart w:id="${commentId}"/>`;
        revisionId += 1;
        xml += `<w:del w:id="${revisionId}" ${revision}><w:r><w:delText xml:space="preserve">${escapeXml(
          original
        )}</w:delText></w:r></w:del>`;
        if (edit.insert) {
          revisionId += 1;
          xml += `<w:ins w:id="${revisionId}" ${revision}>${run(edit.insert)}</w:ins>`;
        }
        if (commentId != null) {
          xml += `<w:commentRangeEnd w:id="${commentId}"/><w:r><w:commentReference w:id="${commentId}"/></w:r>`;
        }
      }
      cursor = end;
    }
    return xml + run(clause.text.slice(cursor));
  }

  const paragraphs = [
    `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${run(contract.title)}</w:p>`,
    `<w:p>${run(contract.parties)}</w:p>`,
    ...contract.clauses.map(
      clause =>
        `<w:p><w:pPr><w:pStyle w:val="Clause"/></w:pPr>${run(
          `${clause.n}. ${clause.heading}. `,
          '<w:b/>'
        )}${clauseBody(clause)}</w:p>`
    ),
  ];

  const document = `${XML_HEAD}<w:document xmlns:w="${W_NS}"><w:body>${paragraphs.join(
    ''
  )}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const commentsXml = `${XML_HEAD}<w:comments xmlns:w="${W_NS}">${comments
    .map(
      (text, id) =>
        `<w:comment w:id="${id}" ${revision} w:initials="RA"><w:p>${run(text)}</w:p></w:comment>`
    )
    .join('')}</w:comments>`;

  const styles = `${XML_HEAD}<w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Clause"><w:name w:val="Clause"/><w:basedOn w:val="Normal"/></w:style></w:styles>`;

  const settings = `${XML_HEAD}<w:settings xmlns:w="${W_NS}"><w:trackRevisions/><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;

  const core = `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(
    contract.title
  )}</dc:title><dc:creator>${escapeXml(
    author
  )}</dc:creator><dc:description>Sample contract with playbook redlines from an unofficial prototype by Haider Bokhari.</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created></cp:coreProperties>`;

  const files = [
    {
      name: '[Content_Types].xml',
      text: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      text: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${REL_TYPE}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    {
      name: 'word/_rels/document.xml.rels',
      text: `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${REL_TYPE}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${REL_TYPE}/settings" Target="settings.xml"/><Relationship Id="rId3" Type="${REL_TYPE}/comments" Target="comments.xml"/></Relationships>`,
    },
    { name: 'word/document.xml', text: document },
    { name: 'word/styles.xml', text: styles },
    { name: 'word/settings.xml', text: settings },
    { name: 'word/comments.xml', text: commentsXml },
    { name: 'docProps/core.xml', text: core },
  ];

  return zipStore(files, date);
}
