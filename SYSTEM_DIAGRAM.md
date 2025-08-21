# 🏗️ MetaTrader.xyz System Architecture

## 📊 **System Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                          │
│                    https://methtrader.xyz                      │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   React     │  │   Mobile    │  │   Real-time Dashboard   │ │
│  │   Frontend  │  │   Responsive│  │   (Auto-refresh)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ API Calls
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND API                             │
│                   https://api.methtrader.xyz                   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Express   │  │   Trading   │  │   AI Consensus Engine   │ │
│  │   Server    │  │   Engine    │  │   (ML Models)           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                         │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Bybit     │  │   Alpha     │  │   MT5 Integration       │ │
│  │   Trading   │  │   Vantage   │  │   (MetaTrader 5)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 **Technical Stack**

### **Frontend (Netlify)**
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **Framer Motion**
- **PWA Support** + **Mobile Responsive**
- **Real-time Data Polling**

### **Backend (Railway)**
- **Node.js 18** + **Express.js**
- **Rate Limiting** + **CORS** + **Helmet**
- **AI Consensus Engine** + **Trading Logic**
- **Paper/Live Trading Modes**

## 📡 **API Endpoints**

```
✅ /health              → System Health
✅ /api/status          → Trading Status  
✅ /api/account/balance → Account Balance
✅ /api/account/positions → Positions
✅ /api/trading/status  → Trading Status
❌ /api/trading/state   → Trading State (404)
❌ /api/models          → AI Models (404)
❌ /api/training/status → Training Status (404)
```

## 🚨 **Current Issues**

1. **Backend API 404s**: New endpoints not working
2. **Trust Proxy**: Rate limiting errors
3. **Static Files**: Interfering with API routes

## 🎯 **Next Steps**

1. Fix backend API endpoints
2. Test frontend-backend integration
3. Deploy working system
4. Monitor performance

Your system is 80% complete - just need to fix the backend API issues! 🚀
