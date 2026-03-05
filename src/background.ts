// Brainstorm Orchestrator (Role-Based)
// Runs in MV3 Service Worker context.

import { createSession, updateSession, getAllSessions, deleteSession, BrainstormSession } from './db.js';

interface BrainstormState {
    active: boolean;
    sessionId: string | null;
    prompt: string;
    role: string;
    customGeminiPrompt?: string;
    customChatGPTPrompt?: string;
    rounds: number;
    currentRound: number;
    geminiTabId: number | null;
    chatGPTTabId: number | null;
    statusLog: string[];
    isPaused: boolean;
    humanFeedback: string | null;
}

const DEFAULT_STATE: BrainstormState = {
    active: false,
    sessionId: null,
    prompt: "",
    role: "CRITIC",
    rounds: 3,
    currentRound: 0,
    geminiTabId: null,
    chatGPTTabId: null,
    statusLog: [],
    isPaused: false,
    humanFeedback: null
};

let brainstormState: BrainstormState = { ...DEFAULT_STATE };
let isRestoring = true;

// --- Persistence ---

function saveState() {
    chrome.storage.local.set({ 'brainstormState': brainstormState });
}

async function loadState() {
    return new Promise<void>(resolve => {
        chrome.storage.local.get(['brainstormState'], (result) => {
            if (result.brainstormState) {
                brainstormState = result.brainstormState;
                // Safety: Force active=false on reload to prevent auto-start bugs
                brainstormState.active = false;
                saveState();
            }
            isRestoring = false;
            resolve();
        });
    });
}

// Initialize
loadState();

// Configure the side panel to open natively when the extension icon is clicked
// This avoids manual `chrome.sidePanel.open` calls which can throw internal core.js payload errors
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ---- Log Helper ----
function log(msg: string, type: 'info' | 'error' | 'system' = 'info') {
    const entry = `[${type === 'info' ? 'Info' : type === 'error' ? 'Error' : 'System'}] ${msg}`;
    console.log(entry);
    if (brainstormState.statusLog.length > 50) brainstormState.statusLog.shift();
    brainstormState.statusLog.push(entry);
    saveState();
}

// ---- Promise wrappers for messaging ----
function sendMessage(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (resp) => {
            const err = chrome.runtime.lastError;
            if (err) resolve(null);
            else resolve(resp);
        });
    });
}

async function ensureInjected(tabId: number) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
        });
    } catch (err: any) { }
}

// ---- Role Definitions ----

