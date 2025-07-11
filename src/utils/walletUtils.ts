import { ethers } from 'ethers'
import { Wallet } from '../types/index'

export const generateRandomWallet = (): Wallet => {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  }
}

export const generateWalletFromPrivateKey = (privateKey: string): Wallet => {
  try {
    const wallet = new ethers.Wallet(privateKey)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    }
  } catch (error) {
    throw new Error('Invalid private key')
  }
}

export const generateWalletFromSeed = (seedPhrase: string, index: number = 0): Wallet => {
  try {
    const mnemonic = ethers.Mnemonic.fromPhrase(seedPhrase)
    const path = `m/44'/60'/0'/0/${index}`
    const wallet = ethers.HDNodeWallet.fromMnemonic(mnemonic, path)
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    }
  } catch (error) {
    throw new Error('Invalid seed phrase')
  }
}

// Convert hex string to BigInt for comparison
const hexToBigInt = (hex: string): bigint => {
  return BigInt('0x' + hex.replace('0x', ''))
}

// Convert BigInt to hex string
const bigIntToHex = (value: bigint): string => {
  return '0x' + value.toString(16).padStart(64, '0')
}

export const generateWalletFromRange = (minHex: string, maxHex: string): Wallet => {
  // Remove 0x prefix if present
  const min = minHex.replace('0x', '').toLowerCase()
  const max = maxHex.replace('0x', '').toLowerCase()
  
  // Validate hex format
  const hexRegex = /^[0-9a-f]+$/
  if (!hexRegex.test(min) || !hexRegex.test(max)) {
    throw new Error('Range values must be valid hex strings (0-9, a-f)')
  }
  
  // Pad to 64 characters (32 bytes)
  const minPadded = min.padEnd(64, '0')
  const maxPadded = max.padEnd(64, 'f')
  
  // Convert to BigInt for comparison
  const minBigInt = hexToBigInt(minPadded)
  const maxBigInt = hexToBigInt(maxPadded)
  
  if (minBigInt >= maxBigInt) {
    throw new Error('Minimum value must be less than maximum value')
  }
  
  // Generate random BigInt within range
  const range = maxBigInt - minBigInt
  const randomOffset = BigInt(Math.floor(Math.random() * Number(range)))
  const randomBigInt = minBigInt + (randomOffset % range)
  
  // Convert back to hex
  const privateKey = bigIntToHex(randomBigInt)
  
  return generateWalletFromPrivateKey(privateKey)
}

export const shufflePrivateKey = (privateKey: string): string => {
  const chars = privateKey.slice(2).split('') // Remove '0x' prefix
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return '0x' + chars.join('')
}

// Load targets from targets.txt
export const loadTargets = async (): Promise<string[]> => {
  try {
    console.log('Loading targets.txt...')
    const response = await fetch('/targets.txt')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const text = await response.text()
    console.log(`Loaded targets.txt: ${text.length} characters`)
    
    const lines = text.split('\n')
    console.log(`Total lines: ${lines.length}`)
    
    const addresses = lines
      .map(line => line.trim())
      .filter(line => line && line.startsWith('0x'))
      .map(address => address.toLowerCase())
    
    console.log(`Valid addresses found: ${addresses.length}`)
    if (addresses.length > 0) {
      console.log('Sample addresses:', addresses.slice(0, 5))
    }
    
    return addresses
  } catch (error) {
    console.error('Error loading targets.txt:', error)
    return []
  }
}

// Check if wallet address matches any target
export const checkWalletMatch = (wallet: Wallet, targets: string[]): boolean => {
  const walletAddress = wallet.address.toLowerCase()
  const isMatch = targets.includes(walletAddress)
  
  // Log matches for debugging (but limit to avoid spam)
  if (isMatch) {
    console.log(`🎯 MATCH FOUND! Address: ${wallet.address}, Private Key: ${wallet.privateKey}`)
  }
  
  return isMatch
}

