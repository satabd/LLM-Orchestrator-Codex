import { BrainstormState } from './types'; // We'll define types.ts or just inline it if lazy. Let's inline for simplicity.

// Inline Interface (matching background.ts)
interface BrainstormState {
  active: boolean;
  prompt: string;
  role: string;
  rounds: number;
  currentRound: number;
  geminiTabId: number | null;
  chatGPTTabId: number | null;
  statusLog: string[];
}

interface StartResponse {
  success: boolean;
  error?: string;
}

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
  const autoCopyToggle = document.getElementById('autoCopyToggle') as HTMLInputElement;
  const topicInput = document.getElementById('topicInput') as HTMLInputElement;
  const roundsInput = document.getElementById('roundsInput') as HTMLInputElement;
  const startBrainstormBtn = document.getElementById('startBrainstormBtn') as HTMLButtonElement;
  const stopBrainstormBtn = document.getElementById('stopBrainstormBtn') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLElement;

  // --- Helper Functions ---

  function getActiveTab(): Promise<chrome.tabs.Tab | null> {
    return new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs?.[0] || null)));
  }

  function execContentScript(tabId: number) {
    return chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }

  function sendToTab(tabId: number, msg: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, msg, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) reject(err);
        else resolve(resp);
      });
    });
  }

  function inferPrefixFromUrl(url: string | undefined): string {
    try {
      if (!url) return 'ai-chat';
      const host = new URL(url).hostname;
      if (host.includes('gemini.google.com')) return 'gemini-chat';
      if (host.includes('chatgpt.com') || host.includes('openai.com')) return 'chatgpt-chat';
    } catch (e) { }
    return 'ai-chat';
  }

  function updateStatus(lines: string[]) {
    if (!statusDiv) return;
    statusDiv.textContent = lines.join('\n');
    statusDiv.scrollTop = statusDiv.scrollHeight;
  }

  async function pollBrainstormStatus() {
    chrome.runtime.sendMessage({ action: 'getBrainstormState' }, (state: BrainstormState) => {
      if (chrome.runtime.lastError || !state) return;

      // Update Dashboard
      const dashStatus = document.getElementById('dashStatus');
      const dashRound = document.getElementById('dashRound');

      if (dashStatus) {
        dashStatus.textContent = state.active ? "Running" : "Idle";
        dashStatus.style.color = state.active ? "#4caf50" : "#888"; // Green vs Grey
      }
      if (dashRound) {
        dashRound.textContent = `${state.currentRound}/${state.rounds}`;
      }

      if (state.active) {
        if (startBrainstormBtn) startBrainstormBtn.style.display = 'none';
        if (stopBrainstormBtn) stopBrainstormBtn.style.display = 'inline-block';
        if (topicInput) topicInput.disabled = true;
        if (roundsInput) roundsInput.disabled = true;
      } else {
        if (startBrainstormBtn) startBrainstormBtn.style.display = 'inline-block';
        if (stopBrainstormBtn) stopBrainstormBtn.style.display = 'none';
        if (topicInput) topicInput.disabled = false;
        if (roundsInput) roundsInput.disabled = false;
      }

      updateStatus(state.statusLog || []);
    });
  }

  // --- Export / Copy Logic ---

  async function handleAction(action: 'save' | 'copy') {
    const tab = await getActiveTab();
    if (!tab?.id) return;

    try {
      await execContentScript(tab.id);
      const response = await sendToTab(tab.id, { action: 'scrapeConversation' });
      const markdownText = response?.text || '';

      if (!markdownText.trim()) {
        alert("No content found.");
        return;
      }

      if (action === 'save') {
        downloadMarkdown(markdownText, tab.url);
      } else if (action === 'copy') {
        await navigator.clipboard.writeText(markdownText);
        alert("Copied to clipboard!");
      }

    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Make sure you're on ChatGPT or Gemini and refresh the page once.");
    }
  }

  function downloadMarkdown(markdownText: string, url: string | undefined) {
    const blob = new Blob([markdownText], { type: 'text/markdown' });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const prefix = inferPrefixFromUrl(url);
    const now = new Date();
    const safeTs = now.toISOString().replace(/[:.]/g, '-');

    a.href = urlObj;
    a.download = `${prefix}-${safeTs}.md`;
    a.click();

    URL.revokeObjectURL(urlObj);
  }

  if (saveBtn) saveBtn.addEventListener('click', () => handleAction('save'));
  if (copyBtn) copyBtn.addEventListener('click', () => handleAction('copy'));

  // --- Auto-Copy Logic ---

  chrome.storage.local.get(['autoCopyEnabled'], (result) => {
    if (autoCopyToggle) autoCopyToggle.checked = !!result.autoCopyEnabled;
  });

  if (autoCopyToggle) {
    autoCopyToggle.addEventListener('change', async () => {
      const enabled = autoCopyToggle.checked;
      chrome.storage.local.set({ autoCopyEnabled: enabled });

      const tab = await getActiveTab();
      if (!tab?.id) return;

      try {
        await execContentScript(tab.id);
        await sendToTab(tab.id, { action: 'toggleAutoCopy', enabled });
      } catch (err) { }
    });
  }

  // --- Brainstorm Loop Logic ---

  if (startBrainstormBtn) {
    startBrainstormBtn.addEventListener('click', () => {
      const topic = topicInput.value.trim();
      const rounds = parseInt(roundsInput.value, 10) || 3;

      if (!topic) {
        alert("Please enter a topic.");
        return;
      }

      chrome.runtime.sendMessage({ action: 'startBrainstorm', topic, rounds }, (resp: StartResponse) => {
        if (resp && resp.success) {
          pollBrainstormStatus();
        } else {
          alert("Failed to start: " + (resp?.error || "Unknown error"));
        }
      });
    });
  }

  if (stopBrainstormBtn) {
    stopBrainstormBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'stopBrainstorm' });
    });
  }

  // Start polling for status immediately
  setInterval(pollBrainstormStatus, 1000);
  pollBrainstormStatus();
});