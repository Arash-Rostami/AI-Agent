const RTL_RANGES = [[0x0590, 0x05FF], [0x0600, 0x06FF], [0x0700, 0x074F], [0x0750, 0x077F], [0x0780, 0x07BF], [0x08A0, 0x08FF], [0xFB50, 0xFDFF], [0xFE70, 0xFEFF]];
const TEMPLATE_CACHE = new Map();

function detectDirection(text) {
    if (!text) return 'ltr';
    let rtlCount = 0;
    let ltrCount = 0;
    let checked = 0;
    for (let i = 0; i < text.length && checked < 100; i++) {
        const code = text.charCodeAt(i);
        if (code === 60 || code === 62 || code === 47) continue;
        if (RTL_RANGES.some(([start, end]) => code >= start && code <= end)) {
            rtlCount++;
            checked++;
        } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            ltrCount++;
            checked++;
        }
    }
    return rtlCount > ltrCount ? 'rtl' : 'ltr';
}

function getTemplate(dir) {
    const cached = TEMPLATE_CACHE.get(dir);
    if (cached) return cached;
    const isRtl = dir === 'rtl';
    const template = {
        headerStyle: `direction:${dir};border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:24px;text-align:${isRtl ? 'right' : 'left'}`,
        titleStyle: 'margin:0;color:#111827;font-size:20px;font-weight:600;font-family:system-ui,sans-serif',
        timeStyle: 'margin:8px 0 0;color:#6b7280;font-size:14px;font-family:system-ui,sans-serif',
        bodyStyle: `direction:${dir};font-family:system-ui,-apple-system,sans-serif;color:#1f2937;line-height:1.6;font-size:15px;background-color:#fff`
    };
    TEMPLATE_CACHE.set(dir, template);
    return template;
}

export function generateChatBody(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return { textBody: '', htmlBody: '' };

    const textBody = messages.map(msg => {
        const role = (msg.role === 'user') ? 'USER' : 'AI';
        const content = msg.parts?.[0]?.text || msg.content || '';
        return `[${role}]\n${content}\n`;
    }).join('\n----------------------------------------\n\n');

    const htmlBody = messages.map(msg => {
        const isUser = msg.role === 'user';
        const roleLabel = isUser ? 'User' : 'AI Assistant';
        const content = msg.parts?.[0]?.text || msg.content || '';
        const dir = detectDirection(content);
        const containerStyle = `margin-bottom: 24px;padding: 16px;border-radius: 12px;background-color: ${isUser ? '#eff6ff' : '#f3f4f6'};border-left: 5px solid ${isUser ? '#2563eb' : '#4b5563'};`;
        const labelStyle = `font-weight: 700;color: ${isUser ? '#1e40af' : '#374151'};font-size: 13px;margin-bottom: 8px;display: block;text-transform: uppercase;letter-spacing: 0.5px;`;
        const msgStyle = `color: #1f2937;white-space: pre-wrap;direction: ${dir};text-align: ${dir === 'rtl' ? 'right' : 'left'};`;

        return `<div style="${containerStyle}"><span style="${labelStyle}">${roleLabel}</span><div style="${msgStyle}">${content.replace(/\n/g, '<br>')}</div></div>`;
    }).join('');

    return { textBody, htmlBody };
}

export function formatEmail(textBody, htmlBody, timestamp) {
    const dir = detectDirection((textBody || '') + (htmlBody || '').substring(0, 200));
    const {headerStyle, titleStyle, timeStyle, bodyStyle} = getTemplate(dir);
    const headerText = `Chat History Export\nSent: ${timestamp}\n${'='.repeat(30)}\n\n`;
    const headerHtml = `<div style="${headerStyle}"><h2 style="${titleStyle}">Chat History Export</h2><p style="${timeStyle}">Sent: ${timestamp}</p></div>`;
    const finalText = textBody ? (headerText + textBody) : '';
    const finalHtml = htmlBody
        ? `<div style="${bodyStyle}">${headerHtml}${htmlBody}</div>`
        : `<div style="${bodyStyle}">${headerHtml}<div style="white-space: pre-wrap;">${(textBody || '').replace(/\n/g, '<br>')}</div></div>`;
    return {finalText, finalHtml};
}
