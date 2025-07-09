import React, { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Brain, AlertCircle, RefreshCw, Calendar, BarChart3 } from 'lucide-react'

// Declare TradingView widget types
declare global {
  interface Window {
    TradingView: {
      widget: any
      MediumWidget: any
      MiniWidget: any
    }
  }
}

interface Position {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  volume: number
  openPrice: number
  currentPrice: number
  pnl: number
  sl?: number
  tp?: number
  openTime: string
}

interface ModelMetrics {
  name: string
  accuracy: number
  lastUpdate: string
  status: 'training' | 'active' | 'offline'
  performance: number
}

export default function TradingViewDashboard() {
  const chartRef = useRef<HTMLDivElement>(null)
  const tickerRef = useRef<HTMLDivElement>(null)
  const screenerRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const heatmapRef = useRef<HTMLDivElement>(null)
  const miniChartRef = useRef<HTMLDivElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [widgetsLoaded, setWidgetsLoaded] = useState({
    tradingview: false,
    chart: false,
    ticker: false,
    screener: false,
    calendar: false,
    heatmap: false
  })

  useEffect(() => {
    const loadTradingViewWidgets = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize all widgets directly
        setTimeout(() => {
          initializeAllWidgets()
          setIsLoading(false)
          setWidgetsLoaded(prev => ({ ...prev, tradingview: true }))
        }, 1000)

      } catch (err) {
        setError('Error loading TradingView widgets')
        setIsLoading(false)
        console.error('TradingView widget error:', err)
      }
    }

    const initializeAllWidgets = () => {
      try {
        initializeAdvancedChart()
        initializeTickerTape()
        initializeScreener()
        initializeEconomicCalendar()
        initializeForexHeatMap()
        initializeMiniChart()
      } catch (err) {
        console.error('Error initializing widgets:', err)
      }
    }

    const initializeAdvancedChart = () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = ''
        
        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        container.style.height = '400px'
        container.style.width = '100%'
        
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container__widget'
        widgetContainer.style.height = 'calc(100% - 32px)'
        widgetContainer.style.width = '100%'
        
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
        script.async = true
        
        const config = {
          autosize: true,
          symbol: "FX:EURUSD",
          interval: "D",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          calendar: false,
          support_host: "https://www.tradingview.com"
        }
        
        script.textContent = JSON.stringify(config)
        
        container.appendChild(widgetContainer)
        container.appendChild(script)
        chartRef.current.appendChild(container)
        
        setWidgetsLoaded(prev => ({ ...prev, chart: true }))
      }
    }

    const initializeTickerTape = () => {
      if (tickerRef.current) {
        tickerRef.current.innerHTML = ''
        
        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container__widget'
        
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
        script.async = true
        
        const config = {
          symbols: [
            {"proName": "FX_IDC:EURUSD", "title": "EUR/USD"},
            {"proName": "FX_IDC:USDJPY", "title": "USD/JPY"},
            {"proName": "FX_IDC:GBPUSD", "title": "GBP/USD"},
            {"proName": "FX_IDC:AUDUSD", "title": "AUD/USD"},
            {"proName": "FX_IDC:USDCAD", "title": "USD/CAD"},
            {"proName": "FX_IDC:USDCHF", "title": "USD/CHF"},
            {"proName": "TVC:GOLD", "title": "Gold"},
            {"proName": "BITSTAMP:BTCUSD", "title": "Bitcoin"}
          ],
          showSymbolLogo: true,
          colorTheme: "light",
          isTransparent: false,
          displayMode: "adaptive",
          locale: "en"
        }
        
        script.textContent = JSON.stringify(config)
        
        container.appendChild(widgetContainer)
        container.appendChild(script)
        tickerRef.current.appendChild(container)
        
        setWidgetsLoaded(prev => ({ ...prev, ticker: true }))
      }
    }

    const initializeScreener = () => {
      if (screenerRef.current) {
        screenerRef.current.innerHTML = ''
        
        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container__widget'
        
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js'
        script.async = true
        
        const config = {
          width: "100%",
          height: "400",
          defaultColumn: "overview",
          screener_type: "crypto_mkt",
          displayCurrency: "USD",
          colorTheme: "light",
          locale: "en",
          market: "forex",
          showToolbar: true,
          showSymbolLogo: true
        }
        
        script.textContent = JSON.stringify(config)
        
        container.appendChild(widgetContainer)
        container.appendChild(script)
        screenerRef.current.appendChild(container)
        
        setWidgetsLoaded(prev => ({ ...prev, screener: true }))
      }
    }

    const initializeEconomicCalendar = () => {
      if (calendarRef.current) {
        calendarRef.current.innerHTML = ''
        
        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container__widget'
        
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-economic-calendar.js'
        script.async = true
        
        const config = {
          colorTheme: "light",
          isTransparent: false,
          width: "100%",
          height: "400",
          locale: "en",
          importanceFilter: "-1,0,1",
          countryFilter: "us,eu,jp,gb,au,ca,ch,nz"
        }
        
        script.textContent = JSON.stringify(config)
        
        container.appendChild(widgetContainer)
        container.appendChild(script)
        calendarRef.current.appendChild(container)
        
        setWidgetsLoaded(prev => ({ ...prev, calendar: true }))
      }
    }

    const initializeForexHeatMap = () => {
      if (heatmapRef.current) {
        heatmapRef.current.innerHTML = ''
        
        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container__widget'
        
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js'
        script.async = true
        
        const config = {
          width: "100%",
          height: "400",
          currencies: ["EUR", "USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"],
          isTransparent: false,
          colorTheme: "light",
          locale: "en"
        }
        
        script.textContent = JSON.stringify(config)
        
        container.appendChild(widgetContainer)
        container.appendChild(script)
        heatmapRef.current.appendChild(container)
        
        setWidgetsLoaded(prev => ({ ...prev, heatmap: true }))
      }
    }

    const initializeMiniChart = () => {
      if (miniChartRef.current) {
        miniChartRef.current.innerHTML = ''
        
        const container = document.createElement('div')
        container.className = 'tradingview-widget-container'
        
        const widgetContainer = document.createElement('div')
        widgetContainer.className = 'tradingview-widget-container__widget'
        
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
        script.async = true
        
        const config = {
          symbol: "FX:EURUSD",
          width: "100%",
          height: "200",
          locale: "en",
          dateRange: "12M",
          colorTheme: "light",
          isTransparent: false,
          autosize: true,
          largeChartUrl: ""
        }
        
        script.textContent = JSON.stringify(config)
        
        container.appendChild(widgetContainer)
        container.appendChild(script)
        miniChartRef.current.appendChild(container)
      }
    }

    loadTradingViewWidgets()

    // Set up refresh interval
    const refreshInterval = setInterval(() => {
      setLastUpdate(new Date())
    }, 1000)

    return () => {
      clearInterval(refreshInterval)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success-700 bg-success-100'
      case 'training':
        return 'text-yellow-700 bg-yellow-100'
      case 'offline':
        return 'text-danger-700 bg-danger-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="h-4 w-4 text-success-500" />
      case 'training':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-danger-500" />
      default:
        return <Brain className="h-4 w-4 text-gray-500" />
    }
  }

  // Fallback content for when widgets fail to load
  const FallbackChart = () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">EURUSD Chart</p>
        <p className="text-gray-500 text-xs">Chart unavailable</p>
      </div>
    </div>
  )

  const FallbackTicker = () => (
    <div className="w-full h-12 bg-gray-100 rounded flex items-center justify-center">
      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <span>EURUSD: 1.0875</span>
        <span>GBPUSD: 1.2625</span>
        <span>USDJPY: 149.50</span>
        <span className="text-xs text-gray-500">(Demo data)</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Last Update */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trading Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Activity className="h-4 w-4" />
          <span>Last Update: {lastUpdate.toLocaleTimeString()}</span>
          {error && (
            <span className="text-yellow-600 text-xs">(Fallback Mode)</span>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <span className="text-yellow-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Live Ticker Banner */}
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-2 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Live Market Ticker</h3>
          </div>
          <div className="p-2">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-12 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading ticker...
              </div>
            ) : error || !widgetsLoaded.ticker ? (
              <FallbackTicker />
            ) : (
              <div 
                ref={tickerRef}
                className="w-full h-12"
                style={{ minHeight: '50px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Market Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">EURUSD Advanced Chart</h3>
            <p className="text-sm text-gray-600">TradingView advanced charting with indicators</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading chart...
              </div>
            ) : error || !widgetsLoaded.chart ? (
              <FallbackChart />
            ) : (
              <div 
                ref={chartRef}
                className="w-full"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        </div>

        {/* Mini Chart Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">EURUSD Overview</h3>
            <p className="text-sm text-gray-600">Mini chart with key statistics</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading overview...
              </div>
            ) : error ? (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Chart Overview</p>
                  <p className="text-gray-500 text-xs">Overview unavailable</p>
                </div>
              </div>
            ) : (
              <div 
                ref={miniChartRef}
                className="w-full"
                style={{ minHeight: '200px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Economic Calendar and Forex Heat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economic Calendar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Economic Calendar</h3>
            <p className="text-sm text-gray-600">Upcoming economic events and news</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading economic calendar...
              </div>
            ) : error || !widgetsLoaded.calendar ? (
              <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Economic Calendar</p>
                  <p className="text-gray-500 text-xs">Calendar unavailable</p>
                </div>
              </div>
            ) : (
              <div 
                ref={calendarRef}
                className="w-full"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        </div>

        {/* Forex Heat Map */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Forex Heat Map</h3>
            <p className="text-sm text-gray-600">Currency strength visualization</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading heat map...
              </div>
            ) : error || !widgetsLoaded.heatmap ? (
              <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Forex Heat Map</p>
                  <p className="text-gray-500 text-xs">Heat map unavailable</p>
                </div>
              </div>
            ) : (
              <div 
                ref={heatmapRef}
                className="w-full"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Market Screener */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Market Screener</h3>
          <p className="text-sm text-gray-600">Real-time market overview and screening</p>
        </div>
        <div className="p-4">
          {isLoading && !error ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading market screener...
            </div>
          ) : error || !widgetsLoaded.screener ? (
            <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Market Screener</p>
                <p className="text-gray-500 text-xs">Screener unavailable</p>
              </div>
            </div>
          ) : (
            <div 
              ref={screenerRef}
              className="w-full"
              style={{ minHeight: '400px' }}
            />
          )}
        </div>
      </div>

      {/* Trading Performance and Model Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Positions Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Positions</h3>
            <p className="text-sm text-gray-600">Current open trades and P&L</p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {/* No active positions data available */}
              <div className="text-center py-8 text-gray-500">
                No active positions data available
              </div>
            </div>
          </div>
        </div>

        {/* ML Model Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">ML Model Analytics</h3>
            <p className="text-sm text-gray-600">Training progress and performance metrics</p>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {/* No model metrics data available */}
              <div className="text-center py-8 text-gray-500">
                No model metrics data available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">+$37.50</div>
              <div className="text-sm text-gray-600">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">2</div>
              <div className="text-sm text-gray-600">Open Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">68.5%</div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">3/3</div>
              <div className="text-sm text-gray-600">Models Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}