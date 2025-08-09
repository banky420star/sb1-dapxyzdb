#!/usr/bin/env python3
"""
Alpha Vantage Integration for Node.js Trading System
This script provides a bridge between the Node.js trading system and Alpha Vantage API.
It can be called from Node.js to fetch real-time and historical data.
"""

import asyncio
import json
import os
import sys
from typing import Dict, List, Any, Optional
from alpha_vantage_pipeline import AlphaVantageClient, LocalFileSink, Pipeline

class AlphaVantageIntegration:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("ALPHAVANTAGE_API_KEY") or ""
        if not self.api_key:
            raise ValueError("ALPHAVANTAGE_API_KEY environment variable not set")
        
        self.client = AlphaVantageClient(self.api_key)
        self.sink = LocalFileSink("data/alpha_vantage")
        self.pipeline = Pipeline(self.client, self.sink)
        
    async def get_realtime_quote(self, symbol: str) -> Dict[str, Any]:
        """Get real-time quote for a symbol"""
        try:
            data = await self.client.quote(symbol)
            return {
                "success": True,
                "symbol": symbol,
                "data": data,
                "timestamp": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "success": False,
                "symbol": symbol,
                "error": str(e),
                "timestamp": asyncio.get_event_loop().time()
            }
    
    async def get_daily_data(self, symbol: str, outputsize: str = "compact") -> Dict[str, Any]:
        """Get daily time series data for a symbol"""
        try:
            data = await self.client.time_series_daily(symbol, outputsize=outputsize)
            return {
                "success": True,
                "symbol": symbol,
                "data": data,
                "timestamp": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "success": False,
                "symbol": symbol,
                "error": str(e),
                "timestamp": asyncio.get_event_loop().time()
            }
    
    async def get_multiple_quotes(self, symbols: List[str]) -> Dict[str, Any]:
        """Get real-time quotes for multiple symbols"""
        tasks = [self.get_realtime_quote(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {
            "success": True,
            "results": results,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    async def get_multiple_daily_data(self, symbols: List[str], outputsize: str = "compact") -> Dict[str, Any]:
        """Get daily data for multiple symbols"""
        tasks = [self.get_daily_data(symbol, outputsize) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {
            "success": True,
            "results": results,
            "timestamp": asyncio.get_event_loop().time()
        }
    
    async def save_data_to_file(self, name: str, data: Any) -> Dict[str, Any]:
        """Save data to file using the pipeline sink"""
        try:
            path = await self.sink.write(name, data)
            return {
                "success": True,
                "file_path": str(path),
                "timestamp": asyncio.get_event_loop().time()
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": asyncio.get_event_loop().time()
            }
    
    async def close(self):
        """Close the client connection"""
        await self.client.aclose()

async def main():
    """Main function to handle command-line interface"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No command specified. Use: quote, daily, multiple_quotes, multiple_daily, save"
        }))
        return
    
    command = sys.argv[1]
    
    try:
        integration = AlphaVantageIntegration()
        
        if command == "quote":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Symbol required for quote command"}))
                return
            
            symbol = sys.argv[2]
            result = await integration.get_realtime_quote(symbol)
            print(json.dumps(result))
            
        elif command == "daily":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Symbol required for daily command"}))
                return
            
            symbol = sys.argv[2]
            outputsize = sys.argv[3] if len(sys.argv) > 3 else "compact"
            result = await integration.get_daily_data(symbol, outputsize)
            print(json.dumps(result))
            
        elif command == "multiple_quotes":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Symbols required for multiple_quotes command"}))
                return
            
            symbols = sys.argv[2].split(",")
            result = await integration.get_multiple_quotes(symbols)
            print(json.dumps(result))
            
        elif command == "multiple_daily":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Symbols required for multiple_daily command"}))
                return
            
            symbols = sys.argv[2].split(",")
            outputsize = sys.argv[3] if len(sys.argv) > 3 else "compact"
            result = await integration.get_multiple_daily_data(symbols, outputsize)
            print(json.dumps(result))
            
        elif command == "save":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "error": "Name and data required for save command"}))
                return
            
            name = sys.argv[2]
            data = json.loads(sys.argv[3])
            result = await integration.save_data_to_file(name, data)
            print(json.dumps(result))
            
        else:
            print(json.dumps({
                "success": False,
                "error": f"Unknown command: {command}"
            }))
            
        await integration.close()
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    asyncio.run(main()) 