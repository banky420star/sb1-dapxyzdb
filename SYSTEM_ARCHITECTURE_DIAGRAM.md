# 🏗️ MetaTrader.xyz System Architecture

## 📊 **Complete System Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET / USERS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DNS & DOMAINS                                      │
│                                                                                 │
│  methtrader.xyz ──────────────┐    api.methtrader.xyz ────────────────────────┐ │
│  (Frontend)                   │    (Backend API)                              │ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Netlify)                                │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    https://methtrader.xyz                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   React App     │  │   PWA Support   │  │   Security Headers      │ │   │
│  │  │   (Vite)        │  │   (Manifest)    │  │   (HSTS, CSP)           │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   Trading UI    │  │   Real-time     │  │   Mobile Responsive     │ │   │
│  │  │   Components    │  │   Data Polling  │  │   Design                │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ API Calls
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Railway)                                 │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                  https://api.methtrader.xyz                            │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   Express.js    │  │   Rate Limiting │  │   CORS Configuration    │ │   │
│  │  │   Server        │  │   (100 req/30s) │  │   (Trust Proxy)         │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   API Endpoints │  │   Trading Logic │  │   AI Consensus Engine   │ │   │
│  │  │   (REST)        │  │   (Paper/Live)  │  │   (ML Models)           │ │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                                 │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐ │
│  │   Bybit API     │  │   Alpha Vantage │  │   MT5 Integration              │ │
│  │   (Trading)     │  │   (Market Data) │  │   (MetaTrader 5)               │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 **Technical Stack Breakdown**

### **Frontend (Netlify)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   React 18      │  │   TypeScript    │  │   Vite Build System         │ │
│  │   (SPA)         │  │   (Type Safety) │  │   (Fast Dev/Build)          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Tailwind CSS  │  │   Framer Motion │  │   Lucide Icons              │ │
│  │   (Styling)     │  │   (Animations)  │  │   (UI Icons)                │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   TradingContext│  │   Real-time     │  │   PWA Features              │ │
│  │   (State Mgmt)  │  │   Polling       │  │   (Offline Support)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Backend (Railway)**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Express.js    │  │   Node.js 18    │  │   Railway Platform          │ │
│  │   (Web Server)  │  │   (Runtime)     │  │   (Deployment)              │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Helmet.js     │  │   CORS          │  │   Rate Limiting             │ │
│  │   (Security)    │  │   (Cross-Origin)│  │   (DDoS Protection)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Trading Engine│  │   AI Consensus  │  │   Risk Management           │ │
│  │   (Paper/Live)  │  │   (ML Models)   │  │   (VaR, Stop Loss)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 **Data Flow Diagram**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │  Frontend   │    │   Backend   │    │  External   │
│  (Browser)  │    │ (Netlify)   │    │ (Railway)   │    │   APIs      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. Visit Site     │                   │                   │
       │ ──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ 2. Load React App │                   │
       │                   │ ──────────────────►│                   │
       │                   │                   │                   │
       │                   │ 3. API Calls      │                   │
       │                   │ ──────────────────►│                   │
       │                   │                   │                   │
       │                   │                   │ 4. Fetch Data     │
       │                   │                   │ ──────────────────►│
       │                   │                   │                   │
       │                   │                   │ 5. Return Data    │
       │                   │                   │ ◄──────────────────│
       │                   │                   │                   │
       │                   │ 6. Update UI      │                   │
       │                   │ ◄──────────────────│                   │
       │                   │                   │                   │
       │ 7. Real-time UI   │                   │                   │
       │ ◄──────────────────│                   │                   │
       │                   │                   │                   │
```

## 📡 **API Endpoints Map**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API ENDPOINTS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GET  /                    → API Info & Available Endpoints                │
│  GET  /health              → System Health Status                          │
│  GET  /api/status          → Trading System Status                         │
│                                                                             │
│  GET  /api/account/balance → Account Balance & Equity                      │
│  GET  /api/account/positions → Open Positions                              │
│  GET  /api/trading/status  → Autonomous Trading Status                     │
│  GET  /api/trading/state   → Trading State (Mode, PnL, Orders)            │
│                                                                             │
│  GET  /api/models          → AI Models & Performance Metrics               │
│  GET  /api/training/status → Model Training Status                         │
│                                                                             │
│  POST /api/trade/execute   → Execute Manual Trade                          │
│  POST /api/trading/start   → Start Autonomous Trading                      │
│  POST /api/trading/stop    → Stop Autonomous Trading                       │
│  POST /api/auto/tick       → AI Consensus Tick                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔐 **Security Architecture**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SECURITY LAYERS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   HTTPS/TLS     │  │   HSTS Headers  │  │   CSP (Content Security)    │ │
│  │   (Encryption)  │  │   (HTTPS Only)  │  │   (XSS Protection)          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   CORS Policy   │  │   Rate Limiting │  │   Helmet.js Security        │ │
│  │   (Origin Check)│  │   (DDoS Guard)  │  │   (Security Headers)        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Trust Proxy   │  │   Input Validation│ │   Error Handling            │ │
│  │   (Railway)     │  │   (Sanitization) │  │   (No Info Leak)           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 **Deployment Flow**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Code      │    │   Build     │    │   Deploy    │    │   Live      │
│  Changes    │    │  Process    │    │  Platform   │    │   System    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. Git Push       │                   │                   │
       │ ──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ 2. Vite Build     │                   │
       │                   │ ──────────────────►│                   │
       │                   │                   │                   │
       │                   │ 3. Netlify Deploy │                   │
       │                   │ ──────────────────►│                   │
       │                   │                   │                   │
       │                   │ 4. Railway Deploy │                   │
       │                   │ ──────────────────►│                   │
       │                   │                   │                   │
       │                   │ 5. DNS Update     │                   │
       │                   │ ──────────────────►│                   │
       │                   │                   │                   │
       │ 6. Live at        │                   │                   │
       │ methtrader.xyz    │                   │                   │
       │ ◄──────────────────│                   │                   │
       │                   │                   │                   │
```

## 📱 **Mobile & PWA Features**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MOBILE & PWA ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Responsive    │  │   Touch Targets │  │   Mobile Navigation         │ │
│  │   Design        │  │   (44px+)       │  │   (Hamburger Menu)          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   PWA Manifest  │  │   Service Worker│  │   Offline Support           │ │
│  │   (App-like)    │  │   (Caching)     │  │   (Basic Functionality)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Fast Loading  │  │   Code Splitting│  │   Lazy Loading              │ │
│  │   (Optimized)   │  │   (Chunks)      │  │   (On-Demand)               │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 **Current Status & Issues**

### ✅ **Working Components**
- ✅ Frontend deployed to Netlify (https://methtrader.xyz)
- ✅ Backend API health endpoint working
- ✅ Professional UI with branding
- ✅ Mobile-responsive design
- ✅ Security headers configured
- ✅ PWA support implemented

### 🔧 **Current Issues**
- ❌ Backend API endpoints returning 404 (except /health)
- ❌ Trust proxy setting not being applied
- ❌ Static file serving interfering with API routes

### 🚀 **Next Steps**
1. **Fix Backend API**: Resolve the 404 issues with new endpoints
2. **Test Integration**: Verify frontend-backend communication
3. **Deploy Fixes**: Ensure all endpoints are working
4. **Monitor Performance**: Check real-time data flow

## 📊 **Performance Metrics**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PERFORMANCE METRICS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Frontend Build Size:     ~1.2MB (gzipped: ~400KB)                         │
│  API Response Time:       <200ms (target)                                   │
│  Mobile Performance:      Lighthouse Score >90                             │
│  Uptime:                 99.9% (target)                                     │
│                                                                             │
│  Caching Strategy:        Static assets: 1 year                            │
│                          HTML: No cache                                    │
│                          API: No cache (real-time)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

This architecture provides a robust, scalable, and secure foundation for your autonomous trading platform! 🚀 