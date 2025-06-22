// === DOM Elements ===
const inputArea = document.getElementById("inputArea");
const outputArea = document.getElementById("outputArea");
const generateBtn = document.getElementById("generateBtn");
const methodRadios = document.querySelectorAll("input[name='method']");

// === State ===
let selectedMethod = "random";

// === Init method change listener ===
methodRadios.forEach(radio => {
  radio.addEventListener("change", e => {
    selectedMethod = e.target.value;
    renderInputArea(selectedMethod);
  });
});

// === Dynamic input rendering ===
function renderInputArea(method) {
  let html = "";
  if (method === "random") {
    html = `
      <label class="block font-medium">Nhập khoảng random:</label>
      <input id="rangeInput" type="text" placeholder="VD: 0-100000" class="w-full border px-3 py-2 rounded-lg">
    `;
  } else if (method === "privatekey") {
    html = `
      <label class="block font-medium">Nhập Private Key(s), mỗi key 1 dòng:</label>
      <textarea id="privateKeyInput" rows="4" class="w-full border px-3 py-2 rounded-lg" placeholder="0x...
0x...
..."></textarea>
    `;
  } else if (method === "mnemonic") {
    html = `
      <label class="block font-medium">Tùy chọn nhập Mnemonic hoặc để trống để tạo tự động:</label>
      <textarea id="mnemonicInput" rows="2" class="w-full border px-3 py-2 rounded-lg" placeholder="12 hoặc 24 từ cách nhau bằng dấu cách"></textarea>
      <div class="mt-2">
        <label class="mr-2">Số từ:</label>
        <select id="mnemonicLength" class="border rounded px-2 py-1">
          <option value="12" selected>12</option>
          <option value="24">24</option>
        </select>
      </div>
    `;
  }
  inputArea.innerHTML = html;
}

renderInputArea(selectedMethod);

// === Placeholder for Wallet Store ===
let walletStore = JSON.parse(localStorage.getItem("walletStore") || "[]");
let matchList = [];

// === Load targets.txt từ GitHub ===
async function fetchTargetList() {
  try {
    const res = await fetch("https://raw.githubusercontent.com/minhdai1607/wallet/main/targets.txt");
    const text = await res.text();
    return text.split("\n").map(line => line.trim().toLowerCase()).filter(Boolean);
  } catch (err) {
    console.error("Không thể load targets.txt:", err);
    return [];
  }
}

// === Generate button logic ===
generateBtn.addEventListener("click", async () => {
  const walletCount = parseInt(document.getElementById("walletCount").value);
  const workerCount = parseInt(document.getElementById("workerCount").value);

  if (!walletCount || walletCount <= 0) return alert("Vui lòng nhập số lượng ví hợp lệ.");
  if (!workerCount || workerCount <= 0) return alert("Vui lòng nhập số lượng worker hợp lệ.");

  outputArea.innerHTML = `<p>Đang tạo ${walletCount} ví bằng ${workerCount} worker...</p>`;

  const targets = await fetchTargetList();
  walletStore = [];
  matchList = [];

  try {
    if (selectedMethod === "random") {
      const rangeStr = document.getElementById("rangeInput").value.trim();
      const [min, max] = rangeStr.split("-").map(n => parseInt(n));
      if (isNaN(min) || isNaN(max) || min >= max) return alert("Khoảng random không hợp lệ. VD: 0-100000");

      for (let i = 0; i < walletCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        walletStore.push({ address: wallet.address, privateKey: wallet.privateKey });
      }

    } else if (selectedMethod === "privatekey") {
      const keys = document.getElementById("privateKeyInput").value.trim().split("\n").map(k => k.trim()).filter(Boolean);
      for (let key of keys) {
        try {
          const wallet = new ethers.Wallet(key);
          walletStore.push({ address: wallet.address, privateKey: wallet.privateKey });
        } catch (err) {
          console.warn("Invalid private key:", key);
        }
      }

    } else if (selectedMethod === "mnemonic") {
      const customInput = document.getElementById("mnemonicInput").value.trim();
      const length = parseInt(document.getElementById("mnemonicLength").value);

      for (let i = 0; i < walletCount; i++) {
        let wallet;
        if (customInput) {
          try {
            const mnemonic = ethers.Mnemonic.fromPhrase(customInput);
            wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic);
          } catch (err) {
            return alert("Mnemonic không hợp lệ.");
          }
        } else {
          const generated = ethers.Wallet.createRandom();
          wallet = generated;
        }
        walletStore.push({ address: wallet.address, privateKey: wallet.privateKey });
      }
    }

    for (let wallet of walletStore) {
      if (targets.includes(wallet.address.toLowerCase())) {
        matchList.push(wallet);
      }
    }

    let resultHtml = `<p>Đã tạo ${walletStore.length} ví.</p>`;
    if (matchList.length > 0) {
      resultHtml += `<p class='text-green-600'>Tìm thấy ${matchList.length} ví trùng khớp!</p>`;
      resultHtml += `<ul class="list-disc ml-6">`;
      matchList.forEach(w => {
        resultHtml += `<li>${w.address}</li>`;
      });
      resultHtml += `</ul>`;
      const content = matchList.map(w => `${w.address} - ${w.privateKey}`).join("\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      resultHtml += `<a href="${url}" download="match.txt" class="text-blue-600 underline mt-2 inline-block">Tải file match.txt</a>`;
    } else {
      resultHtml += `<p>Không có ví nào trùng trong danh sách target.</p>`;
    }

    outputArea.innerHTML = resultHtml;

  } catch (err) {
    outputArea.innerHTML = `<p class='text-red-600'>Lỗi: ${err.message}</p>`;
  }
});

