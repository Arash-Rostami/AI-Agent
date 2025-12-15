export default class MessageFormatter {
    detectLanguageDirection(text) {
        return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
    }

    format(text) {
        if (!text) return '';
        let html = text.trim();
        html = html.replace(/\\n/g, '\n');

        html = this.parseCodeBlocks(html);
        html = this.parseTable(html);
        html = this.parseListsAndBasicMarkdown(html);
        return html;
    }

    parseCodeBlocks(html) {
        const placeholders = [];
        let replaced = html.replace(/```(?:\w+)?\n([\s\S]+?)\n```/g, (_, code) => {
            const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            placeholders.push(`<pre><code>${escaped}</code></pre>`);
            return `__CODE_BLOCK_${placeholders.length - 1}__`;
        });

        replaced = replaced.replace(/`([^`]+)`/g, (_, code) => {
            const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            placeholders.push(`<code>${escaped}</code>`);
            return `__CODE_BLOCK_${placeholders.length - 1}__`;
        });

        return {text: replaced, placeholders};
    }

    parseTable(text) {
        let workingText = typeof text === 'string' ? text : text.text;
        const placeholders = typeof text === 'string' ? [] : text.placeholders;

        const lines = workingText.split('\n');
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

        if (inTable && tableLines.length > 0) result.push(this.buildTable(tableLines));

        return {text: result.join('\n'), placeholders};
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

    parseListsAndBasicMarkdown(input) {
        let html = input.text;
        const placeholders = input.placeholders;

        const lines = html.split('\n');
        let inList = null;
        const processed = [];

        for (const line of lines) {
            if (line.match(/__CODE_BLOCK_\d+__/)) {
                if (inList) {
                    processed.push(`</${inList}>`);
                    inList = null;
                }
                processed.push(line);
                continue;
            }

            if (line.includes('<table') || line.includes('</table>')) {
                if (inList) {
                    processed.push(`</${inList}>`);
                    inList = null;
                }
                processed.push(line);
                continue;
            }

            const ulMatch = line.match(/^(\s*)(?:[\*\-]|\*\*[\*\-]\*\*)\s+(.*)/);
            const olMatch = line.match(/^(\s*)(?:\d+\.|\*\*\d+\.\*\*)\s+(.*)/);

            if (ulMatch) {
                if (inList !== 'ul') {
                    if (inList) processed.push(`</${inList}>`);
                    processed.push('<ul>');
                    inList = 'ul';
                }
                processed.push(`<li>${ulMatch[2]}</li>`);
            } else if (olMatch) {
                if (inList !== 'ol') {
                    if (inList) processed.push(`</${inList}>`);
                    processed.push('<ol>');
                    inList = 'ol';
                }
                processed.push(`<li>${olMatch[2]}</li>`);
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

        html = html
            .replace(/^###\s+(.+)/gm, '<h3>$1</h3>')
            .replace(/^##\s+(.+)/gm, '<h2>$1</h2>')
            .replace(/^#\s+(.+)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => placeholders[parseInt(index)]);

        return html.split('\n').map(p => {
            p = p.trim();
            if (!p) return '';
            if (p.startsWith('<') && !p.startsWith('<strong') && !p.startsWith('<em')) return p;
            return `<p>${p}</p>`;
        }).join('');
    }
}