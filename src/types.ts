export interface TranscriptEntry {
    agent: 'User' | 'Gemini' | 'ChatGPT' | 'System';
    text: string;
}

export interface EscalationPayload {
    reason: string;
    decision_needed: string;
    options: string[];
    recommended_option: string;
    next_step_after_decision: string;
}

export interface BrainstormSession {
    id: string;
    topic: string;
    mode: string;
    role: string;
    timestamp: number;
    transcript: TranscriptEntry[];
    escalations?: EscalationPayload[];
}

export interface BrainstormState {
    active: boolean;
    sessionId: string | null;
    prompt: string;
    mode: "PING_PONG" | "GEMINI_ONLY" | "ChatGPT_ONLY" | "DISCUSSION";
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
    awaitingHumanDecision: boolean;
    lastSpeaker: "Gemini" | "ChatGPT" | null;
    lastEscalation: EscalationPayload | null;
    resumeContext: string | null;
    discussionTurnSinceCheckpoint: number;
}
