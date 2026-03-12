import { applyTranslationsToDOM, getLanguage, setLanguage, t, Language } from './i18n';

let currentLang: Language = 'en';

// Interface matching background state
interface BrainstormState {
    active: boolean;
    prompt: string;
    role: string;
    customGeminiPrompt?: string;
    customChatGPTPrompt?: string;
    rounds: number;
    currentRound: number;
    geminiTabId: number | null;
    chatGPTTabId: number | null;
    statusLog: string[];
}

// Ensure these match panel.html IDs
const ELEMENTS = {
    geminiSelect: document.getElementById('geminiTabSelect') as HTMLSelectElement,
    chatGPTSelect: document.getElementById('chatGPTTabSelect') as HTMLSelectElement,
    roundsInput: document.getElementById('roundsInput') as HTMLInputElement,
    modeSelect: document.getElementById('modeSelect') as HTMLSelectElement,
    roleSelect: document.getElementById('roleSelect') as HTMLSelectElement,
    customRoleInputs: document.getElementById('customRoleInputs') as HTMLElement,
    geminiPromptInput: document.getElementById('geminiPromptInput') as HTMLTextAreaElement,
    chatGPTPromptInput: document.getElementById('chatGPTPromptInput') as HTMLTextAreaElement,
    topicInput: document.getElementById('topicInput') as HTMLTextAreaElement,
    startBtn: document.getElementById('startBtn') as HTMLButtonElement,
    pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
    stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
    statusBadge: document.getElementById('status-badge') as HTMLElement,
    logsArea: document.getElementById('logsArea') as HTMLElement,
    clearLogsBtn: document.getElementById('clearLogsBtn') as HTMLButtonElement,

    postRunActionsCard: document.getElementById('postRunActionsCard') as HTMLElement,
    continueRoundsInput: document.getElementById('continueRoundsInput') as HTMLInputElement,
    continueBtn: document.getElementById('continueBtn') as HTMLButtonElement,
    concludeBtn: document.getElementById('concludeBtn') as HTMLButtonElement,
    postRunStatus: document.getElementById('postRunStatus') as HTMLElement,

    exportLastBtn: document.getElementById('exportLastBtn') as HTMLButtonElement,
    exportFullBtn: document.getElementById('exportFullBtn') as HTMLButtonElement,
    exportStatus: document.getElementById('exportStatus') as HTMLElement,

    // Human Moderator
    humanModeratorCard: document.getElementById('humanModeratorCard') as HTMLElement,
    humanFeedbackInput: document.getElementById('humanFeedbackInput') as HTMLTextAreaElement,
    resumeWithFeedbackBtn: document.getElementById('resumeWithFeedbackBtn') as HTMLButtonElement,
    resumeSilentBtn: document.getElementById('resumeSilentBtn') as HTMLButtonElement,

    // Tabs
    tabActiveBtn: document.getElementById('tabActiveBtn') as HTMLButtonElement,
    tabHistoryBtn: document.getElementById('tabHistoryBtn') as HTMLButtonElement,
    tabActiveContent: document.getElementById('tabActiveContent') as HTMLElement,
    tabHistoryContent: document.getElementById('tabHistoryContent') as HTMLElement,

    // History
    historyList: document.getElementById('historyList') as HTMLElement,
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn') as HTMLButtonElement,
    historyDetailView: document.getElementById('historyDetailView') as HTMLElement,
    historyDetailTitle: document.getElementById('historyDetailTitle') as HTMLElement,
    historyDetailContent: document.getElementById('historyDetailContent') as HTMLElement,
    closeHistoryDetailBtn: document.getElementById('closeHistoryDetailBtn') as HTMLButtonElement
};

// Global variables
let currentHistorySessions: any[] = [];
let hasAttemptedAutoOpen = false;

// URL Checkers
const isGeminiUrl = (tab: chrome.tabs.Tab) => {
    try {
        if (tab.url && new URL(tab.url).hostname.includes("gemini.google.com")) return true;
        if (tab.pendingUrl && new URL(tab.pendingUrl).hostname.includes("gemini.google.com")) return true;
        return false;
    } catch { return false; }
};
const isChatUrl = (tab: chrome.tabs.Tab) => {
    try {
        if (tab.url) {
            const hn = new URL(tab.url).hostname;
            if (hn.includes("chatgpt.com") || hn.includes("openai.com")) return true;
        }
        if (tab.pendingUrl) {
            const hn = new URL(tab.pendingUrl).hostname;
            if (hn.includes("chatgpt.com") || hn.includes("openai.com")) return true;
        }
        return false;
    } catch { return false; }
};

