import { useState, useEffect } from 'react'
import { Upload, Download, Trash2, X, FileText, Eye, Calendar, FileDown } from 'lucide-react'
import { Wallet } from '../types/index'
import { loadWalletsFromStorage } from '../utils/storage'
import { loadWalletsFromFile, saveWalletsToFile } from '../utils/walletUtils'

interface WalletFile {
  id: string
  name: string
  wallets: Wallet[]
  createdAt: string
  type: 'generated' | 'uploaded' | 'matched'
}

const ManagementPage = () => {
  const [walletFiles, setWalletFiles] = useState<WalletFile[]>([])
  const [selectedFile, setSelectedFile] = useState<WalletFile | null>(null)
  const [showFileViewer, setShowFileViewer] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'generated' | 'uploaded' | 'matched'>('all')

  useEffect(() => {
    loadWalletFiles()
  }, [])

  const loadWalletFiles = () => {
    // Load from localStorage - simulate file management
    const storedWallets = loadWalletsFromStorage()
    if (storedWallets.length > 0) {
      const files: WalletFile[] = [
        {
          id: '1',
          name: 'wallet_generated.txt',
          wallets: storedWallets,
          createdAt: new Date().toISOString(),
          type: 'generated'
        }
      ]
      setWalletFiles(files)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      loadWalletsFromFile(file)
        .then((loadedWallets) => {
          const newFile: WalletFile = {
            id: Date.now().toString(),
            name: file.name,
            wallets: loadedWallets,
            createdAt: new Date().toISOString(),
            type: 'uploaded'
          }
          setWalletFiles(prev => [...prev, newFile])
          alert(`Đã tải ${loadedWallets.length} wallet từ file ${file.name}`)
        })
        .catch((error) => {
          alert(`Lỗi khi tải file: ${error.message}`)
        })
    }
  }

  const handleDownload = (file: WalletFile) => {
    saveWalletsToFile(file.wallets, file.name)
  }

  const handleViewFile = (file: WalletFile) => {
    setSelectedFile(file)
    setShowFileViewer(true)
  }

  const handleDeleteFile = (fileId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa file này?')) {
      setWalletFiles(prev => prev.filter(file => file.id !== fileId))
      if (selectedFile?.id === fileId) {
        setSelectedFile(null)
        setShowFileViewer(false)
      }
    }
  }

  const filteredFiles = walletFiles.filter(file => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    switch (filterBy) {
      case 'generated':
        return file.type === 'generated' && file.name.toLowerCase().includes(searchLower)
      case 'uploaded':
        return file.type === 'uploaded' && file.name.toLowerCase().includes(searchLower)
      case 'matched':
        return file.type === 'matched' && file.name.toLowerCase().includes(searchLower)
      default:
        return file.name.toLowerCase().includes(searchLower)
    }
  })

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'generated': return 'bg-blue-100 text-blue-800'
      case 'uploaded': return 'bg-green-100 text-green-800'
      case 'matched': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'generated': return '🔧'
      case 'uploaded': return '📁'
      case 'matched': return '🎯'
      default: return '📄'
    }
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet Management</h1>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <label className="btn-secondary flex items-center space-x-2 cursor-pointer">
            <Upload size={16} />
            <span>Tải file</span>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên file..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lọc theo loại:
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="input-field"
            >
              <option value="all">Tất cả</option>
              <option value="generated">Generated</option>
              <option value="uploaded">Uploaded</option>
              <option value="matched">Matched</option>
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-gray-600">
              Hiển thị {filteredFiles.length} / {walletFiles.length} file
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Danh sách File Wallet</h2>
        
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">
              {walletFiles.length === 0 
                ? 'Chưa có file wallet nào. Hãy tạo hoặc tải file wallet.'
                : 'Không tìm thấy file nào phù hợp với điều kiện tìm kiếm.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFiles.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getFileTypeIcon(file.type)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(file.type)}`}>
                        {file.type.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{file.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <FileText size={14} />
                          <span>{file.wallets.length} wallets</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar size={14} />
                          <span>{formatDate(file.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="btn-secondary flex items-center space-x-2 text-sm"
                    >
                      <Eye size={14} />
                      <span>Xem</span>
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="btn-primary flex items-center space-x-2 text-sm"
                    >
                      <FileDown size={14} />
                      <span>Tải</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {showFileViewer && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
              <button
                onClick={() => setShowFileViewer(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedFile.wallets.length} wallets - {formatDate(selectedFile.createdAt)}
                </p>
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="btn-primary flex items-center space-x-2 text-sm"
                >
                  <Download size={14} />
                  <span>Tải xuống</span>
                </button>
              </div>
              <div className="space-y-2">
                {selectedFile.wallets.slice(0, 50).map((wallet, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm font-mono">
                    <span className="text-gray-600">{wallet.privateKey}</span>
                    <span className="text-gray-800">{wallet.address}</span>
                  </div>
                ))}
                {selectedFile.wallets.length > 50 && (
                  <p className="text-center text-gray-500 text-sm py-2">
                    ... và {selectedFile.wallets.length - 50} wallet khác
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagementPage 