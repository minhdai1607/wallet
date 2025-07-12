import { useState } from 'react'
import { Upload, Search, Download, Copy, AlertTriangle, CheckCircle, X, RefreshCw, Settings } from 'lucide-react'
import { Wallet } from '../types/index'
import { loadWalletsFromFile, getWalletNonce } from '../utils/walletUtils'

const AVAILABLE_CHAINS = [
  { id: 'ETH', name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  { id: 'BNB', name: 'BNB Smart Chain', rpc: 'https://bsc-dataseed1.binance.org' },
  { id: 'POLYGON', name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  { id: 'BASE', name: 'Base', rpc: 'https://mainnet.base.org' },
  { id: 'OP', name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
  { id: 'ARB', name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
  { id: 'AVAX', name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc' },
  { id: 'FTM', name: 'Fantom', rpc: 'https://rpc.fantom.network' }
]

interface FileWallets {
  file: File
  wallets: Wallet[]
  name: string
}

interface WalletWithNonce extends Wallet {
  nonce: number
  fileName: string
}

const CheckUsagePage = () => {
  const [files, setFiles] = useState<FileWallets[]>([])
  const [selectedChain, setSelectedChain] = useState('ETH')
  const [customRpcUrl, setCustomRpcUrl] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<WalletWithNonce[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [workerCount, setWorkerCount] = useState(20)
  const [batchSize, setBatchSize] = useState(100)

  // Handle multiple file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileIndex: number) => {
    const file = event.target.files?.[0]
    if (file) {
      setError('')
      try {
        const loadedWallets = await loadWalletsFromFile(file)
        const newFileWallets: FileWallets = {
          file,
          wallets: loadedWallets,
          name: file.name
        }
        const updatedFiles = [...files]
        updatedFiles[fileIndex] = newFileWallets
        setFiles(updatedFiles)
        setResults([])
      } catch (error) {
        setError(`Lỗi khi tải file ${fileIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const removeFile = (fileIndex: number) => {
    setFiles(files.filter((_, idx) => idx !== fileIndex))
    setResults([])
    setError('')
  }

  // Optimized nonce checking with multiple workers and larger batches
  const startChecking = async () => {
    const allWallets: WalletWithNonce[] = []
    files.forEach(f => {
      f.wallets.forEach(w => allWallets.push({ ...w, nonce: 0, fileName: f.name }))
    })
    if (allWallets.length === 0) {
      setError('Vui lòng tải ít nhất 1 file wallet')
      return
    }
    setError('')
    setIsChecking(true)
    setProgress({ current: 0, total: allWallets.length })
    setResults([])
    
    const chain = AVAILABLE_CHAINS.find(c => c.id === selectedChain)
    const rpcUrl = customRpcUrl || chain?.rpc || AVAILABLE_CHAINS[0].rpc

    try {
      // Split wallets into worker batches
      const walletsPerWorker = Math.ceil(allWallets.length / workerCount)
      const workerBatches: WalletWithNonce[][] = []
      
      for (let i = 0; i < workerCount; i++) {
        const start = i * walletsPerWorker
        const end = Math.min(start + walletsPerWorker, allWallets.length)
        if (start < allWallets.length) {
          workerBatches.push(allWallets.slice(start, end))
        }
      }

      // Process each worker batch in parallel
      const workerPromises = workerBatches.map(async (workerBatch) => {
        const results: WalletWithNonce[] = []
        
        // Process worker batch in smaller batches for progress updates
      for (let i = 0; i < workerBatch.length; i += batchSize) {
        const batch = workerBatch.slice(i, i + batchSize)
        const batchPromises = batch.map(async (wallet) => {
          try {
            const nonce = await getWalletNonce(wallet.address, rpcUrl, selectedChain)
            return { ...wallet, nonce }
          } catch {
            return { ...wallet, nonce: 0 }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
        
        // Update progress
        setProgress(prev => ({
          current: Math.min(prev.current + batch.length, allWallets.length),
          total: allWallets.length
        }))
      }
        
        return results
      })

      // Wait for all workers to complete
      const allResults = await Promise.all(workerPromises)
      const checked = allResults.flat()
      
      // Only keep wallets with nonce > 0
      const usedWallets = checked.filter(w => w.nonce > 0)
      setResults(usedWallets)
      
    } catch (error) {
      setError(`Lỗi khi kiểm tra: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsChecking(false)
    }
  }

  const downloadResults = () => {
    if (results.length === 0) return
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `wallet_nonce_gt0_${selectedChain}_${timestamp}.txt`
    const content = results.map(w => `${w.privateKey},${w.address},${w.nonce},${w.fileName}`).join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyResults = () => {
    if (results.length === 0) return
    const content = results.map(w => `${w.privateKey},${w.address},${w.nonce},${w.fileName}`).join('\n')
    navigator.clipboard.writeText(content)
  }

  const totalWallets = files.reduce((sum, f) => sum + f.wallets.length, 0)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Check Wallet Nonce (Đã sử dụng) - TỐI ƯU TỐC ĐỘ</h1>
        <p className="text-gray-600 mb-6">
          Tải lên 1-3 file wallet để kiểm tra các ví đã từng sử dụng (nonce {'>'} 0) trên blockchain. 
          Tối ưu tốc độ với {workerCount} workers, batch size {batchSize}.
        </p>

        {/* File Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {Array.from({ length: Math.max(1, files.length || 1, 3) }).map((_, index) => (
            <div key={index} className="space-y-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-700">File {index + 1}</h3>
              {files[index] ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {files[index].file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle size={16} />
                    <span>{files[index].wallets.length.toLocaleString()} wallet</span>
                  </div>
                </div>
              ) : (
                <label className="btn-secondary flex items-center space-x-2 cursor-pointer w-fit">
                  <Upload size={16} />
                  <span>Tải file {index + 1}</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => handleFileUpload(e, index)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        {/* Chain Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn Blockchain:
            </label>
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="input-field"
            >
              {AVAILABLE_CHAINS.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name} ({chain.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RPC URL (tùy chọn):
            </label>
            <input
              type="text"
              value={customRpcUrl}
              onChange={(e) => setCustomRpcUrl(e.target.value)}
              placeholder="Để trống để sử dụng RPC mặc định"
              className="input-field"
            />
          </div>
        </div>

        {/* Performance Settings */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Settings size={16} />
            <span>Cài đặt hiệu năng</span>
          </button>
          
          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số Worker (càng nhiều càng nhanh):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={workerCount}
                    onChange={(e) => setWorkerCount(Math.min(Math.max(parseInt(e.target.value) || 20, 1), 50))}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mặc định: 20 workers</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size (càng lớn càng nhanh):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.min(Math.max(parseInt(e.target.value) || 100, 10), 500))}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mặc định: 100 wallets/batch</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Tổng cộng: {totalWallets.toLocaleString()} wallets | 
                  Ước tính thời gian: {totalWallets > 0 ? Math.ceil(totalWallets / (workerCount * batchSize) * 0.5) : 0} giây
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={startChecking}
            disabled={isChecking || files.length === 0 || files.every(f => f.wallets.length === 0)}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {isChecking ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Search size={16} />
            )}
            <span>{isChecking ? 'Đang kiểm tra...' : 'Bắt đầu kiểm tra'}</span>
          </button>
          {files.length > 0 && (
            <button
              onClick={() => {
                setFiles([])
                setResults([])
                setError('')
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <X size={16} />
              <span>Xóa tất cả</span>
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="text-red-600" size={20} />
              <span className="text-red-800 font-medium">Lỗi:</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Progress */}
        {isChecking && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span>Đang kiểm tra wallet...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Đang kiểm tra trên {AVAILABLE_CHAINS.find(c => c.id === selectedChain)?.name} | 
              {workerCount} workers | {batchSize} wallets/batch
            </p>
          </div>
        )}
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="card border-green-200 bg-green-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-800">Wallet có nonce {'>'} 0 ({results.length.toLocaleString()})</h3>
            <div className="flex space-x-2">
              <button onClick={downloadResults} className="btn-secondary flex items-center space-x-2">
                <Download size={16} />
                <span>Tải kết quả</span>
              </button>
              <button onClick={copyResults} className="btn-secondary flex items-center space-x-2">
                <Copy size={16} />
                <span>Copy</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-green-200">
                  <th className="text-left py-2 px-2 text-green-800">#</th>
                  <th className="text-left py-2 px-2 text-green-800">Private Key</th>
                  <th className="text-left py-2 px-2 text-green-800">Wallet Address</th>
                  <th className="text-left py-2 px-2 text-green-800">Nonce</th>
                  <th className="text-left py-2 px-2 text-green-800">File</th>
                </tr>
              </thead>
              <tbody>
                {results.map((wallet, index) => (
                  <tr key={index} className="border-b border-green-100 bg-white hover:bg-green-50">
                    <td className="py-2 px-2 text-green-700 font-semibold">{index + 1}</td>
                    <td className="py-2 px-2 font-mono text-xs text-gray-600">{wallet.privateKey}</td>
                    <td className="py-2 px-2 font-mono text-xs text-green-800">{wallet.address}</td>
                    <td className="py-2 px-2 text-green-700 font-semibold">{wallet.nonce}</td>
                    <td className="py-2 px-2 text-green-700">{wallet.fileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckUsagePage 