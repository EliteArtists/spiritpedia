// The admin guide (web/docs/admin-guide.md), drawn for Admin → Help.
//
// A small renderer for the markdown that guide uses, rather than a package:
// headings, paragraphs, bulleted and numbered lists (nested by indent), tables,
// **bold**, *italic*, `code` and [links](…). The guide is ours and is written
// with these in mind; anything else simply shows as plain text. No raw HTML is
// ever passed through, so nothing in the file can inject markup.

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;

function inline(text, keyBase = 'i') {
  const parts = String(text).split(INLINE);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-white">
          {inline(part.slice(2, -2), key)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const external = /^https?:\/\//.test(link[2]);
      return (
        <a
          key={key}
          href={link[2]}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-[#a78bfa] underline underline-offset-2 hover:text-white"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{inline(part.slice(1, -1), key)}</em>;
    }
    return part;
  });
}

const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const HEADING = /^(#{1,4})\s+(.*)$/;

// Lines of one list block → a tree of { ordered, items: [{ text, children }] }.
function buildList(lines) {
  const root = { indent: -1, list: null, children: [] };
  const stack = [root];
  let last = null;

  for (const line of lines) {
    const m = line.match(LIST_ITEM);
    if (!m) {
      // A wrapped line belongs to the item above it.
      if (last) last.text += ` ${line.trim()}`;
      continue;
    }
    const indent = m[1].length;
    const ordered = /\d/.test(m[2]);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1];
    const owner = parent === root ? root : parent.item;
    if (!owner.list) owner.list = { ordered, items: [] };
    const item = { text: m[3], list: null };
    owner.list.items.push(item);
    stack.push({ indent, item });
    last = item;
  }
  return root.list;
}

function List({ list, depth = 0 }) {
  const Tag = list.ordered ? 'ol' : 'ul';
  return (
    <Tag
      className={`${list.ordered ? 'list-decimal' : 'list-disc'} ${
        depth ? 'mt-1.5' : 'my-4'
      } space-y-1.5 pl-6 text-sm leading-relaxed text-slate-300 marker:text-slate-500`}
    >
      {list.items.map((item, i) => (
        <li key={i}>
          {inline(item.text, `li-${depth}-${i}`)}
          {item.list && <List list={item.list} depth={depth + 1} />}
        </li>
      ))}
    </Tag>
  );
}

function cells(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function Table({ rows }) {
  const [head, , ...body] = rows;
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            {cells(head).map((c, i) => (
              <th key={i} className="px-4 py-2.5 font-bold">
                {inline(c, `th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-slate-300">
          {body.map((row, r) => (
            <tr key={r}>
              {cells(row).map((c, i) => (
                <td key={i} className="px-4 py-2.5 align-top">
                  {inline(c, `td-${r}-${i}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const HEADING_CLASS = {
  1: 'mt-10 mb-4 text-2xl font-bold text-white',
  2: 'mt-10 mb-3 scroll-mt-24 border-t border-white/10 pt-8 text-xl font-bold text-white',
  3: 'mt-8 mb-2 scroll-mt-24 text-base font-bold text-white',
  4: 'mt-6 mb-2 scroll-mt-24 text-sm font-bold uppercase tracking-wider text-slate-400',
};

// The second-level headings, for the page's contents list.
export function guideSections(markdown) {
  return String(markdown)
    .split('\n')
    .map((l) => l.match(/^##\s+(.*)$/))
    .filter(Boolean)
    .map((m) => ({ title: m[1].replace(/[`*]/g, ''), id: slugify(m[1]) }));
}

// skipTitle: the page already carries its own heading, so the file's # title
// is left out.
export default function GuideMarkdown({ markdown, skipTitle = false }) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      if (!(skipTitle && level === 1)) {
        const Tag = `h${level + 1 > 6 ? 6 : level + 1}`;
        blocks.push(
          <Tag key={blocks.length} id={slugify(heading[2])} className={HEADING_CLASS[level]}>
            {inline(heading[2], `h-${i}`)}
          </Tag>
        );
      }
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      blocks.push(<Table key={blocks.length} rows={rows} />);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const block = [];
      while (i < lines.length && lines[i].trim()) block.push(lines[i++]);
      const list = buildList(block);
      if (list) blocks.push(<List key={blocks.length} list={list} />);
      continue;
    }

    // A paragraph: every line up to a blank one or the start of another block.
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !LIST_ITEM.test(lines[i])
    ) {
      para.push(lines[i++].trim());
    }
    blocks.push(
      <p key={blocks.length} className="my-3 text-sm leading-relaxed text-slate-300">
        {inline(para.join(' '), `p-${i}`)}
      </p>
    );
  }

  return <div className="max-w-3xl">{blocks}</div>;
}
