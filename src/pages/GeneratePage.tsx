import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Download, Loader2, AlertTriangle, ChevronDown, ChevronUp, Settings, Pause } from 'lucide-react'
import { Wallet, GenerationProgress } from '../types/index'
import { 
  generateRandomWallet, 
  generateWalletFromPrivateKey, 
  generateWalletFromSeed,
  generateWalletFromRange,
  shufflePrivateKey,
  saveWalletsToFile,
  loadTargets,
  checkWalletMatch,
  saveFileToSource
} from '../utils/walletUtils'
import { saveWalletsToStorage } from '../utils/storage'

type GenerationMethod = 'shuffle' | 'seed' | 'range'

// Thread configuration interface
interface ThreadConfig {
  id: number
  isRunning: boolean
  isCompleted: boolean
  isPaused: boolean
  progress: number // 0-100
  currentCount: number
  totalCount: number
  startTime: number | null
  endTime: number | null
  wallets: Wallet[]
  matchedWallets: Wallet[]
  error: string | null
}

// Predefined private keys for selection
const PREDEFINED_PRIVATE_KEYS = [
  '0x5808743c21cc1d53b62b295c286074a987527fb231e65d074f78b7a62a86cda4',
  '0xc593a4e447f59817b4a2afdd577ac4c1ec8b24bf2a08fb6a9bd440024fb072f8',
  '0x578bacd3e94ad10969a2deed6c9122c9b56a19446e004c8fb85d8bc1fdf4d241',
  '0x1c4585d962a04bffaba0fdb7b9e5d23af7b161f9bd06b317f9a58b4d604bd87b',
  '0x0083e395d58b28d19a004c6ef0b81303a9f9a2b58a47b06e2cd153dfde953be4',
  '0xc1af74b4c898c8618cb1322bfce7739cfb34f89fd94f7fa59cc82757d275670a',
  '0xb0a668e49120b05cd5f168c2b2d79dd10fa1d7ea1cf3e315a4c29d832384455a',
  '0x5163029d5d8504600367735236cc888baeebafd1fbbd3e103d163f27b76528b6',
  '0x0a62d2bb9c228050a12be28db847913082c7978cfff8d159426e1ba25acdeabc',
  '0x99b3b6a1e69b864bde30b25236c1318e11576e8812e0d3f3a362e0ebf1523e17',
  '0x3da01309cedafd15d4adde0b810a249f29a08e5bb52ab66e2c247e4208d6be3e',
  '0xdd632995370927bcb50ec78f2625ec380f58f6d84e24786cbb5da2ab39457089',
  '0x28358596f46a759408c42a0ac1868c6963e894bc1338de92de943f0b922ba590',
  '0x014865035c355556033de3a0109b6a5e6111dfcc601650796374fc00c0dfd062',
  '0x9045cca9d7463f67a52ccd787dfa0f27b0e8e82614e927482fbe45aa1a57385f',
  '0x116633d4bb3ead5d11ed1e1801b13c0e123fd73a88df82b31ab3dab65f795e17',
  '0xafa016496f524f6f75cdfc8fd196f4cf504c39e1ec5e68f2723e0cb0a27f02e1',
  '0xc9e0486fdc6a529331083afd89a1b3aef8fa3c2f8a6b9d17980983583b8f88b7',
  '0xcaae990b663e1c61f04467b9881df0f708bfdfeb631a99c16ad207fa1fef9a76',
  '0x0aee1ea051bb292d56310732a112195f2c64a52f8bd10bef7957fdde9a9bf4e4',
  '0x869ceb706e856267e665c21c612b171fea3bb48a37797917cfd5b1d3a8727c21',
  '0x5b85dc83f6362ae1cfd913092cd4a05e45eb9ed43cd058035c41353796f88093',
  '0x26ca82a9e6071acaffc69a0e9156c0ae3ed9d16ef8de89c9fd65b095c8f7958d',
  '0xf62668a08484e11f27556253d3e49556389517938a88ded9c2b7593aaba5f59f',
  '0xbd7769cd2ff0c2886dd856960e3109a0a315515f44c694c9cc334d70aaaa7aaa',
  '0x626638f4554a8338ed928c1eb9c47333c07f199e0fa1b299f6271ad133cfe1d3',
  '0xbc5bca701904006aebb2f0cdb80d533d2c309184fb90e781526e326d24aaa189',
  '0x853f454a5db1cd155f89ca4f7251af572c3fea705792d0038cc7eb052efec7cc'
]

