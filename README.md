# LLM Orchestrator Codex

A powerful Chrome Extension that orchestrates structured collaboration between Google Gemini and OpenAI ChatGPT. It uses your active browser tabs to help the models brainstorm, critique, refine, and synthesize ideas without manual copy-paste between tools.

## ✨ Features

- **Idea Studio Workspace:** The side panel is now a studio-style control surface with setup, live session monitoring, intervention controls, outputs, checkpoints, and branch actions.
- **Collaborative Exchange:** Run a flexible back-and-forth session where each model builds on or critiques the other.
- **Agent Workshop:** Run a stricter internal working session where Gemini and ChatGPT address each other directly while the human stays in observer mode unless escalation or moderator input is needed.
- **Creative Direction Presets:** Jump into Expand, Stress Test, Reframe, Productize, Simplify, Invent, and Critique workflows without rebuilding prompts manually.
- **Checkpointed Sessions:** Long runs now create explicit checkpoints with summaries, snapshots, and fork points.
- **Branching & Re-entry:** Fork a new branch from any checkpoint and push that checkpoint back into the setup workspace as a new draft.
- **Artifact Harvesting:** The engine continuously extracts highlights, ideas, risks, questions, decisions, and a rolling synthesis while the session runs.
- **Comparative Finales:** Generate multiple finale formats from the same session, including executive summary, product concept, roadmap, risk register, and decision memo.
- **Saved Setup Profiles:** Save and reload favorite session setups locally from the panel.
- **Dynamic Brainstorming Roles:** Choose from several predefined psychological and intellectual roles to steer the debate (e.g., *Expander, Devil's Advocate, First Principles, ELI5, Historian vs. Futurist*).
- **Custom Perspectives:** Don't like the predefined roles? Input your own custom system prompts to instruct each AI on how they should approach their turns.
- **Human-in-the-Loop (Pause & Inject):** Intervene at any point! Pause the loop to inject strict "Human Moderator" overrides to force the AIs to pivot or course-correct their brainstorm.
- **Offline Transcript History:** Every run is progressively saved to your browser's local IndexedDB. You can review your past sessions or export the transcripts to proper, richly-formatted Markdown (`.md`) anytime via the History tab. Formats like bolding, headers, and code blocks are preserved.
- **Post-Run Synthesizer:** When a brainstorm finishes, trigger a "Final Conclusion" to have Gemini read the entire debate and synthesize a definitive Executive Summary.

## 📈 Project Evolution

This repository should make feature progress visible in source control and in this README. Significant behavior changes should add a short note here so the current state of the extension is obvious without diff-hunting.

### Current Status

- Core ping-pong orchestration is implemented and buildable.
- Discussion Mode now starts with agent-to-agent framing from turn 1 instead of a user-facing assistant prompt.
- Discussion guardrails were tightened to detect user-facing drift more aggressively and fail closed when repair/regeneration does not recover.
- Discussion convergence control now injects a checkpoint instruction after a short exchange to force narrowing, conclusion, inference marking, or escalation.
- Structured escalation rendering in the side panel now shows reason, decision needed, options, recommended option, and next step after decision.
- Escalation events are persisted on sessions in IndexedDB.
- User-facing terminology was simplified so the UI describes session intent (`Collaborative Exchange`, `Agent Workshop`) instead of leaking internal engine language (`Ping Pong`, `Discussion`).
- The configuration UI now hides unsupported single-agent options and explains each session type directly in the panel so users do not have to infer the difference.
- Panel settings now persist between opens using `chrome.storage.local`, including selected tabs, session type, collaboration style, rounds, custom prompts, and the current topic draft.
- Active runs now expose a live monitor view that opens `transcript.html` in polling mode and streams the current session transcript directly from IndexedDB.
- The side panel was upgraded into an Idea Studio workspace with session type cards, preset chips, agent rails, live timeline, intervention dock, checkpoint cards, output tabs, branch actions, and saved profiles.
- The orchestrator now tracks session framing, phase (`DIVERGE` / `CONVERGE` / `FINALIZE`), turn intent, repair visibility, checkpoint snapshots, moderator decisions, artifact harvesting, branch lineage, and multi-finale outputs.
- The setup surface now includes a real first-agent / second-agent flow with a flip control, and the run loop respects the selected opening speaker instead of always hard-coding Gemini first.
- The panel palette was refreshed to a cleaner neutral and blue look so the configuration area feels lighter and easier to scan.

### Documentation Rule

- For each meaningful feature or behavior change, update this README with a short progress note under `Project Evolution`.
- Keep entries compact and factual so project evolution stays easy to scan.

## 🚀 Installation Strategy

Because this extension operates by directly scripting actions within `gemini.google.com` and `chatgpt.com`, it must be sideloaded as an "Unpacked Extension".

1. Clone or download this repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run build` to compile the TypeScript into the `dist` folder.
4. *(Optional)* Run `npm run pack` to generate a `.zip` archive of the `dist` folder for easy sharing or distribution.
5. Open Google Chrome and navigate to `chrome://extensions`.
6. Enable **Developer Mode** (toggle usually in the top right).
7. Click **Load Unpacked** and select the `dist` folder you just generated (or unzip the generated archive if sharing).

> 📝 **Note:** `vite.config.ts` and `scripts/bump-version.js` ensure that `dist/manifest.json` is generated with the strict UTF-8 encoding Chrome requires.

## 🛠️ How to Use

1. **Open the Orchestrator:** Click the LLM Orchestrator extension icon to open the Side Panel UI.
2. **Auto-Tab Spawning:** If you don't already have [ChatGPT](https://chatgpt.com) and [Gemini](https://gemini.google.com) open, the extension will instantly open them in the background for you. *(Ensure you are logged into both).*
3. **Configure the Run:**
   - Choose which model opens the run with the **First Agent** selector, or use the **Flip** button to swap the order instantly.
   - The panel will automatically detect your active ChatGPT and Gemini tabs.
   - Choose the number of **Rounds** (e.g., 3 rounds means a back-and-forth cycle 3 times).
   - Select a **Session Type** and **Collaboration Style**.
   - Input your initial **Seed Prompt / Topic**.
4. **Start Run:** Sit back and watch the magic happen! The Side Panel logs will update actively as each AI generates content.
5. **Monitor Live:** While a run is active, click **Monitor Live** to open a fullscreen transcript view that refreshes automatically.
6. **Steer the Session:** Use the Intervention Dock to pause, inject steering, force narrowing, review escalations, continue, or generate finale variants.
7. **Review Outputs:** Switch between Transcript, Highlights, Actionable Ideas, and Final Synthesis in the output pane.
8. **Fork from Checkpoints:** Use checkpoint or branch actions to spin out a new branch draft from a previous snapshot.
9. **Review History:** Click the **History Tab** to browse past sessions and export them.

### Session Type Notes

- `Collaborative Exchange` is the flexible default: Gemini opens the run, ChatGPT responds, and both work on your prompt while referencing each other.
- `Agent Workshop` is the stricter internal working session: the agents address each other directly and only pause when escalation or moderator input is needed.
- The visible UI no longer offers misleading single-agent choices until the backend supports them cleanly.

### Agent Workshop Notes

- In `Agent Workshop`, the agents are expected to address each other directly, not the human observer.
- The human steps in only when manually pausing or when an `[ESCALATION_REQUIRED]` block pauses the loop.
- When escalation is triggered, the panel shows the structured decision request and resumes the discussion after human input is supplied.

## 🏗️ Architecture

- **`background.ts` (Service Worker):** The central brain. It maintains the `BrainstormState`, executes the orchestration while-loop, and handles IndexedDB `db.ts` calls for history tracking.
- **`content.ts` (Content Script):** The puppeteer. Injected directly into the DOM of the AI chat interfaces to programmatically find the textarea, input text, click the "Send" button, and scrape the resulting model responses. It utilizes `turndown` to ensure the scraped DOM elements are accurately converted back into raw Markdown format.
- **`panel.ts/html/css` (Side Panel):** The command center UI for configuration, run tracking, log viewing, and Human-in-the-loop intervention.
- **`manifest.json` (V3):** Built for MV3 using `sidePanel`, `storage`, `tabs`, and `scripting` permissions.

## 📜 Legal / Caution

- This utilizes brittle DOM selectors (e.g. `#prompt-textarea`, `.markdown`) on highly dynamic websites. It may break if ChatGPT or Gemini update their HTML structures.
- Use responsibly. Sending automated rapid-fire prompts may trigger rate-limiting or violate Terms of Service on these platforms. Always monitor the loop.

---
*Built iteratively by collaborating humans and AIs.*
