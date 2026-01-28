// Brainstorm Orchestrator (Role-Based)
// Runs in MV3 Service Worker context.

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

let brainstormState: BrainstormState = {
    active: false,
    prompt: "",
    role: "DEFAULT",
    rounds: 1,
    currentRound: 0,
    geminiTabId: null,
    chatGPTTabId: null,
    statusLog: []
};

// ---- Promise wrappers ----
function sendMessage(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (resp) => {
            const err = chrome.runtime.lastError;
            if (err) reject(err);
            else resolve(resp);
        });
    });
}

function executeScript(tabId: number) {
    return chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"] // Points to the compiled JS file in dist/
    });
}

async function ensureInjected(tabId: number) {
    try {
        await executeScript(tabId);
    } catch (err: any) {
        // Injection can fail on restricted pages or if the tab is not ready.
        console.warn("Injection warning:", err?.message || err);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startBrainstorm") {
        // 1. Find Tabs
        chrome.tabs.query({}, (tabs) => {
            const geminiTab = tabs.find(t => t.url && t.url.includes("gemini.google.com"));
            const chatGPTTab = tabs.find(t => t.url && (t.url.includes("chatgpt.com") || t.url.includes("openai.com")));

            if (!geminiTab || !chatGPTTab || !geminiTab.id || !chatGPTTab.id) {
                sendResponse({
                    success: false,
                    error: `Missing tabs. Found Gemini: ${!!geminiTab}, ChatGPT: ${!!chatGPTTab}. Open both sites.`
                });
                return;
            }

            // 2. Init State
            brainstormState.active = true;
            brainstormState.prompt = request.topic || request.prompt;
            brainstormState.rounds = request.rounds || 3;
            brainstormState.role = "IDEATOR";
            brainstormState.currentRound = 0;
            brainstormState.statusLog = [];

            brainstormState.geminiTabId = geminiTab.id;
            brainstormState.chatGPTTabId = chatGPTTab.id;

            // 3. Start Loop
            runBrainstormLoop();
            sendResponse({ success: true });
        });
        return true; // Keep channel open for async query
    }

    if (request.action === "stopBrainstorm") {
        brainstormState.active = false;
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "getBrainstormState") {
        sendResponse(brainstormState);
        return false;
    }
});

// Master loop
// Master loop
async function runBrainstormLoop() {
    let currentInput = brainstormState.prompt; // Start with the topic

    // We do a "ping-pong" debate: Gemini -> ChatGPT -> Gemini (Refine) -> ChatGPT (Critique) ...
    // Each iteration of the loop is ONE response from ONE agent.
    // Total turns = rounds * 2 (roughly).

    console.log(`[Brainstorm] Starting loop for topic: ${currentInput}`);

    try {
        while (brainstormState.active && brainstormState.currentRound < brainstormState.rounds) {

            if (brainstormState.geminiTabId === null || brainstormState.chatGPTTabId === null) {
                console.error("Tabs lost during loop.");
                break;
            }

            brainstormState.currentRound++;
            console.log(`[Brainstorm] Turn Sequence ${brainstormState.currentRound}`);

            // --- Step 1: Gemini (Ideator / Refiner) ---
            let geminiPrompt = "";
            if (brainstormState.currentRound === 1) {
                // First turn: Just the topic
                geminiPrompt = `Topic: "${currentInput}"\n\nPlease provide a comprehensive, novel, and detailed exploration of this topic. Avoid generic advice.`;
            } else {
                // Subsequent turns: Refine based on ChatGPT's feedback
                geminiPrompt = `Here is feedback from a Critical Reviewer:\n\n---\n${currentInput}\n---\n\nPlease refine your previous ideas based on this critique. Address the holes identified and make the solution more robust. Output the full updated version.`;
            }

            const geminiOutput = await sendPromptToTab(brainstormState.geminiTabId, geminiPrompt);
            if (!brainstormState.active) break; // Check stop btn

            // Update context for next step
            // We don't overwrite currentInput yet, we pass geminiOutput to ChatGPT

            // delay
            await new Promise(r => setTimeout(r, 2000));

            // --- Step 2: ChatGPT (Critic) ---
            // It always acts as the Critic/Reviewer in this loop configuration
            const chatGPTPrompt = `You are a Senior Principal Engineer / Critical Reviewer.\n\nHere is a proposal:\n\n---\n${geminiOutput}\n---\n\nPlease critique this. Find flaws, edge cases that are missing, security risks, or weak architectural decisions. Be harsh but constructive.`;

            const chatGPTOutput = await sendPromptToTab(brainstormState.chatGPTTabId, chatGPTPrompt);
            if (!brainstormState.active) break;

            // Update context for next round (Gemini will see this critique)
            currentInput = chatGPTOutput;

            // Small delay between rounds
            await new Promise(r => setTimeout(r, 2000));
        }
    } catch (err) {
        console.error("[Brainstorm] Loop crashed:", err);
    } finally {
        brainstormState.active = false;
        console.log("[Brainstorm] Completed (State Reset).");
    }
}

