import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import GeneratePage from './pages/GeneratePage'
import ManagementPage from './pages/ManagementPage'
import CheckBalancePage from './pages/CheckBalancePage'
import ComparePage from './pages/ComparePage'
import CheckUsagePage from './pages/CheckUsagePage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<GeneratePage />} />
            <Route path="/management" element={<ManagementPage />} />
            <Route path="/check-balance" element={<CheckBalancePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/check-usage" element={<CheckUsagePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App 