// === Tab logic ===
window.showTab = function(id) {
  document.querySelectorAll(".tab").forEach(tab => tab.style.display = "none");
  document.getElementById(id).style.display = "block";
  if (id === "manager") renderWalletList();
  if (id === "balance") renderRpcList();
};

// === Wallet Management ===
const walletListEl = document.getElementById("walletList");
function renderWalletList() {
  if (!walletStore.length) {
    walletListEl.innerHTML = "<p>Không có ví nào được lưu.</p>";
    return;
  }
  walletListEl.innerHTML = walletStore.map((w, i) => `
    <div class="border p-2 rounded my-2">
      <p><strong>Address:</strong> ${w.address}</p>
      <p><strong>Private Key:</strong> ${w.privateKey}</p>
      <button onclick="deleteWallet(${i})" class="text-red-600">Xóa</button>
    </div>
  `).join("");
}
window.deleteWallet = function(index) {
  walletStore.splice(index, 1);
  localStorage.setItem("walletStore", JSON.stringify(walletStore));
  renderWalletList();
};

// === RPC + Balance Logic ===
import { CHAINS, getMergedChains } from "./chains.js";

const checkBtn = document.getElementById("checkBalanceBtn");
const resultEl = document.getElementById("balanceResult");

checkBtn.addEventListener("click", async () => {
  const workerCount = parseInt(document.getElementById("balanceWorker").value);
  if (!workerCount || workerCount <= 0) return alert("Vui lòng nhập số worker hợp lệ.");
  if (!walletStore.length) return alert("Không có ví nào để kiểm tra.");

  resultEl.innerHTML = "Đang kiểm tra số dư...";
  const allResults = [];

  const chainEntries = Object.entries(getMergedChains());
  for (const [chainName, rpcs] of chainEntries) {
    const rpc = rpcs[0];
    const chunkSize = Math.ceil(walletStore.length / workerCount);
    const promises = [];

    for (let i = 0; i < workerCount; i++) {
      const chunk = walletStore.slice(i * chunkSize, (i + 1) * chunkSize);
      const worker = new Worker("./workers/checkBalance.js");
      worker.postMessage({ wallets: chunk, rpc });
      const p = new Promise(res => {
        worker.onmessage = e => {
          res(e.data);
          worker.terminate();
        };
      });
      promises.push(p);
    }
    const results = (await Promise.all(promises)).flat();
    allResults.push(...results);
  }

  walletStore = allResults;
  localStorage.setItem("walletStore", JSON.stringify(walletStore));
  renderWalletList();

  if (!walletStore.length) {
    resultEl.innerHTML = "Không có ví nào có số dư > 0";
  } else {
    let html = `<p>✅ Tìm thấy ${walletStore.length} ví có balance > 0:</p><ul>`;
    walletStore.forEach(w => {
      html += `<li>${w.address} — ${w.balance} ETH</li>`;
    });
    html += "</ul>";
    const content = walletStore.map(w => `${w.address} - ${w.privateKey}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    html += `<a href="${url}" download="wallet_with_balance.txt" class="text-blue-600 underline">Tải file kết quả</a>`;
    resultEl.innerHTML = html;
  }
});

// === RPC UI ===
document.getElementById("addRpcBtn").addEventListener("click", () => {
  const chain = document.getElementById("rpcChainSelect").value;
  const rpc = document.getElementById("rpcInput").value.trim();
  const msg = document.getElementById("rpcMessage");

  if (!rpc.startsWith("http")) {
    msg.innerText = "❌ RPC không hợp lệ.";
    msg.style.color = "red";
    return;
  }

  const storage = JSON.parse(localStorage.getItem("customRPC") || "{}");
  if (!storage[chain]) storage[chain] = [];
  if (!storage[chain].includes(rpc)) {
    storage[chain].push(rpc);
    localStorage.setItem("customRPC", JSON.stringify(storage));
    renderRpcList();
  }

  msg.innerText = `✅ RPC mới đã được thêm vào ${chain}`;
  msg.style.color = "green";
  document.getElementById("rpcInput").value = "";
});

function renderRpcList() {
  const container = document.getElementById("rpcListContainer");
  const customRPC = JSON.parse(localStorage.getItem("customRPC") || "{}");
  let html = "";

  for (let chain in customRPC) {
    html += `<div><strong>${chain}</strong><ul>`;
    customRPC[chain].forEach((rpc, index) => {
      html += `<li class="flex items-center justify-between">
        <span>${rpc}</span>
        <button class="text-red-600 ml-2" onclick="removeRpc('${chain}', ${index})">Xoá</button>
      </li>`;
    });
    html += "</ul></div>";
  }
  container.innerHTML = html || "<p>Chưa có RPC nào được thêm.</p>";
}
window.removeRpc = function(chain, index) {
  const customRPC = JSON.parse(localStorage.getItem("customRPC") || "{}");
  if (!customRPC[chain]) return;
  customRPC[chain].splice(index, 1);
  if (customRPC[chain].length === 0) delete customRPC[chain];
  localStorage.setItem("customRPC", JSON.stringify(customRPC));
  renderRpcList();
};