// Send prompt + wait for completion + fetch response
async function sendPromptToTab(tabId: number, prompt: string): Promise<string> {
    await ensureInjected(tabId);

    // Grab previous response (optional, for debug)
    try {
        await sendMessage(tabId, { action: "getLastResponse" });
    } catch (err: any) {
        console.warn("getLastResponse failed:", err?.message || err);
    }

    // Try sending prompt up to 3 times if the user-message count doesn't increase
    let tries = 0;
    let userTurnsBefore = 0;

    try {
        const countResp = await sendMessage(tabId, { action: "getUserTurnCount" });
        userTurnsBefore = countResp?.count ?? 0;
    } catch (err: any) {
        console.warn("getUserTurnCount failed:", err?.message || err);
    }

    while (tries < 3) {
        tries++;

        try {
            await sendMessage(tabId, { action: "runPrompt", text: prompt });
        } catch (err: any) {
            console.warn("runPrompt failed:", err?.message || err);
        }

        await new Promise(r => setTimeout(r, 2500));

        try {
            const afterResp = await sendMessage(tabId, { action: "getUserTurnCount" });
            const after = afterResp?.count ?? userTurnsBefore;
            if (after > userTurnsBefore) break;
            console.warn(`Prompt did not post, retrying (${tries})...`);
        } catch (err) {
            break;
        }
    }

    // Wait for assistant to finish generating
    try {
        await sendMessage(tabId, { action: "waitForDone" });
    } catch (err: any) {
        console.warn("waitForDone failed:", err?.message || err);
    }

    // Get final response
    try {
        const finalResp = await sendMessage(tabId, { action: "getLastResponse" });
        return finalResp?.text || "";
    } catch (err: any) {
        console.warn("getLastResponse (final) failed:", err?.message || err);
        return "";
    }
}

// Role Prompt Templates
function buildRolePrompt(role: string, originalPrompt: string, geminiOutput: string): string {
    switch (role) {
        case "REFINER":
            return `You are a **Refiner**.\n\nOriginal prompt:\n${originalPrompt}\n\nGemini response:\n${geminiOutput}\n\nTask: Improve clarity, structure, and actionability. Output only the improved answer.`;

        case "CRITIC":
            return `You are a **Critic**.\n\nOriginal prompt:\n${originalPrompt}\n\nGemini response:\n${geminiOutput}\n\nTask: Identify weaknesses, missing info, and risks. Suggest improvements.`;

        case "SYNTHESIZER":
            return `You are a **Synthesizer**.\n\nOriginal prompt:\n${originalPrompt}\n\nGemini response:\n${geminiOutput}\n\nTask: Combine into a cohesive best-of answer with clear sections.`;

        default:
            return `Original prompt:\n${originalPrompt}\n\nGemini response:\n${geminiOutput}\n\nNow answer as ChatGPT with your best response.`;
    }
}
