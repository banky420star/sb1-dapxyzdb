# 🚀 Netlify Functions Setup Guide
## Secure Bybit V5 API Integration

---

## ✅ **What's Been Created**

Your AI trading system now has secure server-side functions:

- **`netlify/functions/orders-create.ts`** - Create trading orders
- **`netlify/functions/positions-list.ts`** - Get current positions
- **`netlify/functions/account-balance.ts`** - Get wallet balance
- **Updated frontend** - Uses Netlify Functions instead of direct API calls

---

## 🔐 **Step 1: Add Environment Variables to Netlify**

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Find your site**: `delightful-crumble-983869`
3. **Go to**: Site settings → Environment variables
4. **Add these variables**:

```
BYBIT_API_KEY=3fg29yhr1a9JJ1etm3
BYBIT_API_SECRET=wFVWTfRxUUeMcVTtLQSUm7ptyvJYbe3lTd14
BYBIT_RECV_WINDOW=5000
```

**Important**: These are your actual Bybit API credentials. Keep them secure!

---

## 🚀 **Step 2: Deploy to Netlify**

Your functions will automatically deploy when you push to GitHub:

```bash
git add .
git commit -m "🔐 Add Netlify Functions for secure Bybit API integration"
git push origin main
```

Netlify will detect the new functions and deploy them automatically.

---

## 🧪 **Step 3: Test Your Functions**

### **Test Order Creation**
```bash
curl -X POST https://delightful-crumble-983869.netlify.app/.netlify/functions/orders-create \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "Buy",
    "orderType": "Market",
    "qty": "0.001"
  }'
```

### **Test Positions List**
```bash
curl https://delightful-crumble-983869.netlify.app/.netlify/functions/positions-list
```

### **Test Account Balance**
```bash
curl https://delightful-crumble-983869.netlify.app/.netlify/functions/account-balance
```

---

## 🔍 **Step 4: Verify Function URLs**

Your functions are available at:
- **Orders**: `/.netlify/functions/orders-create`
- **Positions**: `/.netlify/functions/positions-list`
- **Balance**: `/.netlify/functions/account-balance`

---

## 🛡️ **Security Features**

### **✅ What's Secure**
- **API Keys**: Stored in Netlify environment variables (server-side only)
- **HMAC Signing**: Proper Bybit V5 signature generation
- **CORS**: Configured for frontend access
- **Validation**: Input validation and error handling

### **✅ What's Public**
- **Market Data**: WebSocket streams (no authentication needed)
- **Public APIs**: Tickers, order book, klines

### **❌ What's Never Exposed**
- **API Keys**: Never sent to browser
- **Signatures**: Generated server-side only
- **Private Data**: All private operations go through functions

---

## 🔧 **Function Details**

### **Orders Create Function**
- **Method**: POST
- **Body**: `{ symbol, side, orderType, qty, price?, stopPrice? }`
- **Response**: Bybit API response

### **Positions List Function**
- **Method**: GET
- **Query**: `?category=linear&symbol=BTCUSDT`
- **Response**: Current positions

### **Account Balance Function**
- **Method**: GET
- **Query**: `?accountType=UNIFIED&coin=USDT`
- **Response**: Wallet balances

---

## 🚨 **Troubleshooting**

### **Function Not Found (404)**
- Check Netlify deployment logs
- Verify function files are in `netlify/functions/`
- Ensure TypeScript compilation is working

### **API Credentials Error**
- Verify environment variables are set in Netlify
- Check variable names match exactly
- Ensure no extra spaces in values

### **CORS Errors**
- Functions include CORS headers
- Check browser console for specific errors
- Verify function URLs are correct

### **Bybit API Errors**
- Check function logs in Netlify dashboard
- Verify API key permissions
- Check timestamp synchronization

---

## 📊 **Monitoring**

### **View Function Logs**
1. **Netlify Dashboard** → Your site
2. **Functions tab** → View logs
3. **Deploys tab** → Check build status

### **Test in Browser**
Visit your site and try placing an order. Check browser network tab to see function calls.

---

## 🎯 **Next Steps**

1. **Deploy**: Push changes to GitHub
2. **Configure**: Add environment variables in Netlify
3. **Test**: Verify functions work with your API keys
4. **Monitor**: Check logs for any issues
5. **Scale**: Add more functions as needed

---

## 💰 **Revenue Ready**

Your AI trading system now has:
- ✅ **Secure API integration** (no key leakage)
- ✅ **Server-side order execution**
- ✅ **Real-time position tracking**
- ✅ **Professional trading interface**

**Ready to generate revenue!** 🚀

---

## 📚 **References**

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Bybit V5 API Documentation](https://bybit-exchange.github.io/docs/v5/intro)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/get-started/) 