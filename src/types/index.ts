export interface Wallet {
  address: string
  privateKey: string
}

export interface RpcConfig {
  id: string
  chain: string
  url: string
  name?: string
}

export interface GenerationMethod {
  type: 'shuffle' | 'seed' | 'range'
  config: any
}

export interface GenerationProgress {
  current: number
  total: number
  estimatedTime: number
  isComplete: boolean
}

export interface WalletUsageStatus {
  address: string
  hasBalance: boolean
  hasTransactions: boolean
  nonce: number
  balance: string
  symbol: string
  isUsed: boolean
  lastActivity?: string
  error?: string
} 