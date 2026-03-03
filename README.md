# LLM Orchestrator (Ping-Pong Extension)

A powerful Chrome Extension that orchestrates an automated, highly configurable, multi-agent debate (a "ping-pong" match) between Google Gemini and OpenAI ChatGPT. It uses your active browser tabs to drive collaboration between these two large language models to brainstorm, critique, expand, and synthesize complex ideas without you having to copy-paste between the two!

## ✨ Features

- **Automated Ping-Pong Looping:** Set the number of rounds, and the extension will automatically take the output from one AI and feed it directly into the prompt box of the other AI.
- **Dynamic Brainstorming Roles:** Choose from several predefined psychological and intellectual roles to steer the debate (e.g., *Expander, Devil's Advocate, First Principles, ELI5, Historian vs. Futurist*).
- **Custom Perspectives:** Don't like the predefined roles? Input your own custom system prompts to instruct each AI on how they should approach their turns.
- **Human-in-the-Loop (Pause & Inject):** Intervene at any point! Pause the loop to inject strict "Human Moderator" overrides to force the AIs to pivot or course-correct their brainstorm.
- **Offline Transcript History:** Every run is progressively saved to your browser's local IndexedDB. You can review your past sessions or export the transcripts to Markdown anytime via the History tab.
- **Post-Run Synthesizer:** When a brainstorm finishes, trigger a "Final Conclusion" to have Gemini read the entire debate and synthesize a definitive Executive Summary.

## 🚀 Installation Strategy

Because this extension operates by directly scripting actions within `gemini.google.com` and `chatgpt.com`, it must be sideloaded as an "Unpacked Extension".

1. Clone or download this repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run build` to compile the TypeScript into the `dist` folder.
4. Open Google Chrome and navigate to `chrome://extensions`.
5. Enable **Developer Mode** (toggle usually in the top right).
6. Click **Load Unpacked** and select the `dist` folder you just generated.

> 📝 **Note:** `vite.config.ts` and `scripts/bump-version.js` ensure that `dist/manifest.json` is generated with the strict UTF-8 encoding Chrome requires.

## 🛠️ How to Use

1. **Prepare the Models:** Open a tab for [ChatGPT](https://chatgpt.com) and a tab for [Gemini](https://gemini.google.com). *Ensure you are logged into both.*
2. **Open the Orchestrator:** Click the LLM Orchestrator extension icon to open the Side Panel UI.
3. **Configure the Run:**
   - The panel should automatically detect your active ChatGPT and Gemini tabs.
   - Choose the number of **Rounds** (e.g., 3 rounds means a back-and-forth cycle 3 times).
   - Select a **Brainstorming Role**.
   - Input your initial **Seed Prompt / Topic**.
4. **Start Run:** Sit back and watch the magic happen! The Side Panel logs will update actively as each AI generates content.
5. **Steer the Ship:** Click **Pause** if they veer off-topic, inject human feedback, and click **Resume with Feedback**.
6. **Review History:** Click the **History Tab** to browse past sessions and export them.

## 🏗️ Architecture

- **`background.ts` (Service Worker):** The central brain. It maintains the `BrainstormState`, executes the orchestration while-loop, and handles IndexedDB `db.ts` calls for history tracking.
- **`content.ts` (Content Script):** The puppeteer. Injected directly into the DOM of the AI chat interfaces to programmatically find the textarea, input text, click the "Send" button, and scrape the resulting model responses. 
- **`panel.ts/html/css` (Side Panel):** The command center UI for configuration, run tracking, log viewing, and Human-in-the-loop intervention.
- **`manifest.json` (V3):** Built for MV3 using `sidePanel`, `storage`, `tabs`, and `scripting` permissions.

## 📜 Legal / Caution

- This utilizes brittle DOM selectors (e.g. `#prompt-textarea`, `.markdown`) on highly dynamic websites. It may break if ChatGPT or Gemini update their HTML structures.
- Use responsibly. Sending automated rapid-fire prompts may trigger rate-limiting or violate Terms of Service on these platforms. Always monitor the loop.

---
*Built iteratively by collaborating humans and AIs.*
