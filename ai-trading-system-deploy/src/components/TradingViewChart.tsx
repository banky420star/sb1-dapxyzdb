import React, { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol?: string
  interval?: string
  theme?: 'light' | 'dark'
  height?: number
  width?: string
}

export default function TradingViewChart({ 
  symbol = 'EURUSD', 
  interval = '1D',
  theme = 'dark',
  height = 400,
  width = '100%'
}: TradingViewChartProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (container.current) {
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = () => {
        if (window.TradingView && container.current) {
          new window.TradingView.widget({
            autosize: true,
            symbol: symbol,
            interval: interval,
            timezone: 'Etc/UTC',
            theme: theme,
            style: '1',
            locale: 'en',
            toolbar_bg: '#f1f3f6',
            enable_publishing: false,
            allow_symbol_change: true,
            container_id: container.current.id,
            width: width,
            height: height,
            studies: [
              'RSI@tv-basicstudies',
              'MACD@tv-basicstudies',
              'BB@tv-basicstudies'
            ],
            show_popup_button: true,
            popup_width: '1000',
            popup_height: '650',
          })
        }
      }
      document.head.appendChild(script)

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script)
        }
      }
    }
  }, [symbol, interval, theme, height, width])

  return (
    <div 
      id={`tradingview-${symbol}-${Date.now()}`}
      ref={container}
      style={{ height: `${height}px`, width }}
      className="tradingview-widget-container"
    />
  )
}

// Add TradingView types to window object
declare global {
  interface Window {
    TradingView: {
      widget: any
      MediumWidget: any
      MiniWidget: any
    }
  }
} 