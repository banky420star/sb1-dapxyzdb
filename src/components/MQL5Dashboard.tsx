import React, { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Brain, AlertCircle, RefreshCw, Calendar, BarChart3 } from 'lucide-react'

// Declare widget types
declare global {
  interface Window {
    MQL5: {
      widget: {
        Chart: any
        Ticker: any
        CurrencyMatrix: any
        Quotes: any
        init: () => void
      }
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

export default function MQL5Dashboard() {
  const chartRef = useRef<HTMLDivElement>(null)
  const tickerRef = useRef<HTMLDivElement>(null)
  const matrixRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const quotesOverviewRef = useRef<HTMLDivElement>(null)
  const quotesTickerRef = useRef<HTMLDivElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [widgetsLoaded, setWidgetsLoaded] = useState({
    mql5: false,
    calendar: false,
    quotes: false
  })

  // Mock data for demonstration
  // const [positions] = useState<Position[]>([
  //   {
  //     id: '1',
  //     symbol: 'EURUSD',
  //     type: 'buy',
  //     volume: 0.1,
  //     openPrice: 1.0850,
  //     currentPrice: 1.0875,
  //     pnl: 25.00,
  //     sl: 1.0800,
  //     tp: 1.0950,
  //     openTime: '2024-01-15 09:30:00'
  //   },
  //   {
  //     id: '2',
  //     symbol: 'GBPUSD',
  //     type: 'sell',
  //     volume: 0.05,
  //     openPrice: 1.2650,
  //     currentPrice: 1.2625,
  //     pnl: 12.50,
  //     sl: 1.2700,
  //     tp: 1.2550,
  //     openTime: '2024-01-15 10:15:00'
  //   }
  // ])

  // const [modelMetrics] = useState<ModelMetrics[]>([
  //   {
  //     name: 'Random Forest',
  //     accuracy: 68.5,
  //     lastUpdate: '2024-01-15 11:30:00',
  //     status: 'active',
  //     performance: 85.2
  //   },
  //   {
  //     name: 'LSTM Neural Net',
  //     accuracy: 72.1,
  //     lastUpdate: '2024-01-15 11:25:00',
  //     status: 'active',
  //     performance: 78.9
  //   },
  //   {
  //     name: 'DDQN Agent',
  //     accuracy: 65.8,
  //     lastUpdate: '2024-01-15 11:20:00',
  //     status: 'training',
  //     performance: 71.3
  //   }
  // ])

  useEffect(() => {
    const loadAllWidgets = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load all widget scripts in parallel
        await Promise.allSettled([
          loadMQL5Widgets(),
          loadEconomicCalendar(),
          loadQuotesWidgets()
        ])

        setIsLoading(false)
      } catch (err) {
        setError('Error loading widgets - using fallback display')
        setIsLoading(false)
      }
    }

    const loadMQL5Widgets = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.MQL5) {
          initializeMQL5Widgets()
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://c.mql5.com/js/widgets/widget.js'
        script.async = true
        
        const timeout = setTimeout(() => {
          reject(new Error('MQL5 widget loading timeout'))
        }, 10000)

        script.onload = () => {
          clearTimeout(timeout)
          setTimeout(() => {
            if (window.MQL5) {
              initializeMQL5Widgets()
              setWidgetsLoaded(prev => ({ ...prev, mql5: true }))
              resolve()
            } else {
              reject(new Error('MQL5 widgets not available'))
            }
          }, 1000)
        }
        
        script.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Failed to load MQL5 widgets'))
        }

        document.head.appendChild(script)
      })
    }

    const loadEconomicCalendar = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://www.tradays.com/c/js/widgets/calendar/widget.js?v=13'
        script.async = true
        script.setAttribute('data-type', 'calendar-widget')
        
        const timeout = setTimeout(() => {
          reject(new Error('Economic calendar loading timeout'))
        }, 10000)

        script.onload = () => {
          clearTimeout(timeout)
          setTimeout(() => {
            initializeEconomicCalendar()
            setWidgetsLoaded(prev => ({ ...prev, calendar: true }))
            resolve()
          }, 1000)
        }
        
        script.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Failed to load economic calendar'))
        }

        // Add configuration as script content
        script.textContent = JSON.stringify({
          "width": "100%",
          "height": "400",
          "mode": "2"
        })

        document.head.appendChild(script)
      })
    }

    const loadQuotesWidgets = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://c.mql5.com/js/widgets/quotes/widget.js?v=1'
        script.async = true
        script.setAttribute('data-type', 'quotes-widget')
        
        const timeout = setTimeout(() => {
          reject(new Error('Quotes widgets loading timeout'))
        }, 10000)

        script.onload = () => {
          clearTimeout(timeout)
          setTimeout(() => {
            initializeQuotesWidgets()
            setWidgetsLoaded(prev => ({ ...prev, quotes: true }))
            resolve()
          }, 1000)
        }
        
        script.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Failed to load quotes widgets'))
        }

        document.head.appendChild(script)
      })
    }

    const initializeMQL5Widgets = () => {
      try {
        // Clear any existing content
        if (chartRef.current) chartRef.current.innerHTML = ''
        if (tickerRef.current) tickerRef.current.innerHTML = ''
        if (matrixRef.current) matrixRef.current.innerHTML = ''

        setTimeout(() => {
          try {
            // Initialize Candlestick Chart
            if (chartRef.current && window.MQL5?.widget?.Chart) {
              new window.MQL5.widget.Chart({
                container_id: 'mql5-chart-widget',
                width: 340,
                height: 200,
                symbol: 'EURUSD',
                interval: 'D1',
                timezone: 'Etc/UTC',
                theme: 'light',
                style: '1',
                locale: 'en',
                toolbar_bg: '#f1f3f6',
                enable_publishing: false,
                hide_top_toolbar: false,
                hide_legend: false,
                save_image: false
              })
            }
          } catch (err) {
            console.warn('Failed to initialize chart widget:', err)
          }

          try {
            // Initialize Currency Matrix
            if (matrixRef.current && window.MQL5?.widget?.CurrencyMatrix) {
              new window.MQL5.widget.CurrencyMatrix({
                container_id: 'mql5-matrix-widget',
                width: 700,
                height: 420,
                currencies: ['EUR', 'USD', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'NZD'],
                theme: 'light',
                locale: 'en'
              })
            }
          } catch (err) {
            console.warn('Failed to initialize matrix widget:', err)
          }
        }, 500)
      } catch (err) {
        console.error('Error initializing MQL5 widgets:', err)
      }
    }

    const initializeEconomicCalendar = () => {
      try {
        if (calendarRef.current) {
          calendarRef.current.innerHTML = ''
          
          // Create the calendar widget container
          const calendarDiv = document.createElement('div')
          calendarDiv.id = 'economicCalendarWidget'
          calendarRef.current.appendChild(calendarDiv)
          
          // The widget should auto-initialize based on the script configuration
        }
      } catch (err) {
        console.error('Error initializing economic calendar:', err)
      }
    }

    const initializeQuotesWidgets = () => {
      try {
        // Initialize Quotes Overview
        if (quotesOverviewRef.current) {
          quotesOverviewRef.current.innerHTML = ''
          
          const overviewDiv = document.createElement('div')
          overviewDiv.id = 'quotesWidgetOverview'
          quotesOverviewRef.current.appendChild(overviewDiv)
          
          // Create and append the script for overview widget
          const overviewScript = document.createElement('script')
          overviewScript.async = true
          overviewScript.setAttribute('data-type', 'quotes-widget')
          overviewScript.src = 'https://c.mql5.com/js/widgets/quotes/widget.js?v=1'
          overviewScript.textContent = JSON.stringify({
            "type": "overview",
            "style": "tiles",
            "filter": ["EURUSD", "USDJPY", "GBPUSD", "AUDUSD", "USDCAD", "NZDUSD", "XAUUSD", "BTCUSD"],
            "width": 700,
            "height": 420,
            "period": "M15",
            "id": "quotesWidgetOverview"
          })
          quotesOverviewRef.current.appendChild(overviewScript)
        }

        // Initialize Quotes Ticker
        if (quotesTickerRef.current) {
          quotesTickerRef.current.innerHTML = ''
          
          const tickerDiv = document.createElement('div')
          tickerDiv.id = 'quotesWidgetTicker'
          quotesTickerRef.current.appendChild(tickerDiv)
          
          // Create and append the script for ticker widget
          const tickerScript = document.createElement('script')
          tickerScript.async = true
          tickerScript.setAttribute('data-type', 'quotes-widget')
          tickerScript.src = 'https://c.mql5.com/js/widgets/quotes/widget.js?v=1'
          tickerScript.textContent = JSON.stringify({
            "type": "ticker",
            "filter": ["EURUSD", "USDJPY", "GBPUSD", "USDCAD", "XAUUSD", "BTCUSD"],
            "width": "100%",
            "height": 50,
            "id": "quotesWidgetTicker"
          })
          quotesTickerRef.current.appendChild(tickerScript)
        }
      } catch (err) {
        console.error('Error initializing quotes widgets:', err)
      }
    }

    loadAllWidgets()

    // Set up refresh interval
    const refreshInterval = setInterval(() => {
      setLastUpdate(new Date())
    }, 1000)

    return () => {
      clearInterval(refreshInterval)
      // Clean up scripts if component unmounts
      const scripts = [
        'script[src*="mql5.com/js/widgets/widget.js"]',
        'script[src*="tradays.com/c/js/widgets/calendar/widget.js"]',
        'script[src*="mql5.com/js/widgets/quotes/widget.js"]'
      ]
      scripts.forEach(selector => {
        const script = document.querySelector(selector)
        if (script) {
          script.remove()
        }
      })
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
    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">EURUSD Chart</p>
        <p className="text-gray-500 text-xs">Live chart unavailable</p>
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

  const FallbackMatrix = () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">Currency Strength Matrix</p>
        <p className="text-gray-500 text-xs">Live matrix unavailable</p>
      </div>
    </div>
  )

  const FallbackCalendar = () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">Economic Calendar</p>
        <p className="text-gray-500 text-xs">Calendar unavailable</p>
      </div>
    </div>
  )

  const FallbackQuotes = () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">Market Overview</p>
        <p className="text-gray-500 text-xs">Live quotes unavailable</p>
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
            ) : error || !widgetsLoaded.quotes ? (
              <FallbackTicker />
            ) : (
              <div 
                ref={quotesTickerRef}
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
            <h3 className="text-lg font-semibold text-gray-900">EURUSD Daily Chart</h3>
            <p className="text-sm text-gray-600">Candlestick with EMA overlays</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading chart...
              </div>
            ) : error || !widgetsLoaded.mql5 ? (
              <FallbackChart />
            ) : (
              <div 
                id="mql5-chart-widget" 
                ref={chartRef}
                className="w-full"
                style={{ width: '340px', height: '200px' }}
              />
            )}
          </div>
        </div>

        {/* Market Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Market Overview</h3>
            <p className="text-sm text-gray-600">Live quotes and price tiles</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading market overview...
              </div>
            ) : error || !widgetsLoaded.quotes ? (
              <FallbackQuotes />
            ) : (
              <div 
                ref={quotesOverviewRef}
                className="w-full"
                style={{ minHeight: '420px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Economic Calendar and Currency Matrix */}
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
              <FallbackCalendar />
            ) : (
              <div 
                ref={calendarRef}
                className="w-full"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        </div>

        {/* Currency Matrix */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Currency Strength Matrix</h3>
            <p className="text-sm text-gray-600">8×8 cross-rate analysis with heat mapping</p>
          </div>
          <div className="p-4">
            {isLoading && !error ? (
              <div className="flex items-center justify-center h-96 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading currency matrix...
              </div>
            ) : error || !widgetsLoaded.mql5 ? (
              <FallbackMatrix />
            ) : (
              <div 
                id="mql5-matrix-widget" 
                ref={matrixRef}
                className="w-full"
                style={{ width: '700px', height: '420px', maxWidth: '100%' }}
              />
            )}
          </div>
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
              {/* positions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active positions
                </div>
              ) : ( */}
                {/* positions.map((position) => ( */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">No data available</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                          N/A
                        </span>
                        <span className="text-sm text-gray-600">0 lots</span>
                      </div>
                      <div className="font-medium text-gray-600">
                        $0.00
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span>Entry: N/A</span>
                        <br />
                        <span>Current: N/A</span>
                      </div>
                      <div>
                        {/* {position.sl && <span>SL: {position.sl}<br /></span>} */}
                        {/* {position.tp && <span>TP: {position.tp}</span>} */}
                      </div>
                    </div>
                  </div>
                {/* )) */}
              {/* ) */}
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
              {/* modelMetrics.map((model, index) => ( */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon('offline')}
                      <span className="font-medium text-gray-900">No data available</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700`}>
                        N/A
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Accuracy:</span>
                      <span className="ml-2 font-medium text-gray-900">N/A%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Performance:</span>
                      <span className="ml-2 font-medium text-gray-900">N/A%</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Last Update: N/A
                  </div>
                  
                  {/* Progress Bar for Training Models */}
                  {/* {model.status === 'training' && ( */}
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gray-300 h-2 rounded-full transition-all duration-300"
                          style={{ width: '0%' }}
                        />
                      </div>
                    </div>
                  {/* )} */}
                </div>
              {/* )) */}
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
              <div className="text-2xl font-bold text-gray-900">N/A</div>
              <div className="text-sm text-gray-600">Total P&L</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-600">Open Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">N/A</div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">0/0</div>
              <div className="text-sm text-gray-600">Models Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}