const GeneratePage = () => {
  const [method, setMethod] = useState<GenerationMethod>('shuffle')
  const [workerCount, setWorkerCount] = useState(2)
  const [walletCount, setWalletCount] = useState(10000)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [generatedWallets, setGeneratedWallets] = useState<Wallet[]>([])
  const [matchedWallets, setMatchedWallets] = useState<Wallet[]>([])
  const [targets, setTargets] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  // Multi-thread configuration states
  const [useMultiThread, setUseMultiThread] = useState(false)
  const [threadCount, setThreadCount] = useState(5)
  const [coresPerThread, setCoresPerThread] = useState(4)
  const [walletsPerThread, setWalletsPerThread] = useState(100000)
  const [threads, setThreads] = useState<ThreadConfig[]>([])
  const [isMultiThreadRunning, setIsMultiThreadRunning] = useState(false)
  const [currentThreadIndex, setCurrentThreadIndex] = useState(0)
  const [showThreadConfig, setShowThreadConfig] = useState(false)

  // Method-specific states
  const [privateKeyInput, setPrivateKeyInput] = useState('')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [seedLength, setSeedLength] = useState(12)
  const [rangeMin, setRangeMin] = useState('0x0000000000000000000000000000000000000000000000000000000000000000')
  const [rangeMax, setRangeMax] = useState('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  
  // Predefined private keys states
  const [showPredefinedKeys, setShowPredefinedKeys] = useState(false)
  const [selectedPredefinedKey, setSelectedPredefinedKey] = useState<string>('')
  const [useCustomInput, setUseCustomInput] = useState(true)

  const stopRequested = useRef(false)
  const multiThreadStopRequested = useRef(false)

  // Initialize threads
  const initializeThreads = useCallback(() => {
    const newThreads: ThreadConfig[] = []
    for (let i = 0; i < threadCount; i++) {
      newThreads.push({
        id: i + 1,
        isRunning: false,
        isCompleted: false,
        isPaused: false,
        progress: 0,
        currentCount: 0,
        totalCount: walletsPerThread,
        startTime: null,
        endTime: null,
        wallets: [],
        matchedWallets: [],
        error: null
      })
    }
    setThreads(newThreads)
  }, [threadCount, walletsPerThread])

  // Initialize threads when component mounts or config changes
  useEffect(() => {
    if (useMultiThread) {
      initializeThreads()
    }
  }, [useMultiThread, initializeThreads])

  // Calculate estimated total wallets that can be generated
  const getEstimatedTotalWallets = () => {
    switch (method) {
      case 'shuffle':
        return privateKeyInput.trim() ? 'Vô hạn (dựa trên private key)' : '0 (cần nhập private key)'
      case 'seed':
        return seedPhrase.trim() ? 'Vô hạn (dựa trên seed phrase)' : 'Vô hạn (tự động tạo)'
      case 'range':
        try {
          const minBigInt = BigInt('0x' + rangeMin.replace('0x', ''))
          const maxBigInt = BigInt('0x' + rangeMax.replace('0x', ''))
          const range = maxBigInt - minBigInt + BigInt(1)
          return range > BigInt(0) ? range.toString() : '0 (khoảng không hợp lệ)'
        } catch (error) {
          return '0 (khoảng không hợp lệ)'
        }
      default:
        return 'Vô hạn'
    }
  }

  // Validate wallet count input - only check for invalid input
  const validateWalletCount = (count: number): string => {
    if (count <= 0) {
      return 'Số lượng wallet phải lớn hơn 0'
    }
    
    if (!Number.isInteger(count)) {
      return 'Số lượng wallet phải là số nguyên'
    }
    
    if (count > Number.MAX_SAFE_INTEGER) {
      return 'Số lượng wallet quá lớn'
    }
    
    return ''
  }

  const handleWalletCountChange = (value: number) => {
    setWalletCount(value)
    const validationError = validateWalletCount(value)
    setError(validationError)
  }

  // Get the actual private key to use (custom input takes priority)
  const getActivePrivateKey = (): string => {
    if (useCustomInput && privateKeyInput.trim()) {
      return privateKeyInput.trim()
    }
    if (selectedPredefinedKey) {
      return selectedPredefinedKey
    }
    return ''
  }

  // Improved download function for large files
  const handleDownload = () => {
    if (generatedWallets.length === 0) return

    // For large files, use streaming download
    if (generatedWallets.length > 100000) {
      downloadLargeFile(generatedWallets)
    } else {
      saveWalletsToFile(generatedWallets)
    }
  }

  const downloadLargeFile = (wallets: Wallet[]) => {
    const chunkSize = 50000 // Process 50k wallets at a time
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `wallet_${timestamp}.txt`
    
    // Create a writable stream using File System Access API if available
    if ('showSaveFilePicker' in window) {
      // Modern browsers with File System Access API
      downloadWithFileSystemAPI(wallets, filename)
    } else {
      // Fallback for older browsers - split into multiple files
      downloadInChunks(wallets, filename, chunkSize)
    }
  }

  const downloadWithFileSystemAPI = async (wallets: Wallet[], filename: string) => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Text Files',
          accept: { 'text/plain': ['.txt'] }
        }]
      })
      
      const writable = await handle.createWritable()
      const content = wallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
      await writable.write(content)
      await writable.close()
    } catch (error) {
      console.error('File System API not available, falling back to chunked download')
      downloadInChunks(wallets, filename, 50000)
    }
  }

  const downloadInChunks = (wallets: Wallet[], baseFilename: string, chunkSize: number) => {
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

  const generateWallets = useCallback(async () => {
    // Validate before starting
    const validationError = validateWalletCount(walletCount)
    if (validationError) {
      setError(validationError)
      return
    }

    // Additional validation for specific methods
    if (method === 'shuffle') {
      const activePrivateKey = getActivePrivateKey()
      if (!activePrivateKey) {
        setError('Vui lòng nhập private key hoặc chọn từ danh sách có sẵn')
        return
      }
    }

    if (method === 'range') {
      // Validate hex format for range
      const hexRegex = /^[0-9a-fA-F]+$/
      if (!hexRegex.test(rangeMin.replace('0x', '')) || !hexRegex.test(rangeMax.replace('0x', ''))) {
        setError('Range values must be valid hex strings (0-9, a-f)')
        return
      }
      
      // Check if min is less than max
      const minBigInt = BigInt('0x' + rangeMin.replace('0x', ''))
      const maxBigInt = BigInt('0x' + rangeMax.replace('0x', ''))
      if (minBigInt >= maxBigInt) {
        setError('Giá trị tối thiểu phải nhỏ hơn giá trị tối đa')
        return
      }
    }

    setError('') // Clear any previous errors
    setIsGenerating(true)
    setProgress({ current: 0, total: walletCount, estimatedTime: 0, isComplete: false })
    setGeneratedWallets([])
    setMatchedWallets([])
    stopRequested.current = false

    const startTime = Date.now()
    const wallets: Wallet[] = []
    const matched: Wallet[] = []
    const batchSize = Math.ceil(walletCount / workerCount)

    try {
      // Load targets first
      const loadedTargets = await loadTargets()
      setTargets(loadedTargets)
      console.log(`Loaded ${loadedTargets.length} targets`)

      for (let i = 0; i < walletCount; i++) {
        if (stopRequested.current) {
          break
        }
        let wallet: Wallet

        switch (method) {
          case 'shuffle':
            const activePrivateKey = getActivePrivateKey()
            if (!activePrivateKey) {
              throw new Error('Vui lòng nhập private key hoặc chọn từ danh sách có sẵn')
            }
            const shuffledKey = shufflePrivateKey(activePrivateKey)
            wallet = generateWalletFromPrivateKey(shuffledKey)
            break

          case 'seed':
            if (seedPhrase.trim()) {
              wallet = generateWalletFromSeed(seedPhrase.trim(), i)
            } else {
              wallet = generateRandomWallet()
            }
            break

          case 'range':
            wallet = generateWalletFromRange(rangeMin, rangeMax)
            break

          default:
            wallet = generateRandomWallet()
        }

        wallets.push(wallet)

        // Check if wallet matches any target
        if (checkWalletMatch(wallet, loadedTargets)) {
          matched.push(wallet)
          console.log(`Found match: ${wallet.address}`)
        }

        // Update progress
        const current = i + 1
        const elapsed = Date.now() - startTime
        const estimatedTime = (elapsed / current) * (walletCount - current)
        
        setProgress({
          current,
          total: walletCount,
          estimatedTime,
          isComplete: false
        })

        // Simulate worker delay
        if (i % batchSize === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      setGeneratedWallets(wallets)
      setMatchedWallets(matched)
      saveWalletsToStorage(wallets)
      setProgress(prev => prev ? { ...prev, isComplete: true } : null)

      // Save files
      if (wallets.length > 0) {
        saveFileToSource(wallets, false) // Save all wallets
      }
      
      if (matched.length > 0) {
        saveFileToSource(matched, true) // Save matched wallets
      }

    } catch (error) {
      console.error('Generation error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsGenerating(false)
    }
  }, [method, workerCount, walletCount, privateKeyInput, seedPhrase, rangeMin, rangeMax, selectedPredefinedKey, useCustomInput])

  const handleStop = () => {
    stopRequested.current = true
  }

  // Multi-thread generation functions
  const startMultiThreadGeneration = useCallback(async () => {
    // Validate before starting
    const validationError = validateWalletCount(walletsPerThread)
    if (validationError) {
      setError(validationError)
      return
    }

    // Additional validation for specific methods
    if (method === 'shuffle') {
      const activePrivateKey = getActivePrivateKey()
      if (!activePrivateKey) {
        setError('Vui lòng nhập private key hoặc chọn từ danh sách có sẵn')
        return
      }
    }

    if (method === 'range') {
      const hexRegex = /^[0-9a-fA-F]+$/
      if (!hexRegex.test(rangeMin.replace('0x', '')) || !hexRegex.test(rangeMax.replace('0x', ''))) {
        setError('Range values must be valid hex strings (0-9, a-f)')
        return
      }
      
      const minBigInt = BigInt('0x' + rangeMin.replace('0x', ''))
      const maxBigInt = BigInt('0x' + rangeMax.replace('0x', ''))
      if (minBigInt >= maxBigInt) {
        setError('Giá trị tối thiểu phải nhỏ hơn giá trị tối đa')
        return
      }
    }

    setError('')
    setIsMultiThreadRunning(true)
    setCurrentThreadIndex(0)
    multiThreadStopRequested.current = false

    // Initialize threads
    initializeThreads()

    // Load targets first
    const loadedTargets = await loadTargets()
    setTargets(loadedTargets)

    // Start sequential thread execution
    await runThreadsSequentially(loadedTargets)
  }, [method, walletsPerThread, privateKeyInput, seedPhrase, rangeMin, rangeMax, selectedPredefinedKey, useCustomInput, initializeThreads])

  const runThreadsSequentially = async (loadedTargets: string[]) => {
    for (let i = 0; i < threadCount; i++) {
      if (multiThreadStopRequested.current) {
        break
      }

      setCurrentThreadIndex(i)
      await runSingleThread(i, loadedTargets)
      
      // Auto-download thread result
      if (threads[i]?.wallets.length > 0) {
        await downloadThreadResult(i + 1)
      }
    }

    setIsMultiThreadRunning(false)
  }

  const runSingleThread = async (threadIndex: number, loadedTargets: string[]) => {
    const thread = threads[threadIndex]
    if (!thread) return

    // Update thread status
    setThreads(prev => prev.map((t, idx) => 
      idx === threadIndex 
        ? { ...t, isRunning: true, startTime: Date.now(), error: null }
        : t
    ))

    const wallets: Wallet[] = []
    const matched: Wallet[] = []
    // const startTime = Date.now()

    try {
      for (let i = 0; i < walletsPerThread; i++) {
        if (multiThreadStopRequested.current) {
          // Mark as paused
          setThreads(prev => prev.map((t, idx) => 
            idx === threadIndex 
              ? { ...t, isRunning: false, isPaused: true, endTime: Date.now() }
              : t
          ))
          return
        }

        let wallet: Wallet

        switch (method) {
          case 'shuffle':
            const activePrivateKey = getActivePrivateKey()
            if (!activePrivateKey) {
              throw new Error('Vui lòng nhập private key hoặc chọn từ danh sách có sẵn')
            }
            const shuffledKey = shufflePrivateKey(activePrivateKey)
            wallet = generateWalletFromPrivateKey(shuffledKey)
            break

          case 'seed':
            if (seedPhrase.trim()) {
              wallet = generateWalletFromSeed(seedPhrase.trim(), i)
            } else {
              wallet = generateRandomWallet()
            }
            break

          case 'range':
            wallet = generateWalletFromRange(rangeMin, rangeMax)
            break

          default:
            wallet = generateRandomWallet()
        }

        wallets.push(wallet)

        // Check if wallet matches any target
        if (checkWalletMatch(wallet, loadedTargets)) {
          matched.push(wallet)
        }

        // Update thread progress
        const current = i + 1
        const progress = (current / walletsPerThread) * 100
        
        setThreads(prev => prev.map((t, idx) => 
          idx === threadIndex 
            ? { 
                ...t, 
                currentCount: current,
                progress,
                wallets: [...wallets],
                matchedWallets: [...matched]
              }
            : t
        ))

        // Simulate processing delay
        if (i % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }

      // Mark thread as completed
      setThreads(prev => prev.map((t, idx) => 
        idx === threadIndex 
          ? { 
              ...t, 
              isRunning: false, 
              isCompleted: true, 
              endTime: Date.now(),
              wallets: [...wallets],
              matchedWallets: [...matched]
            }
          : t
      ))

    } catch (error) {
      console.error(`Thread ${threadIndex + 1} error:`, error)
      setThreads(prev => prev.map((t, idx) => 
        idx === threadIndex 
          ? { 
              ...t, 
              isRunning: false, 
              error: error instanceof Error ? error.message : 'Unknown error',
              endTime: Date.now()
            }
          : t
      ))
    }
  }

  const stopMultiThreadGeneration = () => {
    multiThreadStopRequested.current = true
    setIsMultiThreadRunning(false)
  }

  const downloadThreadResult = async (threadId: number) => {
    const thread = threads.find(t => t.id === threadId)
    if (!thread || thread.wallets.length === 0) return

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `wallet_thread_${threadId}_${timestamp}.txt`
    
    // Download all wallets
    const content = thread.wallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Download matched wallets if any
    if (thread.matchedWallets.length > 0) {
      const matchedFilename = `expected_result_thread_${threadId}_${timestamp}.txt`
      const matchedContent = thread.matchedWallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
      const matchedBlob = new Blob([matchedContent], { type: 'text/plain' })
      const matchedUrl = URL.createObjectURL(matchedBlob)
      const matchedA = document.createElement('a')
      matchedA.href = matchedUrl
      matchedA.download = matchedFilename
      document.body.appendChild(matchedA)
      matchedA.click()
      document.body.removeChild(matchedA)
      URL.revokeObjectURL(matchedUrl)
    }
  }

  const downloadAllThreadResults = async () => {
    const completedThreads = threads.filter(t => t.isCompleted && t.wallets.length > 0)
    if (completedThreads.length === 0) return

    // Download each thread result
    for (const thread of completedThreads) {
      await downloadThreadResult(thread.id)
    }

    // Also download combined result
    const allWallets = completedThreads.flatMap(t => t.wallets)
    const allMatchedWallets = completedThreads.flatMap(t => t.matchedWallets)
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    
    // Download combined all wallets
    const combinedFilename = `wallet_all_threads_${timestamp}.txt`
    const combinedContent = allWallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
    const combinedBlob = new Blob([combinedContent], { type: 'text/plain' })
    const combinedUrl = URL.createObjectURL(combinedBlob)
    const combinedA = document.createElement('a')
    combinedA.href = combinedUrl
    combinedA.download = combinedFilename
    document.body.appendChild(combinedA)
    combinedA.click()
    document.body.removeChild(combinedA)
    URL.revokeObjectURL(combinedUrl)

    // Download combined matched wallets
    if (allMatchedWallets.length > 0) {
      const combinedMatchedFilename = `expected_result_all_threads_${timestamp}.txt`
      const combinedMatchedContent = allMatchedWallets.map(w => `${w.privateKey} - ${w.address}`).join('\n')
      const combinedMatchedBlob = new Blob([combinedMatchedContent], { type: 'text/plain' })
      const combinedMatchedUrl = URL.createObjectURL(combinedMatchedBlob)
      const combinedMatchedA = document.createElement('a')
      combinedMatchedA.href = combinedMatchedUrl
      combinedMatchedA.download = combinedMatchedFilename
      document.body.appendChild(combinedMatchedA)
      combinedMatchedA.click()
      document.body.removeChild(combinedMatchedA)
      URL.revokeObjectURL(combinedMatchedUrl)
    }
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Private Key</h1>
        
        {/* Method Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Chọn phương pháp tạo private key:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setMethod('shuffle')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                method === 'shuffle'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold mb-2">1. Xáo trộn Private Key</h3>
              <p className="text-sm text-gray-600">Generate từ private key có sẵn bằng cách xáo trộn</p>
            </button>
            
            <button
              onClick={() => setMethod('seed')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                method === 'seed'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold mb-2">2. Seed Phrase</h3>
              <p className="text-sm text-gray-600">Generate từ seed phrase 12 hoặc 24 từ</p>
            </button>
            
            <button
              onClick={() => setMethod('range')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                method === 'range'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold mb-2">3. Hex Range</h3>
              <p className="text-sm text-gray-600">Generate từ khoảng hex private key</p>
            </button>
          </div>
        </div>

        {/* Multi-Thread Configuration */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-800">⚡ Cấu hình Multi-Thread</h2>
            <button
              onClick={() => setShowThreadConfig(!showThreadConfig)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Settings size={16} />
              <span>{showThreadConfig ? 'Ẩn cấu hình' : 'Hiện cấu hình'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-4 mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useMultiThread}
                onChange={(e) => {
                  setUseMultiThread(e.target.checked)
                  if (e.target.checked) {
                    initializeThreads()
                  }
                }}
                className="rounded border-gray-300"
              />
              <span className="font-medium">Sử dụng Multi-Thread (Khuyến nghị cho số lượng lớn)</span>
            </label>
          </div>

          {showThreadConfig && useMultiThread && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số Thread:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={threadCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 5
                    setThreadCount(Math.min(Math.max(value, 1), 10))
                  }}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Mặc định: 5 threads</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Core/Thread:
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={coresPerThread}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 4
                    setCoresPerThread(Math.min(Math.max(value, 1), 8))
                  }}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Mặc định: 4 cores</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet/Thread:
                </label>
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  value={walletsPerThread}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 100000
                    setWalletsPerThread(Math.min(Math.max(value, 1000), 1000000))
                  }}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Mặc định: 100,000 wallets</p>
              </div>
            </div>
          )}

          {useMultiThread && (
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Tổng cộng sẽ sinh: <strong>{(threadCount * walletsPerThread).toLocaleString()}</strong> wallets 
                ({threadCount} threads × {walletsPerThread.toLocaleString()} wallets/thread)
              </p>
            </div>
          )}
        </div>

        {/* Method-specific inputs */}
        <div className="mb-6">
          {method === 'shuffle' && (
            <div className="space-y-4">
              {/* Private Key Input Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key để xáo trộn:
                </label>
                
                {/* Input Method Selection */}
                <div className="flex space-x-4 mb-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={useCustomInput}
                      onChange={() => setUseCustomInput(true)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Tự nhập</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={!useCustomInput}
                      onChange={() => setUseCustomInput(false)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Chọn từ danh sách có sẵn</span>
                  </label>
                </div>

                {/* Custom Input */}
                {useCustomInput && (
                  <input
                    type="text"
                    value={privateKeyInput}
                    onChange={(e) => {
                      let value = e.target.value
                      // Auto-add 0x prefix if not present
                      if (value && !value.startsWith('0x')) {
                        value = '0x' + value
                      }
                      setPrivateKeyInput(value)
                    }}
                    placeholder="0x..."
                    className="input-field"
                  />
                )}

                {/* Predefined Keys Selection */}
                {!useCustomInput && (
                  <div>
                    <button
                      onClick={() => setShowPredefinedKeys(!showPredefinedKeys)}
                      className="btn-secondary flex items-center space-x-2 mb-2"
                    >
                      {showPredefinedKeys ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span>
                        {selectedPredefinedKey 
                          ? `Đã chọn: ${selectedPredefinedKey.slice(0, 8)}...${selectedPredefinedKey.slice(-8)}`
                          : 'Chọn private key có sẵn'
                        }
                      </span>
                    </button>
                    
                    {showPredefinedKeys && (
                      <div className="border border-gray-200 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                        <div className="grid grid-cols-1 gap-2">
                          {PREDEFINED_PRIVATE_KEYS.map((key, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSelectedPredefinedKey(key)
                                setShowPredefinedKeys(false)
                              }}
                              className={`text-left p-2 rounded text-sm font-mono ${
                                selectedPredefinedKey === key
                                  ? 'bg-primary-100 border-primary-300 border'
                                  : 'bg-white hover:bg-gray-100 border border-gray-200'
                              }`}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-500 mt-1">
                  {useCustomInput 
                    ? 'Nhập private key để hệ thống xáo trộn và tạo private key mới'
                    : 'Chọn private key từ danh sách có sẵn để xáo trộn'
                  }
                </p>
              </div>
            </div>
          )}

          {method === 'seed' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seed Phrase (để trống để tạo tự động):
                </label>
                <textarea
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  placeholder="12 hoặc 24 từ cách nhau bằng dấu cách"
                  rows={3}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số từ trong seed phrase:
                </label>
                <select
                  value={seedLength}
                  onChange={(e) => setSeedLength(Number(e.target.value))}
                  className="input-field w-auto"
                >
                  <option value={12}>12 từ</option>
                  <option value={24}>24 từ</option>
                </select>
              </div>
            </div>
          )}

          {method === 'range' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khoảng Private Key (Hex):
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Nhập giá trị hex từ 0-9 và a-f. Ví dụ: 0000...0000 đến ffff...ffff
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giá trị tối thiểu (Hex):
                  </label>
                  <input
                    type="text"
                    value={rangeMin}
                    onChange={(e) => {
                      let value = e.target.value.toLowerCase()
                      // Auto-add 0x prefix if not present
                      if (value && !value.startsWith('0x')) {
                        value = '0x' + value
                      }
                      setRangeMin(value)
                    }}
                    placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
                    className="input-field font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {rangeMin.length}/64 ký tự hex
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Giá trị tối đa (Hex):
                  </label>
                  <input
                    type="text"
                    value={rangeMax}
                    onChange={(e) => {
                      let value = e.target.value.toLowerCase()
                      // Auto-add 0x prefix if not present
                      if (value && !value.startsWith('0x')) {
                        value = '0x' + value
                      }
                      setRangeMax(value)
                    }}
                    placeholder="0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                    className="input-field font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {rangeMax.length}/64 ký tự hex
                  </p>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setRangeMin('0x0000000000000000000000000000000000000000000000000000000000000000')
                    setRangeMax('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
                  }}
                  className="btn-secondary text-sm"
                >
                  Đặt lại mặc định
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRangeMin('0x0000000000000000000000000000000000000000000000000000000000000001')
                    setRangeMax('0x0000000000000000000000000000000000000000000000000000000000000fff')
                  }}
                  className="btn-secondary text-sm"
                >
                  Khoảng nhỏ (test)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generation settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số lượng worker:
            </label>
            <input
              type="number"
              value={workerCount}
              onChange={(e) => setWorkerCount(Number(e.target.value))}
              min={1}
              max={10}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số lượng private key cần tạo:
            </label>
            <input
              type="number"
              value={walletCount}
              onChange={(e) => handleWalletCountChange(Number(e.target.value))}
              min={1}
              className="input-field"
            />
            {error && (
              <p className="text-sm text-red-600 mt-1">
                <AlertTriangle className="inline-block mr-1" size={14} /> {error}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Ước tính tổng số wallet có thể tạo: {getEstimatedTotalWallets()}
            </p>
            <p className="text-sm text-gray-500">
              Số lượng hiện tại: {walletCount.toLocaleString()} wallet
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-4">
          {!useMultiThread ? (
            <>
              <button
                onClick={generateWallets}
                disabled={isGenerating}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Play size={16} />
                )}
                <span>{isGenerating ? 'Đang tạo...' : 'Bắt đầu'}</span>
              </button>
              {isGenerating && (
                <button
                  onClick={handleStop}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <span>Dừng</span>
                </button>
              )}
              {generatedWallets.length > 0 && (
                <button
                  onClick={handleDownload}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Tải xuống</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={startMultiThreadGeneration}
                disabled={isMultiThreadRunning}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isMultiThreadRunning ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Play size={16} />
                )}
                <span>{isMultiThreadRunning ? 'Đang chạy...' : 'Start All Threads'}</span>
              </button>
              {isMultiThreadRunning && (
                <button
                  onClick={stopMultiThreadGeneration}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Pause size={16} />
                  <span>Dừng tất cả</span>
                </button>
              )}
              {threads.some(t => t.isCompleted) && (
                <button
                  onClick={downloadAllThreadResults}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Download size={16} />
                  <span>Tải tất cả</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="text-red-600" size={20} />
              <span className="text-red-800 font-medium">Lỗi:</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}
      </div>

      {/* Progress bars */}
      {!useMultiThread && progress && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Tiến trình</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{progress.current} / {progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
          {progress.estimatedTime > 0 && !progress.isComplete && (
            <p className="text-sm text-gray-600">
              Thời gian ước tính: {formatTime(progress.estimatedTime)}
            </p>
          )}
          {progress.isComplete && (
            <div className="space-y-2">
              <p className="text-sm text-green-600 font-medium">
                Hoàn thành! Đã tạo {progress.total.toLocaleString()} private key.
              </p>
              {matchedWallets.length > 0 && (
                <p className="text-sm text-orange-600 font-medium">
                  🎯 Tìm thấy {matchedWallets.length.toLocaleString()} wallet trùng khớp với targets!
                </p>
              )}
              <p className="text-sm text-gray-600">
                Đã tải xuống: wallet_datetime.txt và {matchedWallets.length > 0 ? 'expected_result_datetime.txt' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Multi-Thread Progress Bars */}
      {useMultiThread && threads.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">Tiến trình Multi-Thread</h3>
          <div className="space-y-4">
            {threads.map((thread) => (
              <div key={thread.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">Thread {thread.id}</h4>
                    {thread.isRunning && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <Loader2 className="animate-spin" size={14} />
                        <span className="text-sm">Đang chạy...</span>
                      </div>
                    )}
                    {thread.isCompleted && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <span className="text-sm">✅ Hoàn thành</span>
                      </div>
                    )}
                    {thread.isPaused && (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <span className="text-sm">⏸️ Tạm dừng</span>
                      </div>
                    )}
                    {thread.error && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle size={14} />
                        <span className="text-sm">Lỗi</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {thread.currentCount.toLocaleString()} / {thread.totalCount.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium">
                      {Math.round(thread.progress)}%
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      thread.isCompleted ? 'bg-green-500' :
                      thread.isRunning ? 'bg-blue-500' :
                      thread.isPaused ? 'bg-orange-500' :
                      thread.error ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${thread.progress}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {thread.startTime && (
                      <>
                        Bắt đầu: {new Date(thread.startTime).toLocaleTimeString()}
                        {thread.endTime && (
                          <> | Kết thúc: {new Date(thread.endTime).toLocaleTimeString()}</>
                        )}
                      </>
                    )}
                  </span>
                  <span>
                    {thread.wallets.length > 0 && (
                      <>
                        {thread.wallets.length.toLocaleString()} wallets
                        {thread.matchedWallets.length > 0 && (
                          <> | {thread.matchedWallets.length.toLocaleString()} matches</>
                        )}
                      </>
                    )}
                  </span>
                </div>

                {/* Thread-specific actions */}
                {thread.isCompleted && thread.wallets.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => downloadThreadResult(thread.id)}
                      className="btn-secondary text-sm flex items-center space-x-1"
                    >
                      <Download size={14} />
                      <span>Tải Thread {thread.id}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Overall progress */}
          {isMultiThreadRunning && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Tiến trình tổng thể:</span>
                <span>
                  {threads.filter(t => t.isCompleted).length} / {threads.length} threads hoàn thành
                  {currentThreadIndex > 0 && (
                    <span className="ml-2 text-blue-600">
                      (Đang chạy Thread {currentThreadIndex + 1})
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(threads.filter(t => t.isCompleted).length / threads.length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {generatedWallets.length > 0 && (
        <div className="space-y-6">
          {/* All Generated Wallets */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Tất cả Wallet đã tạo ({generatedWallets.length.toLocaleString()})</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm font-mono space-y-1">
                {generatedWallets.slice(-100).map((wallet, index) => (
                  <div key={generatedWallets.length - 100 + index} className="flex justify-between">
                    <span className="text-gray-600">{wallet.privateKey}</span>
                    <span className="text-gray-800">{wallet.address}</span>
                  </div>
                ))}
                {generatedWallets.length > 100 && (
                  <p className="text-gray-500 text-center mt-2">
                    ... và {(generatedWallets.length - 100).toLocaleString()} private key khác (chỉ hiển thị 100 cuối cùng)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Matched Wallets */}
          {matchedWallets.length > 0 && (
            <div className="card border-orange-200 bg-orange-50">
              <h3 className="text-lg font-semibold mb-4 text-orange-800">
                🎯 Wallet trùng khớp với Targets ({matchedWallets.length.toLocaleString()})
              </h3>
              <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto border border-orange-200">
                <div className="text-sm font-mono space-y-1">
                  {matchedWallets.map((wallet, index) => (
                    <div key={index} className="flex justify-between p-2 bg-orange-100 rounded">
                      <span className="text-gray-700">{wallet.privateKey}</span>
                      <span className="text-orange-800 font-semibold">{wallet.address}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-orange-700 mt-2">
                ✅ Đã lưu vào file: expected_result_datetime.txt
              </p>
            </div>
          )}

          {/* Targets Info */}
          <div className="card bg-blue-50">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Thông tin Targets</h3>
            <div className="space-y-2">
              <p className="text-sm text-blue-700">
                📁 Đã tải {targets.length.toLocaleString()} targets từ file targets.txt
              </p>
              <p className="text-sm text-blue-700">
                🔍 So sánh với {generatedWallets.length.toLocaleString()} wallet đã tạo
              </p>
              <p className="text-sm text-blue-700">
                📊 Tỷ lệ trùng khớp: {generatedWallets.length > 0 ? ((matchedWallets.length / generatedWallets.length) * 100).toFixed(6) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GeneratePage 