function attemptAutoSpawn() {
    if (hasAttemptedAutoOpen) return;

    chrome.tabs.query({}, (tabs) => {
        const hasGemini = tabs.some(t => isGeminiUrl(t));
        const hasChat = tabs.some(t => isChatUrl(t));

        let openedAny = false;
        if (!hasGemini) {
            chrome.tabs.create({ url: "https://gemini.google.com/app", active: false });
            openedAny = true;
        }
        if (!hasChat) {
            chrome.tabs.create({ url: "https://chatgpt.com", active: false });
            openedAny = true;
        }

        if (openedAny) setTimeout(refreshTabs, 1500);
        hasAttemptedAutoOpen = true; // Mark as attempted
    });
}

// --- Initialization ---

function updateDynamicTexts() {
    pollStatus();
    refreshTabs();
    if (document.getElementById('tabHistoryBtn')?.classList.contains('active')) {
        loadHistory();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    currentLang = await getLanguage();
    applyTranslationsToDOM(currentLang);

    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
        langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
        langBtn.addEventListener('click', async () => {
            currentLang = currentLang === 'en' ? 'ar' : 'en';
            await setLanguage(currentLang);
            applyTranslationsToDOM(currentLang);
            langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
            updateDynamicTexts();
        });
    }

    attemptAutoSpawn();

    refreshTabs();
    pollStatus();
    setInterval(() => {
        pollStatus();
        refreshTabs(); // Poll tabs so dropdowns update dynamically
    }, 2000);

    // Event Listeners
    ELEMENTS.startBtn.addEventListener('click', startRun);
    ELEMENTS.pauseBtn.addEventListener('click', pauseRun);
    ELEMENTS.stopBtn.addEventListener('click', stopRun);
    ELEMENTS.clearLogsBtn.addEventListener('click', clearLogs);
    ELEMENTS.continueBtn.addEventListener('click', continueRun);
    ELEMENTS.concludeBtn.addEventListener('click', generateConclusion);

    // Human Mode actions
    ELEMENTS.resumeWithFeedbackBtn.addEventListener('click', () => resumeRun(true));
    ELEMENTS.resumeSilentBtn.addEventListener('click', () => resumeRun(false));

    ELEMENTS.exportLastBtn.addEventListener('click', () => handleExport('last'));
    ELEMENTS.exportFullBtn.addEventListener('click', () => handleExport('full'));

    ELEMENTS.roleSelect.addEventListener('change', () => {
        ELEMENTS.customRoleInputs.style.display = ELEMENTS.roleSelect.value === 'CUSTOM' ? 'block' : 'none';
    });

    // Tabs
    ELEMENTS.tabActiveBtn.addEventListener('click', () => switchTab('active'));
    ELEMENTS.tabHistoryBtn.addEventListener('click', () => switchTab('history'));

    // History Actions
    ELEMENTS.refreshHistoryBtn.addEventListener('click', loadHistory);
    ELEMENTS.closeHistoryDetailBtn.addEventListener('click', () => {
        ELEMENTS.historyDetailView.style.display = 'none';
    });
});

// --- Logic ---

function refreshTabs() {
    chrome.tabs.query({}, (tabs) => {
        const geminiTabs = tabs.filter(t => isGeminiUrl(t));
        const chatGPTTabs = tabs.filter(t => isChatUrl(t));

        populateSelect(ELEMENTS.geminiSelect, geminiTabs);
        populateSelect(ELEMENTS.chatGPTSelect, chatGPTTabs);
    });
}

function populateSelect(select: HTMLSelectElement, tabs: chrome.tabs.Tab[]) {
    const savedId = select.value;
    select.innerHTML = '';

    if (tabs.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = t('noTabsFound', currentLang);
        opt.value = "";
        select.appendChild(opt);
        return;
    }

    tabs.forEach(tab => {
        const opt = document.createElement('option');
        opt.value = String(tab.id);
        opt.textContent = (tab.title || "Untitled").substring(0, 40) + '...';
        select.appendChild(opt);
    });

    // Restore selection if still valid, else default to first
    if (savedId && tabs.some(t => String(t.id) === savedId)) {
        select.value = savedId;
    } else if (select.options.length > 0) {
        select.value = select.options[0].value;
    }
}

function pollStatus() {
    chrome.runtime.sendMessage({ action: "getBrainstormState" }, (state: BrainstormState) => {
        if (!state) return; // Background might be inactive
        updateUI(state);
    });
}

function updateUI(state: BrainstormState) {
    // Status Badge
    let statusText = state.active ? t('running', currentLang) : t('idle', currentLang);
    let statusClass = state.active ? "running" : "idle";
    if (state.active && (state as any).isPaused) {
        statusText = t('paused', currentLang);
        statusClass = "idle"; // Give it a different tone, maybe warning color if we had one
    }

    ELEMENTS.statusBadge.textContent = statusText;
    ELEMENTS.statusBadge.className = `badge ${statusClass}`;

    // Controls visibility
    if (state.active) {
        ELEMENTS.startBtn.style.display = 'none';

        if ((state as any).isPaused) {
            ELEMENTS.pauseBtn.style.display = 'none';
            ELEMENTS.humanModeratorCard.style.display = 'flex';
        } else {
            ELEMENTS.pauseBtn.style.display = 'inline-block';
            ELEMENTS.humanModeratorCard.style.display = 'none';
        }

        ELEMENTS.stopBtn.style.display = 'inline-block';
        ELEMENTS.postRunActionsCard.style.display = 'none';
        toggleInputs(false);
    } else {
        ELEMENTS.startBtn.style.display = 'inline-block';
        ELEMENTS.pauseBtn.style.display = 'none';
        ELEMENTS.stopBtn.style.display = 'none';
        ELEMENTS.humanModeratorCard.style.display = 'none';
        toggleInputs(true);

        // Show post-run actions if loop finished
        if (state.currentRound > 0 && state.currentRound >= state.rounds) {
            ELEMENTS.postRunActionsCard.style.display = 'block';
        } else {
            ELEMENTS.postRunActionsCard.style.display = 'none';
        }
    }

    // Sync input values (only if we're not typing? simplify: sync if running, ignore if idle to allow edit)
    if (state.active) {
        ELEMENTS.roundsInput.value = String(state.rounds);
        ELEMENTS.roleSelect.value = state.role;
        ELEMENTS.customRoleInputs.style.display = state.role === 'CUSTOM' ? 'block' : 'none';

        if (state.role === 'CUSTOM') {
            ELEMENTS.geminiPromptInput.value = state.customGeminiPrompt || "";
            ELEMENTS.chatGPTPromptInput.value = state.customChatGPTPrompt || "";
        }
        // ELEMENTS.topicInput.value = state.prompt; // Optional: don't overwrite if user is reading

        if (state.geminiTabId) ELEMENTS.geminiSelect.value = String(state.geminiTabId);
        if (state.chatGPTTabId) ELEMENTS.chatGPTSelect.value = String(state.chatGPTTabId);
    }

    // Logs
    renderLogs(state.statusLog);
}

function toggleInputs(enabled: boolean) {
    ELEMENTS.geminiSelect.disabled = !enabled;
    ELEMENTS.chatGPTSelect.disabled = !enabled;
    ELEMENTS.roundsInput.disabled = !enabled;
    ELEMENTS.modeSelect.disabled = !enabled;
    ELEMENTS.roleSelect.disabled = !enabled;
    ELEMENTS.geminiPromptInput.disabled = !enabled;
    ELEMENTS.chatGPTPromptInput.disabled = !enabled;
    ELEMENTS.topicInput.disabled = !enabled;
}

let lastLogCount = 0;
function renderLogs(logs: string[]) {
    if (!logs || logs.length === lastLogCount) return;

    // Simple diff: just append new ones or redraw if simpler
    ELEMENTS.logsArea.innerHTML = '';
    logs.forEach(line => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.textContent = line;

        if (line.includes('[Error]')) div.classList.add('error');
        if (line.includes('[System]')) div.classList.add('system');

        ELEMENTS.logsArea.appendChild(div);
    });

    ELEMENTS.logsArea.scrollTop = ELEMENTS.logsArea.scrollHeight;
    lastLogCount = logs.length;
}

