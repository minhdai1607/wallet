// generateWallet.js
// Tạo ví theo từng phương thức: random, private key, mnemonic

// Hàm tạo ví random
export function generateWalletRandom() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
}

// Hàm tạo ví từ private key
export function generateWalletFromPrivateKey(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch (err) {
    console.warn("Private key không hợp lệ:", privateKey);
    return null;
  }
}

// Hàm tạo ví từ mnemonic (nếu có), hoặc tạo mới
export function generateWalletFromMnemonic(mnemonicPhrase) {
  try {
    const mnemonic = ethers.Mnemonic.fromPhrase(mnemonicPhrase);
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  } catch (err) {
    console.warn("Mnemonic không hợp lệ:", mnemonicPhrase);
    return null;
  }
}
