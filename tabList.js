document.addEventListener("DOMContentLoaded", function () {
  let allTabs = [];

  // すべてのタブを取得
  chrome.tabs.query({}, function (tabs) {
    chrome.storage.local.get(["stock"], function (result) {
      let storedTabs = result.stock || [];

      // 取得したすべてのタブを保存
      tabs.forEach((tab) => {
        if (!storedTabs.some((storedTab) => storedTab.id === tab.id)) {
          storedTabs.push(tab);
        }
      });

      // ホストURLでグループ化し、名前順にソート
      allTabs = groupByHost(storedTabs);
      renderTabs(allTabs);
    });
  });

  function groupByHost(tabs) {
    const grouped = {};

    tabs.forEach((tab) => {
      const url = new URL(tab.url);
      const host = url.host;

      if (!grouped[host]) {
        grouped[host] = [];
      }
      grouped[host].push(tab);
    });

    // グループ化したオブジェクトをホスト名でソート
    const sortedGroups = Object.keys(grouped)
      .sort()
      .map((host) => ({
        host: host,
        tabs: grouped[host].sort((a, b) => a.title.localeCompare(b.title)),
      }));

    return sortedGroups.flatMap((group) =>
      group.tabs.map((tab) => ({ ...tab, host: group.host }))
    );
  }

  function renderTabs(tabs) {
    const tabListBody = document.querySelector("#tabList tbody");
    tabListBody.innerHTML = ""; // Clear existing list

    tabs.forEach((tab) => {
      const tr = document.createElement("tr");

      // Close button
      const closeTd = document.createElement("td");
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "X";
      closeBtn.className = "close-btn";
      closeBtn.addEventListener("click", function () {
        chrome.tabs.remove(tab.id); // ブラウザ標準のタブ閉じる機能
        allTabs = allTabs.filter((t) => t.id !== tab.id); // 表示リストから削除
        renderTabs(allTabs);
        saveTabs(); // 更新されたタブリストを保存
      });
      closeTd.appendChild(closeBtn);
      tr.appendChild(closeTd);

      // Checkbox
      const checkboxTd = document.createElement("td");
      const checkboxContainer = document.createElement("div");
      checkboxContainer.className = "checkbox-container";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `tab-${tab.id}`;
      checkboxContainer.appendChild(checkbox);
      checkboxTd.appendChild(checkboxContainer);
      tr.appendChild(checkboxTd);

      // Link to tab with host URL displayed below the title
      const linkTd = document.createElement("td");

      const a = document.createElement("a");
      a.href = tab.url;
      a.textContent = tab.title;
      a.target = "_blank";

      // ホストURLを表示するための要素
      const hostSpan = document.createElement("span");
      hostSpan.textContent = tab.host; // ホストURLを設定
      hostSpan.style.color = "gray"; // 灰色で表示
      hostSpan.style.fontSize = "small"; // 小さく表示
      hostSpan.style.display = "block"; // 新しい行に表示

      linkTd.appendChild(a); // タイトルリンクを追加
      linkTd.appendChild(hostSpan); // ホストURLを追加

      tr.appendChild(linkTd);

      tabListBody.appendChild(tr);
    });
  }

  function saveTabs() {
    chrome.storage.local.set({ stock: allTabs }, function () {
      console.log("Tabs saved successfully.");
    });
  }

  // フィルター機能
  document
    .getElementById("filterInput")
    .addEventListener("input", function (e) {
      const filterText = e.target.value.toLowerCase();
      const filteredTabs = allTabs.filter(
        (tab) =>
          tab.title.toLowerCase().includes(filterText) ||
          tab.url.toLowerCase().includes(filterText)
      );
      renderTabs(filteredTabs);
    });

  // Close All Other Tabs
  document
    .getElementById("closeAllOtherTabs")
    .addEventListener("click", function () {
      chrome.tabs.query(
        { active: false, currentWindow: true },
        function (tabs) {
          const tabIds = tabs.map((tab) => tab.id);

          chrome.tabs.remove(tabIds, function () {
            allTabs = allTabs.filter((tab) => !tabIds.includes(tab.id));
            renderTabs(allTabs);
            saveTabs(); // 更新されたタブリストを保存
          });
        }
      );
    });

  // Clear All Stored Tabs
  document
    .getElementById("clearStorage")
    .addEventListener("click", function () {
      if (confirm("Are you sure you want to clear all stored tabs?")) {
        chrome.storage.local.clear(function () {
          var error = chrome.runtime.lastError;
          if (error) {
            console.error(error);
          } else {
            console.log("All stored tabs cleared.");
            allTabs = [];
            renderTabs(allTabs);
          }
        });
      }
    });

  // Open All Tabs in New Window
  document.getElementById("openAllTabs").addEventListener("click", function () {
    chrome.windows.create(
      { url: allTabs.map((tab) => tab.url) },
      function (newWindow) {
        console.log("New window created with ID:", newWindow.id);
      }
    );
  });

  // Open Selected Tabs in New Window
  document
    .getElementById("openSelectedTabs")
    .addEventListener("click", function () {
      const selectedCheckboxes = document.querySelectorAll(
        'input[type="checkbox"]:checked'
      );
      const selectedUrls = Array.from(selectedCheckboxes)
        .map((checkbox) => {
          const tabId = checkbox.id.replace("tab-", "");
          const tab = allTabs.find((t) => t.id === parseInt(tabId));
          return tab ? tab.url : null;
        })
        .filter((url) => url !== null);

      if (selectedUrls.length > 0) {
        chrome.windows.create({ url: selectedUrls }, function (newWindow) {
          console.log(
            "New window created with selected tabs, ID:",
            newWindow.id
          );
        });
      }

      // 選択状態を解除
      selectedCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
    });
});