function startRun() {
    const geminiId = parseInt(ELEMENTS.geminiSelect.value);
    const chatGPTId = parseInt(ELEMENTS.chatGPTSelect.value);
    const rounds = parseInt(ELEMENTS.roundsInput.value);
    const role = ELEMENTS.roleSelect.value;
    const mode = ELEMENTS.modeSelect.value;
    const topic = ELEMENTS.topicInput.value.trim();

    let customGeminiPrompt = "";
    let customChatGPTPrompt = "";
    if (role === 'CUSTOM') {
        customGeminiPrompt = ELEMENTS.geminiPromptInput.value.trim();
        customChatGPTPrompt = ELEMENTS.chatGPTPromptInput.value.trim();
    }

    if (!geminiId || !chatGPTId) {
        logLocal(t('errorTabsMissing', currentLang));
        return;
    }
    if (!topic) {
        logLocal(t('errorTopicEmpty', currentLang));
        return;
    }

    chrome.runtime.sendMessage({
        action: "startBrainstorm",
        geminiTabId: geminiId,
        chatGPTTabId: chatGPTId,
        rounds,
        mode,
        topic,
        role,
        customGeminiPrompt,
        customChatGPTPrompt
    }, (response) => {
        if (!response || !response.success) {
            logLocal("Error starting: " + (response?.error || "Unknown"));
        } else {
            logLocal(t('systemStartCommand', currentLang));
        }
    });
}

function pauseRun() {
    chrome.runtime.sendMessage({ action: "pauseBrainstorm" }, (res) => {
        if (!res || !res.success) logLocal("Failed to pause: " + (res?.error || "Unknown"));
    });
}

function resumeRun(withFeedback: boolean) {
    const feedback = withFeedback ? ELEMENTS.humanFeedbackInput.value.trim() : "";
    if (withFeedback && !feedback) {
        alert(t('enterFeedback', currentLang));
        return;
    }

    // Clear the box for next time
    ELEMENTS.humanFeedbackInput.value = "";

    chrome.runtime.sendMessage({ action: "resumeBrainstorm", feedback }, (res) => {
        if (!res || !res.success) logLocal("Failed to resume: " + (res?.error || "Unknown"));
    });
}

function stopRun() {
    chrome.runtime.sendMessage({ action: "stopBrainstorm" });
}

function continueRun() {
    const additionalRounds = parseInt(ELEMENTS.continueRoundsInput.value) || 2;
    ELEMENTS.postRunStatus.textContent = t('continuing', currentLang);
    chrome.runtime.sendMessage({
        action: "continueBrainstorm",
        additionalRounds
    }, (response) => {
        if (!response || !response.success) {
            logLocal("Error continuing: " + (response?.error || "Unknown"));
            ELEMENTS.postRunStatus.textContent = t('failedToContinue', currentLang);
        } else {
            ELEMENTS.postRunStatus.textContent = "";
        }
    });
}

function generateConclusion() {
    ELEMENTS.postRunStatus.textContent = t('generatingConclusion', currentLang);
    chrome.runtime.sendMessage({
        action: "generateConclusion"
    }, (response) => {
        if (!response || !response.success) {
            logLocal("Error generating conclusion: " + (response?.error || "Unknown"));
            ELEMENTS.postRunStatus.textContent = t('failedToGenerate', currentLang);
        } else {
            ELEMENTS.postRunStatus.textContent = t('conclusionGenerated', currentLang);
        }
    });
}

function clearLogs() {
    // We can clear local UI but strict state is in BG. 
    // We might want to send a clearLogs to BG? 
    // For now, allow BG logs to persist until next run clears them.
    // Or we just clear the UI and let it refresh? 
    // If we want to truly clear, we need an action.
    // Let's just clear the UI for now, but polling will bring it back if BG has it.
    // We'll trust that startBrainstorm resets logs in BG.
}

function logLocal(msg: string) {
    const div = document.createElement('div');
    div.className = 'log-entry system';
    div.textContent = msg;
    ELEMENTS.logsArea.appendChild(div);
    ELEMENTS.logsArea.scrollTop = ELEMENTS.logsArea.scrollHeight;
}

// --- Export ---

