export let CHAINS = {
  ETH: [
    "https://mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24",
    "https://mainnet.infura.io/v3/36f9fafb00d5417485f570a9eaccba98"
  ],
  BNB: ["https://bsc-dataseed.binance.org/"],
  POLYGON: ["https://polygon-rpc.com"],
  BASE: ["https://mainnet.base.org"],
  OP: ["https://mainnet.optimism.io"],
  ARP: [
    "https://arb1.arbitrum.io/rpc",
    "https://rpc.ankr.com/arbitrum",
    "https://arbitrum.llamarpc.com"
  ]
};

export function getMergedChains() {
  const userChains = JSON.parse(localStorage.getItem("customRPC") || "{}");

  const merged = { ...CHAINS };
  for (let chain in userChains) {
    if (!merged[chain]) merged[chain] = [];
    merged[chain] = [...merged[chain], ...userChains[chain]];
  }
  return merged;
}
