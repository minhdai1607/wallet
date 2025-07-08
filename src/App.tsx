import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import GeneratePage from './pages/GeneratePage'
import ManagementPage from './pages/ManagementPage'
import RpcManagementPage from './pages/RpcManagementPage'
import CheckBalancePage from './pages/CheckBalancePage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/management" element={<ManagementPage />} />
            <Route path="/rpc" element={<RpcManagementPage />} />
            <Route path="/check-balance" element={<CheckBalancePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App 