async function handleExport(type: 'last' | 'full') {
    ELEMENTS.exportStatus.textContent = t('exporting', currentLang);

    // Determine which tab is 'active' for export context?
    // Actually, user might want to export from specific tab.
    // Let's default to exporting from the tab that was LAST active in the orchestration, 
    // or allow picking. 
    // The requirement says: "Export last assistant response (selected tab)"
    // We have two selected tabs (Gemini / ChatGPT). 
    // Let's guess: Try to export from both? Or just the one that matches the current turn?
    // SIMPLIFICATION: Export from the detected "Chat" tab that is currently capable of exporting.
    // Better: Allow user to say "Export Gemini" or "Export ChatGPT"?
    // "Export buttons: Export last assistant response (selected tab)" implies UI has a tab selector?
    // We have the configuration dropdowns. Let's use those.
    // We will try the CHATGPT tab first, then GEMINI, or vice behavior?
    // Let's just try to export from the tab the user has selected in the dropdowns.

    // Which one? We have two dropdowns.
    // Let's check which dropdown has a value.
    const gId = parseInt(ELEMENTS.geminiSelect.value);
    const cId = parseInt(ELEMENTS.chatGPTSelect.value);

    // We'll export from BOTH if possible and combine? No, that's messy.
    // Let's pop a small modal or just try ChatGPT first as it's usually the 'final' output in a ping pong.
    // OR we provide 4 buttons? Too cluttered.

    // Let's send a message to background to "Export from active loop participants".
    // Or just pick ChatGPT if available, else Gemini.
    const targetTabId = cId || gId;
    if (!targetTabId) {
        ELEMENTS.exportStatus.textContent = t('noTabSelected', currentLang);
        return;
    }

    try {
        // We can do this via Background or direct injection if we have host permissions.
        // We'll route through BG to keep logic central? Or just sendMessage to content script directly.
        // Panel -> Tab is allowed if we have tab ID.

        // We need to inject content script if not there.
        await chrome.scripting.executeScript({
            target: { tabId: targetTabId },
            files: ['content.js']
        }).catch(() => { }); // Ignore if already there

        const action = type === 'last' ? 'getLastResponse' : 'scrapeConversation';

        chrome.tabs.sendMessage(targetTabId, { action }, (response) => {
            if (chrome.runtime.lastError || !response) {
                ELEMENTS.exportStatus.textContent = t('errorCommunicating', currentLang);
                return;
            }

            const text = response.text;
            if (!text) {
                ELEMENTS.exportStatus.textContent = t('noContentFound', currentLang);
                return;
            }

            // Instead of downloading, save to storage and open new tab
            chrome.storage.local.set({
                transcriptData: text,
                transcriptMeta: {
                    title: `Active Run Export (${type})`,
                    date: Date.now(),
                    filename: `export-${type}-${Date.now()}.md`
                }
            }, () => {
                chrome.tabs.create({ url: 'transcript.html' });
                ELEMENTS.exportStatus.textContent = t('exportDone', currentLang);
            });
        });

    } catch (e) {
        ELEMENTS.exportStatus.textContent = t('exportFailed', currentLang);
    }
}

function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ---- Tabs and History Logic ----

function switchTab(tab: 'active' | 'history') {
    if (tab === 'active') {
        ELEMENTS.tabActiveBtn.classList.add('active');
        ELEMENTS.tabActiveContent.classList.add('active');
        ELEMENTS.tabHistoryBtn.classList.remove('active');
        ELEMENTS.tabHistoryContent.classList.remove('active');
    } else {
        ELEMENTS.tabHistoryBtn.classList.add('active');
        ELEMENTS.tabHistoryContent.classList.add('active');
        ELEMENTS.tabActiveBtn.classList.remove('active');
        ELEMENTS.tabActiveContent.classList.remove('active');
        loadHistory();
    }
}

