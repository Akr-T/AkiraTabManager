chrome.action.onClicked.addListener((tab) => {
  saveAndShowTabs();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveAndShowTabs") {
    saveAndShowTabs();
  }
});

function saveAndShowTabs() {
  chrome.tabs.query({}, (tabs) => {
    const tabData = tabs.map((tab) => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
    }));

    chrome.storage.local.set({ stock: tabData }, () => {
      chrome.tabs.create({ url: "tabList.html" });
    });
  });
}
