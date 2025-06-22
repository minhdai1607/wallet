
self.importScripts("https://cdn.jsdelivr.net/npm/ethers@6.10.0/dist/ethers.umd.min.js");

self.onmessage = function (e) {
  const { method, chunkSize, range, keys, mnemonic, length } = e.data;
  const wallets = [];

  try {
    if (method === "random") {
      for (let i = 0; i < chunkSize; i++) {
        const wallet = ethers.Wallet.createRandom();
        wallets.push({ address: wallet.address, privateKey: wallet.privateKey });
      }

    } else if (method === "privatekey") {
      for (let key of keys || []) {
        try {
          const wallet = new ethers.Wallet(key);
          wallets.push({ address: wallet.address, privateKey: wallet.privateKey });
        } catch {}
      }

    } else if (method === "mnemonic") {
      for (let i = 0; i < chunkSize; i++) {
        try {
          let wallet;
          if (mnemonic) {
            const m = ethers.Mnemonic.fromPhrase(mnemonic);
            wallet = ethers.HDNodeWallet.fromMnemonic(m);
          } else {
            wallet = ethers.Wallet.createRandom();
          }
          wallets.push({ address: wallet.address, privateKey: wallet.privateKey });
        } catch {}
      }
    }

    self.postMessage(wallets);
  } catch (err) {
    self.postMessage([]);
  }
};