const ROLE_PROMPTS: Record<string, {
    geminiInit: (topic: string, cp?: string) => string;
    geminiLoop: (feedback: string, cp?: string) => string;
    chatGPTLoop: (proposal: string, cp?: string) => string;
}> = {
    CRITIC: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nPlease provide a comprehensive, novel, and detailed exploration of this topic.`,
        geminiLoop: (feedback) => `Here is feedback from a Reviewer:\n---\n${feedback}\n---\n\nPlease refine your ideas based on this critique. Output the updated version.`,
        chatGPTLoop: (proposal) => `You are a Critical Reviewer.\n\nProposal:\n---\n${proposal}\n---\n\nCritique this. Find flaws, missing edge cases, or security risks.`
    },
    EXPANDER: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nProvide an initial creative concept for this topic. Keep it open-ended.`,
        geminiLoop: (addition) => `Your collaborator added the following ideas:\n---\n${addition}\n---\n\nUsing the 'Yes, And...' principle, accept their additions and expand the concept further in a new direction.`,
        chatGPTLoop: (concept) => `Your collaborator proposed this concept:\n---\n${concept}\n---\n\nUsing the 'Yes, And...' principle, accept this concept and add new, highly creative dimensions or features to it without criticizing.`
    },
    ARCHITECT: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are a Visionary Product Leader. Pitch a bold, high-level vision for this topic, focusing on user experience, value, and disruption.`,
        geminiLoop: (feedback) => `The Systems Architect responded with this feasibility analysis:\n---\n${feedback}\n---\n\nDefend your vision or adapt it based on these constraints, maintaining the visionary perspective.`,
        chatGPTLoop: (proposal) => `You are a Systems Architect. The Visionary just proposed:\n---\n${proposal}\n---\n\nAnalyze the technical feasibility, potential bottlenecks, system requirements, and suggest realistic architectural approaches to build this.`
    },
    DEV_ADVOCATE: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nPropose a robust, complete solution or thesis for this topic. Be definitive.`,
        geminiLoop: (critique) => `The Devil's Advocate attacked your proposal:\n---\n${critique}\n---\n\nRebut their attacks, patch the vulnerabilities in your logic, and present a stronger proposal.`,
        chatGPTLoop: (proposal) => `You are the Devil's Advocate. Your job is to destroy this proposal:\n---\n${proposal}\n---\n\nFind every logical fallacy, market weakness, performance issue, or security hole. Do not hold back.`
    },
    FIRST_PRINCIPLES: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are the Deconstructor. Break this topic down into its absolute, undeniable fundamental truths and physical/logical constraints. Strip away all industry assumptions.`,
        geminiLoop: (synthesis) => `The Synthesizer built this solution from your principles:\n---\n${synthesis}\n---\n\nDeconstruct their solution. Are they relying on any hidden assumptions? Break it down again.`,
        chatGPTLoop: (truths) => `Here are the fundamental truths of the problem:\n---\n${truths}\n---\n\nYou are the Synthesizer. Build a completely novel, unconventional solution from the ground up using ONLY these fundamental truths.`
    },
    INTERVIEWER: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are a world-class Domain Expert explaining this topic at a high level.`,
        geminiLoop: (question) => `The Interviewer asks:\n---\n${question}\n---\n\nProvide a deeply nuanced, expert answer.`,
        chatGPTLoop: (answer) => `The Expert says:\n---\n${answer}\n---\n\nYou are a probing Journalist. Ask one highly specific, clarifying follow-up question to force them to go deeper or explain hard jargon.`
    },
    FIVE_WHYS: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nState the core problem or standard solution associated with this topic.`,
        geminiLoop: (why) => `Response:\n---\n${why}\n---\n\nAnswer the "Why" to drill deeper into the root cause.`,
        chatGPTLoop: (statement) => `Statement:\n---\n${statement}\n---\n\nAsk "Why is that the case?" or "Why does that happen?" to drill down into the root cause.`
    },
    HISTORIAN_FUTURIST: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are a Historian. Analyze this topic based on historical precedents, past failures, and established data.`,
        geminiLoop: (future) => `The Futurist predicts:\n---\n${future}\n---\n\nCheck their prediction against history. What historical cycles or human behaviors might disrupt their sci-fi scenario?`,
        chatGPTLoop: (history) => `The Historian notes:\n---\n${history}\n---\n\nYou are a Futurist. Project this 50 years into the future. How will emerging tech and societal shifts evolve this past the historical constraints?`
    },
    ELI5: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nProvide a highly complex, academic, and technically precise explanation of this topic.`,
        geminiLoop: (eli5) => `Here is the simplified ELI5 version:\n---\n${eli5}\n---\n\nCorrect any oversimplifications or lost nuances while keeping it accessible.`,
        chatGPTLoop: (academic) => `Academic Explanation:\n---\n${academic}\n---\n\nTranslate this into an "Explain Like I'm 5" (ELI5) version using simple metaphors.`
    },
    CUSTOM: {
        geminiInit: (topic, cp) => `${cp}\n\nHere is the initial topic:\n---\n${topic}\n---`,
        geminiLoop: (feedback, cp) => `${cp}\n\nHere is the latest input from the collaborator:\n---\n${feedback}\n---`,
        chatGPTLoop: (proposal, cp) => `${cp}\n\nHere is the latest input from the collaborator:\n---\n${proposal}\n---`
    }
};

// ---- Event Listeners ----

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 0. DB Operations
    if (request.action === "getAllSessions") {
        getAllSessions().then(sessions => { sendResponse(sessions); }).catch(e => { sendResponse([]); });
        return true;
    }
    if (request.action === "deleteSession") {
        deleteSession(request.id).then(() => { sendResponse({ success: true }); }).catch(e => { sendResponse({ success: false }); });
        return true;
    }

    // 1. GET STATUS
    if (request.action === "getBrainstormState") {
        sendResponse(brainstormState);
        return false;
    }

    // 2. STOP
    if (request.action === "stopBrainstorm") {
        brainstormState.active = false;
        log("Stopped by user.", 'system');
        saveState();
        sendResponse({ success: true });
        return true;
    }

    // 3. START
    if (request.action === "startBrainstorm") {
        (async () => {
            if (isRestoring) await loadState();

            const { topic, rounds, role, customGeminiPrompt, customChatGPTPrompt, geminiTabId, chatGPTTabId } = request;

            if (!geminiTabId || !chatGPTTabId) {
                sendResponse({ success: false, error: "Missing tab IDs." });
                return;
            }

            const sessionId = crypto.randomUUID();

            brainstormState = {
                active: true,
                sessionId,
                prompt: topic,
                role: role || "CRITIC",
                customGeminiPrompt,
                customChatGPTPrompt,
                rounds: rounds || 3,
                currentRound: 0,
                geminiTabId,
                chatGPTTabId,
                statusLog: [],
                isPaused: false,
                humanFeedback: null
            };

            log(`Starting run: ${rounds} rounds...`, 'system');
            saveState();

            // Initialize DB Session
            try {
                await createSession({
                    id: sessionId,
                    topic: topic,
                    role: brainstormState.role,
                    timestamp: Date.now(),
                    transcript: [{ agent: 'User', text: topic }]
                });
            } catch (e: any) {
                log(`Failed to create DB session: ${e.message}`, 'error');
            }

            runBrainstormLoop().catch(e => {
                log(`Loop fatal error: ${e.message}`, 'error');
                brainstormState.active = false;
                saveState();
            });

            sendResponse({ success: true });
        })();
        return true;
    }

    // 4. CONTINUE RUN
    if (request.action === "continueBrainstorm") {
        (async () => {
            if (!brainstormState.geminiTabId || !brainstormState.chatGPTTabId) {
                sendResponse({ success: false, error: "Tab IDs missing. Start a new run instead." });
                return;
            }
            if (brainstormState.active) {
                sendResponse({ success: false, error: "Run is already active." });
                return;
            }

            const additionalRounds = request.additionalRounds || 2;
            brainstormState.rounds += additionalRounds;
            brainstormState.active = true;

            log(`Continuing run for ${additionalRounds} more rounds...`, 'system');
            saveState();

            // We do not reset `brainstormState.currentRound` or `brainstormState.prompt` (which holds the currentInput).
            // We just kick off the loop again.
            runBrainstormLoop().catch(e => {
                log(`Loop fatal error: ${e.message}`, 'error');
                brainstormState.active = false;
                saveState();
            });

            sendResponse({ success: true });
        })();
        return true;
    }

    // 5. GENERATE CONCLUSION
    if (request.action === "generateConclusion") {
        (async () => {
            if (!brainstormState.geminiTabId) {
                sendResponse({ success: false, error: "Gemini tab ID missing." });
                return;
            }
            if (brainstormState.active) {
                sendResponse({ success: false, error: "Run is active. Please wait for it to finish." });
                return;
            }

            brainstormState.active = true;
            log("Generating Final Conclusion via Gemini...", 'system');
            saveState();

            try {
                // The current input holds the LAST response (which is from ChatGPT).
                const synthesisPrompt = `The debate is now over. Here is the final thought from your collaborator:\n---\n${brainstormState.prompt}\n---\n\nPlease synthesize everything that has been discussed into a single, highly polished, definitive Final Conclusion or Executive Summary.`;

                const conclusionOutput = await sendPromptToTab(brainstormState.geminiTabId, synthesisPrompt);

                if (conclusionOutput) {
                    log("Conclusion generated successfully.", 'system');
                    brainstormState.prompt = conclusionOutput; // Save as the newest input just in case
                } else {
                    log("Failed to generate conclusion.", 'error');
                }
            } catch (err: any) {
                log(`Conclusion error: ${err.message}`, 'error');
            } finally {
                brainstormState.active = false;
                saveState();
            }

            sendResponse({ success: true });
        })();
        return true;
    }

    // 6. PAUSE (Human in the Loop)
    if (request.action === "pauseBrainstorm") {
        if (!brainstormState.active) {
            sendResponse({ success: false, error: "Run is not active." });
            return;
        }
        brainstormState.isPaused = true;
        log("Human Intervention: Run paused. Waiting for input...", 'system');
        saveState();
        sendResponse({ success: true });
        return true;
    }

    // 7. RESUME (Human in the Loop)
    if (request.action === "resumeBrainstorm") {
        if (!brainstormState.active || !brainstormState.isPaused) {
            sendResponse({ success: false, error: "Run is not paused." });
            return;
        }

        brainstormState.isPaused = false;

        if (request.feedback) {
            brainstormState.humanFeedback = request.feedback;
            log("Human Intervention: Feedback received. Resuming...", 'system');
            // Log the actual feedback for the history record
            brainstormState.statusLog.push(`[System] Moderator: ${request.feedback}`);

            if (brainstormState.sessionId) {
                updateSession(brainstormState.sessionId, { agent: 'System', text: `[Moderator Intervention]\n${request.feedback}` }).catch(() => { });
            }
        } else {
            log("Human Intervention: Run resumed without feedback.", 'system');
        }

        saveState();
        sendResponse({ success: true });
        return true;
    }

    return false;
});

// ---- Orchestration Engine ----

async function runBrainstormLoop() {
    let currentInput = brainstormState.prompt;

    // Fallback to CRITIC if role is missing or invalid
    const activeRole = ROLE_PROMPTS[brainstormState.role] ? brainstormState.role : "CRITIC";
    const roleConfig = ROLE_PROMPTS[activeRole];

    log(`Loop started with role: ${activeRole}`);

    try {
        while (brainstormState.active && brainstormState.currentRound < brainstormState.rounds) {

            brainstormState.currentRound++;
            saveState();
            log(`Round ${brainstormState.currentRound} initiating...`);

            // --- Gemini Turn ---
            // Wait if paused
            while (brainstormState.isPaused && brainstormState.active) {
                await wait(1000);
            }
            if (!brainstormState.active) break;

            log("Executing Gemini turn...");
            let geminiPrompt = "";
            let basePrompt = currentInput;

            if (brainstormState.humanFeedback) {
                basePrompt = `Here is the latest input from your collaborator:\n---\n${currentInput}\n---\n\n[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:\n---\n${brainstormState.humanFeedback}\n---\nAcknowledge the moderator's instructions and seamlessly incorporate them into your next response.`;
                brainstormState.humanFeedback = null;
                saveState();
            }

            if (brainstormState.currentRound === 1) {
                geminiPrompt = roleConfig.geminiInit(basePrompt, brainstormState.customGeminiPrompt);
            } else {
                geminiPrompt = roleConfig.geminiLoop(basePrompt, brainstormState.customGeminiPrompt);
            }

            const geminiOutput = await sendPromptToTab(brainstormState.geminiTabId!, geminiPrompt);
            if (!brainstormState.active) break;
            if (!geminiOutput) {
                log("Gemini produced no output. Aborting.", 'error');
                break;
            }

            if (brainstormState.sessionId) {
                await updateSession(brainstormState.sessionId, { agent: 'Gemini', text: geminiOutput }).catch(() => { });
            }

            await wait(2000);

            // --- ChatGPT Turn ---
            // Wait if paused
            while (brainstormState.isPaused && brainstormState.active) {
                await wait(1000);
            }
            if (!brainstormState.active) break;

            log("Executing ChatGPT turn...");

            let chatBasePrompt = geminiOutput;
            if (brainstormState.humanFeedback) {
                chatBasePrompt = `Here is the latest input from your collaborator:\n---\n${geminiOutput}\n---\n\n[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:\n---\n${brainstormState.humanFeedback}\n---\nAcknowledge the moderator's instructions and seamlessly incorporate them into your next response.`;
                brainstormState.humanFeedback = null; // Clear it so it doesn't leak into Gemini's next turn
                saveState();
            }

            const chatGPTPrompt = roleConfig.chatGPTLoop(chatBasePrompt, brainstormState.customChatGPTPrompt);

            const chatGPTOutput = await sendPromptToTab(brainstormState.chatGPTTabId!, chatGPTPrompt);
            if (!brainstormState.active) break;
            if (!chatGPTOutput) {
                log("ChatGPT produced no output. Aborting.", 'error');
                break;
            }

            currentInput = chatGPTOutput;
            // Update global state prompt so Continuation knows the last input
            brainstormState.prompt = currentInput;
            saveState();

            if (brainstormState.sessionId) {
                await updateSession(brainstormState.sessionId, { agent: 'ChatGPT', text: chatGPTOutput }).catch(() => { });
            }

            await wait(2000);
        }
    } catch (err: any) {
        log(`Loop crashed: ${err.message}`, 'error');
    } finally {
        brainstormState.active = false;
        log("Run completed or stopped.", 'system');
        saveState();
    }
}

