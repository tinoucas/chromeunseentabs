// Adds "● " in front of the page title while the background script says this
// tab hasn't been looked at yet, and keeps it there if the page changes its
// title. Removes it as soon as the tab gets activated.

(() => {
  // The tab strip draws titles in the OS's UI font, which lacks these
  // characters, so their size depends on the fallback font. ● looks right on
  // Linux but much bigger on macOS, where ⏺ (forced to text, not emoji, by
  // U+FE0E) comes out at about the same size.
  const isMac = /^mac/i.test(navigator.userAgentData?.platform || navigator.platform || '');
  const PREFIX = isMac ? '\u23FA\uFE0E ' : '\u25CF ';
  let unseen = false;
  let synthesized = null; // title we made up for a page that had none
  let observer = null;

  function apply() {
    const title = document.title;
    if (unseen) {
      if (title.startsWith(PREFIX)) return;
      if (title) {
        document.title = PREFIX + title;
      } else {
        // Untitled page: Chrome would show the URL, so do the same.
        synthesized = PREFIX + location.host + location.pathname;
        document.title = synthesized;
      }
    } else if (title.startsWith(PREFIX)) {
      document.title = title === synthesized ? '' : title.slice(PREFIX.length);
      synthesized = null;
    }
  }

  function setUnseen(value) {
    unseen = value;
    apply();
    if (unseen && !observer) {
      // Pages (and SPAs) set or change <title> at any time: re-apply.
      observer = new MutationObserver(apply);
      observer.observe(document, { subtree: true, childList: true, characterData: true });
    } else if (!unseen && observer) {
      observer.disconnect();
      observer = null;
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && typeof msg.unseen === 'boolean') setUnseen(msg.unseen);
  });

  chrome.runtime.sendMessage('isUnseen').then(
    (value) => { if (value) setUnseen(true); },
    () => {}
  );
})();
