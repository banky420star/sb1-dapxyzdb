import React, { useEffect, useRef, useState } from 'react';

interface WidgetConfig {
  id: string;
  name: string;
  type: string;
  description: string;
  embed: string;
  api?: string;
  refresh?: number;
  enabled: boolean;
  position: string;
  symbols?: string[];
  symbol?: string;
  timeframe?: string;
  indicators?: string[];
}

interface MQL5WidgetProps {
  config: WidgetConfig;
  className?: string;
}

export const MQL5Widget: React.FC<MQL5WidgetProps> = ({ config, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config.enabled) return;

    const loadWidget = () => {
      try {
        if (containerRef.current) {
          // Clear previous content
          containerRef.current.innerHTML = '';
          
          // Create a wrapper div for the widget
          const wrapper = document.createElement('div');
          wrapper.innerHTML = config.embed;
          containerRef.current.appendChild(wrapper);
          
          // Extract script tag and execute it
          const scriptTag = wrapper.querySelector('script');
          if (scriptTag) {
            const newScript = document.createElement('script');
            newScript.type = scriptTag.type || 'text/javascript';
            newScript.src = scriptTag.src;
            
            // Copy all data attributes
            Array.from(scriptTag.attributes).forEach(attr => {
              if (attr.name.startsWith('data-')) {
                newScript.setAttribute(attr.name, attr.value);
              }
            });
            
            // Handle script load events
            newScript.onload = () => {
              setIsLoaded(true);
              setError(null);
            };
            
            newScript.onerror = () => {
              setError('Failed to load widget script');
              setIsLoaded(false);
            };
            
            // Remove old script if exists
            const oldScript = containerRef.current.querySelector('script');
            if (oldScript) {
              oldScript.remove();
            }
            
            containerRef.current.appendChild(newScript);
          }
        }
      } catch (err) {
        setError(`Error loading widget: ${err}`);
        setIsLoaded(false);
      }
    };

    loadWidget();

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [config]);

  if (!config.enabled) {
    return null;
  }

  return (
    <div className={`mql5-widget ${className}`}>
      <div className="widget-header">
        <h3 className="widget-title">{config.name}</h3>
        <p className="widget-description">{config.description}</p>
      </div>
      
      <div className="widget-content">
        {error && (
          <div className="widget-error">
            <p>⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              Retry
            </button>
          </div>
        )}
        
        {!isLoaded && !error && (
          <div className="widget-loading">
            <div className="loading-spinner"></div>
            <p>Loading {config.name}...</p>
          </div>
        )}
        
        <div 
          ref={containerRef} 
          className="widget-container"
          style={{ minHeight: '200px' }}
        />
      </div>
    </div>
  );
};

// Widget Loader Component
interface WidgetLoaderProps {
  position?: string;
  className?: string;
}

export const WidgetLoader: React.FC<WidgetLoaderProps> = ({ position = 'main', className = '' }) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWidgets = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin
        const response = await fetch(`${API_URL}/api/widgets`);
        if (response.ok) {
          const data = await response.json();
          const filteredWidgets = data.widgets.filter(
            (widget: WidgetConfig) => widget.enabled && widget.position === position
          );
          setWidgets(filteredWidgets);
        }
      } catch (error) {
        console.error('Failed to load widgets', error);
      }
    };

    loadWidgets();
  }, [position]);

  if (loading) {
    return (
      <div className={`widget-loader ${className}`}>
        <div className="loading-spinner"></div>
        <p>Loading widgets...</p>
      </div>
    );
  }

  return (
    <div className={`widget-container ${className}`}>
      {widgets.map((widget) => (
        <MQL5Widget 
          key={widget.id} 
          config={widget} 
          className="mb-4"
        />
      ))}
    </div>
  );
};

