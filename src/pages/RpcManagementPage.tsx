import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Globe, TestTube } from 'lucide-react'
import { RpcConfig } from '../types'
import { loadRpcConfigsFromStorage, saveRpcConfigsToStorage } from '../utils/storage'

const RpcManagementPage = () => {
  const [rpcConfigs, setRpcConfigs] = useState<RpcConfig[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingConfig, setEditingConfig] = useState<RpcConfig | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newConfig, setNewConfig] = useState<Partial<RpcConfig>>({
    chain: 'ETH',
    url: '',
    name: ''
  })

  const availableChains = [
    { value: 'ETH', label: 'Ethereum' },
    { value: 'BNB', label: 'BNB Smart Chain' },
    { value: 'POLYGON', label: 'Polygon' },
    { value: 'BASE', label: 'Base' },
    { value: 'OP', label: 'Optimism' },
    { value: 'ARB', label: 'Arbitrum' },
    { value: 'AVAX', label: 'Avalanche' },
    { value: 'FTM', label: 'Fantom' },
    { value: 'MATIC', label: 'Polygon' },
    { value: 'CUSTOM', label: 'Custom' }
  ]

  useEffect(() => {
    loadRpcConfigs()
  }, [])

  const loadRpcConfigs = () => {
    const configs = loadRpcConfigsFromStorage()
    setRpcConfigs(configs)
  }

  const handleAddRpc = () => {
    if (!newConfig.url?.trim()) {
      alert('Vui lòng nhập RPC URL')
      return
    }

    const config: RpcConfig = {
      id: Date.now().toString(),
      chain: newConfig.chain || 'ETH',
      url: newConfig.url.trim(),
      name: newConfig.name?.trim() || ''
    }

    const updatedConfigs = [...rpcConfigs, config]
    setRpcConfigs(updatedConfigs)
    saveRpcConfigsToStorage(updatedConfigs)
    
    setNewConfig({ chain: 'ETH', url: '', name: '' })
    setShowAddForm(false)
  }

  const handleEdit = (config: RpcConfig) => {
    setEditingId(config.id)
    setEditingConfig({ ...config })
  }

  const handleSaveEdit = () => {
    if (editingId && editingConfig) {
      const updatedConfigs = rpcConfigs.map(config =>
        config.id === editingId ? editingConfig : config
      )
      setRpcConfigs(updatedConfigs)
      saveRpcConfigsToStorage(updatedConfigs)
      setEditingId(null)
      setEditingConfig(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingConfig(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa RPC này?')) {
      const updatedConfigs = rpcConfigs.filter(config => config.id !== id)
      setRpcConfigs(updatedConfigs)
      saveRpcConfigsToStorage(updatedConfigs)
    }
  }

  const testRpcConnection = async (url: string) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.result) {
          alert('✅ Kết nối RPC thành công!')
        } else {
          alert('❌ RPC trả về lỗi')
        }
      } else {
        alert('❌ Không thể kết nối đến RPC')
      }
    } catch (error) {
      alert('❌ Lỗi kết nối: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const getChainIcon = (chain: string) => {
    const chainColors: { [key: string]: string } = {
      ETH: 'bg-blue-100 text-blue-600',
      BNB: 'bg-yellow-100 text-yellow-600',
      POLYGON: 'bg-purple-100 text-purple-600',
      BASE: 'bg-blue-100 text-blue-600',
      OP: 'bg-red-100 text-red-600',
      ARB: 'bg-blue-100 text-blue-600',
      AVAX: 'bg-red-100 text-red-600',
      FTM: 'bg-blue-100 text-blue-600',
      MATIC: 'bg-purple-100 text-purple-600',
      CUSTOM: 'bg-gray-100 text-gray-600'
    }
    return chainColors[chain] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">RPC Management</h1>
        
        {/* Add RPC Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Thêm RPC mới</span>
          </button>
        </div>

        {/* Add RPC Form */}
        {showAddForm && (
          <div className="card mb-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Thêm RPC mới</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chain:
                </label>
                <select
                  value={newConfig.chain}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, chain: e.target.value }))}
                  className="input-field"
                >
                  {availableChains.map(chain => (
                    <option key={chain.value} value={chain.value}>
                      {chain.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RPC URL:
                </label>
                <input
                  type="text"
                  value={newConfig.url}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên (tùy chọn):
                </label>
                <input
                  type="text"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Tên RPC"
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAddRpc}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Thêm</span>
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewConfig({ chain: 'ETH', url: '', name: '' })
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <X size={16} />
                <span>Hủy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RPC List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Danh sách RPC</h2>
        
        {rpcConfigs.length === 0 ? (
          <div className="text-center py-8">
            <Globe size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Chưa có RPC nào được thêm.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rpcConfigs.map((config) => (
              <div
                key={config.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                {editingId === config.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Chain:
                        </label>
                        <select
                          value={editingConfig?.chain}
                          onChange={(e) => setEditingConfig(prev => 
                            prev ? { ...prev, chain: e.target.value } : null
                          )}
                          className="input-field"
                        >
                          {availableChains.map(chain => (
                            <option key={chain.value} value={chain.value}>
                              {chain.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          RPC URL:
                        </label>
                        <input
                          type="text"
                          value={editingConfig?.url}
                          onChange={(e) => setEditingConfig(prev => 
                            prev ? { ...prev, url: e.target.value } : null
                          )}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tên:
                        </label>
                        <input
                          type="text"
                          value={editingConfig?.name}
                          onChange={(e) => setEditingConfig(prev => 
                            prev ? { ...prev, name: e.target.value } : null
                          )}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getChainIcon(config.chain)}`}>
                        {config.chain}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {config.name || 'Unnamed RPC'}
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          {config.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testRpcConnection(config.url)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Test connection"
                      >
                        <TestTube size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RpcManagementPage 