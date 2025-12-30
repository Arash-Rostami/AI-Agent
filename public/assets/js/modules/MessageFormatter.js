export default class MessageFormatter {
    buildTable(lines) {
        if (lines.length < 2) return lines.join('\n');

        const rows = lines.map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
        const [header, , ...body] = rows;

        let html = '<div class="table-wrapper"><table class="markdown-table"><thead><tr>';
        html += header.map(cell => `<th>${cell}</th>`).join('');
        html += '</tr></thead><tbody>';
        html += body.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
        html += '</tbody></table></div>';

        return html;
    }

    createAvatar(sender) {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        const img = sender === 'user' ? this.getUserAvatar() : this.getBotAvatar();

        if (img) avatar.appendChild(img);
        return avatar;
    }

    getUserAvatar() {
        const headerAvatar = document.getElementById('header-avatar');
        if (headerAvatar && !headerAvatar.classList.contains('hidden') && headerAvatar.src) {
            const img = document.createElement('img');
            img.src = headerAvatar.src;
            img.alt = 'User Avatar';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.onerror = () => this.setDefaultAvatar();
            return img;
        }
        return this.setDefaultAvatar();
    }

    setDefaultAvatar() {
        const avatar = document.createElement('div');
        avatar.innerHTML = '<i class="fas fa-user"></i>';
        return avatar;
    }

    getBotAvatar() {
        const avatar = document.createElement('div');
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        return avatar;
    }

    createCopyButton(content) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyBtn.title = 'Copy message';

        copyBtn.addEventListener('click', () => this.copyText(content, copyBtn));
        return copyBtn;
    }

    copyText(content, copyBtn) {
        navigator.clipboard.writeText(content).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
        });
    }

    createFileAttachmentTag(fileName) {
        const fileTag = document.createElement('div');
        fileTag.className = 'message-attachment-tag';
        fileTag.style = 'font-size:0.8em;margin-top:5px;opacity:0.8;';
        fileTag.innerHTML = `<i class="fas fa-paperclip"></i> ${fileName}`;
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

    detectLanguageDirection(text) {
        return /[\u0600-\u06FF]/.test(text) ? 'rtl' : 'ltr';
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    excludeQuotationMarks(text) {
        if (typeof text !== 'string') return '';
        let cleaned = text.trim();

        if (cleaned.startsWith('"')) cleaned = cleaned.substring(1);
        if (cleaned.endsWith('"')) cleaned = cleaned.substring(0, cleaned.length - 1);

        return cleaned;
    }

    cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        let cleaned = text.trim();

        // Recursively remove outer quotes if they exist (e.g., "\"foo\"" -> "foo")
        while (cleaned.length >= 2 && cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1);
        }

        // Robust strategy: Remove ALL backslashes that immediately precede a double quote
        // This handles \", \\\", \\\\\\", etc., regardless of count.
        cleaned = cleaned.replace(/\\+(?=")/g, '');

        // Collapse multiple backslashes followed by 'n' into a single newline
        // Handles \n, \\n, \\\n, \\\\n, etc.
        cleaned = cleaned.replace(/\\+n/g, '\n');

        // General unescape for other common sequences if needed, but the above covers the main artifacts.
        // We still unescape \\ to \ for other non-quote contexts if they exist, but safely.
        cleaned = cleaned.replace(/\\\\/g, '\\');

        // Remove trailing backslashes often left by bad splitting/escaping
        cleaned = cleaned.replace(/\\+$/gm, '');

        return cleaned;
    }

    format(text) {
        if (!text) return '';

        let html = this.cleanText(text);

        // Final pass for any remaining standard newlines not caught above
        html = html.replace(/\\n/g, '\n');

        const {text: codeBlockHtml, placeholders} = this.parseCodeBlocks(html);
        html = this.parseTable(codeBlockHtml);
        html = this.parseListsAndBasicMarkdown({text: html, placeholders});
        return html;
    }

    parseCodeBlocks(html) {
        const placeholders = [];
        const codeBlocks = html.replace(/```(?:\w+)?\n([\s\S]+?)\n```/g, (_, code) => {
            const escaped = this.escapeHtml(code);
            placeholders.push(`<pre><code>${escaped}</code></pre>`);
            return `__CODE_BLOCK_${placeholders.length - 1}__`;
        });

        const inlineCode = codeBlocks.replace(/`([^`]+)`/g, (_, code) => {
            const escaped = this.escapeHtml(code);
            placeholders.push(`<code>${escaped}</code>`);
            return `__CODE_BLOCK_${placeholders.length - 1}__`;
        });

        return {text: inlineCode, placeholders};
    }

    parseListsAndBasicMarkdown(input) {
        let html = input.text;
        const placeholders = input.placeholders;

        let inList = null;
        const processed = [];
        const lines = html.split('\n');

        lines.forEach(line => {
            if (line.match(/__CODE_BLOCK_\d+__/)) {
                if (inList) {
                    processed.push(`</${inList}>`);
                    inList = null;
                }
                processed.push(line);
                return;
            }

            if (line.includes('<table') || line.includes('</table>')) {
                if (inList) {
                    processed.push(`</${inList}>`);
                    inList = null;
                }
                processed.push(line);
                return;
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
        });

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

    parseTable(text) {
        let workingText = typeof text === 'string' ? text : text.text;
        const placeholders = typeof text === 'string' ? [] : text.placeholders;

        const lines = workingText.split('\n');
        const result = [];
        let tableLines = [];
        let inTable = false;

        lines.forEach(line => {
            if (line.trim().match(/^\|(.+)\|$/)) {
                if (!inTable) inTable = true;
                tableLines.push(line);
            } else {
                if (inTable && tableLines.length) {
                    result.push(this.buildTable(tableLines));
                    tableLines = [];
                    inTable = false;
                }
                result.push(line);
            }
        });

        if (inTable && tableLines.length) result.push(this.buildTable(tableLines));

        return result.join('\n');
    }
}
