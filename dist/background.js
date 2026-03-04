const L="LLMOrchestratorDB";const h="sessions";function p(){return new Promise((e,r)=>{const i=indexedDB.open(L,1);i.onerror=()=>r(i.error),i.onsuccess=()=>e(i.result),i.onupgradeneeded=o=>{const n=o.target.result;n.objectStoreNames.contains(h)||n.createObjectStore(h,{keyPath:"id"}).createIndex("timestamp","timestamp",{unique:!1})}})}async function $(e){const r=await p();return new Promise((i,o)=>{const c=r.transaction(h,"readwrite").objectStore(h).add(e);c.onsuccess=()=>i(),c.onerror=()=>o(c.error)})}async function E(e){const r=await p();return new Promise((i,o)=>{const c=r.transaction(h,"readonly").objectStore(h).get(e);c.onsuccess=()=>i(c.result),c.onerror=()=>o(c.error)})}async function y(e,r){const i=await p(),o=await E(e);if(!o)throw new Error("Session not found");return o.transcript.push(r),new Promise((n,s)=>{const l=i.transaction(h,"readwrite").objectStore(h).put(o);l.onsuccess=()=>n(),l.onerror=()=>s(l.error)})}async function k(){const e=await p();return new Promise((r,i)=>{const s=e.transaction(h,"readonly").objectStore(h).getAll();s.onsuccess=()=>{const c=s.result;c.sort((d,l)=>l.timestamp-d.timestamp),r(c)},s.onerror=()=>i(s.error)})}async function A(e){const r=await p();return new Promise((i,o)=>{const c=r.transaction(h,"readwrite").objectStore(h).delete(e);c.onsuccess=()=>i(),c.onerror=()=>o(c.error)})}const R={active:!1,sessionId:null,prompt:"",role:"CRITIC",rounds:3,currentRound:0,geminiTabId:null,chatGPTTabId:null,statusLog:[],isPaused:!1,humanFeedback:null};let t={...R},v=!0;function u(){chrome.storage.local.set({brainstormState:t})}async function S(){return new Promise(e=>{chrome.storage.local.get(["brainstormState"],r=>{r.brainstormState&&(t=r.brainstormState,t.active=!1,u()),v=!1,e()})})}S();chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:!0});function a(e,r="info"){const i=`[${r==="info"?"Info":r==="error"?"Error":"System"}] ${e}`;console.log(i),t.statusLog.length>50&&t.statusLog.shift(),t.statusLog.push(i),u()}function g(e,r){return new Promise((i,o)=>{chrome.tabs.sendMessage(e,r,n=>{const s=chrome.runtime.lastError;i(s?null:n)})})}async function x(e){try{await chrome.scripting.executeScript({target:{tabId:e},files:["content.js"]})}catch{}}const w={CRITIC:{geminiInit:e=>`Topic: "${e}"

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

Translate this into an "Explain Like I'm 5" (ELI5) version using simple metaphors.`},CUSTOM:{geminiInit:(e,r)=>`${r}

Here is the initial topic:
---
${e}
---`,geminiLoop:(e,r)=>`${r}

Here is the latest input from the collaborator:
---
${e}
---`,chatGPTLoop:(e,r)=>`${r}

Here is the latest input from the collaborator:
---
${e}
---`}};chrome.runtime.onMessage.addListener((e,r,i)=>{if(e.action==="getAllSessions")return k().then(o=>{i(o)}).catch(o=>{i([])}),!0;if(e.action==="deleteSession")return A(e.id).then(()=>{i({success:!0})}).catch(o=>{i({success:!1})}),!0;if(e.action==="getBrainstormState")return i(t),!1;if(e.action==="stopBrainstorm")return t.active=!1,a("Stopped by user.","system"),u(),i({success:!0}),!0;if(e.action==="startBrainstorm")return(async()=>{v&&await S();const{topic:o,rounds:n,role:s,customGeminiPrompt:c,customChatGPTPrompt:d,geminiTabId:l,chatGPTTabId:b}=e;if(!l||!b){i({success:!1,error:"Missing tab IDs."});return}const I=crypto.randomUUID();t={active:!0,sessionId:I,prompt:o,role:s||"CRITIC",customGeminiPrompt:c,customChatGPTPrompt:d,rounds:n||3,currentRound:0,geminiTabId:l,chatGPTTabId:b,statusLog:[],isPaused:!1,humanFeedback:null},a(`Starting run: ${n} rounds...`,"system"),u();try{await $({id:I,topic:o,role:t.role,timestamp:Date.now(),transcript:[{agent:"User",text:o}]})}catch(f){a(`Failed to create DB session: ${f.message}`,"error")}P().catch(f=>{a(`Loop fatal error: ${f.message}`,"error"),t.active=!1,u()}),i({success:!0})})(),!0;if(e.action==="continueBrainstorm")return(async()=>{if(!t.geminiTabId||!t.chatGPTTabId){i({success:!1,error:"Tab IDs missing. Start a new run instead."});return}if(t.active){i({success:!1,error:"Run is already active."});return}const o=e.additionalRounds||2;t.rounds+=o,t.active=!0,a(`Continuing run for ${o} more rounds...`,"system"),u(),P().catch(n=>{a(`Loop fatal error: ${n.message}`,"error"),t.active=!1,u()}),i({success:!0})})(),!0;if(e.action==="generateConclusion")return(async()=>{if(!t.geminiTabId){i({success:!1,error:"Gemini tab ID missing."});return}if(t.active){i({success:!1,error:"Run is active. Please wait for it to finish."});return}t.active=!0,a("Generating Final Conclusion via Gemini...","system"),u();try{const o=`The debate is now over. Here is the final thought from your collaborator:
---
${t.prompt}
---

Please synthesize everything that has been discussed into a single, highly polished, definitive Final Conclusion or Executive Summary.`,n=await T(t.geminiTabId,o);n?(a("Conclusion generated successfully.","system"),t.prompt=n):a("Failed to generate conclusion.","error")}catch(o){a(`Conclusion error: ${o.message}`,"error")}finally{t.active=!1,u()}i({success:!0})})(),!0;if(e.action==="pauseBrainstorm"){if(!t.active){i({success:!1,error:"Run is not active."});return}return t.isPaused=!0,a("Human Intervention: Run paused. Waiting for input...","system"),u(),i({success:!0}),!0}if(e.action==="resumeBrainstorm"){if(!t.active||!t.isPaused){i({success:!1,error:"Run is not paused."});return}return t.isPaused=!1,e.feedback?(t.humanFeedback=e.feedback,a("Human Intervention: Feedback received. Resuming...","system"),t.statusLog.push(`[System] Moderator: ${e.feedback}`),t.sessionId&&y(t.sessionId,{agent:"System",text:`[Moderator Intervention]
${e.feedback}`}).catch(()=>{})):a("Human Intervention: Run resumed without feedback.","system"),u(),i({success:!0}),!0}return!1});async function P(){let e=t.prompt;const r=w[t.role]?t.role:"CRITIC",i=w[r];a(`Loop started with role: ${r}`);try{for(;t.active&&t.currentRound<t.rounds;){for(t.currentRound++,u(),a(`Round ${t.currentRound} initiating...`);t.isPaused&&t.active;)await m(1e3);if(!t.active)break;a("Executing Gemini turn...");let o="",n=e;t.humanFeedback&&(n=`Here is the latest input from your collaborator:
---
${e}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t.humanFeedback}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`,t.humanFeedback=null,u()),t.currentRound===1?o=i.geminiInit(n,t.customGeminiPrompt):o=i.geminiLoop(n,t.customGeminiPrompt);const s=await T(t.geminiTabId,o);if(!t.active)break;if(!s){a("Gemini produced no output. Aborting.","error");break}for(t.sessionId&&await y(t.sessionId,{agent:"Gemini",text:s}).catch(()=>{}),await m(2e3);t.isPaused&&t.active;)await m(1e3);if(!t.active)break;a("Executing ChatGPT turn...");let c=s;t.humanFeedback&&(c=`Here is the latest input from your collaborator:
---
${s}
---

[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:
---
${t.humanFeedback}
---
Acknowledge the moderator's instructions and seamlessly incorporate them into your next response.`,t.humanFeedback=null,u());const d=i.chatGPTLoop(c,t.customChatGPTPrompt),l=await T(t.chatGPTTabId,d);if(!t.active)break;if(!l){a("ChatGPT produced no output. Aborting.","error");break}e=l,t.prompt=e,u(),t.sessionId&&await y(t.sessionId,{agent:"ChatGPT",text:l}).catch(()=>{}),await m(2e3)}}catch(o){a(`Loop crashed: ${o.message}`,"error")}finally{t.active=!1,a("Run completed or stopped.","system"),u()}}async function T(e,r){await x(e);let i=0,o=!1;for(;i<3&&!o;){i++;const s=await g(e,{action:"runPrompt",text:r});(s==null?void 0:s.status)==="done"?o=!0:await m(1e3)}if(!o)return a(`Failed to send prompt to tab ${e}`,"error"),"";a("Waiting for generation...","info"),await g(e,{action:"waitForDone"});const n=await g(e,{action:"getLastResponse"});return(n==null?void 0:n.text)||""}function m(e){return new Promise(r=>setTimeout(r,e))}
