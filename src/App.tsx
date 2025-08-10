import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { TradingProvider } from './contexts/TradingContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Trading from './pages/Trading'
import Crypto from './pages/Crypto'
import Models from './pages/Models'
import Risk from './pages/Risk'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import FuturisticLanding from './pages/FuturisticLanding'
import NotFound from './pages/NotFound'

function App() {
  return (
    <TradingProvider>
      <Router>
        <Routes>
          <Route path="/" element={<FuturisticLanding />} />
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/trading" element={<Trading />} />
                <Route path="/crypto" element={<Crypto />} />
                <Route path="/models" element={<Models />} />
                <Route path="/risk" element={<Risk />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </TradingProvider>
  )
}

export default App