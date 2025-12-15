export default class MessageFormatter {
    detectLanguageDirection(text) {
        return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
    }

    format(text) {
        let html = text.trim();
        html = this.parseCodeBlocks(html);
        html = this.parseTable(html);
        html = this.parseListsAndBasicMarkdown(html);
        return html;
    }

    parseCodeBlocks(html) {
        return html.replace(/```(?:\w+)?\n([\s\S]+?)\n```/g, (_, code) => {
            const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code>${escaped}</code></pre>`;
        });
    }

    parseTable(text) {
        const lines = text.split('\n');
        const result = [];
        let tableLines = [];
        let inTable = false;

        for (const line of lines) {
            if (line.trim().match(/^\|(.+)\|$/)) {
                if (!inTable) inTable = true;
                tableLines.push(line);
            } else {
                if (inTable && tableLines.length > 0) {
                    result.push(this.buildTable(tableLines));
                    tableLines = [];
                    inTable = false;
                }
                result.push(line);
            }
        }

        if (inTable && tableLines.length > 0) {
            result.push(this.buildTable(tableLines));
        }

        return result.join('\n');
    }

    buildTable(lines) {
        if (lines.length < 2) return lines.join('\n');

        const rows = lines.map(line =>
            line.split('|').slice(1, -1).map(cell => cell.trim())
        );

        const [header, , ...body] = rows;

        let html = '<div class="table-wrapper"><table class="markdown-table"><thead><tr>';
        header.forEach(cell => html += `<th>${cell}</th>`);
        html += '</tr></thead><tbody>';
        body.forEach(row => {
            html += '<tr>';
            row.forEach(cell => html += `<td>${cell}</td>`);
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        return html;
    }

    parseListsAndBasicMarkdown(html) {
        const lines = html.split('\n');
        let inList = null;
        const processed = [];

        for (const line of lines) {
            if (line.includes('<table') || line.includes('</table>')) {
                if (inList) {
                    processed.push(`</${inList}>`);
                    inList = null;
                }
                processed.push(line);
                continue;
            }

            const ulMatch = line.match(/^[\*\-]\s(.*)/);
            const olMatch = line.match(/^\d+\.\s(.*)/);

            if (ulMatch) {
                if (inList !== 'ul') {
                    if (inList) processed.push(`</${inList}>`);
                    processed.push('<ul>');
                    inList = 'ul';
                }
                processed.push(`<li>${ulMatch[1]}</li>`);
            } else if (olMatch) {
                if (inList !== 'ol') {
                    if (inList) processed.push(`</${inList}>`);
                    processed.push('<ol>');
                    inList = 'ol';
                }
                processed.push(`<li>${olMatch[1]}</li>`);
            } else {
                if (inList) {
                    processed.push(`</${inList}>`);
                    inList = null;
                }
                processed.push(line);
            }
        }

        if (inList) processed.push(`</${inList}>`);

        html = processed.join('\n');
        html = html.replace(/^###\s(.+)/gm, '<h3>$1</h3>')
            .replace(/^##\s(.+)/gm, '<h2>$1</h2>')
            .replace(/^#\s(.+)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');

        return html.split('\n\n').map(p => {
            if (p.startsWith('<') && p.endsWith('>')) return p;
            return p ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '';
        }).join('');
    }
}