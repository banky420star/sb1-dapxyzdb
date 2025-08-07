import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FuturisticLanding: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // V2: Add loading animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className={`min-h-screen bg-futuristic text-slate-100 font-sans antialiased flex flex-col transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* V2: Enhanced Navbar */}
      <header className="glass-dark fixed top-0 w-full z-20 shadow-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-gradient">
            Meth<span className="text-indigo-400 text-glow">Trader</span>
          </h1>
          
          {/* V2: Enhanced Navigation */}
          <nav className="space-x-8 hidden md:block">
            <a href="/dashboard" className="hover:text-indigo-300 transition-all duration-300 relative group">
              Dashboard
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/trading" className="hover:text-indigo-300 transition-all duration-300 relative group">
              Trading
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/models" className="hover:text-indigo-300 transition-all duration-300 relative group">
              AI Models
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/risk" className="hover:text-indigo-300 transition-all duration-300 relative group">
              Risk
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/analytics" className="hover:text-indigo-300 transition-all duration-300 relative group">
              Analytics
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/settings" className="hover:text-indigo-300 transition-all duration-300 relative group">
              Settings
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
            </a>
          </nav>

          {/* V2: Enhanced Mobile Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg glass hover:bg-white/10 transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* V2: Enhanced Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden glass-dark border-t border-white/10 animate-fade-in-up">
            <div className="px-6 py-4 space-y-4">
              <a href="/dashboard" className="block hover:text-indigo-300 transition-colors duration-300">Dashboard</a>
              <a href="/trading" className="block hover:text-indigo-300 transition-colors duration-300">Trading</a>
              <a href="/models" className="block hover:text-indigo-300 transition-colors duration-300">AI Models</a>
              <a href="/risk" className="block hover:text-indigo-300 transition-colors duration-300">Risk</a>
              <a href="/analytics" className="block hover:text-indigo-300 transition-colors duration-300">Analytics</a>
              <a href="/settings" className="block hover:text-indigo-300 transition-colors duration-300">Settings</a>
            </div>
          </div>
        )}
      </header>

      {/* V2: Enhanced Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 pt-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* V2: Enhanced Animated Cube Hero */}
          <div className="mb-12 relative">
            <div className="w-32 h-32 mx-auto relative animate-pulse-slow">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl transform rotate-45 animate-pulse-slow"></div>
              <div className="absolute inset-2 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl transform -rotate-45 animate-pulse-slow" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute inset-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg transform rotate-12 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
            </div>
          </div>

          {/* V2: Enhanced Typography */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient animate-fade-in-up">
            AI-Powered
            <br />
            <span className="text-indigo-400 text-glow">Trading Platform</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            Experience the future of algorithmic trading with advanced AI models, 
            real-time analytics, and intelligent risk management.
          </p>

          {/* V2: Enhanced CTA Button */}
          <button
            onClick={handleEnterDashboard}
            className="btn-futuristic text-lg px-12 py-4 text-white font-semibold animate-fade-in-up"
            style={{animationDelay: '0.4s'}}
          >
            <span className="flex items-center space-x-2">
              <span>Enter Dashboard</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {/* V2: Enhanced Feature Highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
            <div className="card-futuristic text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Intelligence</h3>
              <p className="text-slate-400">Advanced machine learning models for predictive trading</p>
            </div>

            <div className="card-futuristic text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Data</h3>
              <p className="text-slate-400">Live market data and instant trade execution</p>
            </div>

            <div className="card-futuristic text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Risk Management</h3>
              <p className="text-slate-400">Intelligent risk controls and portfolio protection</p>
            </div>
          </div>
        </div>
      </main>

      {/* V2: Enhanced Footer */}
      <footer className="glass-dark border-t border-white/10 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400">
            © 2025 MethTrader. Advanced AI Trading Platform. 
            <span className="text-indigo-400 ml-2">Powered by cutting-edge technology.</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FuturisticLanding; 