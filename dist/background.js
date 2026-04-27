const H="LLMOrchestratorDB";const f="sessions";function T(){return new Promise((e,t)=>{const n=indexedDB.open(H,1);n.onerror=()=>t(n.error),n.onsuccess=()=>e(n.result),n.onupgradeneeded=o=>{const s=o.target.result;s.objectStoreNames.contains(f)||s.createObjectStore(f,{keyPath:"id"}).createIndex("timestamp","timestamp",{unique:!1})}})}async function g(e){const t=await T();return new Promise((n,o)=>{const r=t.transaction(f,"readwrite").objectStore(f).put(e);r.onsuccess=()=>n(),r.onerror=()=>o(r.error)})}async function V(e){return g(e)}async function M(e){return g(e)}async function h(e){const t=await T();return new Promise((n,o)=>{const r=t.transaction(f,"readonly").objectStore(f).get(e);r.onsuccess=()=>n(r.result),r.onerror=()=>o(r.error)})}async function j(e,t){const n=await h(e);if(!n)throw new Error("Session not found");await g({...n,...t})}async function G(e,t){const n=await h(e);if(!n)throw new Error("Session not found");const o=n.transcript||[];o.push(t),await g({...n,transcript:o})}async function x(e,t){await j(e,{artifacts:t})}async function W(e,t){const n=await h(e);if(!n)throw new Error("Session not found");const o=n.checkpoints||[];o.push(t),await g({...n,checkpoints:o})}async function q(e,t){const n=await h(e);if(!n)throw new Error("Session not found");const o=n.moderatorDecisions||[];o.push(t),await g({...n,moderatorDecisions:o})}async function z(e,t,n){const o=await h(e);if(!o)throw new Error("Session not found");const s={...o.finalOutputs||{}};s[t]=n,await g({...o,finalOutputs:s})}async function Q(){const e=await T();return new Promise((t,n)=>{const a=e.transaction(f,"readonly").objectStore(f).getAll();a.onsuccess=()=>{const r=a.result;r.sort((c,p)=>p.timestamp-c.timestamp),t(r)},a.onerror=()=>n(a.error)})}async function J(e){const t=await T();return new Promise((n,o)=>{const r=t.transaction(f,"readwrite").objectStore(f).delete(e);r.onsuccess=()=>n(),r.onerror=()=>o(r.error)})}async function K(e,t){const n=await h(e);if(!n)throw new Error("Session not found");const o=n.escalations||[];o.push(t),await g({...n,escalations:o})}const P={active:!1,sessionId:null,prompt:"",mode:"PING_PONG",role:"CRITIC",firstSpeaker:"Gemini",rounds:3,currentRound:0,geminiTabId:null,chatGPTTabId:null,statusLog:[],isPaused:!1,humanFeedback:null,awaitingHumanDecision:!1,lastSpeaker:null,lastEscalation:null,resumeContext:null,discussionTurnSinceCheckpoint:0,currentPhase:"DIVERGE",currentIntent:"expand",activeCheckpointId:null,lastRepairStatus:null};let i={...P},U=!0;const D=3;function l(){chrome.storage.local.set({brainstormState:i})}async function B(){return new Promise(e=>{chrome.storage.local.get(["brainstormState"],t=>{t.brainstormState&&(i={...P,...t.brainstormState,active:!1},l()),U=!1,e()})})}B();chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0});function u(e,t="info"){const n=`[${t==="info"?"Info":t==="error"?"Error":"System"}] ${e}`;i.statusLog.length>80&&i.statusLog.shift(),i.statusLog.push(n),console.log(n),l()}function v(e,t){return new Promise(n=>{chrome.tabs.sendMessage(e,t,o=>{chrome.runtime.lastError?n(null):n(o)})})}async function Z(e){try{await chrome.scripting.executeScript({target:{tabId:e},files:["content.js"]})}catch{}}const O={CRITIC:{geminiInit:e=>`Topic: "${e}"

Please provide a comprehensive, novel, and detailed exploration of this topic.`,chatGPTInit:e=>`Topic: "${e}"

Please provide a comprehensive, novel, and detailed exploration of this topic.`,geminiLoop:e=>`Here is feedback from a Reviewer:
---
${e}
---

Please refine your ideas based on this critique. Output the updated version.`,chatGPTLoop:e=>`You are a Critical Reviewer.

Proposal:
---
${e}
---

Critique this. Find flaws, missing edge cases, or security risks.`},EXPANDER:{geminiInit:e=>`Topic: "${e}"

Provide an initial creative concept for this topic. Keep it open-ended.`,chatGPTInit:e=>`Topic: "${e}"

Provide an initial creative concept for this topic. Keep it open-ended.`,geminiLoop:e=>`Your collaborator added the following ideas:
---
${e}
---

Using the 'Yes, And...' principle, accept their additions and expand the concept further in a new direction.`,chatGPTLoop:e=>`Your collaborator proposed this concept:
---
${e}
---

Using the 'Yes, And...' principle, accept this concept and add new, highly creative dimensions or features to it without criticizing.`},ARCHITECT:{geminiInit:e=>`Topic: "${e}"

You are a Visionary Product Leader. Pitch a bold, high-level vision for this topic, focusing on user experience, value, and disruption.`,chatGPTInit:e=>`Topic: "${e}"

You are a Systems Architect opening the session. Frame a realistic architecture direction, key constraints, and the most viable implementation path for this topic.`,geminiLoop:e=>`The Systems Architect responded with this feasibility analysis:
---
${e}
---

Defend your vision or adapt it based on these constraints, maintaining the visionary perspective.`,chatGPTLoop:e=>`You are a Systems Architect. The Visionary just proposed:
---
${e}
---

Analyze the technical feasibility, potential bottlenecks, system requirements, and suggest realistic architectural approaches to build this.`},DEV_ADVOCATE:{geminiInit:e=>`Topic: "${e}"

Propose a robust, complete solution or thesis for this topic. Be definitive.`,chatGPTInit:e=>`Topic: "${e}"

You are opening as the Devil's Advocate. State the strongest skeptical thesis or failure case this topic must overcome before any solution is credible.`,geminiLoop:e=>`The Devil's Advocate attacked your proposal:
---
${e}
---

Rebut their attacks, patch the vulnerabilities in your logic, and present a stronger proposal.`,chatGPTLoop:e=>`You are the Devil's Advocate. Your job is to destroy this proposal:
---
${e}
---

Find every logical fallacy, market weakness, performance issue, or security hole. Do not hold back.`},FIRST_PRINCIPLES:{geminiInit:e=>`Topic: "${e}"

You are the Deconstructor. Break this topic down into its absolute, undeniable fundamental truths and physical/logical constraints. Strip away all industry assumptions.`,chatGPTInit:e=>`Topic: "${e}"

You are the Synthesizer opening the session. Propose a novel solution path, then explicitly identify which assumptions still need first-principles scrutiny.`,geminiLoop:e=>`The Synthesizer built this solution from your principles:
---
${e}
---

Deconstruct their solution. Are they relying on any hidden assumptions? Break it down again.`,chatGPTLoop:e=>`Here are the fundamental truths of the problem:
---
${e}
---

You are the Synthesizer. Build a completely novel, unconventional solution from the ground up using ONLY these fundamental truths.`},INTERVIEWER:{geminiInit:e=>`Topic: "${e}"

You are a world-class Domain Expert explaining this topic at a high level.`,chatGPTInit:e=>`Topic: "${e}"

You are a probing Journalist opening the session. Ask one precise, high-signal question that would force a domain expert to reveal the most important hidden assumption or hard detail.`,geminiLoop:e=>`The Interviewer asks:
---
${e}
---

Provide a deeply nuanced, expert answer.`,chatGPTLoop:e=>`The Expert says:
---
${e}
---

You are a probing Journalist. Ask one highly specific, clarifying follow-up question to force them to go deeper or explain hard jargon.`},FIVE_WHYS:{geminiInit:e=>`Topic: "${e}"

State the core problem or standard solution associated with this topic.`,chatGPTInit:e=>`Topic: "${e}"

Open the session by stating the most obvious symptom or surface-level explanation, then ask why it exists.`,geminiLoop:e=>`Response:
---
${e}
---

Answer the "Why" to drill deeper into the root cause.`,chatGPTLoop:e=>`Statement:
---
${e}
---

Ask "Why is that the case?" or "Why does that happen?" to drill down into the root cause.`},HISTORIAN_FUTURIST:{geminiInit:e=>`Topic: "${e}"

You are a Historian. Analyze this topic based on historical precedents, past failures, and established data.`,chatGPTInit:e=>`Topic: "${e}"

You are a Futurist opening the session. Project this topic forward and define the most plausible long-range shifts before history pushes back.`,geminiLoop:e=>`The Futurist predicts:
---
${e}
---

Check their prediction against history. What historical cycles or human behaviors might disrupt their sci-fi scenario?`,chatGPTLoop:e=>`The Historian notes:
---
${e}
---

You are a Futurist. Project this 50 years into the future. How will emerging tech and societal shifts evolve this past the historical constraints?`},ELI5:{geminiInit:e=>`Topic: "${e}"

Provide a highly complex, academic, and technically precise explanation of this topic.`,chatGPTInit:e=>`Topic: "${e}"

Open with a simple explanation of this topic using plain language and one concrete metaphor.`,geminiLoop:e=>`Here is the simplified ELI5 version:
---
${e}
---

Correct any oversimplifications or lost nuances while keeping it accessible.`,chatGPTLoop:e=>`Academic Explanation:
---
${e}
---

Translate this into an "Explain Like I'm 5" (ELI5) version using simple metaphors.`},CUSTOM:{geminiInit:(e,t)=>`${t}

Here is the initial topic:
---
${e}
---`,chatGPTInit:(e,t)=>`${t}

Here is the initial topic:
---
${e}
---`,geminiLoop:(e,t)=>`${t}

Here is the latest input from the collaborator:
---
${e}
---`,chatGPTLoop:(e,t)=>`${t}

Here is the latest input from the collaborator:
---
${e}
---`},DISCUSSION:{geminiInit:e=>`[SYSTEM: DISCUSSION MODE]
You are Agent A in an internal working session with Agent B.
The human is observing only and is not your audience.

TOPIC
---
${e}
---

HARD RULES
1. Address Agent B directly. Do not address the human user.
2. No greetings, no assistant persona language, no offers, no polished essay framing.
3. Forbidden examples: "Dear user", "Would you like me to", "I recommend you", "As an AI", "Let me know".
4. Treat this as an internal design/analysis exchange, not a final answer.
5. If evidence is weak or missing, mark claims as inference, ask Agent B to verify, or emit an [ESCALATION_REQUIRED] block.

TURN 1 OBJECTIVE
Do all of the following in a compact working-session style:
- frame the problem for Agent B,
- define the main design dimensions or constraints,
- propose 2-4 candidate approaches or hypotheses,
- end by asking Agent B to critique, reject, or narrow one of them.

OUTPUT STYLE
Compact, analytical, and collaborative. No user-facing wrap-up.`,chatGPTInit:e=>`[SYSTEM: DISCUSSION MODE]
You are Agent A in an internal working session with Agent B.
The human is observing only and is not your audience.

TOPIC
---
${e}
---

HARD RULES
1. Address Agent B directly. Do not address the human user.
2. No greetings, no assistant persona language, no offers, no polished essay framing.
3. Forbidden examples: "Dear user", "Would you like me to", "I recommend you", "As an AI", "Let me know".
4. Treat this as an internal design/analysis exchange, not a final answer.
5. If evidence is weak or missing, mark claims as inference, ask Agent B to verify, or emit an [ESCALATION_REQUIRED] block.

TURN 1 OBJECTIVE
Do all of the following in a compact working-session style:
- frame the problem for Agent B,
- define the main design dimensions or constraints,
- propose 2-4 candidate approaches or hypotheses,
- end by asking Agent B to critique, reject, or narrow one of them.

OUTPUT STYLE
Compact, analytical, and collaborative. No user-facing wrap-up.`,geminiLoop:e=>`[SYSTEM: DISCUSSION MODE] You are Agent A in an internal agent-to-agent working session. Agent B just said:
---
${e}
---

RULES:
1. Address Agent B directly. DO NOT address the human user.
2. No greetings, no assistant persona language, no offers, and no polished final-answer framing.
3. Your turn must do exactly one primary move: critique, refine, verify, narrow, combine, conclude, or escalate.
4. Do NOT close with offers, next-step suggestions for the user, or invitations.
5. If evidence is weak or missing, mark claims as inference, request verification from Agent B, or emit an [ESCALATION_REQUIRED] block.
6. If the thread is circling, converge instead of expanding: conclude the sub-issue, mark unsupported claims, or escalate.`,chatGPTLoop:e=>`[SYSTEM: DISCUSSION MODE] You are Agent B in an internal agent-to-agent working session. Agent A just said:
---
${e}
---

RULES:
1. Address Agent A directly. DO NOT address the human user.
2. No greetings, no assistant persona language, no offers, and no polished final-answer framing.
3. Your turn must do exactly one primary move: critique, refine, verify, narrow, combine, conclude, or escalate.
4. Do NOT close with offers, next-step suggestions for the user, or invitations.
5. If evidence is weak or missing, mark claims as inference, request verification from Agent A, or emit an [ESCALATION_REQUIRED] block.
6. If the thread is circling, converge instead of expanding: conclude the sub-issue, mark unsupported claims, or escalate.`}};chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.action==="getAllSessions")return Q().then(n).catch(()=>n([])),!0;if(e.action==="getSession")return h(e.id).then(o=>n(o||null)).catch(()=>n(null)),!0;if(e.action==="deleteSession")return J(e.id).then(()=>n({success:!0})).catch(()=>n({success:!1})),!0;if(e.action==="getBrainstormState")return n(i),!1;if(e.action==="createBranchFromCheckpoint")return le(e.sessionId,e.checkpointId,e.branchLabel).then(n).catch(o=>n({success:!1,error:o.message})),!0;if(e.action==="generateFinale")return $(e.finaleType||"executive").then(n).catch(o=>n({success:!1,error:o.message})),!0;if(e.action==="stopBrainstorm")return i.active=!1,u("Stopped by user.","system"),l(),n({success:!0}),!0;if(e.action==="startBrainstorm")return(async()=>{U&&await B();const{topic:o,rounds:s,role:a,mode:r,customGeminiPrompt:c,customChatGPTPrompt:p,geminiTabId:d,chatGPTTabId:I,firstSpeaker:m}=e;if(!d||!I){n({success:!1,error:"Missing tab IDs."});return}const C=crypto.randomUUID(),A=X(o,r||"PING_PONG"),F=b([],A);i={...P,active:!0,sessionId:C,prompt:o,mode:r||"PING_PONG",role:a||"CRITIC",firstSpeaker:m==="ChatGPT"?"ChatGPT":"Gemini",customGeminiPrompt:c,customChatGPTPrompt:p,rounds:s||3,geminiTabId:d,chatGPTTabId:I,currentPhase:"DIVERGE",currentIntent:Y(a||"CRITIC","DIVERGE",m==="ChatGPT"?"ChatGPT":"Gemini",r||"PING_PONG")},u(`Starting studio session: ${s} rounds...`,"system"),l(),await V({id:C,topic:o,mode:i.mode,role:i.role,firstSpeaker:i.firstSpeaker,timestamp:Date.now(),transcript:[{agent:"User",text:o,timestamp:Date.now(),intent:"moderate",phase:"DIVERGE"}],framing:A,artifacts:F,checkpoints:[],escalations:[],moderatorDecisions:[],finalOutputs:{},parentSessionId:null,branchLabel:null,branchOriginTurn:null}).catch(E=>u(`Failed to create DB session: ${E.message}`,"error")),L().catch(E=>{u(`Loop fatal error: ${E.message}`,"error"),i.active=!1,l()}),n({success:!0})})(),!0;if(e.action==="continueBrainstorm")return(async()=>{if(!i.geminiTabId||!i.chatGPTTabId){n({success:!1,error:"Tab IDs missing. Start a new run instead."});return}if(i.active){n({success:!1,error:"Run is already active."});return}const o=e.additionalRounds||2;i.rounds+=o,i.active=!0,u(`Continuing run for ${o} more rounds...`,"system"),l(),L().catch(s=>{u(`Loop fatal error: ${s.message}`,"error"),i.active=!1,l()}),n({success:!0})})(),!0;if(e.action==="generateConclusion")return $("executive").then(n).catch(o=>n({success:!1,error:o.message})),!0;if(e.action==="pauseBrainstorm"){if(!i.active){n({success:!1,error:"Run is not active."});return}return i.isPaused=!0,u("Human Intervention: Run paused. Waiting for input...","system"),l(),n({success:!0}),!0}if(e.action==="resumeBrainstorm"){if(!i.active||!i.isPaused){n({success:!1,error:"Run is not paused."});return}return i.isPaused=!1,e.feedback?(u("Human Intervention: Feedback received. Resuming...","system"),i.statusLog.push(`[System] Moderator: ${e.feedback}`),i.sessionId&&(G(i.sessionId,{agent:"System",text:`[Moderator Intervention]
${e.feedback}`,timestamp:Date.now(),intent:"moderate",phase:i.currentPhase}).catch(()=>{}),q(i.sessionId,{timestamp:Date.now(),feedback:e.feedback,linkedCheckpointId:i.activeCheckpointId,linkedTurn:i.currentRound}).catch(()=>{})),i.awaitingHumanDecision?(i.resumeContext=e.feedback,i.awaitingHumanDecision=!1,i.lastEscalation=null):i.humanFeedback=e.feedback):(u("Human Intervention: Run resumed without feedback.","system"),i.awaitingHumanDecision=!1,i.lastEscalation=null),l(),n({success:!0}),!0}return!1});function X(e,t){const n=e.trim();return{objective:n.length>120?n.slice(0,120):n,constraints:t==="DISCUSSION"?["Address the other agent directly","Mark weak claims as inference","Escalate when blocked"]:["Stay grounded in the user's topic","Keep ideas actionable","Iterate with contrast and refinement"],successCriteria:t==="DISCUSSION"?["Reach a narrower conclusion","Expose unsupported claims","Pause only when human input is genuinely required"]:["Generate multiple directions","Surface tradeoffs","End with stronger synthesis than the initial prompt"]}}function ee(){return{highlights:[],ideas:[],risks:[],questions:[],decisions:[],synthesis:""}}function w(e){return[...new Set(e.filter(Boolean))]}function b(e,t){const n=ee();return e.filter(s=>s.agent==="Gemini"||s.agent==="ChatGPT").slice(-8).forEach(s=>{const a=s.text.split(/\n+/).map(r=>r.trim()).filter(Boolean);a[0]&&n.highlights.push(a[0]),a.forEach(r=>{const c=r.toLowerCase();(c.includes("risk")||c.includes("flaw")||c.includes("danger"))&&n.risks.length<6&&n.risks.push(r),(c.includes("?")||c.includes("unknown")||c.includes("unresolved"))&&n.questions.length<6&&n.questions.push(r),(c.includes("should")||c.includes("option")||c.includes("proposal")||c.includes("approach"))&&n.ideas.length<8&&n.ideas.push(r),(c.includes("conclude")||c.includes("decision")||c.includes("recommend"))&&n.decisions.length<6&&n.decisions.push(r)})}),n.highlights=w(n.highlights).slice(0,6),n.ideas=w(n.ideas).slice(0,8),n.risks=w(n.risks).slice(0,6),n.questions=w(n.questions).slice(0,6),n.decisions=w(n.decisions).slice(0,6),n.synthesis=t?`Objective: ${t.objective}. Current direction: ${n.highlights[0]||"Session has started but no strong highlight was extracted yet."}`:n.highlights[0]||"No synthesis available yet.",n}function te(e,t){return e>=t?"FINALIZE":e>=Math.max(2,Math.ceil(t*.66))?"CONVERGE":"DIVERGE"}function Y(e,t,n,o){return o==="DISCUSSION"?t==="FINALIZE"?"conclude":t==="CONVERGE"?n==="Gemini"?"narrow":"verify":n==="Gemini"?"combine":"critique":t==="FINALIZE"?"conclude":t==="CONVERGE"?n==="Gemini"?"combine":"critique":{CRITIC:n==="Gemini"?"combine":"critique",EXPANDER:"expand",ARCHITECT:n==="Gemini"?"combine":"verify",DEV_ADVOCATE:n==="Gemini"?"combine":"critique",FIRST_PRINCIPLES:n==="Gemini"?"verify":"combine",INTERVIEWER:n==="Gemini"?"combine":"verify",FIVE_WHYS:"verify",HISTORIAN_FUTURIST:n==="Gemini"?"verify":"expand",ELI5:n==="Gemini"?"combine":"verify",CUSTOM:"combine"}[e]||"expand"}function ne(e){return e==="DISCUSSION"?4:6}function k(e){const t=e.toLowerCase();return t.includes("dear user")||t.includes("hello")||t.includes("hi there")||t.includes("thanks for")||t.includes("thank you for")||t.includes("to help you")||t.includes("for the user")||t.includes("for the human")||t.includes("dear ")||t.includes("the user should")||t.includes("the best approach for you")||t.includes("mr. sata")||t.includes("mr. sataa")||t.includes("as an ai")||t.includes("as a language model")||t.includes("recommend you")||t.includes("recommend to you")||t.includes("your request")||t.includes("would you like")||t.includes("shall i prepare")||t.includes("shall i")||t.includes("let me know if you need")||t.includes("feel free to ask")||t.includes("i can help you")||t.includes("let me know")||t.includes("for you")||t.includes("you can use this")||t.includes("the final answer")||t.includes("in summary for the user")||t.includes("here's a summary for you")||t.includes("here is a summary")||t.includes("i recommend")||t.includes("would you like a roadmap")||t.includes("i can now create")||t.includes("أستاذ ساطع")||t.includes("هل ترغب")||t.includes("يمكنني أن")||t.includes("أقترح عليك")||t.includes("بصفتي ذكاء")||t.includes("يسعدني أن")||t.includes("دعني أعرف")||t.includes("لأجلك")||t.includes("هل يمكنني")||t.includes("إليك ملخص")||t.includes("أوصي بأن")?"You used forbidden user-facing or AI-disclaimer language. You must speak ONLY to your agent collaborator.":null}function _(e){const t=e.match(/\[ESCALATION_REQUIRED\]([\s\S]*?)\[\/ESCALATION_REQUIRED\]/i);if(!t)return null;const n=t[1],o={reason:"",decision_needed:"",options:[],recommended_option:"",next_step_after_decision:""},s=r=>{const c=n.match(new RegExp(`${r}:\\s*(.*?)(?=\\n[a-z_]+:|$)`,"is"));return c?c[1].trim():""};o.reason=s("reason"),o.decision_needed=s("decision_needed"),o.recommended_option=s("recommended_option"),o.next_step_after_decision=s("next_step_after_decision");const a=n.match(/options:\s*((?:-\s+.*\n?)*)/i);return a!=null&&a[1]&&(o.options=a[1].split(`
`).map(r=>r.replace(/^-?\s*/,"").trim()).filter(Boolean)),o.reason?o:null}function ie(e){return`

[DISCUSSION CONTROL - HIDDEN]
The discussion has reached a convergence checkpoint.
Address ${e} directly.
Do not expand scope.
Choose exactly one action for this turn:
- conclude the current sub-issue,
- mark a claim unsupported,
- mark a claim as inference only,
- request verification on one concrete point,
- emit an [ESCALATION_REQUIRED] block.
If you conclude, use this compact structure:
Established Facts:
- ...
Unsupported Claims:
- ...
Unresolved Items:
- ...`}function oe(e){const t=e.toLowerCase();return!!_(e)||t.includes("established facts")||t.includes("unsupported claims")||t.includes("unresolved items")||t.includes("inference only")||t.includes("unsupported")}function se(e){return`[DISCUSSION SAFETY OVERRIDE]
${e}, no stable conclusion yet. One claim remains unsupported, one point requires verification, and further expansion is blocked. Narrow to a single disputed point or emit an [ESCALATION_REQUIRED] block.`}async function re(e,t,n,o){const s=k(o);if(!s)return{text:o,status:"clean"};u(`[RULE VIOLATION] ${t}: ${s}. Attempting repair...`,"system");const a=`[SYSTEM: RULE VIOLATION]
${s}

Rewrite your previous response so it is fully discussion-safe.
Requirements:
1. Address ${n} directly.
2. Do not address the human user.
3. No greetings, no offers, no assistant persona language.
4. Make exactly one move: critique, refine, verify, narrow, combine, conclude, or escalate.
5. Output only the corrected response.`,r=await S(e,a);if(r&&i.active&&!k(r))return{text:r,status:"repaired"};u(`[RULE VIOLATION] ${t}: Repair failed, regenerating once...`,"system");const c=`[SYSTEM: DISCUSSION REGENERATE]
Your prior response remained invalid.
Generate a new compact agent-to-agent reply for ${n} only.
Do not address the human.
No greetings, no offers, no polished essay framing.
Do exactly one of: critique, refine, verify, narrow, combine, conclude, escalate.
If evidence is weak, mark inference or escalate.
Output only the new reply.`,p=await S(e,c);return p&&i.active&&!k(p)?{text:p,status:"regenerated"}:(u(`[RULE VIOLATION] ${t}: Repair and regenerate failed. Forcing discussion-safe fallback.`,"error"),{text:se(n),status:"forced"})}function ae(e,t,n,o){const s=["[STUDIO CONTROL]",`Current phase: ${t}.`,`Primary intent for this turn: ${n}.`];return o&&(s.push(`Objective: ${o.objective}.`),o.constraints.length&&s.push(`Constraints: ${o.constraints.join("; ")}.`)),t==="DIVERGE"&&s.push("Expand possibilities, generate options, and expose interesting contrasts."),t==="CONVERGE"&&s.push("Narrow the space, compare options directly, and reduce ambiguity."),t==="FINALIZE"&&s.push("Conclude sharply, synthesize decisions, and minimize new branches of thought."),`${e}

${s.join(`
`)}`}async function ce(e){if(!i.sessionId)return;await G(i.sessionId,e).catch(()=>{});const t=await h(i.sessionId).catch(()=>{});t&&await x(t.id,b(t.transcript,t.framing)).catch(()=>{})}async function ue(e){if(!i.sessionId||i.currentRound%ne(i.mode)!==0&&i.currentRound!==i.rounds)return;const t=await h(i.sessionId).catch(()=>{});if(!t)return;const n=b(t.transcript,t.framing),o={id:crypto.randomUUID(),turn:i.currentRound,phase:i.currentPhase,label:i.currentPhase==="DIVERGE"?`Expand Checkpoint ${i.currentRound}`:i.currentPhase==="CONVERGE"?`Narrow Checkpoint ${i.currentRound}`:`Final Checkpoint ${i.currentRound}`,createdAt:Date.now(),transcriptCount:t.transcript.length,promptSnapshot:e,summary:n.synthesis,artifactSnapshot:n};i.activeCheckpointId=o.id,await W(t.id,o).catch(()=>{}),await x(t.id,n).catch(()=>{}),u(`Checkpoint created: ${o.label}`,"system"),l()}async function $(e){var r;if(!i.sessionId)return{success:!1,text:"No active session."};const t=await h(i.sessionId);if(!t)return{success:!1,text:"Session not found."};const n=t.artifacts||b(t.transcript,t.framing),o=[`Topic: ${t.topic}`,`Mode: ${t.mode}`,`Role: ${t.role}`,`Objective: ${((r=t.framing)==null?void 0:r.objective)||t.topic}`,`Highlights: ${n.highlights.join(" | ")||"n/a"}`,`Ideas: ${n.ideas.join(" | ")||"n/a"}`,`Risks: ${n.risks.join(" | ")||"n/a"}`,`Questions: ${n.questions.join(" | ")||"n/a"}`].join(`
`),s={executive:`${o}

Produce an executive summary with the strongest outcome and tradeoffs.`,product:`${o}

Turn this into a product concept note with core value, audience, and differentiators.`,roadmap:`${o}

Turn this into a roadmap with phases, milestones, and sequencing.`,risks:`${o}

Turn this into a risk register with severity, exposure, and mitigations.`,decision:`${o}

Turn this into a concise decision memo with recommendation, why now, and unresolved items.`};let a="";return i.geminiTabId&&(a=await S(i.geminiTabId,s[e])),a||(a=s[e]),await z(t.id,e,a).catch(()=>{}),e==="executive"&&(i.prompt=a),l(),{success:!0,text:a}}async function le(e,t,n){const o=await h(e);if(!o)throw new Error("Session not found");const s=(o.checkpoints||[]).find(r=>r.id===t);if(!s)throw new Error("Checkpoint not found");const a=crypto.randomUUID();return await M({...o,id:a,timestamp:Date.now(),topic:s.promptSnapshot,transcript:o.transcript.slice(0,s.transcriptCount),checkpoints:[],escalations:[],moderatorDecisions:[],finalOutputs:{},artifacts:s.artifactSnapshot,parentSessionId:o.id,branchLabel:n||s.label,branchOriginTurn:s.turn,firstSpeaker:o.firstSpeaker||i.firstSpeaker}),chrome.storage.local.set({branchDraft:{topic:s.promptSnapshot,mode:o.mode,role:o.role,firstSpeaker:o.firstSpeaker||i.firstSpeaker,customGeminiPrompt:i.customGeminiPrompt||"",customChatGPTPrompt:i.customChatGPTPrompt||""}}),{success:!0,branchSessionId:a}}function de(e){return e==="Gemini"?{tabId:i.geminiTabId,initPrompt:(t,n)=>t.geminiInit(n,i.customGeminiPrompt),loopPrompt:(t,n)=>t.geminiLoop(n,i.customGeminiPrompt),counterpart:"Agent B"}:{tabId:i.chatGPTTabId,initPrompt:(t,n)=>t.chatGPTInit(n,i.customChatGPTPrompt),loopPrompt:(t,n)=>t.chatGPTLoop(n,i.customChatGPTPrompt),counterpart:"Agent B"}}function R(e){return e==="Gemini"?"Agent B":"Agent A"}function he(e,t){return`Here is the latest input from your collaborator:
---
${e}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`}function pe(e,t){return`[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:
---
${e}
---

RULES:
1. Address ${t==="Gemini"?"Agent B":"Agent A"} directly. DO NOT address the human user.
2. Incorporate this decision to unblock the discussion.`}async function N(e,t,n,o,s){const a=de(e);let r=s??i.prompt;i.humanFeedback?(r=he(r,i.humanFeedback),i.humanFeedback=null,l()):i.resumeContext&&i.mode==="DISCUSSION"&&(r=pe(i.resumeContext,e),i.resumeContext=null,l()),i.currentIntent=Y(i.role,i.currentPhase,e,i.mode);let c=t?a.initPrompt(n,r):a.loopPrompt(n,r);c=ae(c,i.currentPhase,i.currentIntent,o);const p=i.mode==="DISCUSSION"&&i.discussionTurnSinceCheckpoint>=D;p&&(c+=ie(R(e)),u(`Convergence checkpoint reached. Forced sub-issue resolution requested for ${e}.`,"system"));let d=await S(a.tabId,c);if(!i.active)return{output:"",escalated:!1};if(!d)throw new Error(`${e} produced no output.`);let I="clean";if(i.mode==="DISCUSSION"){const m=await re(a.tabId,e,R(e),d);d=m.text,I=m.status,i.discussionTurnSinceCheckpoint=p?oe(d)?0:D:i.discussionTurnSinceCheckpoint+1}if(i.lastSpeaker=e,i.lastRepairStatus=I,i.prompt=d,l(),await ce({agent:e,text:d,timestamp:Date.now(),intent:i.currentIntent,phase:i.currentPhase,repairStatus:I,checkpointTag:i.activeCheckpointId}),i.mode==="DISCUSSION"){const m=_(d);if(m)return i.lastEscalation=m,i.isPaused=!0,i.awaitingHumanDecision=!0,i.currentIntent="escalate",u(`[ESCALATION DETECTED] ${e} requests human input. Reason: ${m.reason}`,"system"),i.sessionId&&await K(i.sessionId,m).catch(()=>{}),l(),{output:d,escalated:!0}}return{output:d,escalated:!1}}async function L(){const e=O[i.role]?i.role:"CRITIC",t=O[e];u(`Loop started with role: ${e}`);try{for(;i.active&&i.currentRound<i.rounds;){for(i.currentRound++,i.currentPhase=te(i.currentRound,i.rounds),l(),u(`Round ${i.currentRound} initiating in phase ${i.currentPhase}...`);i.isPaused&&i.active;)await y(1e3);if(!i.active)break;const n=i.sessionId?await h(i.sessionId).catch(()=>{}):void 0,o=n==null?void 0:n.framing,s=i.firstSpeaker,a=s==="Gemini"?"ChatGPT":"Gemini",r=await N(s,i.currentRound===1,t,o);if(!i.active)break;if(r.escalated)continue;for(await y(1500);i.isPaused&&i.active;)await y(1e3);if(!i.active)break;const c=await N(a,!1,t,o,r.output);if(!i.active)break;c.escalated||(await ue(c.output),await y(1500))}}catch(n){u(`Loop crashed: ${n.message}`,"error")}finally{i.active=!1,u("Run completed or stopped.","system"),l()}}async function S(e,t){await Z(e);try{await chrome.tabs.update(e,{active:!0});const a=await chrome.tabs.get(e);a.windowId&&await chrome.windows.update(a.windowId,{focused:!0}),await y(200)}catch{u(`Failed to focus tab ${e}`,"error")}let n=0,o=!1;for(;n<3&&!o;){n++;const a=await v(e,{action:"runPrompt",text:t});(a==null?void 0:a.status)==="done"?o=!0:await y(1e3)}if(!o)return u(`Failed to send prompt to tab ${e}`,"error"),"";u("Waiting for generation...","info"),await v(e,{action:"waitForDone"});const s=await v(e,{action:"getLastResponse"});return(s==null?void 0:s.text)||""}function y(e){return new Promise(t=>setTimeout(t,e))}
