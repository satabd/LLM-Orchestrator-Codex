const N="LLMOrchestratorDB";const h="sessions";function S(){return new Promise((e,i)=>{const o=indexedDB.open(N,1);o.onerror=()=>i(o.error),o.onsuccess=()=>e(o.result),o.onupgradeneeded=s=>{const r=s.target.result;r.objectStoreNames.contains(h)||r.createObjectStore(h,{keyPath:"id"}).createIndex("timestamp","timestamp",{unique:!1})}})}async function D(e){const i=await S();return new Promise((o,s)=>{const c=i.transaction(h,"readwrite").objectStore(h).add(e);c.onsuccess=()=>o(),c.onerror=()=>s(c.error)})}async function P(e){const i=await S();return new Promise((o,s)=>{const c=i.transaction(h,"readonly").objectStore(h).get(e);c.onsuccess=()=>o(c.result),c.onerror=()=>s(c.error)})}async function b(e,i){const o=await S(),s=await P(e);if(!s)throw new Error("Session not found");return s.transcript.push(i),new Promise((r,n)=>{const d=o.transaction(h,"readwrite").objectStore(h).put(s);d.onsuccess=()=>r(),d.onerror=()=>n(d.error)})}async function R(){const e=await S();return new Promise((i,o)=>{const n=e.transaction(h,"readonly").objectStore(h).getAll();n.onsuccess=()=>{const c=n.result;c.sort((p,d)=>d.timestamp-p.timestamp),i(c)},n.onerror=()=>o(n.error)})}async function k(e){const i=await S();return new Promise((o,s)=>{const c=i.transaction(h,"readwrite").objectStore(h).delete(e);c.onsuccess=()=>o(),c.onerror=()=>s(c.error)})}async function w(e,i){const o=await S();return new Promise((s,r)=>{const n=o.transaction(h,"readwrite"),c=n.objectStore(h),p=c.get(e);p.onsuccess=()=>{const d=p.result;d&&(d.escalations||(d.escalations=[]),d.escalations.push(i),c.put(d))},n.oncomplete=()=>s(),n.onerror=()=>r(n.error)})}const $={active:!1,sessionId:null,prompt:"",mode:"PING_PONG",role:"CRITIC",rounds:3,currentRound:0,geminiTabId:null,chatGPTTabId:null,statusLog:[],isPaused:!1,humanFeedback:null,awaitingHumanDecision:!1,lastSpeaker:null,lastEscalation:null,resumeContext:null,discussionTurnSinceCheckpoint:0};let t={...$},v=!0;function l(){chrome.storage.local.set({brainstormState:t})}async function L(){return new Promise(e=>{chrome.storage.local.get(["brainstormState"],i=>{i.brainstormState&&(t=i.brainstormState,t.active=!1,l()),v=!1,e()})})}L();chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0});function a(e,i="info"){const o=`[${i==="info"?"Info":i==="error"?"Error":"System"}] ${e}`;console.log(o),t.statusLog.length>50&&t.statusLog.shift(),t.statusLog.push(o),l()}function E(e,i){return new Promise((o,s)=>{chrome.tabs.sendMessage(e,i,r=>{const n=chrome.runtime.lastError;o(n?null:r)})})}async function U(e){try{await chrome.scripting.executeScript({target:{tabId:e},files:["content.js"]})}catch{}}const O={CRITIC:{geminiInit:e=>`Topic: "${e}"

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

Provide an initial creative concept for this topic. Keep it open-ended.`,geminiLoop:e=>`Your collaborator added the following ideas:
---
${e}
---

Using the 'Yes, And...' principle, accept their additions and expand the concept further in a new direction.`,chatGPTLoop:e=>`Your collaborator proposed this concept:
---
${e}
---

Using the 'Yes, And...' principle, accept this concept and add new, highly creative dimensions or features to it without criticizing.`},ARCHITECT:{geminiInit:e=>`Topic: "${e}"

You are a Visionary Product Leader. Pitch a bold, high-level vision for this topic, focusing on user experience, value, and disruption.`,geminiLoop:e=>`The Systems Architect responded with this feasibility analysis:
---
${e}
---

Defend your vision or adapt it based on these constraints, maintaining the visionary perspective.`,chatGPTLoop:e=>`You are a Systems Architect. The Visionary just proposed:
---
${e}
---

Analyze the technical feasibility, potential bottlenecks, system requirements, and suggest realistic architectural approaches to build this.`},DEV_ADVOCATE:{geminiInit:e=>`Topic: "${e}"

Propose a robust, complete solution or thesis for this topic. Be definitive.`,geminiLoop:e=>`The Devil's Advocate attacked your proposal:
---
${e}
---

Rebut their attacks, patch the vulnerabilities in your logic, and present a stronger proposal.`,chatGPTLoop:e=>`You are the Devil's Advocate. Your job is to destroy this proposal:
---
${e}
---

Find every logical fallacy, market weakness, performance issue, or security hole. Do not hold back.`},FIRST_PRINCIPLES:{geminiInit:e=>`Topic: "${e}"

You are the Deconstructor. Break this topic down into its absolute, undeniable fundamental truths and physical/logical constraints. Strip away all industry assumptions.`,geminiLoop:e=>`The Synthesizer built this solution from your principles:
---
${e}
---

Deconstruct their solution. Are they relying on any hidden assumptions? Break it down again.`,chatGPTLoop:e=>`Here are the fundamental truths of the problem:
---
${e}
---

You are the Synthesizer. Build a completely novel, unconventional solution from the ground up using ONLY these fundamental truths.`},INTERVIEWER:{geminiInit:e=>`Topic: "${e}"

You are a world-class Domain Expert explaining this topic at a high level.`,geminiLoop:e=>`The Interviewer asks:
---
${e}
---

Provide a deeply nuanced, expert answer.`,chatGPTLoop:e=>`The Expert says:
---
${e}
---

You are a probing Journalist. Ask one highly specific, clarifying follow-up question to force them to go deeper or explain hard jargon.`},FIVE_WHYS:{geminiInit:e=>`Topic: "${e}"

State the core problem or standard solution associated with this topic.`,geminiLoop:e=>`Response:
---
${e}
---

Answer the "Why" to drill deeper into the root cause.`,chatGPTLoop:e=>`Statement:
---
${e}
---

Ask "Why is that the case?" or "Why does that happen?" to drill down into the root cause.`},HISTORIAN_FUTURIST:{geminiInit:e=>`Topic: "${e}"

You are a Historian. Analyze this topic based on historical precedents, past failures, and established data.`,geminiLoop:e=>`The Futurist predicts:
---
${e}
---

Check their prediction against history. What historical cycles or human behaviors might disrupt their sci-fi scenario?`,chatGPTLoop:e=>`The Historian notes:
---
${e}
---

You are a Futurist. Project this 50 years into the future. How will emerging tech and societal shifts evolve this past the historical constraints?`},ELI5:{geminiInit:e=>`Topic: "${e}"

Provide a highly complex, academic, and technically precise explanation of this topic.`,geminiLoop:e=>`Here is the simplified ELI5 version:
---
${e}
---

Correct any oversimplifications or lost nuances while keeping it accessible.`,chatGPTLoop:e=>`Academic Explanation:
---
${e}
---

Translate this into an "Explain Like I'm 5" (ELI5) version using simple metaphors.`},CUSTOM:{geminiInit:(e,i)=>`${i}

Here is the initial topic:
---
${e}
---`,geminiLoop:(e,i)=>`${i}

Here is the latest input from the collaborator:
---
${e}
---`,chatGPTLoop:(e,i)=>`${i}

Here is the latest input from the collaborator:
---
${e}
---`},DISCUSSION:{geminiInit:e=>`[SYSTEM: DISCUSSION MODE] You are Agent A in an internal agent-to-agent working session. You are speaking directly to Agent B to start a discussion on the following topic:
---
${e}
---

RULES:
1. Address Agent B directly. DO NOT address the human user.
2. DO NOT use phrases like "Dear User", "I recommend you", "As an AI", or "Mr. Sataa".
3. TURN OBJECTIVE: Start the analysis. Provide your initial thesis, identify risks, or propose options for Agent B to critique.
4. Do NOT close with offers, next-step suggestions for the user, or invitations. End with a challenge, a narrowing move, a conclusion, or an escalation.
5. BOUNDARIES: If evidence boundaries (non-public data, industry practices, weak quantitative data) are reached, you MUST mark as inference, request verification, or emit an [ESCALATION_REQUIRED] block.`,geminiLoop:e=>`[SYSTEM: DISCUSSION MODE] You are Agent A in an internal agent-to-agent working session. Agent B just said:
---
${e}
---

RULES:
1. Address Agent B directly. DO NOT address the human user.
2. DO NOT use phrases like "Dear User", "I recommend you", "As an AI", or "Mr. Sataa".
3. TURN OBJECTIVE: Critique their ideas, refine them, combine multiple options, reject them, escalate, or conclude the sub-issue. Speak ONLY as a collaborator/debater.
4. Do NOT close with offers, next-step suggestions for the user, or invitations.
5. CONVERGENCE & BOUNDARIES: If debating the same point or if evidence boundaries are reached, you MUST produce a compact structured conclusion (Established Facts, Unsupported Claims, Unresolved Items) or emit an [ESCALATION_REQUIRED] block.`,chatGPTLoop:e=>`[SYSTEM: DISCUSSION MODE] You are Agent B in an internal agent-to-agent working session. Agent A just said:
---
${e}
---

RULES:
1. Address Agent A directly. DO NOT address the human user.
2. DO NOT use phrases like "Dear User", "I recommend you", "As an AI", or "Mr. Sataa".
3. TURN OBJECTIVE: Critique their ideas, refine them, combine multiple options, reject them, escalate, or conclude the sub-issue. Speak ONLY as a collaborator/debater.
4. Do NOT close with offers, next-step suggestions for the user, or invitations.
5. CONVERGENCE & BOUNDARIES: If debating the same point or if evidence boundaries are reached, you MUST produce a compact structured conclusion (Established Facts, Unsupported Claims, Unresolved Items) or emit an [ESCALATION_REQUIRED] block.`}};chrome.runtime.onMessage.addListener((e,i,o)=>{if(e.action==="getAllSessions")return R().then(s=>{o(s)}).catch(s=>{o([])}),!0;if(e.action==="deleteSession")return k(e.id).then(()=>{o({success:!0})}).catch(s=>{o({success:!1})}),!0;if(e.action==="getBrainstormState")return o(t),!1;if(e.action==="stopBrainstorm")return t.active=!1,a("Stopped by user.","system"),l(),o({success:!0}),!0;if(e.action==="startBrainstorm")return(async()=>{v&&await L();const{topic:s,rounds:r,role:n,mode:c,customGeminiPrompt:p,customChatGPTPrompt:d,geminiTabId:u,chatGPTTabId:f}=e;if(!u||!f){o({success:!1,error:"Missing tab IDs."});return}const m=crypto.randomUUID();t={active:!0,sessionId:m,prompt:s,mode:c||"PING_PONG",role:n||"CRITIC",customGeminiPrompt:p,customChatGPTPrompt:d,rounds:r||3,currentRound:0,geminiTabId:u,chatGPTTabId:f,statusLog:[],isPaused:!1,humanFeedback:null,awaitingHumanDecision:!1,lastSpeaker:null,lastEscalation:null,resumeContext:null,discussionTurnSinceCheckpoint:0},a(`Starting run: ${r} rounds...`,"system"),l();try{await D({id:m,topic:s,mode:t.mode,role:t.role,timestamp:Date.now(),transcript:[{agent:"User",text:s}]})}catch(y){a(`Failed to create DB session: ${y.message}`,"error")}C().catch(y=>{a(`Loop fatal error: ${y.message}`,"error"),t.active=!1,l()}),o({success:!0})})(),!0;if(e.action==="continueBrainstorm")return(async()=>{if(!t.geminiTabId||!t.chatGPTTabId){o({success:!1,error:"Tab IDs missing. Start a new run instead."});return}if(t.active){o({success:!1,error:"Run is already active."});return}const s=e.additionalRounds||2;t.rounds+=s,t.active=!0,a(`Continuing run for ${s} more rounds...`,"system"),l(),C().catch(r=>{a(`Loop fatal error: ${r.message}`,"error"),t.active=!1,l()}),o({success:!0})})(),!0;if(e.action==="generateConclusion")return(async()=>{if(!t.geminiTabId){o({success:!1,error:"Gemini tab ID missing."});return}if(t.active){o({success:!1,error:"Run is active. Please wait for it to finish."});return}t.active=!0,a("Generating Final Conclusion via Gemini...","system"),l();try{const s=`The debate is now over. Here is the final thought from your collaborator:
---
${t.prompt}
---

Please synthesize everything that has been discussed into a single, highly polished, definitive Final Conclusion or Executive Summary.`,r=await g(t.geminiTabId,s);r?(a("Conclusion generated successfully.","system"),t.prompt=r):a("Failed to generate conclusion.","error")}catch(s){a(`Conclusion error: ${s.message}`,"error")}finally{t.active=!1,l()}o({success:!0})})(),!0;if(e.action==="pauseBrainstorm"){if(!t.active){o({success:!1,error:"Run is not active."});return}return t.isPaused=!0,a("Human Intervention: Run paused. Waiting for input...","system"),l(),o({success:!0}),!0}if(e.action==="resumeBrainstorm"){if(!t.active||!t.isPaused){o({success:!1,error:"Run is not paused."});return}return t.isPaused=!1,e.feedback?(a("Human Intervention: Feedback received. Resuming...","system"),t.statusLog.push(`[System] Moderator: ${e.feedback}`),t.sessionId&&b(t.sessionId,{agent:"System",text:`[Moderator Intervention]
${e.feedback}`}).catch(()=>{}),t.awaitingHumanDecision?(t.resumeContext=e.feedback,t.awaitingHumanDecision=!1,t.lastEscalation=null):t.humanFeedback=e.feedback):(a("Human Intervention: Run resumed without feedback.","system"),t.awaitingHumanDecision=!1,t.lastEscalation=null),l(),o({success:!0}),!0}return!1});function A(e){const i=e.match(/\[ESCALATION_REQUIRED\]([\s\S]*?)\[\/ESCALATION_REQUIRED\]/i);if(!i)return null;const o=i[1],s={reason:"",decision_needed:"",options:[],recommended_option:"",next_step_after_decision:""},r=c=>{const p=o.match(new RegExp(`${c}:\\s*(.*?)(?=\\n[a-z_]+:|$)`,"is"));return p?p[1].trim():""};s.reason=r("reason"),s.decision_needed=r("decision_needed"),s.recommended_option=r("recommended_option"),s.next_step_after_decision=r("next_step_after_decision");const n=o.match(/options:\s*((?:-\s+.*\n?)*)/i);return n&&n[1]&&(s.options=n[1].split(`
`).map(c=>c.replace(/^-?\s*/,"").trim()).filter(c=>c.length>0)),s.reason?s:null}function I(e){const i=e.toLowerCase();return i.includes("dear user")||i.includes("mr. sata")||i.includes("mr. sataa")||i.includes("as an ai")||i.includes("as a language model")||i.includes("recommend you")||i.includes("recommend to you")||i.includes("your request")||i.includes("would you like")||i.includes("shall i prepare")||i.includes("shall i")||i.includes("let me know if you need")||i.includes("feel free to ask")||i.includes("i can help you")||i.includes("let me know")||i.includes("for you")||i.includes("here's a summary for you")||i.includes("here is a summary")||i.includes("i recommend")||i.includes("would you like a roadmap")||i.includes("i can now create")||i.includes("أستاذ ساطع")||i.includes("هل ترغب")||i.includes("يمكنني أن")||i.includes("أقترح عليك")||i.includes("بصفتي ذكاء")||i.includes("يسعدني أن")||i.includes("دعني أعرف")||i.includes("لأجلك")||i.includes("هل يمكنني")||i.includes("إليك ملخص")||i.includes("أوصي بأن")?"You used forbidden user-facing or AI-disclaimer language. You must speak ONLY to your agent collaborator.":null}async function C(){let e=t.prompt;const i=O[t.role]?t.role:"CRITIC",o=O[i];a(`Loop started with role: ${i}`);try{for(;t.active&&t.currentRound<t.rounds;){for(t.currentRound++,l(),a(`Round ${t.currentRound} initiating...`);t.isPaused&&t.active;)await T(1e3);if(!t.active)break;a("Executing Gemini turn...");let s="",r=e;t.humanFeedback?(r=`Here is the latest input from your collaborator:
---
${e}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t.humanFeedback}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`,t.humanFeedback=null,l()):t.resumeContext&&t.mode==="DISCUSSION"&&(r=`[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:
---
${t.resumeContext}
---

RULES:
1. Address Agent B directly. DO NOT address the human user.
2. Incorporate this decision to unblock the discussion.`,t.resumeContext=null,l()),t.currentRound===1?s=o.geminiInit(r,t.customGeminiPrompt):s=o.geminiLoop(r,t.customGeminiPrompt),t.mode==="DISCUSSION"&&t.discussionTurnSinceCheckpoint>=4&&(s+=`

[DISCUSSION CONTROL]
Do not expand the topic further.
Your next response must do exactly one of the following:
- conclude the current sub-issue,
- mark a claim unsupported,
- mark a claim as inference only,
- escalate for human input.`,t.discussionTurnSinceCheckpoint=0,a("Convergence checkpoint reached. Forced sub-issue conclusion requested for Gemini.","system"),l());let n=await g(t.geminiTabId,s);if(!t.active)break;if(!n){a("Gemini produced no output. Aborting.","error");break}if(t.mode==="DISCUSSION"){let u=I(n);if(u){a(`[RULE VIOLATION] Gemini: ${u}. Attempting repair...`,"system");const f=`[SYSTEM: RULE VIOLATION] ${u}

RULES REMINDER:
1. Address Agent B directly.
2. DO NOT address the human user or use AI disclaimers.

Please rewrite your previous response exactly to comply with these rules. Do not include apologies, just output the corrected response.`;let m=await g(t.geminiTabId,f);m&&t.active&&(u=I(m),u&&(a(`[RULE VIOLATION] Gemini: ${u}. Repair failed, regenerating once more...`,"system"),m=await g(t.geminiTabId,f),u=I(m||""))),u||!m?(a("[RULE VIOLATION] Gemini: Repair completely failed. Forcing generic response.","error"),n="[SYSTEM ENFORCED REPLACEMENT] Your last message drifted into user-facing mode. Narrow your claim and continue the debate."):m&&t.active&&(n=m)}t.discussionTurnSinceCheckpoint++,l()}if(t.sessionId&&await b(t.sessionId,{agent:"Gemini",text:n}).catch(()=>{}),t.mode==="DISCUSSION"){const u=A(n);if(u){t.lastEscalation=u,t.isPaused=!0,t.awaitingHumanDecision=!0,a(`[ESCALATION DETECTED] Gemini requests human input. Reason: ${u.reason}`,"system"),t.sessionId&&await w(t.sessionId,u).catch(()=>{}),l();continue}}for(await T(2e3);t.isPaused&&t.active;)await T(1e3);if(!t.active)break;a("Executing ChatGPT turn...");let c=n;t.humanFeedback?(c=`Here is the latest input from your collaborator:
---
${n}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t.humanFeedback}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`,t.humanFeedback=null,l()):t.resumeContext&&t.mode==="DISCUSSION"&&(c=`[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:
---
${t.resumeContext}
---

RULES:
1. Address Agent A directly. DO NOT address the human user.
2. Incorporate this decision to unblock the discussion.`,t.resumeContext=null,l());let p=o.chatGPTLoop(c,t.customChatGPTPrompt);t.mode==="DISCUSSION"&&t.discussionTurnSinceCheckpoint>=4&&(p+=`

[DISCUSSION CONTROL]
Do not expand the topic further.
Your next response must do exactly one of the following:
- conclude the current sub-issue,
- mark a claim unsupported,
- mark a claim as inference only,
- escalate for human input.`,t.discussionTurnSinceCheckpoint=0,a("Convergence checkpoint reached. Forced sub-issue conclusion requested for ChatGPT.","system"),l());let d=await g(t.chatGPTTabId,p);if(!t.active)break;if(!d){a("ChatGPT produced no output. Aborting.","error");break}if(t.mode==="DISCUSSION"){let u=I(d);if(u){a(`[RULE VIOLATION] ChatGPT: ${u}. Attempting repair...`,"system");const f=`[SYSTEM: RULE VIOLATION] ${u}

RULES REMINDER:
1. Address Agent A directly.
2. DO NOT address the human user or use AI disclaimers.

Please rewrite your previous response exactly to comply with these rules. Do not include apologies, just output the corrected response.`;let m=await g(t.chatGPTTabId,f);m&&t.active&&(u=I(m),u&&(a(`[RULE VIOLATION] ChatGPT: ${u}. Repair failed, regenerating once more...`,"system"),m=await g(t.chatGPTTabId,f),u=I(m||""))),u||!m?(a("[RULE VIOLATION] ChatGPT: Repair completely failed. Forcing generic response.","error"),d="[SYSTEM ENFORCED REPLACEMENT] Your last message drifted into user-facing mode. Narrow your claim and continue the debate."):m&&t.active&&(d=m)}t.discussionTurnSinceCheckpoint++,l()}if(e=d,t.prompt=e,l(),t.sessionId&&await b(t.sessionId,{agent:"ChatGPT",text:d}).catch(()=>{}),t.mode==="DISCUSSION"){const u=A(d);if(u){t.lastEscalation=u,t.isPaused=!0,t.awaitingHumanDecision=!0,a(`[ESCALATION DETECTED] ChatGPT requests human input. Reason: ${u.reason}`,"system"),t.sessionId&&await w(t.sessionId,u).catch(()=>{}),l();continue}}await T(2e3)}}catch(s){a(`Loop crashed: ${s.message}`,"error")}finally{t.active=!1,a("Run completed or stopped.","system"),l()}}async function g(e,i){await U(e);try{await chrome.tabs.update(e,{active:!0});const n=await chrome.tabs.get(e);n.windowId&&await chrome.windows.update(n.windowId,{focused:!0}),await T(200)}catch{a(`Failed to focus tab ${e}`,"error")}let o=0,s=!1;for(;o<3&&!s;){o++;const n=await E(e,{action:"runPrompt",text:i});(n==null?void 0:n.status)==="done"?s=!0:await T(1e3)}if(!s)return a(`Failed to send prompt to tab ${e}`,"error"),"";a("Waiting for generation...","info"),await E(e,{action:"waitForDone"});const r=await E(e,{action:"getLastResponse"});return(r==null?void 0:r.text)||""}function T(e){return new Promise(i=>setTimeout(i,e))}
