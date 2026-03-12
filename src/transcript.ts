import { marked } from 'marked';

document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('content');
    const titleEl = document.getElementById('transcriptTitle');
    const printBtn = document.getElementById('printBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    let rawMarkdown = '';
    let filenameToDownload = 'transcript.md';

    chrome.storage.local.get(['transcriptData', 'transcriptMeta'], (result) => {
        if (!result.transcriptData) {
            if (contentEl) contentEl.innerHTML = '<p>No transcript data found.</p>';
            return;
        }

        rawMarkdown = result.transcriptData;

        if (result.transcriptMeta) {
            if (titleEl) titleEl.textContent = result.transcriptMeta.title || 'Chat Transcript';
            const metaEl = document.getElementById('transcriptMeta');
            if (metaEl && result.transcriptMeta.date) {
                metaEl.textContent = `Generated on ${new Date(result.transcriptMeta.date).toLocaleString()}`;
            }
            if (result.transcriptMeta.filename) {
                filenameToDownload = result.transcriptMeta.filename;
            }
        }

        // Render Markdown to HTML safely
        if (contentEl) {
            // marked.parse returns string | Promise<string> depending on options
            // but default is string
            const html = marked.parse(rawMarkdown);
            contentEl.innerHTML = html as string;
        }
    });

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!rawMarkdown) return;
            const blob = new Blob([rawMarkdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filenameToDownload;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
});
