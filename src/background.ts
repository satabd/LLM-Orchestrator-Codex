// Brainstorm Orchestrator (Role-Based)
// Runs in MV3 Service Worker context.

import { createSession, updateSession, getAllSessions, deleteSession, appendEscalation } from './db.js';
import { BrainstormSession, BrainstormState, EscalationPayload } from './types.js';

const DEFAULT_STATE: BrainstormState = {
    active: false,
    sessionId: null,
    prompt: "",
    mode: "PING_PONG",
    role: "CRITIC",
    rounds: 3,
    currentRound: 0,
    geminiTabId: null,
    chatGPTTabId: null,
    statusLog: [],
    isPaused: false,
    humanFeedback: null,
    awaitingHumanDecision: false,
    lastSpeaker: null,
    lastEscalation: null,
    resumeContext: null,
    discussionTurnSinceCheckpoint: 0
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
    },
    DISCUSSION: {
        geminiInit: (topic) => 
            `[SYSTEM: DISCUSSION MODE] You are Agent A in an internal agent-to-agent working session. You are speaking directly to Agent B to start a discussion on the following topic:\n---\n${topic}\n---\n\nRULES:\n1. Address Agent B directly. DO NOT address the human user.\n2. DO NOT use phrases like "Dear User", "I recommend you", "As an AI", or "Mr. Sataa".\n3. TURN OBJECTIVE: Start the analysis. Provide your initial thesis, identify risks, or propose options for Agent B to critique.\n4. Do NOT close with offers, next-step suggestions for the user, or invitations. End with a challenge, a narrowing move, a conclusion, or an escalation.\n5. BOUNDARIES: If evidence boundaries (non-public data, industry practices, weak quantitative data) are reached, you MUST mark as inference, request verification, or emit an [ESCALATION_REQUIRED] block.`,
        geminiLoop: (feedback) => 
            `[SYSTEM: DISCUSSION MODE] You are Agent A in an internal agent-to-agent working session. Agent B just said:\n---\n${feedback}\n---\n\nRULES:\n1. Address Agent B directly. DO NOT address the human user.\n2. DO NOT use phrases like "Dear User", "I recommend you", "As an AI", or "Mr. Sataa".\n3. TURN OBJECTIVE: Critique their ideas, refine them, combine multiple options, reject them, escalate, or conclude the sub-issue. Speak ONLY as a collaborator/debater.\n4. Do NOT close with offers, next-step suggestions for the user, or invitations.\n5. CONVERGENCE & BOUNDARIES: If debating the same point or if evidence boundaries are reached, you MUST produce a compact structured conclusion (Established Facts, Unsupported Claims, Unresolved Items) or emit an [ESCALATION_REQUIRED] block.`,
        chatGPTLoop: (proposal) => 
            `[SYSTEM: DISCUSSION MODE] You are Agent B in an internal agent-to-agent working session. Agent A just said:\n---\n${proposal}\n---\n\nRULES:\n1. Address Agent A directly. DO NOT address the human user.\n2. DO NOT use phrases like "Dear User", "I recommend you", "As an AI", or "Mr. Sataa".\n3. TURN OBJECTIVE: Critique their ideas, refine them, combine multiple options, reject them, escalate, or conclude the sub-issue. Speak ONLY as a collaborator/debater.\n4. Do NOT close with offers, next-step suggestions for the user, or invitations.\n5. CONVERGENCE & BOUNDARIES: If debating the same point or if evidence boundaries are reached, you MUST produce a compact structured conclusion (Established Facts, Unsupported Claims, Unresolved Items) or emit an [ESCALATION_REQUIRED] block.`
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

            const { topic, rounds, role, mode, customGeminiPrompt, customChatGPTPrompt, geminiTabId, chatGPTTabId } = request;

            if (!geminiTabId || !chatGPTTabId) {
                sendResponse({ success: false, error: "Missing tab IDs." });
                return;
            }

            const sessionId = crypto.randomUUID();

            brainstormState = {
                active: true,
                sessionId,
                prompt: topic,
                mode: mode || "PING_PONG",
                role: role || "CRITIC",
                customGeminiPrompt,
                customChatGPTPrompt,
                rounds: rounds || 3,
                currentRound: 0,
                geminiTabId,
                chatGPTTabId,
                statusLog: [],
                isPaused: false,
                humanFeedback: null,
                awaitingHumanDecision: false,
                lastSpeaker: null,
                lastEscalation: null,
                resumeContext: null,
                discussionTurnSinceCheckpoint: 0
            };

            log(`Starting run: ${rounds} rounds...`, 'system');
            saveState();

            // Initialize DB Session
            try {
                await createSession({
                    id: sessionId,
                    topic: topic,
                    mode: brainstormState.mode,
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
            log("Human Intervention: Feedback received. Resuming...", 'system');
            brainstormState.statusLog.push(`[System] Moderator: ${request.feedback}`);

            if (brainstormState.sessionId) {
                updateSession(brainstormState.sessionId, { agent: 'System', text: `[Moderator Intervention]\n${request.feedback}` }).catch(() => { });
            }

            if (brainstormState.awaitingHumanDecision) {
                brainstormState.resumeContext = request.feedback;
                brainstormState.awaitingHumanDecision = false;
                brainstormState.lastEscalation = null;
            } else {
                // Standard manual pause feedback
                brainstormState.humanFeedback = request.feedback;
            }
        } else {
            log("Human Intervention: Run resumed without feedback.", 'system');
            brainstormState.awaitingHumanDecision = false;
            brainstormState.lastEscalation = null;
        }

        saveState();
        sendResponse({ success: true });
        return true;
    }

    return false;
});

