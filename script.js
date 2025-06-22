const radios = document.querySelectorAll('input[name="method"]');
const inputArea = document.getElementById("inputArea");
const inputValue = document.getElementById("inputValue");
const walletInfo = document.getElementById("walletInfo");

radios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.value === "random") {
      inputArea.classList.add("hidden");
    } else {
      inputArea.classList.remove("hidden");
    }
    inputValue.value = '';
    walletInfo.innerHTML = '';
  });
});

async function createWallet() {
  let wallet;
  const method = document.querySelector('input[name="method"]:checked').value;
  const value = inputValue.value.trim();

  try {
    if (method === "random") {
      wallet = ethers.Wallet.createRandom();
    } else if (method === "privatekey") {
      wallet = new ethers.Wallet(value);
    } else if (method === "mnemonic") {
      const mnemonic = ethers.Mnemonic.fromPhrase(value);
      wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic);
    }

    const content = `Address: ${wallet.address}\nPrivate Key: ${wallet.privateKey}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    walletInfo.innerHTML = `
      <p><strong>Địa chỉ:</strong> ${wallet.address}</p>
      <a href="${url}" download="wallet_${wallet.address.slice(2, 6)}.txt" class="text-blue-600 underline mt-2 inline-block">Tải file ví</a>
    `;
  } catch (err) {
    walletInfo.innerHTML = `<p class="text-red-600">Lỗi: ${err.message}</p>`;
  }
}
