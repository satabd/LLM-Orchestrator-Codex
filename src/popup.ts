
document.getElementById('openPanelBtn')?.addEventListener('click', async () => {
  // Chrome 116+ supports opening side panel via API from user action
  // But usually this requires the "activeTab".
  // We can also just instruct the user.
  // Ideally we assume the user can click the toolbar if configured to open side panel, 
  // but we left "default_popup" in manifest, so the icon opens this popup.

  // Trigger side panel open
  // Note: chrome.sidePanel.open requires a user gesture and windowId.
  try {
    const window = await chrome.windows.getCurrent();
    if (window.id) {
      await chrome.sidePanel.open({ windowId: window.id });
      window.close(); // Close the popup
    }
  } catch (e) {
    console.error("Context error", e);
    // Fallback: Inform user
    const btn = document.getElementById('openPanelBtn');
    if (btn) btn.textContent = "Right-click Icon > Open Side Panel";
  }
});