async function sendPromptToTab(tabId: number, prompt: string): Promise<string> {
    await ensureInjected(tabId);

    // Focus the tab first to ensure the text inputs are active and visible in the DOM
    try {
        await chrome.tabs.update(tabId, { active: true });

        // Find the window this tab belongs to and make sure the window itself is focused
        const tab = await chrome.tabs.get(tabId);
        if (tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true });
        }

        // Wait a moment for Chrome's rendering engine to settle
        await wait(200);
    } catch (e) {
        log(`Failed to focus tab ${tabId}`, 'error');
    }

    let tries = 0;
    let sent = false;

    while (tries < 3 && !sent) {
        tries++;
        const res = await sendMessage(tabId, { action: "runPrompt", text: prompt });
        if (res?.status === 'done') sent = true;
        else await wait(1000);
    }

    if (!sent) {
        log(`Failed to send prompt to tab ${tabId}`, 'error');
        return "";
    }

    log("Waiting for generation...", 'info');
    await sendMessage(tabId, { action: "waitForDone" });

    const resp = await sendMessage(tabId, { action: "getLastResponse" });
    return resp?.text || "";
}

async function getTurnCount(tabId: number): Promise<number> {
    const res = await sendMessage(tabId, { action: "getUserTurnCount" });
    return res?.count || 0;
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
