// A small Markdown renderer for the AI assistant's replies: headings, lists,
// quotes, code, bold, italic and links. Every piece of text is escaped first,
// so a reply can never inject markup (safe for v-html).

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function inline(text) {
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

export function markdown(source) {
    const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let paragraph = [];
    let list = null;

    const flush = () => {
        if (paragraph.length) {
            out.push(`<p>${paragraph.map(inline).join('<br>')}</p>`);
        }
        paragraph = [];
        if (list) {
            out.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`);
        }
        list = null;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^```/.test(line)) {
            flush();
            const code = [];
            while (++i < lines.length && !/^```/.test(lines[i])) {
                code.push(lines[i]);
            }
            out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
            continue;
        }

        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
        const quote = line.match(/^>\s?(.*)$/);

        if (heading) {
            flush();
            const level = Math.min(heading[1].length + 2, 6);
            out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        } else if (bullet || numbered) {
            const tag = bullet ? 'ul' : 'ol';
            if (paragraph.length || (list && list.tag !== tag)) {
                flush();
            }
            list ??= { tag, items: [] };
            list.items.push((bullet ?? numbered)[1]);
        } else if (quote) {
            flush();
            out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
        } else if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
            flush();
            out.push('<hr>');
        } else if (line.trim() === '') {
            flush();
        } else if (list && /^\s{2,}\S/.test(line)) {
            list.items[list.items.length - 1] += ` ${line.trim()}`;
        } else {
            if (list) {
                flush();
            }
            paragraph.push(line);
        }
    }
    flush();

    return out.join('');
}
