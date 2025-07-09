#!/usr/bin/env python3
"""
MQL5 Data Collector for Trading System
Collects data from MQL5 widgets and APIs and stores it in the database.
"""

import asyncio
import json
import os
import time
import yaml
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from pathlib import Path

class MQL5Collector:
    def __init__(self, config_file: str = "widgets.yaml", db_path: str = "data/trading.db"):
        self.config_file = config_file
        self.db_path = db_path
        self.config = self.load_config()
        self.is_running = False
        self.collectors = {}
        
    def load_config(self) -> Dict[str, Any]:
        """Load widget configuration from YAML file"""
        try:
            with open(self.config_file, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"Config file {self.config_file} not found")
            return {"widgets": [], "settings": {}}
        except yaml.YAMLError as e:
            print(f"Error parsing config file: {e}")
            return {"widgets": [], "settings": {}}
    
    def init_database(self):
        """Initialize database tables for MQL5 data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Economic calendar events
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS economic_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE,
                country TEXT,
                title TEXT,
                actual TEXT,
                previous TEXT,
                forecast TEXT,
                impact TEXT,
                timestamp INTEGER,
                event_time INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # News events
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS news_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                news_id TEXT UNIQUE,
                title TEXT,
                content TEXT,
                source TEXT,
                url TEXT,
                timestamp INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Widget data cache
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS widget_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                widget_id TEXT,
                data_type TEXT,
                data_json TEXT,
                timestamp INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized for MQL5 data")
    
    async def collect_economic_calendar(self, widget_config: Dict[str, Any]):
        """Collect economic calendar data from Tradays API"""
        try:
            # Get date range (today + next 7 days)
            today = datetime.now()
            end_date = today + timedelta(days=7)
            
            params = {
                "date_from": today.strftime("%Y-%m-%d"),
                "date_to": end_date.strftime("%Y-%m-%d"),
                "country": "US"  # Can be expanded to multiple countries
            }
            
            response = requests.get(
                "https://ecapi.tradays.com/series",
                params=params,
                timeout=10
            )
            response.raise_for_status()
            
            events = response.json()
            
            # Store in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for event in events:
                try:
                    cursor.execute('''
                        INSERT OR REPLACE INTO economic_events 
                        (event_id, country, title, actual, previous, forecast, impact, timestamp, event_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        event.get('id'),
                        event.get('country'),
                        event.get('title'),
                        event.get('actual'),
                        event.get('previous'),
                        event.get('forecast'),
                        event.get('impact'),
                        int(time.time()),
                        event.get('timestamp', 0)
                    ))
                except Exception as e:
                    print(f"Error storing event {event.get('id')}: {e}")
            
            conn.commit()
            conn.close()
            
            print(f"Collected {len(events)} economic events")
            return events
            
        except Exception as e:
            print(f"Error collecting economic calendar: {e}")
            return []
    
    async def collect_news_feed(self, widget_config: Dict[str, Any]):
        """Collect news data from MQL5 API"""
        try:
            # Note: This is a placeholder as MQL5 news API might require authentication
            # For now, we'll simulate news data
            mock_news = [
                {
                    "id": f"news_{int(time.time())}",
                    "title": "EUR/USD reaches new high on ECB policy decision",
                    "content": "The Euro strengthened against the US Dollar following the European Central Bank's latest policy announcement...",
                    "source": "Reuters",
                    "url": "https://example.com/news/1",
                    "timestamp": int(time.time())
                }
            ]
            
            # Store in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for news in mock_news:
                try:
                    cursor.execute('''
                        INSERT OR REPLACE INTO news_events 
                        (news_id, title, content, source, url, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        news['id'],
                        news['title'],
                        news['content'],
                        news['source'],
                        news['url'],
                        news['timestamp']
                    ))
                except Exception as e:
                    print(f"Error storing news {news['id']}: {e}")
            
            conn.commit()
            conn.close()
            
            print(f"Collected {len(mock_news)} news items")
            return mock_news
            
        except Exception as e:
            print(f"Error collecting news feed: {e}")
            return []
    
    async def collect_widget_data(self, widget_config: Dict[str, Any]):
        """Collect data for a specific widget"""
        widget_type = widget_config.get('type')
        
        if widget_type == 'economic_calendar':
            return await self.collect_economic_calendar(widget_config)
        elif widget_type == 'news_feed':
            return await self.collect_news_feed(widget_config)
        else:
            print(f"Unknown widget type: {widget_type}")
            return []
    
    async def start_collector(self, widget_config: Dict[str, Any]):
        """Start a collector for a specific widget"""
        widget_id = widget_config['id']
        refresh_interval = widget_config.get('refresh', 300)
        
        print(f"Starting collector for {widget_id} (refresh: {refresh_interval}s)")
        
        while self.is_running:
            try:
                await self.collect_widget_data(widget_config)
                await asyncio.sleep(refresh_interval)
            except Exception as e:
                print(f"Error in collector {widget_id}: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
    
    async def start_all_collectors(self):
        """Start all enabled collectors"""
        self.is_running = True
        self.init_database()
        
        # Start collectors for widgets with APIs
        tasks = []
        for widget in self.config.get('widgets', []):
            if widget.get('enabled', True) and widget.get('api'):
                task = asyncio.create_task(self.start_collector(widget))
                tasks.append(task)
        
        if tasks:
            print(f"Started {len(tasks)} collectors")
            await asyncio.gather(*tasks)
        else:
            print("No collectors to start")
    
    def stop_collectors(self):
        """Stop all collectors"""
        self.is_running = False
        print("Stopping all collectors")
    
    def get_economic_events(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get economic events from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_time = int(time.time()) - (hours * 3600)
        
        cursor.execute('''
            SELECT event_id, country, title, actual, previous, forecast, impact, event_time
            FROM economic_events
            WHERE timestamp > ?
            ORDER BY event_time DESC
        ''', (cutoff_time,))
        
        events = []
        for row in cursor.fetchall():
            events.append({
                'id': row[0],
                'country': row[1],
                'title': row[2],
                'actual': row[3],
                'previous': row[4],
                'forecast': row[5],
                'impact': row[6],
                'event_time': row[7]
            })
        
        conn.close()
        return events
    
    def get_news_events(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get news events from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_time = int(time.time()) - (hours * 3600)
        
        cursor.execute('''
            SELECT news_id, title, content, source, url, timestamp
            FROM news_events
            WHERE timestamp > ?
            ORDER BY timestamp DESC
        ''', (cutoff_time,))
        
        news = []
        for row in cursor.fetchall():
            news.append({
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'source': row[3],
                'url': row[4],
                'timestamp': row[5]
            })
        
        conn.close()
        return news

async def main():
    """Main function for standalone collector"""
    collector = MQL5Collector()
    
    try:
        await collector.start_all_collectors()
    except KeyboardInterrupt:
        print("Shutting down...")
        collector.stop_collectors()

if __name__ == "__main__":
    asyncio.run(main()) 