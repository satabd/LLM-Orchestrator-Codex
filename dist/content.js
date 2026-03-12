function $(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}return e}function y(e,t){return Array(t+1).join(e)}function x(e){return e.replace(/^\n*/,"")}function O(e){for(var t=e.length;t>0&&e[t-1]===`
`;)t--;return e.substring(0,t)}function D(e){return O(x(e))}var U=["ADDRESS","ARTICLE","ASIDE","AUDIO","BLOCKQUOTE","BODY","CANVAS","CENTER","DD","DIR","DIV","DL","DT","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","FRAMESET","H1","H2","H3","H4","H5","H6","HEADER","HGROUP","HR","HTML","ISINDEX","LI","MAIN","MENU","NAV","NOFRAMES","NOSCRIPT","OL","OUTPUT","P","PRE","SECTION","TABLE","TBODY","TD","TFOOT","TH","THEAD","TR","UL"];function A(e){return S(e,U)}var B=["AREA","BASE","BR","COL","COMMAND","EMBED","HR","IMG","INPUT","KEYGEN","LINK","META","PARAM","SOURCE","TRACK","WBR"];function P(e){return S(e,B)}function V(e){return I(e,B)}var L=["A","TABLE","THEAD","TBODY","TFOOT","TH","TD","IFRAME","SCRIPT","AUDIO","VIDEO"];function W(e){return S(e,L)}function _(e){return I(e,L)}function S(e,t){return t.indexOf(e.nodeName)>=0}function I(e,t){return e.getElementsByTagName&&t.some(function(r){return e.getElementsByTagName(r).length})}var s={};s.paragraph={filter:"p",replacement:function(e){return`

`+e+`

`}};s.lineBreak={filter:"br",replacement:function(e,t,r){return r.br+`
`}};s.heading={filter:["h1","h2","h3","h4","h5","h6"],replacement:function(e,t,r){var n=Number(t.nodeName.charAt(1));if(r.headingStyle==="setext"&&n<3){var i=y(n===1?"=":"-",e.length);return`

`+e+`
`+i+`

`}else return`

`+y("#",n)+" "+e+`

`}};s.blockquote={filter:"blockquote",replacement:function(e){return e=D(e).replace(/^/gm,"> "),`

`+e+`

`}};s.list={filter:["ul","ol"],replacement:function(e,t){var r=t.parentNode;return r.nodeName==="LI"&&r.lastElementChild===t?`
`+e:`

`+e+`

`}};s.listItem={filter:"li",replacement:function(e,t,r){var n=r.bulletListMarker+"   ",i=t.parentNode;if(i.nodeName==="OL"){var a=i.getAttribute("start"),o=Array.prototype.indexOf.call(i.children,t);n=(a?Number(a)+o:o+1)+".  "}var u=/\n$/.test(e);return e=D(e)+(u?`
`:""),e=e.replace(/\n/gm,`
`+" ".repeat(n.length)),n+e+(t.nextSibling?`
`:"")}};s.indentedCodeBlock={filter:function(e,t){return t.codeBlockStyle==="indented"&&e.nodeName==="PRE"&&e.firstChild&&e.firstChild.nodeName==="CODE"},replacement:function(e,t,r){return`

    `+t.firstChild.textContent.replace(/\n/g,`
    `)+`

`}};s.fencedCodeBlock={filter:function(e,t){return t.codeBlockStyle==="fenced"&&e.nodeName==="PRE"&&e.firstChild&&e.firstChild.nodeName==="CODE"},replacement:function(e,t,r){for(var n=t.firstChild.getAttribute("class")||"",i=(n.match(/language-(\S+)/)||[null,""])[1],a=t.firstChild.textContent,o=r.fence.charAt(0),u=3,l=new RegExp("^"+o+"{3,}","gm"),c;c=l.exec(a);)c[0].length>=u&&(u=c[0].length+1);var d=y(o,u);return`

`+d+i+`
`+a.replace(/\n$/,"")+`
`+d+`

`}};s.horizontalRule={filter:"hr",replacement:function(e,t,r){return`

`+r.hr+`

`}};s.inlineLink={filter:function(e,t){return t.linkStyle==="inlined"&&e.nodeName==="A"&&e.getAttribute("href")},replacement:function(e,t){var r=t.getAttribute("href");r&&(r=r.replace(/([()])/g,"\\$1"));var n=h(t.getAttribute("title"));return n&&(n=' "'+n.replace(/"/g,'\\"')+'"'),"["+e+"]("+r+n+")"}};s.referenceLink={filter:function(e,t){return t.linkStyle==="referenced"&&e.nodeName==="A"&&e.getAttribute("href")},replacement:function(e,t,r){var n=t.getAttribute("href"),i=h(t.getAttribute("title"));i&&(i=' "'+i+'"');var a,o;switch(r.linkReferenceStyle){case"collapsed":a="["+e+"][]",o="["+e+"]: "+n+i;break;case"shortcut":a="["+e+"]",o="["+e+"]: "+n+i;break;default:var u=this.references.length+1;a="["+e+"]["+u+"]",o="["+u+"]: "+n+i}return this.references.push(o),a},references:[],append:function(e){var t="";return this.references.length&&(t=`

`+this.references.join(`
`)+`

`,this.references=[]),t}};s.emphasis={filter:["em","i"],replacement:function(e,t,r){return e.trim()?r.emDelimiter+e+r.emDelimiter:""}};s.strong={filter:["strong","b"],replacement:function(e,t,r){return e.trim()?r.strongDelimiter+e+r.strongDelimiter:""}};s.code={filter:function(e){var t=e.previousSibling||e.nextSibling,r=e.parentNode.nodeName==="PRE"&&!t;return e.nodeName==="CODE"&&!r},replacement:function(e){if(!e)return"";e=e.replace(/\r?\n|\r/g," ");for(var t=/^`|^ .*?[^ ].* $|`$/.test(e)?" ":"",r="`",n=e.match(/`+/gm)||[];n.indexOf(r)!==-1;)r=r+"`";return r+t+e+t+r}};s.image={filter:"img",replacement:function(e,t){var r=h(t.getAttribute("alt")),n=t.getAttribute("src")||"",i=h(t.getAttribute("title")),a=i?' "'+i+'"':"";return n?"!["+r+"]("+n+a+")":""}};function h(e){return e?e.replace(/(\n+\s*)+/g,`
`):""}function M(e){this.options=e,this._keep=[],this._remove=[],this.blankRule={replacement:e.blankReplacement},this.keepReplacement=e.keepReplacement,this.defaultRule={replacement:e.defaultReplacement},this.array=[];for(var t in e.rules)this.array.push(e.rules[t])}M.prototype={add:function(e,t){this.array.unshift(t)},keep:function(e){this._keep.unshift({filter:e,replacement:this.keepReplacement})},remove:function(e){this._remove.unshift({filter:e,replacement:function(){return""}})},forNode:function(e){if(e.isBlank)return this.blankRule;var t;return(t=g(this.array,e,this.options))||(t=g(this._keep,e,this.options))||(t=g(this._remove,e,this.options))?t:this.defaultRule},forEach:function(e){for(var t=0;t<this.array.length;t++)e(this.array[t],t)}};function g(e,t,r){for(var n=0;n<e.length;n++){var i=e[n];if(G(i,t,r))return i}}function G(e,t,r){var n=e.filter;if(typeof n=="string"){if(n===t.nodeName.toLowerCase())return!0}else if(Array.isArray(n)){if(n.indexOf(t.nodeName.toLowerCase())>-1)return!0}else if(typeof n=="function"){if(n.call(e,t,r))return!0}else throw new TypeError("`filter` needs to be a string, array, or function")}function X(e){var t=e.element,r=e.isBlock,n=e.isVoid,i=e.isPre||function(F){return F.nodeName==="PRE"};if(!(!t.firstChild||i(t))){for(var a=null,o=!1,u=null,l=k(u,t,i);l!==t;){if(l.nodeType===3||l.nodeType===4){var c=l.data.replace(/[ \r\n\t]+/g," ");if((!a||/ $/.test(a.data))&&!o&&c[0]===" "&&(c=c.substr(1)),!c){l=v(l);continue}l.data=c,a=l}else if(l.nodeType===1)r(l)||l.nodeName==="BR"?(a&&(a.data=a.data.replace(/ $/,"")),a=null,o=!1):n(l)||i(l)?(a=null,o=!0):a&&(o=!1);else{l=v(l);continue}var d=k(u,l,i);u=l,l=d}a&&(a.data=a.data.replace(/ $/,""),a.data||v(a))}}function v(e){var t=e.nextSibling||e.parentNode;return e.parentNode.removeChild(e),t}function k(e,t,r){return e&&e.parentNode===t||r(t)?t.nextSibling||t.parentNode:t.firstChild||t.nextSibling||t.parentNode}var w=typeof window<"u"?window:{};function j(){var e=w.DOMParser,t=!1;try{new e().parseFromString("","text/html")&&(t=!0)}catch{}return t}function K(){var e=function(){};return Y()?e.prototype.parseFromString=function(t){var r=new window.ActiveXObject("htmlfile");return r.designMode="on",r.open(),r.write(t),r.close(),r}:e.prototype.parseFromString=function(t){var r=document.implementation.createHTMLDocument("");return r.open(),r.write(t),r.close(),r},e}function Y(){var e=!1;try{document.implementation.createHTMLDocument("").open()}catch{w.ActiveXObject&&(e=!0)}return e}var z=j()?w.DOMParser:K();function Q(e,t){var r;if(typeof e=="string"){var n=J().parseFromString('<x-turndown id="turndown-root">'+e+"</x-turndown>","text/html");r=n.getElementById("turndown-root")}else r=e.cloneNode(!0);return X({element:r,isBlock:A,isVoid:P,isPre:t.preformattedCode?Z:null}),r}var b;function J(){return b=b||new z,b}function Z(e){return e.nodeName==="PRE"||e.nodeName==="CODE"}function ee(e,t){return e.isBlock=A(e),e.isCode=e.nodeName==="CODE"||e.parentNode.isCode,e.isBlank=te(e),e.flankingWhitespace=re(e,t),e}function te(e){return!P(e)&&!W(e)&&/^\s*$/i.test(e.textContent)&&!V(e)&&!_(e)}function re(e,t){if(e.isBlock||t.preformattedCode&&e.isCode)return{leading:"",trailing:""};var r=ne(e.textContent);return r.leadingAscii&&N("left",e,t)&&(r.leading=r.leadingNonAscii),r.trailingAscii&&N("right",e,t)&&(r.trailing=r.trailingNonAscii),{leading:r.leading,trailing:r.trailing}}function ne(e){var t=e.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);return{leading:t[1],leadingAscii:t[2],leadingNonAscii:t[3],trailing:t[4],trailingNonAscii:t[5],trailingAscii:t[6]}}function N(e,t,r){var n,i,a;return e==="left"?(n=t.previousSibling,i=/ $/):(n=t.nextSibling,i=/^ /),n&&(n.nodeType===3?a=i.test(n.nodeValue):r.preformattedCode&&n.nodeName==="CODE"?a=!1:n.nodeType===1&&!A(n)&&(a=i.test(n.textContent))),a}var ie=Array.prototype.reduce,ae=[[/\\/g,"\\\\"],[/\*/g,"\\*"],[/^-/g,"\\-"],[/^\+ /g,"\\+ "],[/^(=+)/g,"\\$1"],[/^(#{1,6}) /g,"\\$1 "],[/`/g,"\\`"],[/^~~~/g,"\\~~~"],[/\[/g,"\\["],[/\]/g,"\\]"],[/^>/g,"\\>"],[/_/g,"\\_"],[/^(\d+)\. /g,"$1\\. "]];function m(e){if(!(this instanceof m))return new m(e);var t={rules:s,headingStyle:"setext",hr:"* * *",bulletListMarker:"*",codeBlockStyle:"indented",fence:"```",emDelimiter:"_",strongDelimiter:"**",linkStyle:"inlined",linkReferenceStyle:"full",br:"  ",preformattedCode:!1,blankReplacement:function(r,n){return n.isBlock?`

`:""},keepReplacement:function(r,n){return n.isBlock?`

`+n.outerHTML+`

`:n.outerHTML},defaultReplacement:function(r,n){return n.isBlock?`

`+r+`

`:r}};this.options=$({},t,e),this.rules=new M(this.options)}m.prototype={turndown:function(e){if(!se(e))throw new TypeError(e+" is not a string, or an element/document/fragment node.");if(e==="")return"";var t=H.call(this,new Q(e,this.options));return le.call(this,t)},use:function(e){if(Array.isArray(e))for(var t=0;t<e.length;t++)this.use(e[t]);else if(typeof e=="function")e(this);else throw new TypeError("plugin must be a Function or an Array of Functions");return this},addRule:function(e,t){return this.rules.add(e,t),this},keep:function(e){return this.rules.keep(e),this},remove:function(e){return this.rules.remove(e),this},escape:function(e){return ae.reduce(function(t,r){return t.replace(r[0],r[1])},e)}};function H(e){var t=this;return ie.call(e.childNodes,function(r,n){n=new ee(n,t.options);var i="";return n.nodeType===3?i=n.isCode?n.nodeValue:t.escape(n.nodeValue):n.nodeType===1&&(i=oe.call(t,n)),q(r,i)},"")}function le(e){var t=this;return this.rules.forEach(function(r){typeof r.append=="function"&&(e=q(e,r.append(t.options)))}),e.replace(/^[\t\r\n]+/,"").replace(/[\t\r\n\s]+$/,"")}function oe(e){var t=this.rules.forNode(e),r=H.call(this,e),n=e.flankingWhitespace;return(n.leading||n.trailing)&&(r=r.trim()),n.leading+t.replacement(r,e,this.options)+n.trailing}function q(e,t){var r=O(e),n=x(t),i=Math.max(e.length-r.length,t.length-n.length),a=`

`.substring(0,i);return r+a+n}function se(e){return e!=null&&(typeof e=="string"||e.nodeType&&(e.nodeType===1||e.nodeType===9||e.nodeType===11))}const f=()=>window.location.hostname.includes("gemini.google.com"),p=()=>window.location.hostname.includes("chatgpt.com")||window.location.hostname.includes("openai.com");chrome.runtime.onMessage.addListener((e,t,r)=>{switch(e.action){case"runPrompt":return ue(e.text).then(()=>r({status:"done"})),!0;case"waitForDone":return he().then(()=>r({status:"complete"})),!0;case"getLastResponse":const n=E();r({text:n});break;case"getUserTurnCount":r({count:ce()});break;case"scrapeConversation":r({text:me()});break}return!1});async function ue(e){const t=fe();if(!t)return;if(f()){const n=document.querySelector(".ql-editor");n?(n.innerHTML=`<p>${e}</p>`,n.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:"insertText",data:e}))):C(t,e)}else C(t,e);await new Promise(n=>setTimeout(n,500));const r=de();if(r)r.click();else{const n=new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,bubbles:!0,composed:!0});t.dispatchEvent(n)}}function C(e,t){e.tagName==="TEXTAREA"?(e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0}))):(e.focus(),document.execCommand("selectAll",!1,void 0),document.execCommand("insertText",!1,t),e.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:"insertText",data:t})))}function ce(){return f()?document.querySelectorAll('user-query, [data-test-id="user-query"]').length:p()?document.querySelectorAll('[data-message-author-role="user"]').length:0}function fe(){return f()?document.querySelector('div[contenteditable="true"][role="textbox"], .ql-editor, textarea'):p()?document.querySelector("#prompt-textarea"):null}function de(){return f()?document.querySelector('.send-button, button[aria-label*="Send"], button[aria-label*="bfe"]'):p()?document.querySelector('button[data-testid="send-button"]'):null}function R(){return f()||p()?!!document.querySelector('button[aria-label*="Stop"]'):!1}async function he(){return new Promise(e=>{setTimeout(()=>{if(R()){const r=new MutationObserver(()=>{R()||(r.disconnect(),t())});r.observe(document.body,{childList:!0,subtree:!0,attributes:!0})}else t()},2e3);function t(){let r=E(),n=0,i=0;const a=setInterval(()=>{i++;const o=E();window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"}),document.querySelectorAll("main, .overflow-y-auto").forEach(c=>{c.scrollTop=c.scrollHeight}),o===r?n++:(n=0,r=o);const u=n>=5;(o.length>0?u:u&&i>20)&&(clearInterval(a),e())},500);setTimeout(()=>{clearInterval(a),e()},18e4)}})}function E(){let e=null;if(f()){const t=document.querySelectorAll("model-response, .model-response");t.length&&(e=t[t.length-1])}else{const t=document.querySelectorAll('[data-message-author-role="assistant"]');t.length&&(e=t[t.length-1])}return e?T(e):""}function me(){let e=`# Conversation Export

`;return f()?document.querySelectorAll("user-query, model-response").forEach(r=>{const n=r.tagName.toLowerCase().includes("user")?"User":"DeepMind";e+=`## ${n}

${T(r)}

`}):document.querySelectorAll("[data-message-author-role]").forEach(r=>{const n=r.getAttribute("data-message-author-role")==="user"?"User":"Assistant";e+=`## ${n}

${T(r)}

`}),e}function T(e){const t=e.cloneNode(!0);t.querySelectorAll("button, .action-buttons, .copy-button").forEach(a=>a.remove());let i=new m({headingStyle:"atx",codeBlockStyle:"fenced"}).turndown(t);return i=i.replace(/Show drafts/g,"").replace(/Regenerate/g,""),i.trim()}
