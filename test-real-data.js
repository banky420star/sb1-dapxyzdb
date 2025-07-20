#!/usr/bin/env node

import { UnirateClient } from 'unirate-api'
import finnhub from 'finnhub'

console.log('🧪 Testing Real Data Connections...')
console.log('=====================================')

// Test UniRateAPI
console.log('\n1. Testing UniRateAPI...')
const unirateClient = new UnirateClient('UOaBj21hy46nIf54j0ykaP0KGLkXvDJflgjqiiwAanzrVQPXcL0tA9aNPJ9sik5R')

try {
  const usdEurRate = await unirateClient.getRate('USD', 'EUR')
  console.log(`✅ USD/EUR: ${usdEurRate}`)
  
  const gbpUsdRate = await unirateClient.getRate('GBP', 'USD')
  console.log(`✅ GBP/USD: ${gbpUsdRate}`)
  
  const jpyUsdRate = await unirateClient.getRate('JPY', 'USD')
  console.log(`✅ JPY/USD: ${jpyUsdRate}`)
  
} catch (error) {
  console.log(`❌ UniRateAPI Error: ${error.message}`)
}

// Test Finnhub
console.log('\n2. Testing Finnhub...')
const finnhubClient = new finnhub.DefaultApi({
  apiKey: 'd1o63spr01qtrauvcglgd1o63spr01qtrauvcgm0'
})

try {
  const aaplQuote = await new Promise((resolve, reject) => {
    finnhubClient.quote('AAPL', (error, data, response) => {
      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    })
  })
  console.log(`✅ AAPL: $${aaplQuote.c} (Change: ${aaplQuote.d}%)`)
  
  const msftQuote = await new Promise((resolve, reject) => {
    finnhubClient.quote('MSFT', (error, data, response) => {
      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    })
  })
  console.log(`✅ MSFT: $${msftQuote.c} (Change: ${msftQuote.d}%)`)
  
  const tslaQuote = await new Promise((resolve, reject) => {
    finnhubClient.quote('TSLA', (error, data, response) => {
      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    })
  })
  console.log(`✅ TSLA: $${tslaQuote.c} (Change: ${tslaQuote.d}%)`)
  
} catch (error) {
  console.log(`❌ Finnhub Error: ${error.message}`)
}

// Test server connection
console.log('\n3. Testing Server Connection...')
try {
  const response = await fetch('http://45.76.136.30:8000/api/health')
  if (response.ok) {
    const data = await response.json()
    console.log(`✅ Server Health: ${JSON.stringify(data)}`)
  } else {
    console.log(`❌ Server Error: ${response.status}`)
  }
} catch (error) {
  console.log(`❌ Server Connection Error: ${error.message}`)
}

console.log('\n�� Test Complete!') 