let r={active:!1,prompt:"",role:"DEFAULT",rounds:1,currentRound:0,geminiTabId:null,chatGPTTabId:null,statusLog:[]};function c(t,n){return new Promise((o,a)=>{chrome.tabs.sendMessage(t,n,e=>{const i=chrome.runtime.lastError;i?a(i):o(e)})})}function l(t){return chrome.scripting.executeScript({target:{tabId:t},files:["content.js"]})}async function m(t){try{await l(t)}catch(n){console.warn("Injection warning:",(n==null?void 0:n.message)||n)}}chrome.runtime.onMessage.addListener((t,n,o)=>{if(t.action==="startBrainstorm")return chrome.tabs.query({},a=>{const e=a.find(s=>s.url&&s.url.includes("gemini.google.com")),i=a.find(s=>s.url&&(s.url.includes("chatgpt.com")||s.url.includes("openai.com")));if(!e||!i||!e.id||!i.id){o({success:!1,error:`Missing tabs. Found Gemini: ${!!e}, ChatGPT: ${!!i}. Open both sites.`});return}r.active=!0,r.prompt=t.topic||t.prompt,r.rounds=t.rounds||3,r.role="IDEATOR",r.currentRound=0,r.statusLog=[],r.geminiTabId=e.id,r.chatGPTTabId=i.id,d(),o({success:!0})}),!0;if(t.action==="stopBrainstorm")return r.active=!1,o({success:!0}),!0;if(t.action==="getBrainstormState")return o(r),!1});async function d(){let t=r.prompt;console.log(`[Brainstorm] Starting loop for topic: ${t}`);try{for(;r.active&&r.currentRound<r.rounds;){if(r.geminiTabId===null||r.chatGPTTabId===null){console.error("Tabs lost during loop.");break}r.currentRound++,console.log(`[Brainstorm] Turn Sequence ${r.currentRound}`);let n="";r.currentRound===1?n=`Topic: "${t}"

Please provide a comprehensive, novel, and detailed exploration of this topic. Avoid generic advice.`:n=`Here is feedback from a Critical Reviewer:

---
${t}
---

Please refine your previous ideas based on this critique. Address the holes identified and make the solution more robust. Output the full updated version.`;const o=await u(r.geminiTabId,n);if(!r.active)break;await new Promise(i=>setTimeout(i,2e3));const a=`You are a Senior Principal Engineer / Critical Reviewer.

Here is a proposal:

---
${o}
---

Please critique this. Find flaws, edge cases that are missing, security risks, or weak architectural decisions. Be harsh but constructive.`,e=await u(r.chatGPTTabId,a);if(!r.active)break;t=e,await new Promise(i=>setTimeout(i,2e3))}}catch(n){console.error("[Brainstorm] Loop crashed:",n)}finally{r.active=!1,console.log("[Brainstorm] Completed (State Reset).")}}async function u(t,n){await m(t);try{await c(t,{action:"getLastResponse"})}catch(e){console.warn("getLastResponse failed:",(e==null?void 0:e.message)||e)}let o=0,a=0;try{const e=await c(t,{action:"getUserTurnCount"});a=(e==null?void 0:e.count)??0}catch(e){console.warn("getUserTurnCount failed:",(e==null?void 0:e.message)||e)}for(;o<3;){o++;try{await c(t,{action:"runPrompt",text:n})}catch(e){console.warn("runPrompt failed:",(e==null?void 0:e.message)||e)}await new Promise(e=>setTimeout(e,2500));try{const e=await c(t,{action:"getUserTurnCount"});if(((e==null?void 0:e.count)??a)>a)break;console.warn(`Prompt did not post, retrying (${o})...`)}catch{break}}try{await c(t,{action:"waitForDone"})}catch(e){console.warn("waitForDone failed:",(e==null?void 0:e.message)||e)}try{const e=await c(t,{action:"getLastResponse"});return(e==null?void 0:e.text)||""}catch(e){return console.warn("getLastResponse (final) failed:",(e==null?void 0:e.message)||e),""}}
