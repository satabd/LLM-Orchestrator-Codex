// AI Executor Content Script
// Handles DOM interactions for Gemini and ChatGPT

// --- Platform Detection ---
const isGemini = (): boolean => window.location.hostname.includes('gemini.google.com');
const isChatGPT = (): boolean => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('openai.com');

// --- Main Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'runPrompt':
            handleRunPrompt(request.text).then(() => sendResponse({ status: 'done' }));
            return true;

        case 'waitForDone':
            waitForIdle().then(() => sendResponse({ status: 'complete' }));
            return true;

        case 'getLastResponse':
            const text = getLastResponseText();
            sendResponse({ text });
            break;

        case 'getUserTurnCount':
            sendResponse({ count: getUserMessageCount() });
            break;

        case 'scrapeConversation':
            sendResponse({ text: mainScrape() });
            break;
    }
});

// --- Action Implementations ---

async function handleRunPrompt(text: string) {
    const inputArea = findInputArea();
    if (!inputArea) return;

    // inputArea.focus(); 

    // Set text
    if (isGemini()) {
        const richTextEditor = document.querySelector('.ql-editor');
        if (richTextEditor) {
            (richTextEditor as HTMLElement).innerHTML = `<p>${text}</p>`;
        } else {
            setTextInEditable(inputArea, text);
        }
    } else {
        setTextInEditable(inputArea, text);
    }

    await new Promise(r => setTimeout(r, 500));

    // Click Send
    const sendBtn = findSendButton();
    if (sendBtn) {
        sendBtn.click();
    } else {
        const event = new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13,
            bubbles: true, composed: true
        });
        inputArea.dispatchEvent(event);
    }
}

function setTextInEditable(el: HTMLElement, text: string) {
    if (el.tagName === 'TEXTAREA') {
        (el as HTMLTextAreaElement).value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        el.focus();
        document.execCommand('selectAll', false, undefined);
        document.execCommand('insertText', false, text);
    }
}

// --- Status & Waiting ---

function getUserMessageCount(): number {
    if (isGemini()) return document.querySelectorAll('user-query, [data-test-id="user-query"]').length;
    if (isChatGPT()) return document.querySelectorAll('[data-message-author-role="user"]').length;
    return 0;
}

function findInputArea(): HTMLElement | null {
    if (isGemini()) {
        return document.querySelector('div[contenteditable="true"][role="textbox"], .ql-editor, textarea') as HTMLElement;
    }
    if (isChatGPT()) {
        return document.querySelector('#prompt-textarea') as HTMLElement;
    }
    return null;
}

function findSendButton(): HTMLElement | null {
    if (isGemini()) {
        return document.querySelector('.send-button, button[aria-label*="Send"], button[aria-label*="bfe"]') as HTMLElement;
    }
    if (isChatGPT()) {
        return document.querySelector('button[data-testid="send-button"]') as HTMLElement;
    }
    return null;
}

function isStopButtonVisible(): boolean {
    if (isGemini()) {
        return !!document.querySelector('button[aria-label*="Stop"]');
    }
    if (isChatGPT()) {
        return !!document.querySelector('button[aria-label*="Stop"]');
    }
    return false;
}

async function waitForIdle(): Promise<void> {
    return new Promise(resolve => {
        // If already stable, resolve immediately
        if (!isStopButtonVisible()) {
            // slight delay to double-check transient states
            setTimeout(() => {
                if (!isStopButtonVisible()) resolve();
                else waitForIdle().then(resolve);
            }, 500);
            return;
        }

        const observer = new MutationObserver((mutations) => {
            if (!isStopButtonVisible()) {
                // Stop button gone!
                observer.disconnect();
                // Stabilization delay
                setTimeout(resolve, 1000);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true // Stop button might just change attribute
        });

        // Safety timeout (180s)
        setTimeout(() => {
            observer.disconnect();
            resolve();
        }, 180000);
    });
}

// --- Data Extraction ---

function getLastResponseText(): string {
    let node: Element | null = null;

    if (isGemini()) {
        const nodes = document.querySelectorAll('model-response, .model-response');
        if (nodes.length) node = nodes[nodes.length - 1];
    } else {
        const nodes = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (nodes.length) node = nodes[nodes.length - 1];
    }

    return node ? htmlToMarkdown(node as HTMLElement) : "";
}

function mainScrape(): string {
    let out = `# Conversation Export\n\n`;

    if (isGemini()) {
        const turns = document.querySelectorAll('user-query, model-response');
        turns.forEach(t => {
            const role = t.tagName.toLowerCase().includes('user') ? 'User' : 'DeepMind';
            out += `## ${role}\n\n${htmlToMarkdown(t as HTMLElement)}\n\n`;
        });
    } else {
        const turns = document.querySelectorAll('[data-message-author-role]');
        turns.forEach(t => {
            const role = t.getAttribute('data-message-author-role') === 'user' ? 'User' : 'Assistant';
            out += `## ${role}\n\n${htmlToMarkdown(t as HTMLElement)}\n\n`;
        });
    }
    return out;
}

function htmlToMarkdown(root: HTMLElement): string {
    let text = root.innerText || root.textContent || "";
    // Basic cleanup
    text = text.replace(/Show drafts/g, '').replace(/Regenerate/g, '');
    return text.trim();
}