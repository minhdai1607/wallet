import { useState, useEffect } from 'react'
import { Upload, Search, Download, Loader2, Wallet, Edit, Plus, X, Save } from 'lucide-react'
import { Wallet as WalletType, RpcConfig } from '../types/index'
import { loadWalletsFromFile, checkWalletBalance, formatBalance, getChainSymbol } from '../utils/walletUtils'
import { loadRpcConfigsFromStorage, saveRpcConfigsToStorage } from '../utils/storage'

interface BalanceResult {
  wallet: WalletType
  balances: { [chain: string]: { balance: string; symbol: string; usdValue?: number } }
  hasBalance: boolean
}

const CheckBalancePage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [wallets, setWallets] = useState<WalletType[]>([])
  const [rpcConfigs, setRpcConfigs] = useState<RpcConfig[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<BalanceResult[]>([])
  const [selectedChains, setSelectedChains] = useState<string[]>([])
  const [workerCount, setWorkerCount] = useState(4)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  
  // RPC Management states
  const [showRpcManager, setShowRpcManager] = useState(false)
  const [editingRpc, setEditingRpc] = useState<RpcConfig | null>(null)
  const [newRpc, setNewRpc] = useState<Partial<RpcConfig>>({})

  // Default RPC configurations with premium endpoints
  const defaultRpcs: RpcConfig[] = [
    { id: 'eth-1', chain: 'ETH', url: 'https://mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24', name: 'Ethereum (Infura)' },
    { id: 'bnb-1', chain: 'BNB', url: 'https://bsc-dataseed1.binance.org', name: 'BNB Smart Chain' },
    { id: 'polygon-1', chain: 'POLYGON', url: 'https://polygon-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24', name: 'Polygon (Infura)' },
    { id: 'base-1', chain: 'BASE', url: 'https://base-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24', name: 'Base (Infura)' },
    { id: 'op-1', chain: 'OP', url: 'https://optimism-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24', name: 'Optimism (Infura)' },
    { id: 'arb-1', chain: 'ARB', url: 'https://arbitrum-mainnet.infura.io/v3/d9f58b9dee474f0281bc9c87161aee24', name: 'Arbitrum (Infura)' },
    { id: 'avax-1', chain: 'AVAX', url: 'https://api.avax.network/ext/bc/C/rpc', name: 'Avalanche' },
    { id: 'ftm-1', chain: 'FTM', url: 'https://rpc.fantom.network', name: 'Fantom' }
  ]

  useEffect(() => {
    // Load RPC configs from storage or use defaults
    const storedConfigs = loadRpcConfigsFromStorage()
    if (storedConfigs.length > 0) {
      setRpcConfigs(storedConfigs)
      setSelectedChains(storedConfigs.map(config => config.chain))
    } else {
      setRpcConfigs(defaultRpcs)
      setSelectedChains(defaultRpcs.map(config => config.chain))
    }

    // Check if there's a file selected from Management page
    const selectedFileData = localStorage.getItem('selectedFileForCheck')
    if (selectedFileData) {
      try {
        const fileData = JSON.parse(selectedFileData)
        setWallets(fileData.wallets)
        setSelectedFile(new File([], fileData.name)) // Create a dummy file object
        setResults([])
        // Clear the localStorage after loading
        localStorage.removeItem('selectedFileForCheck')
      } catch (error) {
        console.error('Error loading selected file:', error)
      }
    }
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      try {
        const loadedWallets = await loadWalletsFromFile(file)
        setWallets(loadedWallets)
        setResults([])
      } catch (error) {
        alert(`Lỗi khi tải file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }



  const checkBalance = async (wallet: WalletType, rpcUrl: string, chain: string): Promise<{ balance: string; symbol: string }> => {
    return await checkWalletBalance(wallet.address, rpcUrl, chain)
  }

  const startBalanceCheck = async () => {
    if (wallets.length === 0) {
      alert('Vui lòng tải file wallet trước')
      return
    }

    if (selectedChains.length === 0) {
      alert('Vui lòng chọn ít nhất một blockchain để check')
      return
    }

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)

    setIsChecking(true)
    setProgress({ current: 0, total: wallets.length * selectedChains.length })
    setResults([])

    const newResults: BalanceResult[] = []
    const batchSize = Math.ceil((wallets.length * selectedChains.length) / workerCount)

    try {
      for (let i = 0; i < wallets.length; i++) {
        // Check if operation was cancelled
        if (controller.signal.aborted) {
          console.log('Balance check cancelled by user')
          break
        }

        const wallet = wallets[i]
        const balances: { [chain: string]: { balance: string; symbol: string } } = {}
        let hasBalance = false

        for (const chain of selectedChains) {
          // Check if operation was cancelled
          if (controller.signal.aborted) {
            break
          }

          const rpcConfig = rpcConfigs.find(config => config.chain === chain)
          if (rpcConfig) {
            try {
              const balanceResult = await checkBalance(wallet, rpcConfig.url, chain)
              balances[chain] = balanceResult
              
              if (BigInt(balanceResult.balance) > 0) {
                hasBalance = true
              }
            } catch (error) {
              console.warn(`Failed to check balance for ${chain}:`, error)
              balances[chain] = { balance: '0', symbol: getChainSymbol(chain) }
            }

            // Update progress
            const current = i * selectedChains.length + selectedChains.indexOf(chain) + 1
            setProgress({ current, total: wallets.length * selectedChains.length })

            // Simulate worker delay
            if (current % batchSize === 0) {
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          }
        }

        newResults.push({ wallet, balances, hasBalance })
        setResults([...newResults])
      }

    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Balance check error:', error)
        alert(`Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setIsChecking(false)
      setAbortController(null)
    }
  }

  const stopBalanceCheck = () => {
    if (abortController) {
      abortController.abort()
      setIsChecking(false)
      setAbortController(null)
    }
  }

  const handleChainToggle = (chain: string) => {
    setSelectedChains(prev => 
      prev.includes(chain) 
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    )
  }

  const exportResults = () => {
    const content = results
      .filter(result => result.hasBalance)
      .map(result => {
        const balanceLines = Object.entries(result.balances)
          .filter(([_, balance]) => BigInt(balance.balance) > 0)
          .map(([chain, balance]) => `${chain}: ${formatBalance(balance.balance)} ${balance.symbol}`)
          .join(', ')
        
        return `${result.wallet.privateKey} - ${result.wallet.address} - ${balanceLines}`
      })
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `balance_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const walletsWithBalance = results.filter(result => result.hasBalance)

  // RPC Management functions
  const handleSaveRpcConfigs = () => {
    saveRpcConfigsToStorage(rpcConfigs)
    setShowRpcManager(false)
    setEditingRpc(null)
    setNewRpc({})
  }

  const handleAddRpc = () => {
    if (newRpc.chain && newRpc.url && newRpc.name) {
      const rpcConfig: RpcConfig = {
        id: `custom-${Date.now()}`,
        chain: newRpc.chain.toUpperCase(),
        url: newRpc.url,
        name: newRpc.name
      }
      setRpcConfigs(prev => [...prev, rpcConfig])
      setNewRpc({})
    }
  }

  const handleEditRpc = (rpc: RpcConfig) => {
    setEditingRpc(rpc)
  }

  const handleSaveEditRpc = () => {
    if (editingRpc) {
      setRpcConfigs(prev => 
        prev.map(rpc => 
          rpc.id === editingRpc.id ? editingRpc : rpc
        )
      )
      setEditingRpc(null)
    }
  }

  const handleDeleteRpc = (id: string) => {
    setRpcConfigs(prev => prev.filter(rpc => rpc.id !== id))
    setSelectedChains(prev => prev.filter(chain => 
      rpcConfigs.find(rpc => rpc.id === id)?.chain !== chain
    ))
  }

  const handleResetToDefaults = () => {
    setRpcConfigs(defaultRpcs)
    setSelectedChains(defaultRpcs.map(config => config.chain))
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Check Balance</h1>
        
        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn file wallet để check balance:
          </label>
          <label className="btn-secondary flex items-center space-x-2 cursor-pointer w-fit">
            <Upload size={16} />
            <span>{selectedFile ? selectedFile.name : 'Tải file wallet'}</span>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          {wallets.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✅ Đã tải {wallets.length} wallet từ file
            </p>
          )}
        </div>

        {/* Blockchain Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Chọn blockchain để check:</h3>
            <button
              onClick={() => setShowRpcManager(!showRpcManager)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Edit size={16} />
              <span>Quản lý RPC</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rpcConfigs.map((config) => (
              <label key={config.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChains.includes(config.chain)}
                  onChange={() => handleChainToggle(config.chain)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">{config.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* RPC Manager Modal */}
        {showRpcManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Quản lý RPC Endpoints</h3>
                <button
                  onClick={() => setShowRpcManager(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Add New RPC */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h4 className="font-semibold mb-3">Thêm RPC mới:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Tên blockchain (VD: ETH)"
                    value={newRpc.chain || ''}
                    onChange={(e) => setNewRpc(prev => ({ ...prev, chain: e.target.value }))}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="Tên hiển thị (VD: Ethereum)"
                    value={newRpc.name || ''}
                    onChange={(e) => setNewRpc(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="RPC URL"
                    value={newRpc.url || ''}
                    onChange={(e) => setNewRpc(prev => ({ ...prev, url: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <button
                  onClick={handleAddRpc}
                  disabled={!newRpc.chain || !newRpc.url || !newRpc.name}
                  className="btn-primary mt-3 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Plus size={16} />
                  <span>Thêm RPC</span>
                </button>
              </div>

              {/* RPC List */}
              <div className="space-y-3">
                <h4 className="font-semibold">Danh sách RPC hiện tại:</h4>
                {rpcConfigs.map((rpc) => (
                  <div key={rpc.id} className="border border-gray-200 rounded-lg p-3">
                    {editingRpc?.id === rpc.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={editingRpc.chain}
                          onChange={(e) => setEditingRpc(prev => prev ? { ...prev, chain: e.target.value.toUpperCase() } : null)}
                          className="input-field"
                        />
                        <input
                          type="text"
                          value={editingRpc.name}
                          onChange={(e) => setEditingRpc(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="input-field"
                        />
                        <input
                          type="text"
                          value={editingRpc.url}
                          onChange={(e) => setEditingRpc(prev => prev ? { ...prev, url: e.target.value } : null)}
                          className="input-field"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <span className="font-medium">{rpc.chain}</span>
                        <span className="text-gray-600">{rpc.name}</span>
                        <span className="text-gray-500 text-sm truncate">{rpc.url}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditRpc(rpc)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRpc(rpc.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                    {editingRpc?.id === rpc.id && (
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={handleSaveEditRpc}
                          className="btn-primary flex items-center space-x-2"
                        >
                          <Save size={16} />
                          <span>Lưu</span>
                        </button>
                        <button
                          onClick={() => setEditingRpc(null)}
                          className="btn-secondary"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={handleResetToDefaults}
                  className="btn-secondary"
                >
                  Khôi phục mặc định
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowRpcManager(false)}
                    className="btn-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveRpcConfigs}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Save size={16} />
                    <span>Lưu cấu hình</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Worker Count */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Số lượng worker:
          </label>
          <input
            type="number"
            value={workerCount}
            onChange={(e) => setWorkerCount(Number(e.target.value))}
            min={1}
            max={10}
            className="input-field w-32"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          {!isChecking ? (
            <button
              onClick={startBalanceCheck}
              disabled={wallets.length === 0 || selectedChains.length === 0}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Search size={16} />
              <span>Bắt đầu check balance</span>
            </button>
          ) : (
            <button
              onClick={stopBalanceCheck}
              className="btn-secondary flex items-center space-x-2"
            >
              <Loader2 className="animate-spin" size={16} />
              <span>Dừng check balance</span>
            </button>
          )}
          
          {walletsWithBalance.length > 0 && (
            <button
              onClick={exportResults}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Export kết quả ({walletsWithBalance.length})</span>
            </button>
          )}
        </div>

        {/* Progress */}
        {isChecking && (
          <div className="mb-6">
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
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="card bg-blue-50">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Tóm tắt</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700">📊 Tổng số wallet: {results.length}</p>
              </div>
              <div>
                <p className="text-green-700">💰 Wallet có balance: {walletsWithBalance.length}</p>
              </div>
              <div>
                <p className="text-blue-700">🔗 Blockchain đã check: {selectedChains.join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Wallets with Balance */}
          {walletsWithBalance.length > 0 && (
            <div className="card border-green-200 bg-green-50">
              <h3 className="text-lg font-semibold mb-4 text-green-800">
                💰 Wallet có Balance ({walletsWithBalance.length})
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {walletsWithBalance.map((result, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <Wallet size={16} className="text-green-600" />
                        <span className="font-mono text-sm text-gray-700">
                          {result.wallet.address}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(result.balances)
                        .filter(([_, balance]) => BigInt(balance.balance) > 0)
                        .map(([chain, balance]) => (
                          <div key={chain} className="flex justify-between text-sm">
                            <span className="text-gray-600">{chain}:</span>
                            <span className="font-semibold text-green-700">
                              {formatBalance(balance.balance)} {balance.symbol}
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 font-mono">
                        PK: {result.wallet.privateKey}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Results Table */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Tất cả kết quả</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Address</th>
                    {selectedChains.map(chain => (
                      <th key={chain} className="text-left py-2 px-2">{chain}</th>
                    ))}
                    <th className="text-left py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 px-2 text-gray-600">{index + 1}</td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {result.wallet.address.slice(0, 8)}...{result.wallet.address.slice(-6)}
                      </td>
                      {selectedChains.map(chain => {
                        const balance = result.balances[chain]
                        const hasBalance = balance && BigInt(balance.balance) > 0
                        return (
                          <td key={chain} className="py-2 px-2">
                            {balance ? (
                              <span className={hasBalance ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                                {formatBalance(balance.balance)} {balance.symbol}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="py-2 px-2">
                        {result.hasBalance ? (
                          <span className="text-green-600 font-semibold">💰 Có balance</span>
                        ) : (
                          <span className="text-gray-500">❌ Không có</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckBalancePage 