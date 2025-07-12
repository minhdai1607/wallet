import { useState, useEffect } from 'react'
import { Upload, Search, AlertTriangle, CheckCircle, X, Plus, Minus } from 'lucide-react'
import { Wallet } from '../types/index'
import { loadWalletsFromFile } from '../utils/walletUtils'

interface FileData {
  file: File
  wallets: Wallet[]
  name: string
}

interface CompareResult {
  wallet: Wallet
  foundInFiles: string[]
}

const ComparePage = () => {
  const [files, setFiles] = useState<FileData[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [results, setResults] = useState<CompareResult[]>([])
  const [error, setError] = useState<string>('')
  const [maxFiles] = useState(20)

  // Initialize with 2 empty file slots
  useEffect(() => {
    setFiles([
      { file: null as any, wallets: [], name: 'File 1' },
      { file: null as any, wallets: [], name: 'File 2' }
    ])
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileIndex: number) => {
    const file = event.target.files?.[0]
    if (file) {
      setError('')
      try {
        const loadedWallets = await loadWalletsFromFile(file)
        const newFileData: FileData = {
          file,
          wallets: loadedWallets,
          name: `File ${fileIndex + 1}`
        }
        
        const updatedFiles = [...files]
        updatedFiles[fileIndex] = newFileData
        setFiles(updatedFiles)
      } catch (error) {
        setError(`Lỗi khi tải file ${fileIndex + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const removeFile = (fileIndex: number) => {
    const updatedFiles = [...files]
    updatedFiles[fileIndex] = { file: null as any, wallets: [], name: `File ${fileIndex + 1}` }
    setFiles(updatedFiles)
    setError('')
  }

  const compareFiles = () => {
    console.log('Starting comparison...')
    console.log('All files:', files)
    
    const validFiles = files.filter(f => f.file && f.wallets.length > 0)
    console.log('Valid files:', validFiles)
    
    if (validFiles.length < 2) {
      setError('Vui lòng tải ít nhất 2 files có dữ liệu hợp lệ để so sánh')
      return
    }

    setIsComparing(true)
    setError('')

    try {
      // Create maps of addresses from all files for faster lookup
      const addressMaps = validFiles.map(fileData => {
        const addressMap = new Map<string, Wallet>()
        fileData.wallets.forEach(wallet => {
          addressMap.set(wallet.address.toLowerCase(), wallet)
        })
        console.log(`File ${fileData.name}: ${fileData.wallets.length} wallets, ${addressMap.size} unique addresses`)
        return { fileData, addressMap }
      })

      // Find wallets that appear in ALL files
      const matchingWallets: CompareResult[] = []
      
      // Use the first file as reference
      const firstFile = addressMaps[0]
      console.log(`Using first file as reference: ${firstFile.fileData.name} with ${firstFile.addressMap.size} addresses`)
      
      firstFile.addressMap.forEach((wallet, address) => {
        // Check if this address exists in ALL other files
        const foundInAllFiles = addressMaps.every(({ addressMap }) => {
          return addressMap.has(address)
        })

        if (foundInAllFiles) {
          const foundInFiles = validFiles.map(f => f.name)
          matchingWallets.push({
            wallet,
            foundInFiles
          })
        }
      })

      console.log(`Found ${matchingWallets.length} matching wallets`)
      setResults(matchingWallets)
    } catch (error) {
      console.error('Comparison error:', error)
      setError(`Lỗi khi so sánh files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsComparing(false)
    }
  }

  const clearFiles = () => {
    setFiles([
      { file: null as any, wallets: [], name: 'File 1' },
      { file: null as any, wallets: [], name: 'File 2' }
    ])
    setResults([])
    setError('')
  }

  const addFileSlot = () => {
    if (files.length < maxFiles) {
      setFiles([...files, { file: null as any, wallets: [], name: `File ${files.length + 1}` }])
    }
  }

  const removeFileSlot = () => {
    if (files.length > 2) {
      setFiles(files.slice(0, -1))
    }
  }

  const getFileColor = (index: number) => {
    const colors = [
      'text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600',
      'text-red-600', 'text-indigo-600', 'text-pink-600', 'text-yellow-600',
      'text-teal-600', 'text-cyan-600', 'text-lime-600', 'text-amber-600',
      'text-emerald-600', 'text-violet-600', 'text-rose-600', 'text-sky-600',
      'text-slate-600', 'text-gray-600', 'text-zinc-600', 'text-neutral-600'
    ]
    return colors[index % colors.length]
  }

  const getFileBgColor = (index: number) => {
    const colors = [
      'bg-blue-50', 'bg-green-50', 'bg-purple-50', 'bg-orange-50',
      'bg-red-50', 'bg-indigo-50', 'bg-pink-50', 'bg-yellow-50',
      'bg-teal-50', 'bg-cyan-50', 'bg-lime-50', 'bg-amber-50',
      'bg-emerald-50', 'bg-violet-50', 'bg-rose-50', 'bg-sky-50',
      'bg-slate-50', 'bg-gray-50', 'bg-zinc-50', 'bg-neutral-50'
    ]
    return colors[index % colors.length]
  }

  const getFileBorderColor = (index: number) => {
    const colors = [
      'border-blue-200', 'border-green-200', 'border-purple-200', 'border-orange-200',
      'border-red-200', 'border-indigo-200', 'border-pink-200', 'border-yellow-200',
      'border-teal-200', 'border-cyan-200', 'border-lime-200', 'border-amber-200',
      'border-emerald-200', 'border-violet-200', 'border-rose-200', 'border-sky-200',
      'border-slate-200', 'border-gray-200', 'border-zinc-200', 'border-neutral-200'
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="card mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">So sánh Files Wallet</h1>
        
        <p className="text-gray-600 mb-6">
          Tải lên 2-20 files txt chứa private key và wallet address để tìm các wallet trùng nhau.
          Format: <code className="bg-gray-100 px-2 py-1 rounded">private_key - wallet_address</code>
        </p>

        {/* File Controls */}
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={addFileSlot}
            disabled={files.length >= maxFiles}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>Thêm file</span>
          </button>
          
          <button
            onClick={removeFileSlot}
            disabled={files.length <= 2}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <Minus size={16} />
            <span>Bớt file</span>
          </button>
          
          <span className="text-sm text-gray-600">
            ({files.length}/{maxFiles} files)
          </span>
        </div>

        {/* File Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mb-6">
          {files.map((fileData, index) => (
            <div key={index} className={`space-y-4 p-4 rounded-lg border-2 ${getFileBorderColor(index)} ${getFileBgColor(index)}`}>
              <h3 className={`text-lg font-semibold ${getFileColor(index)}`}>
                File {index + 1}
              </h3>
              
              {fileData.file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {fileData.file.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {fileData.wallets.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <CheckCircle size={16} />
                      <span>✅ {fileData.wallets.length.toLocaleString()} wallet</span>
                    </div>
                  )}
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

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={compareFiles}
            disabled={isComparing || files.filter(f => f.file && f.wallets.length > 0).length < 2}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            <Search size={16} />
            <span>{isComparing ? 'Đang so sánh...' : 'So sánh Files'}</span>
          </button>
          
          <button
            onClick={clearFiles}
            className="btn-secondary flex items-center space-x-2"
          >
            <X size={16} />
            <span>Xóa tất cả</span>
          </button>
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

        {/* Summary */}
        {files.some(f => f.file) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">Tóm tắt</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 text-xs">
              {files.map((fileData, index) => (
                <div key={index}>
                  <p className="text-blue-700 truncate">
                    📁 File {index + 1}: {fileData.file?.name || 'Chưa tải'} 
                    ({fileData.wallets.length.toLocaleString()} wallet)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card border-green-200 bg-green-50">
          <h3 className="text-lg font-semibold mb-4 text-green-800">
            🎯 Wallet Trùng Khớp ({results.length.toLocaleString()})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-green-200">
                  <th className="text-left py-2 px-2 text-green-800">#</th>
                  <th className="text-left py-2 px-2 text-green-800">Private Key</th>
                  <th className="text-left py-2 px-2 text-green-800">Wallet Address</th>
                  <th className="text-left py-2 px-2 text-green-800">Xuất hiện trong</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b border-green-100 bg-white hover:bg-green-50">
                    <td className="py-2 px-2 text-green-700 font-semibold">{index + 1}</td>
                    <td className="py-2 px-2 font-mono text-xs text-gray-600">
                      {result.wallet.privateKey}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-green-800">
                      {result.wallet.address}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {result.foundInFiles.map((fileName, fileIndex) => (
                          <span 
                            key={fileIndex}
                            className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                          >
                            {fileName}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-green-800 text-sm">
              💡 Tìm thấy {results.length.toLocaleString()} wallet xuất hiện trong tất cả {files.filter(f => f.file).length} files.
              Đây là những wallet có cùng địa chỉ trong tất cả files đã tải.
            </p>
          </div>
        </div>
      )}

      {/* No Results */}
      {results.length === 0 && !isComparing && files.filter(f => f.file && f.wallets.length > 0).length >= 2 && (
        <div className="card border-gray-200 bg-gray-50">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Search size={48} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Không tìm thấy wallet trùng khớp
            </h3>
            <p className="text-gray-600">
              Không có wallet nào xuất hiện trong tất cả {files.filter(f => f.file).length} files.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {files.filter(f => f.file).map((fileData, index) => (
                <p key={index}>File {index + 1}: {fileData.wallets.length.toLocaleString()} wallet</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-blue-50 mt-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-800">Hướng dẫn sử dụng</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>1. 📁 Tải lên 2-20 files txt chứa danh sách wallet (format: private_key - wallet_address)</p>
          <p>2. ➕ Sử dụng nút "Thêm file" để tăng số lượng files cần so sánh (tối đa 20 files)</p>
          <p>3. ➖ Sử dụng nút "Bớt file" để giảm số lượng files (tối thiểu 2 files)</p>
          <p>4. 🔍 Nhấn "So sánh Files" để tìm wallet xuất hiện trong TẤT CẢ files</p>
          <p>5. 📊 Kết quả sẽ hiển thị các wallet có cùng địa chỉ trong tất cả files đã tải</p>
          <p>6. 🎯 Nếu không có wallet trùng, sẽ hiển thị thông báo "Không tìm thấy wallet trùng khớp"</p>
        </div>
      </div>
    </div>
  )
}

export default ComparePage 