// Specific Widget Components
export const EconomicCalendar: React.FC = () => {
  const config: WidgetConfig = {
    id: 'econ_cal',
    name: 'Economic Calendar',
    type: 'economic_calendar',
    description: 'Real-time economic calendar with impact levels',
    embed: '<div id="ecal"></div><script type="text/javascript" src="https://www.mql5.com/widgets/calendar/widget.js" data-lang="en" data-timezone="UTC" data-theme="dark" data-width="100%" data-height="400"></script>',
    api: 'https://ecapi.tradays.com/series',
    refresh: 300,
    enabled: true,
    position: 'sidebar'
  };

  return <MQL5Widget config={config} />;
};

export const QuotesTable: React.FC = () => {
  const config: WidgetConfig = {
    id: 'quotes_table',
    name: 'Forex Quotes Table',
    type: 'quotes_table',
    description: 'Real-time forex quotes with bid/ask spreads',
    symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'],
    embed: '<div id="quotes"></div><script type="text/javascript" src="https://www.mql5.com/widgets/quotes/widget.js" data-symbols="EURUSD,GBPUSD,USDJPY,AUDUSD,USDCAD,USDCHF,NZDUSD" data-theme="dark" data-width="100%"></script>',
    refresh: 60,
    enabled: true,
    position: 'main'
  };

  return <MQL5Widget config={config} />;
};

export const TickerStrip: React.FC = () => {
  const config: WidgetConfig = {
    id: 'ticker_strip',
    name: 'Ticker Strip',
    type: 'ticker_strip',
    description: 'Horizontal scrolling price ticker',
    symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'BTCUSD', 'ETHUSD'],
    embed: '<div id="ticker"></div><script type="text/javascript" src="https://www.mql5.com/widgets/ticker/widget.js" data-symbols="EURUSD,GBPUSD,USDJPY,AUDUSD,BTCUSD,ETHUSD" data-theme="dark" data-speed="50"></script>',
    refresh: 30,
    enabled: true,
    position: 'header'
  };

  return <MQL5Widget config={config} />;
};

export const PriceChart: React.FC = () => {
  const config: WidgetConfig = {
    id: 'price_chart',
    name: 'Interactive Price Chart',
    type: 'price_chart',
    description: 'Interactive candlestick chart with zoom',
    symbol: 'EURUSD',
    timeframe: '1H',
    embed: '<div id="chart"></div><script type="text/javascript" src="https://www.mql5.com/widgets/chart/widget.js" data-symbol="EURUSD" data-timeframe="1H" data-theme="dark" data-width="100%" data-height="400"></script>',
    refresh: 60,
    enabled: true,
    position: 'main'
  };

  return <MQL5Widget config={config} />;
};

export const TechnicalIndicators: React.FC = () => {
  const config: WidgetConfig = {
    id: 'tech_indicators',
    name: 'Technical Indicators',
    type: 'tech_indicators',
    description: 'RSI, MACD, and moving averages',
    symbol: 'EURUSD',
    indicators: ['RSI', 'MACD', 'SMA'],
    embed: '<div id="indicators"></div><script type="text/javascript" src="https://www.mql5.com/widgets/indicators/widget.js" data-symbol="EURUSD" data-indicators="RSI,MACD,SMA" data-theme="dark" data-width="100%" data-height="300"></script>',
    refresh: 60,
    enabled: true,
    position: 'sidebar'
  };

  return <MQL5Widget config={config} />;
};

export const NewsFeed: React.FC = () => {
  const config: WidgetConfig = {
    id: 'news_feed',
    name: 'Market News Feed',
    type: 'news_feed',
    description: 'Real-time financial news headlines',
    embed: '<div id="news"></div><script type="text/javascript" src="https://www.mql5.com/widgets/news/widget.js" data-lang="en" data-theme="dark" data-width="100%" data-height="300"></script>',
    api: 'https://www.mql5.com/api/news',
    refresh: 300,
    enabled: true,
    position: 'sidebar'
  };

  return <MQL5Widget config={config} />;
}; 