function loadHistory() {
    ELEMENTS.historyList.innerHTML = `<div class="status-text">${t('loading', currentLang)}</div>`;

    chrome.runtime.sendMessage({ action: "getAllSessions" }, (sessions) => {
        if (!sessions || sessions.length === 0) {
            ELEMENTS.historyList.innerHTML = `<div class="status-text">${t('noHistoryFound', currentLang)}</div>`;
            return;
        }

        currentHistorySessions = sessions;
        ELEMENTS.historyList.innerHTML = '';

        sessions.forEach((s: any) => {
            const date = new Date(s.timestamp).toLocaleString();

            const item = document.createElement('div');
            item.className = 'history-item';

            const header = document.createElement('div');
            header.className = 'history-item-header';

            // Try to map role constant to translation key
            const roleKey = `role${s.role.charAt(0).toUpperCase() + s.role.slice(1).toLowerCase().replace(/_([a-z])/g, (g: string) => g[1].toUpperCase())}`;
            const displayRole = t(roleKey as any, currentLang) !== roleKey ? t(roleKey as any, currentLang) : s.role;

            header.innerHTML = `<span>${t('role', currentLang)}: ${displayRole}</span><span>${date}</span>`;

            const topic = document.createElement('div');
            topic.className = 'history-item-topic';
            topic.textContent = s.topic;
            topic.title = s.topic; // Tooltip for full text

            const actions = document.createElement('div');
            actions.className = 'history-item-actions';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn secondary';
            viewBtn.textContent = t('view', currentLang);
            viewBtn.onclick = () => viewHistorySession(s.id);

            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn primary';
            exportBtn.textContent = t('export', currentLang);
            exportBtn.onclick = () => exportHistorySession(s.id);

            const delBtn = document.createElement('button');
            delBtn.className = 'btn danger';
            delBtn.textContent = t('del', currentLang);
            delBtn.onclick = () => deleteHistorySession(s.id);

            actions.appendChild(viewBtn);
            actions.appendChild(exportBtn);
            actions.appendChild(delBtn);

            item.appendChild(header);
            item.appendChild(topic);
            item.appendChild(actions);

            ELEMENTS.historyList.appendChild(item);
        });
    });
}

function viewHistorySession(id: string) {
    const session = currentHistorySessions.find(s => s.id === id);
    if (!session) return;

    ELEMENTS.historyDetailTitle.textContent = "Transcript"; // keeping it simple
    ELEMENTS.historyDetailContent.innerHTML = ''; // clear

    session.transcript.forEach((entry: any) => {
        const div = document.createElement('div');
        div.className = `log-entry ${entry.agent === 'System' ? 'system' : ''}`;
        
        let formattedText = entry.text;
        
        // Highlight Escalation blocks beautifully
        formattedText = formattedText.replace(
            /\[ESCALATION_REQUIRED\]([\s\S]*?)\[\/ESCALATION_REQUIRED\]/ig, 
            (match: string, p1: string) => {
                return `<div style="background:var(--bg-secondary); border-left:4px solid var(--primary-color); padding:8px; margin:8px 0; border-radius:4px;">
                            <strong>⚠️ Escalation Required</strong><br/>
                            <div style="white-space:pre-wrap; font-size:0.9em; margin-top:4px;">${p1.trim()}</div>
                        </div>`;
            }
        ).replace(/\n/g, '<br/>');

        div.innerHTML = `<strong>${entry.agent}:</strong><br/>${formattedText}`;
        ELEMENTS.historyDetailContent.appendChild(div);
    });

    ELEMENTS.historyDetailView.style.display = 'flex';
}

function exportHistorySession(id: string) {
    const session = currentHistorySessions.find(s => s.id === id);
    if (!session) return;

    let md = `# Brainstorm Session\n**Topic:** ${session.topic}\n**Role:** ${session.role}\n**Date:** ${new Date(session.timestamp).toLocaleString()}\n\n---\n\n`;

    session.transcript.forEach((entry: any) => {
        md += `### ${entry.agent}\n${entry.text}\n\n`;
    });

    // Instead of downloading, save to storage and open new tab
    chrome.storage.local.set({
        transcriptData: md,
        transcriptMeta: {
            title: `History: ${session.topic.substring(0, 30)}...`,
            date: session.timestamp,
            filename: `session_${id}.md`
        }
    }, () => {
        chrome.tabs.create({ url: 'transcript.html' });
    });
}

function deleteHistorySession(id: string) {
    if (!confirm(t('deleteConfirm', currentLang))) return;
    chrome.runtime.sendMessage({ action: "deleteSession", id }, (res) => {
        if (res && res.success) {
            loadHistory();
            ELEMENTS.historyDetailView.style.display = 'none';
        }
    });
}
