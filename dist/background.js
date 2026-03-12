const D="LLMOrchestratorDB";const m="sessions";function T(){return new Promise((e,i)=>{const o=indexedDB.open(D,1);o.onerror=()=>i(o.error),o.onsuccess=()=>e(o.result),o.onupgradeneeded=s=>{const r=s.target.result;r.objectStoreNames.contains(m)||r.createObjectStore(m,{keyPath:"id"}).createIndex("timestamp","timestamp",{unique:!1})}})}async function L(e){const i=await T();return new Promise((o,s)=>{const a=i.transaction(m,"readwrite").objectStore(m).add(e);a.onsuccess=()=>o(),a.onerror=()=>s(a.error)})}async function C(e){const i=await T();return new Promise((o,s)=>{const a=i.transaction(m,"readonly").objectStore(m).get(e);a.onsuccess=()=>o(a.result),a.onerror=()=>s(a.error)})}async function E(e,i){const o=await T(),s=await C(e);if(!s)throw new Error("Session not found");return s.transcript.push(i),new Promise((r,n)=>{const d=o.transaction(m,"readwrite").objectStore(m).put(s);d.onsuccess=()=>r(),d.onerror=()=>n(d.error)})}async function N(){const e=await T();return new Promise((i,o)=>{const n=e.transaction(m,"readonly").objectStore(m).getAll();n.onsuccess=()=>{const a=n.result;a.sort((h,d)=>d.timestamp-h.timestamp),i(a)},n.onerror=()=>o(n.error)})}async function R(e){const i=await T();return new Promise((o,s)=>{const a=i.transaction(m,"readwrite").objectStore(m).delete(e);a.onsuccess=()=>o(),a.onerror=()=>s(a.error)})}const k={active:!1,sessionId:null,prompt:"",mode:"PING_PONG",role:"CRITIC",rounds:3,currentRound:0,geminiTabId:null,chatGPTTabId:null,statusLog:[],isPaused:!1,humanFeedback:null,awaitingHumanDecision:!1,lastSpeaker:null,lastEscalation:null,resumeContext:null};let t={...k},v=!0;function u(){chrome.storage.local.set({brainstormState:t})}async function P(){return new Promise(e=>{chrome.storage.local.get(["brainstormState"],i=>{i.brainstormState&&(t=i.brainstormState,t.active=!1,u()),v=!1,e()})})}P();chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0});function c(e,i="info"){const o=`[${i==="info"?"Info":i==="error"?"Error":"System"}] ${e}`;console.log(o),t.statusLog.length>50&&t.statusLog.shift(),t.statusLog.push(o),u()}function S(e,i){return new Promise((o,s)=>{chrome.tabs.sendMessage(e,i,r=>{const n=chrome.runtime.lastError;o(n?null:r)})})}async function $(e){try{await chrome.scripting.executeScript({target:{tabId:e},files:["content.js"]})}catch{}}const b={CRITIC:{geminiInit:e=>`Topic: "${e}"

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
5. CONVERGENCE & BOUNDARIES: If debating the same point or if evidence boundaries are reached, you MUST produce a compact structured conclusion (Established Facts, Unsupported Claims, Unresolved Items) or emit an [ESCALATION_REQUIRED] block.`}};chrome.runtime.onMessage.addListener((e,i,o)=>{if(e.action==="getAllSessions")return N().then(s=>{o(s)}).catch(s=>{o([])}),!0;if(e.action==="deleteSession")return R(e.id).then(()=>{o({success:!0})}).catch(s=>{o({success:!1})}),!0;if(e.action==="getBrainstormState")return o(t),!1;if(e.action==="stopBrainstorm")return t.active=!1,c("Stopped by user.","system"),u(),o({success:!0}),!0;if(e.action==="startBrainstorm")return(async()=>{v&&await P();const{topic:s,rounds:r,role:n,mode:a,customGeminiPrompt:h,customChatGPTPrompt:d,geminiTabId:l,chatGPTTabId:f}=e;if(!l||!f){o({success:!1,error:"Missing tab IDs."});return}const p=crypto.randomUUID();t={active:!0,sessionId:p,prompt:s,mode:a||"PING_PONG",role:n||"CRITIC",customGeminiPrompt:h,customChatGPTPrompt:d,rounds:r||3,currentRound:0,geminiTabId:l,chatGPTTabId:f,statusLog:[],isPaused:!1,humanFeedback:null,awaitingHumanDecision:!1,lastSpeaker:null,lastEscalation:null,resumeContext:null},c(`Starting run: ${r} rounds...`,"system"),u();try{await L({id:p,topic:s,mode:t.mode,role:t.role,timestamp:Date.now(),transcript:[{agent:"User",text:s}]})}catch(y){c(`Failed to create DB session: ${y.message}`,"error")}O().catch(y=>{c(`Loop fatal error: ${y.message}`,"error"),t.active=!1,u()}),o({success:!0})})(),!0;if(e.action==="continueBrainstorm")return(async()=>{if(!t.geminiTabId||!t.chatGPTTabId){o({success:!1,error:"Tab IDs missing. Start a new run instead."});return}if(t.active){o({success:!1,error:"Run is already active."});return}const s=e.additionalRounds||2;t.rounds+=s,t.active=!0,c(`Continuing run for ${s} more rounds...`,"system"),u(),O().catch(r=>{c(`Loop fatal error: ${r.message}`,"error"),t.active=!1,u()}),o({success:!0})})(),!0;if(e.action==="generateConclusion")return(async()=>{if(!t.geminiTabId){o({success:!1,error:"Gemini tab ID missing."});return}if(t.active){o({success:!1,error:"Run is active. Please wait for it to finish."});return}t.active=!0,c("Generating Final Conclusion via Gemini...","system"),u();try{const s=`The debate is now over. Here is the final thought from your collaborator:
---
${t.prompt}
---

Please synthesize everything that has been discussed into a single, highly polished, definitive Final Conclusion or Executive Summary.`,r=await I(t.geminiTabId,s);r?(c("Conclusion generated successfully.","system"),t.prompt=r):c("Failed to generate conclusion.","error")}catch(s){c(`Conclusion error: ${s.message}`,"error")}finally{t.active=!1,u()}o({success:!0})})(),!0;if(e.action==="pauseBrainstorm"){if(!t.active){o({success:!1,error:"Run is not active."});return}return t.isPaused=!0,c("Human Intervention: Run paused. Waiting for input...","system"),u(),o({success:!0}),!0}if(e.action==="resumeBrainstorm"){if(!t.active||!t.isPaused){o({success:!1,error:"Run is not paused."});return}return t.isPaused=!1,e.feedback?(c("Human Intervention: Feedback received. Resuming...","system"),t.statusLog.push(`[System] Moderator: ${e.feedback}`),t.sessionId&&E(t.sessionId,{agent:"System",text:`[Moderator Intervention]
${e.feedback}`}).catch(()=>{}),t.awaitingHumanDecision?(t.resumeContext=e.feedback,t.awaitingHumanDecision=!1,t.lastEscalation=null):t.humanFeedback=e.feedback):(c("Human Intervention: Run resumed without feedback.","system"),t.awaitingHumanDecision=!1,t.lastEscalation=null),u(),o({success:!0}),!0}return!1});function w(e){const i=e.match(/\[ESCALATION_REQUIRED\]([\s\S]*?)\[\/ESCALATION_REQUIRED\]/i);if(!i)return null;const o=i[1],s={reason:"",decision_needed:"",options:[],recommended_option:"",next_step_after_decision:""},r=a=>{const h=o.match(new RegExp(`${a}:\\s*(.*?)(?=\\n[a-z_]+:|$)`,"is"));return h?h[1].trim():""};s.reason=r("reason"),s.decision_needed=r("decision_needed"),s.recommended_option=r("recommended_option"),s.next_step_after_decision=r("next_step_after_decision");const n=o.match(/options:\s*((?:-\s+.*\n?)*)/i);return n&&n[1]&&(s.options=n[1].split(`
`).map(a=>a.replace(/^-?\s*/,"").trim()).filter(a=>a.length>0)),s.reason?s:null}function A(e){const i=e.toLowerCase();return i.includes("dear user")||i.includes("mr. sata")||i.includes("mr. sataa")||i.includes("as an ai")||i.includes("as a language model")||i.includes("recommend you")||i.includes("recommend to you")||i.includes("your request")||i.includes("would you like")||i.includes("shall i prepare")||i.includes("let me know if you need")||i.includes("feel free to ask")||i.includes("أستاذ ساطع")||i.includes("هل ترغب")||i.includes("يمكنني أن")||i.includes("أقترح عليك")||i.includes("بصفتي ذكاء")||i.includes("يسعدني أن")?"You used forbidden user-facing or AI-disclaimer language. You must speak ONLY to your agent collaborator.":null}async function O(){let e=t.prompt;const i=b[t.role]?t.role:"CRITIC",o=b[i];c(`Loop started with role: ${i}`);try{for(;t.active&&t.currentRound<t.rounds;){for(t.currentRound++,u(),c(`Round ${t.currentRound} initiating...`);t.isPaused&&t.active;)await g(1e3);if(!t.active)break;c("Executing Gemini turn...");let s="",r=e;t.humanFeedback?(r=`Here is the latest input from your collaborator:
---
${e}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t.humanFeedback}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`,t.humanFeedback=null,u()):t.resumeContext&&t.mode==="DISCUSSION"&&(r=`[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:
---
${t.resumeContext}
---

RULES:
1. Address Agent B directly. DO NOT address the human user.
2. Incorporate this decision to unblock the discussion.`,t.resumeContext=null,u()),t.currentRound===1?s=o.geminiInit(r,t.customGeminiPrompt):s=o.geminiLoop(r,t.customGeminiPrompt);let n=await I(t.geminiTabId,s);if(!t.active)break;if(!n){c("Gemini produced no output. Aborting.","error");break}if(t.mode==="DISCUSSION"){const l=A(n);if(l){c(`[RULE VIOLATION] Gemini: ${l}. Attempting repair...`,"system");const f=`[SYSTEM: RULE VIOLATION] ${l}

RULES REMINDER:
1. Address Agent B directly.
2. DO NOT address the human user or use AI disclaimers.

Please rewrite your previous response exactly to comply with these rules. Do not include apologies, just output the corrected response.`,p=await I(t.geminiTabId,f);p&&t.active&&(n=p)}}if(t.sessionId&&await E(t.sessionId,{agent:"Gemini",text:n}).catch(()=>{}),t.mode==="DISCUSSION"){const l=w(n);if(l){t.lastEscalation=l,t.isPaused=!0,t.awaitingHumanDecision=!0,c(`[ESCALATION DETECTED] Gemini requests human input. Reason: ${l.reason}`,"system"),u();continue}}for(await g(2e3);t.isPaused&&t.active;)await g(1e3);if(!t.active)break;c("Executing ChatGPT turn...");let a=n;t.humanFeedback?(a=`Here is the latest input from your collaborator:
---
${n}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t.humanFeedback}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`,t.humanFeedback=null,u()):t.resumeContext&&t.mode==="DISCUSSION"&&(a=`[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:
---
${t.resumeContext}
---

RULES:
1. Address Agent A directly. DO NOT address the human user.
2. Incorporate this decision to unblock the discussion.`,t.resumeContext=null,u());const h=o.chatGPTLoop(a,t.customChatGPTPrompt);let d=await I(t.chatGPTTabId,h);if(!t.active)break;if(!d){c("ChatGPT produced no output. Aborting.","error");break}if(t.mode==="DISCUSSION"){const l=A(d);if(l){c(`[RULE VIOLATION] ChatGPT: ${l}. Attempting repair...`,"system");const f=`[SYSTEM: RULE VIOLATION] ${l}

RULES REMINDER:
1. Address Agent A directly.
2. DO NOT address the human user or use AI disclaimers.

Please rewrite your previous response exactly to comply with these rules. Do not include apologies, just output the corrected response.`,p=await I(t.chatGPTTabId,f);p&&t.active&&(d=p)}}if(e=d,t.prompt=e,u(),t.sessionId&&await E(t.sessionId,{agent:"ChatGPT",text:d}).catch(()=>{}),t.mode==="DISCUSSION"){const l=w(d);if(l){t.lastEscalation=l,t.isPaused=!0,t.awaitingHumanDecision=!0,c(`[ESCALATION DETECTED] ChatGPT requests human input. Reason: ${l.reason}`,"system"),u();continue}}await g(2e3)}}catch(s){c(`Loop crashed: ${s.message}`,"error")}finally{t.active=!1,c("Run completed or stopped.","system"),u()}}async function I(e,i){await $(e);try{await chrome.tabs.update(e,{active:!0});const n=await chrome.tabs.get(e);n.windowId&&await chrome.windows.update(n.windowId,{focused:!0}),await g(200)}catch{c(`Failed to focus tab ${e}`,"error")}let o=0,s=!1;for(;o<3&&!s;){o++;const n=await S(e,{action:"runPrompt",text:i});(n==null?void 0:n.status)==="done"?s=!0:await g(1e3)}if(!s)return c(`Failed to send prompt to tab ${e}`,"error"),"";c("Waiting for generation...","info"),await S(e,{action:"waitForDone"});const r=await S(e,{action:"getLastResponse"});return(r==null?void 0:r.text)||""}function g(e){return new Promise(i=>setTimeout(i,e))}
