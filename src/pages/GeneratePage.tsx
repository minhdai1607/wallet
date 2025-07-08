import { useState, useCallback } from 'react'
import { Play, Download, Loader2 } from 'lucide-react'
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

const GeneratePage = () => {
  const [method, setMethod] = useState<GenerationMethod>('shuffle')
  const [workerCount, setWorkerCount] = useState(2)
  const [walletCount, setWalletCount] = useState(10000)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [generatedWallets, setGeneratedWallets] = useState<Wallet[]>([])
  const [matchedWallets, setMatchedWallets] = useState<Wallet[]>([])
  const [targets, setTargets] = useState<string[]>([])

  // Method-specific states
  const [privateKeyInput, setPrivateKeyInput] = useState('')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [seedLength, setSeedLength] = useState(12)
  const [rangeMin, setRangeMin] = useState(0)
  const [rangeMax, setRangeMax] = useState(100000)

  const generateWallets = useCallback(async () => {
    setIsGenerating(true)
    setProgress({ current: 0, total: walletCount, estimatedTime: 0, isComplete: false })
    setGeneratedWallets([])
    setMatchedWallets([])

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
        let wallet: Wallet

        switch (method) {
          case 'shuffle':
            if (!privateKeyInput.trim()) {
              throw new Error('Vui lòng nhập private key để xáo trộn')
            }
            const shuffledKey = shufflePrivateKey(privateKeyInput.trim())
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
      alert(`Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }, [method, workerCount, walletCount, privateKeyInput, seedPhrase, rangeMin, rangeMax])

  const handleDownload = () => {
    if (generatedWallets.length > 0) {
      saveWalletsToFile(generatedWallets)
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
              <h3 className="font-semibold mb-2">3. Random Range</h3>
              <p className="text-sm text-gray-600">Generate từ khoảng số ngẫu nhiên</p>
            </button>
          </div>
        </div>

        {/* Method-specific inputs */}
        <div className="mb-6">
          {method === 'shuffle' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Private Key để xáo trộn:
              </label>
              <input
                type="text"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="0x..."
                className="input-field"
              />
              <p className="text-sm text-gray-500 mt-1">
                Nhập private key để hệ thống xáo trộn và tạo private key mới
              </p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giá trị tối thiểu:
                </label>
                <input
                  type="number"
                  value={rangeMin}
                  onChange={(e) => setRangeMin(Number(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giá trị tối đa:
                </label>
                <input
                  type="number"
                  value={rangeMax}
                  onChange={(e) => setRangeMax(Number(e.target.value))}
                  className="input-field"
                />
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
              onChange={(e) => setWalletCount(Number(e.target.value))}
              min={1}
              className="input-field"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-4">
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
          
          {generatedWallets.length > 0 && (
            <button
              onClick={handleDownload}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Tải xuống</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress && (
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
                Hoàn thành! Đã tạo {progress.total} private key.
              </p>
              {matchedWallets.length > 0 && (
                <p className="text-sm text-orange-600 font-medium">
                  🎯 Tìm thấy {matchedWallets.length} wallet trùng khớp với targets!
                </p>
              )}
              <p className="text-sm text-gray-600">
                Đã tải xuống: wallet_datetime.txt và {matchedWallets.length > 0 ? 'expected_result_datetime.txt' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {generatedWallets.length > 0 && (
        <div className="space-y-6">
          {/* All Generated Wallets */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Tất cả Wallet đã tạo ({generatedWallets.length})</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm font-mono space-y-1">
                {generatedWallets.slice(0, 10).map((wallet, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{wallet.privateKey}</span>
                    <span className="text-gray-800">{wallet.address}</span>
                  </div>
                ))}
                {generatedWallets.length > 10 && (
                  <p className="text-gray-500 text-center mt-2">
                    ... và {generatedWallets.length - 10} private key khác
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Matched Wallets */}
          {matchedWallets.length > 0 && (
            <div className="card border-orange-200 bg-orange-50">
              <h3 className="text-lg font-semibold mb-4 text-orange-800">
                🎯 Wallet trùng khớp với Targets ({matchedWallets.length})
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
                📁 Đã tải {targets.length} targets từ file targets.txt
              </p>
              <p className="text-sm text-blue-700">
                🔍 So sánh với {generatedWallets.length} wallet đã tạo
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