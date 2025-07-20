#!/usr/bin/env python3
"""
Test script to demonstrate the Alpha Vantage integration
"""

import asyncio
import json
from alpha_vantage_integration import AlphaVantageIntegration

async def test_alpha_vantage():
    print("🧪 Testing Alpha Vantage Integration")
    print("=" * 50)
    
    try:
        integration = AlphaVantageIntegration()
        
        # Test 1: Get real-time quote
        print("\n1. Testing real-time quote for AAPL...")
        result = await integration.get_realtime_quote("AAPL")
        print(f"✅ Success: {result['success']}")
        if result['success']:
            print(f"   Symbol: {result['symbol']}")
            print(f"   Data: {json.dumps(result['data'], indent=2)}")
        
        # Test 2: Get daily data
        print("\n2. Testing daily data for AAPL...")
        result = await integration.get_daily_data("AAPL", "compact")
        print(f"✅ Success: {result['success']}")
        if result['success']:
            print(f"   Symbol: {result['symbol']}")
            print(f"   Data keys: {list(result['data'].keys())}")
        
        # Test 3: Get multiple quotes
        print("\n3. Testing multiple quotes...")
        result = await integration.get_multiple_quotes(["AAPL", "MSFT", "GOOGL"])
        print(f"✅ Success: {result['success']}")
        if result['success']:
            print(f"   Results: {len(result['results'])} symbols")
            for r in result['results']:
                if r['success']:
                    print(f"   - {r['symbol']}: OK")
                else:
                    print(f"   - {r['symbol']}: {r['error']}")
        
        await integration.close()
        
        print("\n🎉 All tests completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_alpha_vantage()) 