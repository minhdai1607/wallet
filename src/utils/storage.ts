import { Wallet, RpcConfig } from '../types/index'

const STORAGE_KEYS = {
  WALLETS: 'wallet_generator_wallets',
  RPC_CONFIGS: 'wallet_generator_rpc_configs'
}

export const saveWalletsToStorage = (wallets: Wallet[]): void => {
  localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets))
}

export const loadWalletsFromStorage = (): Wallet[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WALLETS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading wallets from storage:', error)
    return []
  }
}

export const saveRpcConfigsToStorage = (configs: RpcConfig[]): void => {
  localStorage.setItem(STORAGE_KEYS.RPC_CONFIGS, JSON.stringify(configs))
}

export const loadRpcConfigsFromStorage = (): RpcConfig[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RPC_CONFIGS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading RPC configs from storage:', error)
    return []
  }
}

export const addWalletToStorage = (wallet: Wallet): void => {
  const wallets = loadWalletsFromStorage()
  wallets.push(wallet)
  saveWalletsToStorage(wallets)
}

export const removeWalletFromStorage = (index: number): void => {
  const wallets = loadWalletsFromStorage()
  wallets.splice(index, 1)
  saveWalletsToStorage(wallets)
}

export const addRpcConfigToStorage = (config: RpcConfig): void => {
  const configs = loadRpcConfigsFromStorage()
  configs.push(config)
  saveRpcConfigsToStorage(configs)
}

export const removeRpcConfigFromStorage = (id: string): void => {
  const configs = loadRpcConfigsFromStorage()
  const filtered = configs.filter(config => config.id !== id)
  saveRpcConfigsToStorage(filtered)
} 