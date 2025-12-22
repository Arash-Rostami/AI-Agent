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

        const rows = lines.map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));

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

    excludeQuotationMarks(text) {
        if (typeof text !== 'string') return '';
        let cleaned = text.trim();

        if (cleaned.startsWith('"')) cleaned = cleaned.substring(1);
        if (cleaned.endsWith('"')) cleaned = cleaned.substring(0, cleaned.length - 1);

        return cleaned;
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    createAvatar(sender) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (sender === 'user') {
            const headerAvatar = document.getElementById('header-avatar');
            if (headerAvatar && !headerAvatar.classList.contains('hidden') && headerAvatar.src) {
                const img = document.createElement('img');
                img.src = headerAvatar.src;
                img.alt = 'User Avatar';
                img.onerror = () => {
                    avatar.innerHTML = '<i class="fas fa-user"></i>';
                };
                avatar.appendChild(img);
                return avatar;
            }
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
        }
        return avatar;
    }

    createCopyButton(content) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy message';

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
            });
        });

        return copyBtn;
    }

    createFileAttachmentTag(fileName) {
        const fileTag = document.createElement('div');
        fileTag.className = 'message-attachment-tag';

        const icon = document.createElement('i');
        icon.className = 'fas fa-paperclip';
        fileTag.appendChild(icon);

        const text = document.createTextNode(` ${fileName}`);
        fileTag.appendChild(text);

        fileTag.style.fontSize = '0.8em';
        fileTag.style.marginTop = '5px';
        fileTag.style.opacity = '0.8';

        return fileTag;
    }

    createSourcesElement(sources) {
        const sourcesEl = document.createElement('div');
        sourcesEl.className = 'message-sources';
        sourcesEl.innerHTML = '<h4>🔗 Sources:</h4>' + sources.map(source => `
        <div class="source-item">
            <a href="${source.url}" target="_blank" rel="noopener noreferrer" title="${source.snippet || ''}">
                <i>${source.title || source.url}</i>
            </a>
        </div>`).join('');
        return sourcesEl;
    }
}