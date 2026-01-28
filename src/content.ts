// AI Exporter content script (Gemini + ChatGPT)

// Declare the window interface extension for our singleton
declare global {
    interface Window {
        AIExporter: {
            __initialized: boolean;
            mainScrape: () => string;
        };
    }
}

// Singleton Check
if (window.AIExporter && window.AIExporter.__initialized) {
    // Already loaded, just ensuring the mainScrape is returned if this was a programmatic injection
    // But since this is a module now, we just exit. 
    // The previous logic used 'return' which works in a function body, but not top-level.
    // We'll trust the variable check prevents re-attaching listeners.
    console.log("AIExporter already initialized.");
} else {
    // Initialize
    window.AIExporter = {
        __initialized: true,
        mainScrape: mainScrape // Function defined below
    };

    // --- Platform Helpers ---
    const isGemini = (): boolean => window.location.hostname.includes('gemini.google.com');
    const isChatGPT = (): boolean => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('openai.com');
    const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    // --- HTML to Markdown Helper ---
    function htmlToMarkdown(element: Node): string {
        let markdown = '';
        element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                markdown += node.textContent || '';
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                switch (el.tagName.toLowerCase()) {
                    case 'p': markdown += htmlToMarkdown(node) + '\n\n'; break;
                    case 'br': markdown += '\n'; break;
                    case 'strong':
                    case 'b': markdown += `**${htmlToMarkdown(node)}**`; break;
                    case 'em':
                    case 'i': markdown += `*${htmlToMarkdown(node)}*`; break;
                    case 'code':
                        if (el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') markdown += el.textContent;
                        else markdown += `\`${htmlToMarkdown(node)}\``;
                        break;
                    case 'pre': {
                        const codeNode = el.querySelector('code');
                        const codeContent = codeNode ? (codeNode.textContent || '') : (el.textContent || '');
                        let lang = '';
                        if (codeNode?.className) {
                            const match = codeNode.className.match(/language-(\w+)/);
                            if (match) lang = match[1];
                        }
                        markdown += `\n\`\`\`${lang}\n${codeContent}\n\`\`\`\n\n`;
                        break;
                    }
                    case 'ul': markdown += extractList(el, '-'); break;
                    case 'ol': markdown += extractList(el, '1.'); break;
                    case 'li': markdown += `- ${htmlToMarkdown(node)}\n`; break;
                    case 'a': markdown += `[${el.textContent}](${(el as HTMLAnchorElement).href})`; break;
                    case 'h1':
                    case 'h2':
                    case 'h3':
                    case 'h4':
                    case 'h5':
                    case 'h6': {
                        const level = parseInt(el.tagName.substring(1), 10);
                        markdown += `${'#'.repeat(level)} ${htmlToMarkdown(node)}\n\n`;
                        break;
                    }
                    default: markdown += htmlToMarkdown(node);
                }
            }
        });
        return markdown;
    }

    function extractList(listNode: HTMLElement, prefix: string): string {
        let output = '\n';
        let index = 1;
        listNode.childNodes.forEach(child => {
            if ((child as HTMLElement).tagName?.toLowerCase() === 'li') {
                output += `${prefix === '1.' ? index + '.' : '-'} ${htmlToMarkdown(child).trim()}\n`;
                index++;
            }
        });
        output += '\n';
        return output;
    }

    // --- Shared DOM cleanup ---
    function sanitizeClone(root: HTMLElement): HTMLElement {
        // Remove known "thinking" / meta blocks
        root.querySelectorAll('thinking-process, .thinking-process').forEach(el => el.remove());

        // Remove buttons/icons/toolbars
        root.querySelectorAll('button, svg, path, textarea, form, [role="button"]').forEach(el => el.remove());

        return root;
    }

    // --- Brainstorm State Tracking ---
    let lastTurnCountBeforePrompt = 0;
    let sawStopSincePrompt = false;

    function getTurnCount(): number {
        if (isGemini()) return document.querySelectorAll('model-response, .model-response').length;
        if (isChatGPT()) return document.querySelectorAll('[data-message-author-role="assistant"]').length;
        return 0;
    }

    // --- Monitoring & Auto-Copy Logic ---
    let observer: MutationObserver | null = null;
    let autoCopyEnabled = false;
    let isStable = true;
    let silenceTimer: any = null;
    let waitingToast: HTMLElement | null = null;
    let lastCopiedText = '';

    function startMonitoring() {
        if (observer) return;
        createDebugOverlay();
        const targetNode = document.querySelector('main') || document.body;
        const config = { childList: true, subtree: true, characterData: true, attributes: true };

        observer = new MutationObserver((mutations) => {
            const isRelevant = mutations.some(m => {
                const target = m.target as HTMLElement;
                if (target.classList && (target.classList.contains('ai-exporter-toast') || target.id === 'ai-debug-overlay')) return false;
                if (m.addedNodes.length > 0) {
                    const added = Array.from(m.addedNodes) as HTMLElement[];
                    if (added.every(n => (n.classList && n.classList.contains('ai-exporter-toast')) || n.id === 'ai-debug-overlay')) return false;
                }
                return true;
            });
            if (isRelevant) handleActivity();
        });

        observer.observe(targetNode, config);
        updateDebugOverlay('Monitoring Started');
    }

    function stopMonitoring() {
        if (observer) { observer.disconnect(); observer = null; }
        if (silenceTimer) clearTimeout(silenceTimer);
        removeArtifacts();
    }

    function removeArtifacts() {
        if (waitingToast?.parentNode) waitingToast.remove();
        waitingToast = null;
        if (document.getElementById('ai-debug-overlay')) document.getElementById('ai-debug-overlay')?.remove();
        debugOverlay = null;
    }

    function setAutoCopy(enabled: boolean) {
        autoCopyEnabled = enabled;
        if (enabled) startMonitoring();
        else stopMonitoring();
    }

    function ensureMonitoring() {
        startMonitoring();
    }

    function handleActivity() {
        if (silenceTimer) clearTimeout(silenceTimer);

        if (isStable) {
            isStable = false;
            if (autoCopyEnabled && !waitingToast) {
                waitingToast = showToast('Waiting (Activity detected)...', false, true);
            }
        }

        updateDebugOverlay('Activity Detected');
        silenceTimer = setTimeout(finishGeneration, 2500);
    }

    async function finishGeneration() {
        const stopBtn = isStopButtonVisible();
        if (stopBtn) sawStopSincePrompt = true;
        updateDebugOverlay(`Checking Completion (StopBtn: ${stopBtn})`);

        if (stopBtn) {
            if (autoCopyEnabled) {
                if (waitingToast) waitingToast.textContent = 'Waiting (Stop button visible)...';
                else waitingToast = showToast('Waiting (Stop button visible)...', false, true);
            }
            silenceTimer = setTimeout(finishGeneration, 1000);
            return;
        }

        isStable = true;
        if (waitingToast?.parentNode) waitingToast.remove();
        waitingToast = null;

        if (autoCopyEnabled) {
            updateDebugOverlay('Copying (Auto-Enabled)...');
            await processLastResponse();
        } else {
            updateDebugOverlay('Stable (Auto-Copy Disabled)');
        }
    }

    function isStopButtonVisible(): boolean {
        let stopButton: Element | null | undefined = null;

        if (isGemini()) {
            stopButton = document.querySelector('button.stop, button[aria-label="Stop response"]');
            if (!stopButton) {
                const stopIcon = document.querySelector('.stop-icon, mat-icon[fonticon="stop"], [data-mat-icon-name="stop"], .fa-stop');
                if (stopIcon) stopButton = stopIcon.closest('button');
            }
            if (!stopButton) {
                stopButton = Array.from(document.querySelectorAll('button')).find(b =>
                    b.classList.contains('stop') || (b.getAttribute('aria-label') || '').includes('Stop')
                );
            }
        } else if (isChatGPT()) {
            stopButton = document.querySelector('[data-testid="stop-button"], [aria-label="Stop streaming"], [aria-label="Stop generating"], [aria-label*="إيقاف"]');
        }

        return !!stopButton;
    }

    async function processLastResponse() {
        let lastResponseNode: Element | null = null;

        if (isGemini()) {
            const turns = document.querySelectorAll('model-response, .model-response');
            if (turns.length > 0) lastResponseNode = turns[turns.length - 1];
        } else if (isChatGPT()) {
            const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
            if (messages.length > 0) lastResponseNode = messages[messages.length - 1];
        }

        if (lastResponseNode) {
            const clone = sanitizeClone(lastResponseNode.cloneNode(true) as HTMLElement);
            let text = htmlToMarkdown(clone).trim();
            text = text.replace(/^Clarifying.*Answer now\s*/gm, '')
                .replace(/^Refining.*Answer now\s*/gm, '')
                .replace(/^Show thinking\s*/gm, '')
                .trim();

            if (text && text !== lastCopiedText && text.length > 5) {
                const success = await copyToClipboard(text);
                if (success) {
                    lastCopiedText = text;
                    showToast('Auto-Copied new response!');
                }
            }
        }
    }

    // --- Export / Scrape Logic ---
    function scrapeChatGPT(): string {
        const nodes = Array.from(document.querySelectorAll(
            '[data-message-author-role="user"], [data-message-author-role="assistant"]'
        ));
        if (!nodes.length) return "";

        let out = `# Chat Export (ChatGPT)\n\nExported at: ${new Date().toISOString()}\n\n`;

        for (const node of nodes) {
            const role = node.getAttribute('data-message-author-role') === 'user' ? 'User' : 'Assistant';

            const contentRoot =
                node.querySelector('.markdown') ||
                node.querySelector('[data-message-content]') ||
                node;

            const clone = sanitizeClone(contentRoot.cloneNode(true) as HTMLElement);
            const text = htmlToMarkdown(clone).trim();
            if (!text) continue;

            out += `## ${role}\n\n${text}\n\n`;
        }

        return out.trim() + "\n";
    }

    function scrapeGemini(): string {
        const nodes = Array.from(document.querySelectorAll(
            'user-query, [data-test-id="user-query"], model-response, .model-response, [data-test-id="model-response"]'
        ));
        if (!nodes.length) return "";

        let out = `# Chat Export (Gemini)\n\nExported at: ${new Date().toISOString()}\n\n`;

        for (const node of nodes) {
            const isUser =
                node.matches('user-query, [data-test-id="user-query"]') &&
                !node.matches('model-response, .model-response, [data-test-id="model-response"]');

            const role = isUser ? 'User' : 'Assistant';

            const clone = sanitizeClone(node.cloneNode(true) as HTMLElement);
            const text = htmlToMarkdown(clone).trim();
            if (!text) continue;

            out += `## ${role}\n\n${text}\n\n`;
        }

        return out.trim() + "\n";
    }

    function mainScrape(): string {
        if (isGemini()) return scrapeGemini();
        if (isChatGPT()) return scrapeChatGPT();
        return "Unsupported website.";
    }

    // --- Message Listeners (API) ---
    function getUserMessageCount(): number {
        if (isGemini()) return document.querySelectorAll('user-query, [data-test-id="user-query"]').length;
        if (isChatGPT()) return document.querySelectorAll('[data-message-author-role="user"]').length;
        return 0;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'toggleAutoCopy') {
            setAutoCopy(request.enabled);
            sendResponse({ status: 'ok' });
        }
        else if (request.action === 'runPrompt') {
            ensureMonitoring();
            handleRunPrompt(request.text).then(() => sendResponse({ status: 'done' }));
            return true;
        }
        else if (request.action === 'waitForDone') {
            ensureMonitoring();
            waitForDone().then(() => sendResponse({ status: 'complete' }));
            return true;
        }
        else if (request.action === 'getLastResponse') {
            sendResponse({ text: getLastResponseText() });
        }
        else if (request.action === 'getUserTurnCount') {
            sendResponse({ count: getUserMessageCount() });
        }
        else if (request.action === 'scrapeConversation') {
            sendResponse({ text: mainScrape() });
        }
        return true;
    });




    // --- Prompt Runner ---
    function setTextInEditable(el: HTMLElement, text: string) {
        el.focus();
        try {
            document.execCommand('selectAll', false, undefined);
            document.execCommand('delete', false, undefined);
            document.execCommand('insertText', false, text);
        } catch (e) { }

        const current = (el.innerText || el.textContent || '').trim();
        if (current !== text.trim()) {
            el.textContent = '';
            el.textContent = text;
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    async function handleRunPrompt(text: string) {
        lastTurnCountBeforePrompt = getTurnCount();
        sawStopSincePrompt = false;

        isStable = false;
        handleActivity();

        let inputArea: HTMLElement | null = null;
        if (isGemini()) {
            inputArea = document.querySelector('div[contenteditable="true"][role="textbox"], div[contenteditable="true"].rich-textarea, .ql-editor, textarea') as HTMLElement;
        } else if (isChatGPT()) {
            inputArea = (document.querySelector('textarea#prompt-textarea') ||
                document.querySelector('#prompt-textarea') ||
                document.querySelector('div[contenteditable="true"][role="textbox"]')) as HTMLElement;
        }

        if (!inputArea) return;

        inputArea.focus();

        const isEditable = inputArea.isContentEditable || inputArea.getAttribute('contenteditable') === 'true';
        if (isGemini() || (isChatGPT() && isEditable)) {
            setTextInEditable(inputArea, text);
        } else {
            (inputArea as HTMLInputElement).value = text;
            inputArea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        await wait(2000);

        let sendBtn: HTMLElement | null = null;
        if (isGemini()) {
            sendBtn = document.querySelector('.send-button, button[aria-label="Send message"], button[aria-label="إرسال"]') as HTMLElement;
            if (!sendBtn) {
                const icon = document.querySelector('mat-icon[data-mat-icon-name="send"]');
                if (icon) sendBtn = icon.closest('button');
            }
        } else if (isChatGPT()) {
            sendBtn = document.querySelector('button[data-testid="send-button"], [data-testid="send-button"], button[aria-label="Send prompt"]') as HTMLElement;
        }

        if (sendBtn && !(sendBtn as HTMLButtonElement).disabled) {
            sendBtn.click();
        }

        // Fallback or Enter key
        if (isGemini()) {
            await wait(300);
            inputArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));
        } else if (isChatGPT() && (!sendBtn || (sendBtn as HTMLButtonElement).disabled)) {
            inputArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true }));
        }
    }

    function getLastResponseText(): string {
        let lastResponseNode: Element | null = null;
        if (isGemini()) {
            const turns = document.querySelectorAll('model-response, .model-response, [data-test-id="model-response"], .message-content');
            if (turns.length > 0) lastResponseNode = turns[turns.length - 1];
        } else if (isChatGPT()) {
            const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
            if (messages.length > 0) lastResponseNode = messages[messages.length - 1];
        }
        if (!lastResponseNode) return "";
        const clone = sanitizeClone(lastResponseNode.cloneNode(true) as HTMLElement);
        return htmlToMarkdown(clone).trim();
    }

    async function waitForDone(): Promise<void> {
        return new Promise(resolve => {
            const start = Date.now();
            const timeoutMs = 180000;

            const phase1 = setInterval(() => {
                const stopBtn = isStopButtonVisible();
                const turnsNow = getTurnCount();

                if (stopBtn || sawStopSincePrompt || turnsNow > lastTurnCountBeforePrompt) {
                    clearInterval(phase1);
                    startPhase2();
                }

                if (Date.now() - start > 15000) {
                    clearInterval(phase1);
                    startPhase2();
                }
            }, 250);

            function startPhase2() {
                const phase2 = setInterval(() => {
                    const stopBtn = isStopButtonVisible();
                    const turnsNow = getTurnCount();

                    if (!stopBtn && isStable) {
                        if (turnsNow > lastTurnCountBeforePrompt || sawStopSincePrompt) {
                            clearInterval(phase2);
                            resolve();
                            return;
                        }
                    }

                    if (Date.now() - start > timeoutMs) {
                        clearInterval(phase2);
                        resolve();
                    }
                }, 400);
            }
        });
    }

    // --- Copy Utilities ---
    let pendingCopyText: string | null = null;

    function setupRetryOnInteraction(text: string) {
        pendingCopyText = text;
        showToast('⚠ Auto-copy blocked. Click anywhere to copy!', true, true);
        document.addEventListener('click', retryCopy, { once: true, capture: true });
        document.addEventListener('keydown', retryCopy, { once: true, capture: true });
    }

    async function retryCopy() {
        if (!pendingCopyText) return;
        const success = await copyToClipboard(pendingCopyText, true);
        if (success) {
            pendingCopyText = null;
            showToast('Auto-Copied new response!');
        }
    }

    async function copyToClipboard(text: string, isRetry = false): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.cssText = "position:fixed;left:0;top:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;";
                document.body.appendChild(textArea);
                textArea.focus({ preventScroll: true });
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) return true;
                throw new Error('execCommand returned false');
            } catch (fallbackErr) {
                if (!isRetry) setupRetryOnInteraction(text);
                else showToast('Error: Copy failed completely.', true);
                return false;
            }
        }
    }

    // --- UI Helpers ---
    function showToast(msg: string, isError = false, isPersistent = false): HTMLElement {
        document.querySelectorAll('.ai-exporter-toast').forEach(el => el.remove());

        const toast = document.createElement('div');
        toast.className = 'ai-exporter-toast';

        Object.assign(toast.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            backgroundColor: isError ? '#dc3545' : (isPersistent ? '#17a2b8' : '#28a745'),
            color: '#fff', padding: '10px 20px', borderRadius: '5px',
            zIndex: '10000', fontWeight: 'bold', fontSize: '14px', pointerEvents: 'none',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'opacity 0.3s'
        });

        toast.textContent = msg;
        document.body.appendChild(toast);

        if (!isPersistent) {
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                }
            }, 3000);
        }

        return toast;
    }

    let debugOverlay: HTMLElement | null = null;

    function createDebugOverlay() {
        if (debugOverlay || document.getElementById('ai-debug-overlay')) return;
        debugOverlay = document.createElement('div');
        debugOverlay.id = 'ai-debug-overlay';
        Object.assign(debugOverlay.style, {
            position: 'fixed', bottom: '10px', left: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', color: '#0f0',
            padding: '10px', borderRadius: '5px',
            zIndex: '10001', fontFamily: 'monospace', fontSize: '12px',
            pointerEvents: 'none', whiteSpace: 'pre'
        });
        document.body.appendChild(debugOverlay);
    }

    function updateDebugOverlay(status: string) {
        if (!debugOverlay) createDebugOverlay();
        if (debugOverlay) {
            const foundStop = isStopButtonVisible();
            debugOverlay.textContent =
                `[Debug Mode]\nPlatform: ${isGemini() ? 'Gemini' : (isChatGPT() ? 'ChatGPT' : 'Unknown')}\nState: ${status}\nStop Visible: ${foundStop}\nStable: ${isStable}`;
        }
    }

    // Auto-start monitoring if user previously enabled it
    chrome.storage.local.get(['autoCopyEnabled'], (result) => {
        if (result.autoCopyEnabled) setAutoCopy(true);
    });
}

export { }; // Make this a module