// ---- Orchestration Engine ----

function parseEscalationBlock(text: string): EscalationPayload | null {
    const blockMatch = text.match(/\[ESCALATION_REQUIRED\]([\s\S]*?)\[\/ESCALATION_REQUIRED\]/i);
    if (!blockMatch) return null;

    const block = blockMatch[1];
    const payload: EscalationPayload = {
        reason: "",
        decision_needed: "",
        options: [],
        recommended_option: "",
        next_step_after_decision: ""
    };

    const extract = (key: string) => {
        const match = block.match(new RegExp(`${key}:\\s*(.*?)(?=\\n[a-z_]+:|$)`, 'is'));
        return match ? match[1].trim() : "";
    };

    payload.reason = extract('reason');
    payload.decision_needed = extract('decision_needed');
    payload.recommended_option = extract('recommended_option');
    payload.next_step_after_decision = extract('next_step_after_decision');

    const optionsMatch = block.match(/options:\s*((?:-\s+.*\n?)*)/i);
    if (optionsMatch && optionsMatch[1]) {
        payload.options = optionsMatch[1].split('\n')
            .map(o => o.replace(/^-?\s*/, '').trim())
            .filter(o => o.length > 0);
    }

    return payload.reason ? payload : null; // basic validation
}

function getDiscussionViolation(text: string): string | null {
    const lower = text.toLowerCase();
    
    // English triggers
    if (lower.includes("dear user") || 
        lower.includes("mr. sata") || 
        lower.includes("mr. sataa") || 
        lower.includes("as an ai") || 
        lower.includes("as a language model") || 
        lower.includes("recommend you") ||
        lower.includes("recommend to you") ||
        lower.includes("your request") ||
        lower.includes("would you like") ||
        lower.includes("shall i prepare") ||
        lower.includes("shall i") ||
        lower.includes("let me know if you need") ||
        lower.includes("feel free to ask") ||
        lower.includes("i can help you") ||
        lower.includes("let me know") ||
        lower.includes("for you") ||
        lower.includes("here's a summary for you") ||
        lower.includes("here is a summary") ||
        lower.includes("i recommend") ||
        lower.includes("would you like a roadmap") ||
        lower.includes("i can now create")) {
        return "You used forbidden user-facing or AI-disclaimer language. You must speak ONLY to your agent collaborator.";
    }

    // Arabic triggers (handling audience drift)
    if (lower.includes("أستاذ ساطع") || 
        lower.includes("هل ترغب") || 
        lower.includes("يمكنني أن") || 
        lower.includes("أقترح عليك") || 
        lower.includes("بصفتي ذكاء") ||
        lower.includes("يسعدني أن") ||
        lower.includes("دعني أعرف") ||
        lower.includes("لأجلك") ||
        lower.includes("هل يمكنني") ||
        lower.includes("إليك ملخص") ||
        lower.includes("أوصي بأن")) {
        return "You used forbidden user-facing or AI-disclaimer language. You must speak ONLY to your agent collaborator.";
    }

    return null;
}

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
                // Standard manual pause injection
                basePrompt = `Here is the latest input from your collaborator:\n---\n${currentInput}\n---\n\n[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:\n---\n${brainstormState.humanFeedback}\n---\nAcknowledge the moderator's instructions and seamlessly incorporate them into your next response.`;
                brainstormState.humanFeedback = null;
                saveState();
            } else if (brainstormState.resumeContext && brainstormState.mode === 'DISCUSSION') {
                // Resolution for an explicit escalation
                basePrompt = `[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:\n---\n${brainstormState.resumeContext}\n---\n\nRULES:\n1. Address Agent B directly. DO NOT address the human user.\n2. Incorporate this decision to unblock the discussion.`;
                brainstormState.resumeContext = null;
                saveState();
            }

            if (brainstormState.currentRound === 1) {
                geminiPrompt = roleConfig.geminiInit(basePrompt, brainstormState.customGeminiPrompt);
            } else {
                geminiPrompt = roleConfig.geminiLoop(basePrompt, brainstormState.customGeminiPrompt);
            }

            if (brainstormState.mode === 'DISCUSSION' && brainstormState.discussionTurnSinceCheckpoint >= 4) {
                geminiPrompt += `\n\n[DISCUSSION CONTROL]\nDo not expand the topic further.\nYour next response must do exactly one of the following:\n- conclude the current sub-issue,\n- mark a claim unsupported,\n- mark a claim as inference only,\n- escalate for human input.`;
                brainstormState.discussionTurnSinceCheckpoint = 0;
                log(`Convergence checkpoint reached. Forced sub-issue conclusion requested for Gemini.`, 'system');
                saveState();
            }

            let geminiOutput = await sendPromptToTab(brainstormState.geminiTabId!, geminiPrompt);
            if (!brainstormState.active) break;
            if (!geminiOutput) {
                log("Gemini produced no output. Aborting.", 'error');
                break;
            }

            if (brainstormState.mode === 'DISCUSSION') {
                let violation = getDiscussionViolation(geminiOutput);
                if (violation) {
                    log(`[RULE VIOLATION] Gemini: ${violation}. Attempting repair...`, 'system');
                    const repairPrompt = `[SYSTEM: RULE VIOLATION] ${violation}\n\nRULES REMINDER:\n1. Address Agent B directly.\n2. DO NOT address the human user or use AI disclaimers.\n\nPlease rewrite your previous response exactly to comply with these rules. Do not include apologies, just output the corrected response.`;
                    let repairedOutput = await sendPromptToTab(brainstormState.geminiTabId!, repairPrompt);
                    
                    if (repairedOutput && brainstormState.active) {
                        violation = getDiscussionViolation(repairedOutput);
                        if (violation) {
                            log(`[RULE VIOLATION] Gemini: ${violation}. Repair failed, regenerating once more...`, 'system');
                            repairedOutput = await sendPromptToTab(brainstormState.geminiTabId!, repairPrompt);
                            violation = getDiscussionViolation(repairedOutput || "");
                        }
                    }

                    if (violation || !repairedOutput) {
                        log(`[RULE VIOLATION] Gemini: Repair completely failed. Forcing generic response.`, 'error');
                        geminiOutput = "[SYSTEM ENFORCED REPLACEMENT] Your last message drifted into user-facing mode. Narrow your claim and continue the debate.";
                    } else if (repairedOutput && brainstormState.active) {
                        geminiOutput = repairedOutput;
                    }
                }
                brainstormState.discussionTurnSinceCheckpoint++;
                saveState();
            }

            if (brainstormState.sessionId) {
                await updateSession(brainstormState.sessionId, { agent: 'Gemini', text: geminiOutput }).catch(() => { });
            }

            if (brainstormState.mode === 'DISCUSSION') {
                const escalation = parseEscalationBlock(geminiOutput);
                if (escalation) {
                    brainstormState.lastEscalation = escalation;
                    brainstormState.isPaused = true;
                    brainstormState.awaitingHumanDecision = true;
                    log(`[ESCALATION DETECTED] Gemini requests human input. Reason: ${escalation.reason}`, 'system');
                    if (brainstormState.sessionId) {
                        await appendEscalation(brainstormState.sessionId, escalation).catch(() => {});
                    }
                    saveState();
                    continue; // Skip the wait and immediately prompt the UI that we are paused
                }
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
            } else if (brainstormState.resumeContext && brainstormState.mode === 'DISCUSSION') {
                // Resolution for an explicit escalation
                chatBasePrompt = `[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:\n---\n${brainstormState.resumeContext}\n---\n\nRULES:\n1. Address Agent A directly. DO NOT address the human user.\n2. Incorporate this decision to unblock the discussion.`;
                brainstormState.resumeContext = null;
                saveState();
            }

            let chatGPTPrompt = roleConfig.chatGPTLoop(chatBasePrompt, brainstormState.customChatGPTPrompt);

            if (brainstormState.mode === 'DISCUSSION' && brainstormState.discussionTurnSinceCheckpoint >= 4) {
                chatGPTPrompt += `\n\n[DISCUSSION CONTROL]\nDo not expand the topic further.\nYour next response must do exactly one of the following:\n- conclude the current sub-issue,\n- mark a claim unsupported,\n- mark a claim as inference only,\n- escalate for human input.`;
                brainstormState.discussionTurnSinceCheckpoint = 0;
                log(`Convergence checkpoint reached. Forced sub-issue conclusion requested for ChatGPT.`, 'system');
                saveState();
            }

            let chatGPTOutput = await sendPromptToTab(brainstormState.chatGPTTabId!, chatGPTPrompt);
            if (!brainstormState.active) break;
            if (!chatGPTOutput) {
                log("ChatGPT produced no output. Aborting.", 'error');
                break;
            }

            if (brainstormState.mode === 'DISCUSSION') {
                let violation = getDiscussionViolation(chatGPTOutput);
                if (violation) {
                    log(`[RULE VIOLATION] ChatGPT: ${violation}. Attempting repair...`, 'system');
                    const repairPrompt = `[SYSTEM: RULE VIOLATION] ${violation}\n\nRULES REMINDER:\n1. Address Agent A directly.\n2. DO NOT address the human user or use AI disclaimers.\n\nPlease rewrite your previous response exactly to comply with these rules. Do not include apologies, just output the corrected response.`;
                    let repairedOutput = await sendPromptToTab(brainstormState.chatGPTTabId!, repairPrompt);
                    
                    if (repairedOutput && brainstormState.active) {
                        violation = getDiscussionViolation(repairedOutput);
                        if (violation) {
                            log(`[RULE VIOLATION] ChatGPT: ${violation}. Repair failed, regenerating once more...`, 'system');
                            repairedOutput = await sendPromptToTab(brainstormState.chatGPTTabId!, repairPrompt);
                            violation = getDiscussionViolation(repairedOutput || "");
                        }
                    }

                    if (violation || !repairedOutput) {
                        log(`[RULE VIOLATION] ChatGPT: Repair completely failed. Forcing generic response.`, 'error');
                        chatGPTOutput = "[SYSTEM ENFORCED REPLACEMENT] Your last message drifted into user-facing mode. Narrow your claim and continue the debate.";
                    } else if (repairedOutput && brainstormState.active) {
                        chatGPTOutput = repairedOutput;
                    }
                }
                brainstormState.discussionTurnSinceCheckpoint++;
                saveState();
            }

            currentInput = chatGPTOutput;
            // Update global state prompt so Continuation knows the last input
            brainstormState.prompt = currentInput;
            saveState();

            if (brainstormState.sessionId) {
                await updateSession(brainstormState.sessionId, { agent: 'ChatGPT', text: chatGPTOutput }).catch(() => { });
            }

            if (brainstormState.mode === 'DISCUSSION') {
                const escalation = parseEscalationBlock(chatGPTOutput);
                if (escalation) {
                    brainstormState.lastEscalation = escalation;
                    brainstormState.isPaused = true;
                    brainstormState.awaitingHumanDecision = true;
                    log(`[ESCALATION DETECTED] ChatGPT requests human input. Reason: ${escalation.reason}`, 'system');
                    if (brainstormState.sessionId) {
                        await appendEscalation(brainstormState.sessionId, escalation).catch(() => {});
                    }
                    saveState();
                    continue; // Immediately loop back around to wait at the top if paused
                }
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
