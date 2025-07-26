import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { TradingProvider } from './contexts/TradingContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Trading from './pages/Trading'
import Models from './pages/Models'
import Risk from './pages/Risk'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import FuturisticLanding from './pages/FuturisticLanding'

function App() {
  return (
    <TradingProvider>
      <Router>
        <Routes>
          <Route path="/futuristic" element={<FuturisticLanding />} />
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/trading" element={<Trading />} />
                <Route path="/models" element={<Models />} />
                <Route path="/risk" element={<Risk />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </TradingProvider>
  )
}

export default App