// Save wallets to file and download
export const saveWalletsToFile = (wallets: Wallet[], filename?: string): void => {
  // For large files, use chunked download
  if (wallets.length > 100000) {
    downloadLargeFile(wallets, filename)
    return
  }
  
  const content = wallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `wallet_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Download large files in chunks
const downloadLargeFile = (wallets: Wallet[], filename?: string): void => {
  const chunkSize = 50000 // Process 50k wallets at a time
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const baseFilename = filename || `wallet_${timestamp}.txt`
  
  const totalChunks = Math.ceil(wallets.length / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, wallets.length)
    const chunk = wallets.slice(start, end)
    
    const chunkFilename = totalChunks > 1 
      ? `${baseFilename.replace('.txt', '')}_part${i + 1}_of_${totalChunks}.txt`
      : baseFilename
    
    const content = chunk.map(w => `${w.privateKey} - ${w.address}`).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = chunkFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Save file directly to source (simulate by creating a download with specific name)
export const saveFileToSource = (wallets: Wallet[], isMatchResult: boolean = false): void => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const baseFilename = isMatchResult 
    ? `expected_result_${timestamp}`
    : `wallet_${timestamp}`

  // Save to localStorage for ManagementPage (only for smaller files to avoid localStorage limits)
  if (wallets.length <= 10000) {
    const fileData = {
      id: Date.now().toString(),
      name: `${baseFilename}.txt`,
      wallets: wallets,
      createdAt: new Date().toISOString(),
      type: isMatchResult ? 'matched' : 'generated'
    }

    // Get existing files from localStorage
    const existingFiles = JSON.parse(localStorage.getItem('wallet_files') || '[]')
    existingFiles.push(fileData)
    localStorage.setItem('wallet_files', JSON.stringify(existingFiles))
  }

  // Create download - use chunked download for large files
  if (wallets.length > 100000) {
    downloadLargeFile(wallets, `${baseFilename}.txt`)
  } else {
    const content = wallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseFilename}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Load generated files from localStorage
export const loadGeneratedFiles = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem('wallet_files') || '[]')
  } catch (error) {
    console.error('Error loading generated files:', error)
    return []
  }
}

// Remove generated file from localStorage
export const removeGeneratedFile = (fileId: string): void => {
  try {
    const existingFiles = JSON.parse(localStorage.getItem('wallet_files') || '[]')
    const updatedFiles = existingFiles.filter((file: any) => file.id !== fileId)
    localStorage.setItem('wallet_files', JSON.stringify(updatedFiles))
  } catch (error) {
    console.error('Error removing generated file:', error)
  }
}

export const loadWalletsFromFile = (file: File): Promise<Wallet[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const lines = content.split('\n').filter(line => line.trim())
        const wallets: Wallet[] = []
        
        for (const line of lines) {
          const parts = line.split(' - ')
          if (parts.length === 2) {
            wallets.push({
              privateKey: parts[0].trim(),
              address: parts[1].trim()
            })
          }
        }
        
        resolve(wallets)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// Fallback RPC endpoints for each chain
const fallbackEndpoints: { [key: string]: string[] } = {
  ETH: [
    'https://eth.llamarpc.com',
    'https://mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24',
    'https://rpc.ankr.com/eth/77d5b9fb64723e265ea8e77b93490a6df107ad251ec935d7f7fd44520866b865',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com'
  ],
  BNB: [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://bsc-dataseed3.binance.org',
    'https://rpc.ankr.com/bsc'
  ],
  POLYGON: [
    'https://polygon-rpc.com',
    'https://polygon-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24',
    'https://rpc-mainnet.matic.network',
    'https://rpc-mainnet.maticvigil.com',
    'https://rpc.ankr.com/polygon'
  ],
  BASE: [
    'https://mainnet.base.org',
    'https://base-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24',
    'https://base.blockpi.network/v1/rpc/public'
  ],
  OP: [
    'https://mainnet.optimism.io',
    'https://optimism-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24',
    'https://optimism.blockpi.network/v1/rpc/public'
  ],
  ARB: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24',
    'https://arbitrum.blockpi.network/v1/rpc/public'
  ],
  AVAX: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche'
  ],
  FTM: [
    'https://rpc.fantom.network',
    'https://rpc.ftm.tools',
    'https://rpcapi.fantom.network'
  ]
}

// Check balance for a specific wallet on a specific chain with retry and fallback
export const checkWalletBalance = async (
  walletAddress: string, 
  rpcUrl: string, 
  chain: string
): Promise<{ balance: string; symbol: string }> => {
  const endpoints = [rpcUrl, ...(fallbackEndpoints[chain] || [])]
  const maxRetries = 3
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [walletAddress, 'latest'],
            id: 1
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data.result) {
            const balance = data.result
            const symbol = getChainSymbol(chain)
            return { balance, symbol }
          }
        }
        
        // If we get here, the request was successful but no result
        break
        
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for ${chain} at ${endpoint}:`, error)
        continue
      }
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  // All attempts failed
  console.error(`All attempts failed for ${chain}`)
  return { balance: '0', symbol: getChainSymbol(chain) }
}

// Get chain symbol
export const getChainSymbol = (chain: string): string => {
  const symbols: { [key: string]: string } = {
    ETH: 'ETH',
    BNB: 'BNB',
    POLYGON: 'MATIC',
    BASE: 'ETH',
    OP: 'ETH',
    ARB: 'ETH',
    AVAX: 'AVAX',
    FTM: 'FTM'
  }
  return symbols[chain] || 'TOKEN'
}

// Format balance from wei to readable format
export const formatBalance = (balance: string, decimals: number = 18): string => {
  try {
    const wei = BigInt(balance)
    const divisor = BigInt(10) ** BigInt(decimals)
    const whole = wei / divisor
    const fraction = wei % divisor
    const fractionStr = fraction.toString().padStart(decimals, '0')
    return `${whole}.${fractionStr.slice(0, 6)}`
  } catch (error) {
    return '0.000000'
  }
}

// Interface for wallet usage status
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

// Check if wallet has been used (has balance, transactions, or nonce > 0)
export const checkWalletUsage = async (
  walletAddress: string,
  rpcUrl: string,
  chain: string
): Promise<WalletUsageStatus> => {
  try {
    // Check balance first
    const balanceResult = await checkWalletBalance(walletAddress, rpcUrl, chain)
    const hasBalance = BigInt(balanceResult.balance) > BigInt(0)
    
    // Check nonce (transaction count)
    const nonce = await getWalletNonce(walletAddress, rpcUrl, chain)
    const hasTransactions = nonce > 0
    
    // Determine if wallet is used
    const isUsed = hasBalance || hasTransactions
    
    return {
      address: walletAddress,
      hasBalance,
      hasTransactions,
      nonce,
      balance: balanceResult.balance,
      symbol: balanceResult.symbol,
      isUsed,
      lastActivity: hasTransactions ? 'Has transaction history' : undefined
    }
  } catch (error) {
    return {
      address: walletAddress,
      hasBalance: false,
      hasTransactions: false,
      nonce: 0,
      balance: '0',
      symbol: getChainSymbol(chain),
      isUsed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get wallet nonce (transaction count)
export const getWalletNonce = async (
  walletAddress: string,
  rpcUrl: string,
  chain: string
): Promise<number> => {
  const endpoints = [rpcUrl, ...(fallbackEndpoints[chain] || [])]
  const maxRetries = 3
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionCount',
            params: [walletAddress, 'latest'],
            id: 1
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data.result) {
            return parseInt(data.result, 16)
          }
        }
        
        break
        
      } catch (error) {
        console.warn(`Nonce check attempt ${attempt + 1} failed for ${chain} at ${endpoint}:`, error)
        continue
      }
    }
    
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  return 0
}

// Check multiple wallets usage status
export const checkMultipleWalletsUsage = async (
  wallets: Wallet[],
  rpcUrl: string,
  chain: string,
  onProgress?: (current: number, total: number) => void
): Promise<WalletUsageStatus[]> => {
  const results: WalletUsageStatus[] = []
  
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i]
    const status = await checkWalletUsage(wallet.address, rpcUrl, chain)
    results.push(status)
    
    if (onProgress) {
      onProgress(i + 1, wallets.length)
    }
    
    // Add delay to avoid rate limiting
    if (i < wallets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return results
}

// Filter wallets by usage status
export const filterWalletsByUsage = (
  wallets: Wallet[],
  usageStatuses: WalletUsageStatus[],
  filterType: 'used' | 'unused' | 'with_balance' | 'with_transactions'
): Wallet[] => {
  const filteredWallets: Wallet[] = []
  
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i]
    const status = usageStatuses[i]
    
    if (!status) continue
    
    let shouldInclude = false
    
    switch (filterType) {
      case 'used':
        shouldInclude = status.isUsed
        break
      case 'unused':
        shouldInclude = !status.isUsed
        break
      case 'with_balance':
        shouldInclude = status.hasBalance
        break
      case 'with_transactions':
        shouldInclude = status.hasTransactions
        break
    }
    
    if (shouldInclude) {
      filteredWallets.push(wallet)
    }
  }
  
  return filteredWallets
}

// Get usage statistics
export const getUsageStatistics = (usageStatuses: WalletUsageStatus[]) => {
  const total = usageStatuses.length
  const used = usageStatuses.filter(s => s.isUsed).length
  const unused = total - used
  const withBalance = usageStatuses.filter(s => s.hasBalance).length
  const withTransactions = usageStatuses.filter(s => s.hasTransactions).length
  
  return {
    total,
    used,
    unused,
    withBalance,
    withTransactions,
    usedPercentage: total > 0 ? (used / total) * 100 : 0,
    withBalancePercentage: total > 0 ? (withBalance / total) * 100 : 0,
    withTransactionsPercentage: total > 0 ? (withTransactions / total) * 100 : 0
  }
} 