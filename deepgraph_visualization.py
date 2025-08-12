#!/usr/bin/env python3
"""
DeepGraph Visualization of AI Trading System Architecture
This script creates a comprehensive network graph showing the relationships
between different components of the AI trading system.
"""

import networkx as nx
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

def create_trading_system_graph():
    """Create a directed graph representing the AI trading system architecture"""
    G = nx.DiGraph()
    
    # Define node categories with colors
    node_categories = {
        'core': '#FF6B6B',          # Red - Core Components
        'ml': '#4ECDC4',            # Teal - ML Models
        'data': '#45B7D1',          # Blue - Data Sources
        'infrastructure': '#96CEB4', # Green - Infrastructure
        'frontend': '#FECA57',       # Yellow - Frontend
        'trading': '#FF9FF3',        # Pink - Trading Components
        'monitoring': '#54A0FF',     # Light Blue - Monitoring
        'database': '#48DBFB'        # Sky Blue - Database
    }
    
    # Add nodes with categories
    nodes = {
        # Core Components
        'Trading Engine': 'core',
        'Risk Manager': 'core',
        'Autonomous Orchestrator': 'core',
        'AI Notification Agent': 'core',
        
        # ML Models
        'Random Forest': 'ml',
        'LSTM': 'ml',
        'DDQN': 'ml',
        'Ensemble Predictor': 'ml',
        'ML Manager': 'ml',
        
        # Data Sources
        'Alpha Vantage API': 'data',
        'Bybit API': 'data',
        'MT5 Integration': 'data',
        'Data Manager': 'data',
        'Real-time Feed': 'data',
        
        # Infrastructure
        'PostgreSQL': 'infrastructure',
        'Redis': 'infrastructure',
        'MLflow': 'infrastructure',
        'Grafana': 'infrastructure',
        'Prometheus': 'infrastructure',
        'Loki': 'infrastructure',
        'Rate-Gate': 'infrastructure',
        
        # Frontend
        'React Dashboard': 'frontend',
        'WebSocket Client': 'frontend',
        'TradingView Charts': 'frontend',
        'MQL5 Widgets': 'frontend',
        
        # Trading Components
        'Position Manager': 'trading',
        'Order Manager': 'trading',
        'Portfolio Manager': 'trading',
        'Backtest Engine': 'trading',
        
        # Monitoring
        'Metrics Collector': 'monitoring',
        'Logger': 'monitoring',
        'Health Monitor': 'monitoring',
        
        # Database
        'TimescaleDB': 'database',
        'SQLite': 'database'
    }
    
    # Add nodes to graph
    for node, category in nodes.items():
        G.add_node(node, category=category)
    
    # Define edges (relationships)
    edges = [
        # Trading Engine connections
        ('Trading Engine', 'Risk Manager'),
        ('Trading Engine', 'ML Manager'),
        ('Trading Engine', 'Position Manager'),
        ('Trading Engine', 'Order Manager'),
        ('Trading Engine', 'MT5 Integration'),
        ('Trading Engine', 'AI Notification Agent'),
        
        # ML Model connections
        ('Random Forest', 'Ensemble Predictor'),
        ('LSTM', 'Ensemble Predictor'),
        ('DDQN', 'Ensemble Predictor'),
        ('ML Manager', 'Random Forest'),
        ('ML Manager', 'LSTM'),
        ('ML Manager', 'DDQN'),
        ('ML Manager', 'MLflow'),
        ('Ensemble Predictor', 'Trading Engine'),
        
        # Data flow
        ('Alpha Vantage API', 'Data Manager'),
        ('Bybit API', 'Data Manager'),
        ('Data Manager', 'Real-time Feed'),
        ('Real-time Feed', 'ML Manager'),
        ('Real-time Feed', 'Trading Engine'),
        ('Real-time Feed', 'WebSocket Client'),
        ('MT5 Integration', 'Trading Engine'),
        
        # Risk Management
        ('Risk Manager', 'Position Manager'),
        ('Risk Manager', 'Portfolio Manager'),
        ('Portfolio Manager', 'Trading Engine'),
        
        # Database connections
        ('Trading Engine', 'PostgreSQL'),
        ('ML Manager', 'PostgreSQL'),
        ('Data Manager', 'TimescaleDB'),
        ('AI Notification Agent', 'SQLite'),
        ('PostgreSQL', 'TimescaleDB'),
        
        # Infrastructure
        ('Rate-Gate', 'Redis'),
        ('Rate-Gate', 'Data Manager'),
        ('Metrics Collector', 'Prometheus'),
        ('Logger', 'Loki'),
        ('Prometheus', 'Grafana'),
        ('Loki', 'Grafana'),
        ('Health Monitor', 'Metrics Collector'),
        
        # Frontend connections
        ('WebSocket Client', 'React Dashboard'),
        ('React Dashboard', 'TradingView Charts'),
        ('React Dashboard', 'MQL5 Widgets'),
        ('Trading Engine', 'WebSocket Client'),
        
        # Autonomous Orchestrator
        ('Autonomous Orchestrator', 'Trading Engine'),
        ('Autonomous Orchestrator', 'ML Manager'),
        ('Autonomous Orchestrator', 'Risk Manager'),
        ('Autonomous Orchestrator', 'Health Monitor'),
        ('Autonomous Orchestrator', 'AI Notification Agent'),
        
        # Monitoring
        ('Trading Engine', 'Logger'),
        ('ML Manager', 'Logger'),
        ('Risk Manager', 'Logger'),
        ('Trading Engine', 'Metrics Collector'),
        ('ML Manager', 'Metrics Collector'),
        
        # Backtest
        ('Backtest Engine', 'ML Manager'),
        ('Backtest Engine', 'Risk Manager'),
        ('Backtest Engine', 'PostgreSQL')
    ]
    
    G.add_edges_from(edges)
    
    return G, node_categories

def visualize_deepgraph(G, node_categories):
    """Create a DeepGraph-style visualization"""
    plt.figure(figsize=(24, 18))
    
    # Use a hierarchical layout
    pos = nx.spring_layout(G, k=3, iterations=50, seed=42)
    
    # Draw edges with gradient effect
    for edge in G.edges():
        x1, y1 = pos[edge[0]]
        x2, y2 = pos[edge[1]]
        
        # Create gradient effect for edges
        ax = plt.gca()
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                   arrowprops=dict(arrowstyle='->', lw=1.5, 
                                 color='gray', alpha=0.6,
                                 connectionstyle="arc3,rad=0.1"))
    
    # Draw nodes with custom styling
    for node in G.nodes():
        x, y = pos[node]
        category = G.nodes[node]['category']
        color = node_categories[category]
        
        # Create node with glow effect
        for i in range(3, 0, -1):
            circle = plt.Circle((x, y), 0.05 + i*0.01, 
                              color=color, alpha=0.2)
            plt.gca().add_patch(circle)
        
        # Main node
        circle = plt.Circle((x, y), 0.05, color=color, 
                          ec='white', linewidth=2, zorder=10)
        plt.gca().add_patch(circle)
        
        # Add labels with background
        bbox_props = dict(boxstyle="round,pad=0.3", 
                         facecolor='white', alpha=0.8,
                         edgecolor=color, linewidth=1)
        plt.text(x, y-0.08, node, ha='center', va='top', 
                fontsize=9, weight='bold', bbox=bbox_props)
    
    # Create legend
    legend_elements = [mpatches.Patch(facecolor=color, edgecolor='black', 
                                    label=category.replace('_', ' ').title())
                      for category, color in node_categories.items()]
    
    plt.legend(handles=legend_elements, loc='upper left', 
              bbox_to_anchor=(0, 1), ncol=2, fontsize=10)
    
    # Add title and styling
    plt.title('AI Trading System - DeepGraph Architecture Visualization', 
             fontsize=24, weight='bold', pad=20)
    plt.axis('off')
    plt.tight_layout()
    
    # Add annotations for key relationships
    ax = plt.gca()
    
    # Highlight critical paths
    critical_paths = [
        ("Data Flow", 0.1, 0.9, '#45B7D1'),
        ("ML Pipeline", 0.3, 0.9, '#4ECDC4'),
        ("Trading Flow", 0.5, 0.9, '#FF9FF3'),
        ("Monitoring", 0.7, 0.9, '#54A0FF'),
        ("Infrastructure", 0.9, 0.9, '#96CEB4')
    ]
    
    for label, x, y, color in critical_paths:
        bbox = FancyBboxPatch((x-0.08, y-0.02), 0.16, 0.04,
                             boxstyle="round,pad=0.01",
                             facecolor=color, alpha=0.3,
                             edgecolor=color, linewidth=2)
        ax.add_patch(bbox)
        plt.text(x, y, label, ha='center', va='center',
                fontsize=10, weight='bold')
    
    plt.savefig('ai_trading_system_deepgraph.png', dpi=300, bbox_inches='tight')
    plt.savefig('ai_trading_system_deepgraph.pdf', bbox_inches='tight')
    plt.show()

def create_component_interaction_matrix():
    """Create an interaction matrix showing component dependencies"""
    components = ['Trading Engine', 'ML Manager', 'Risk Manager', 
                 'Data Manager', 'AI Agent', 'Orchestrator',
                 'Frontend', 'Database', 'Monitoring']
    
    # Create interaction matrix
    n = len(components)
    matrix = np.zeros((n, n))
    
    # Define interactions (1 = direct interaction, 0.5 = indirect)
    interactions = {
        (0, 1): 1, (0, 2): 1, (0, 3): 1, (0, 4): 1, (0, 7): 1,
        (1, 3): 1, (1, 7): 1, (1, 8): 0.5,
        (2, 0): 1, (2, 7): 0.5,
        (3, 7): 1, (3, 6): 1,
        (4, 0): 0.5, (4, 7): 1,
        (5, 0): 1, (5, 1): 1, (5, 2): 1, (5, 4): 1,
        (6, 0): 1, (6, 3): 1,
        (8, 0): 0.5, (8, 1): 0.5
    }
    
    for (i, j), value in interactions.items():
        matrix[i, j] = value
        matrix[j, i] = value  # Make symmetric
    
    # Visualize matrix
    plt.figure(figsize=(12, 10))
    im = plt.imshow(matrix, cmap='YlOrRd', aspect='auto')
    
    # Add labels
    plt.xticks(range(n), components, rotation=45, ha='right')
    plt.yticks(range(n), components)
    
    # Add values
    for i in range(n):
        for j in range(n):
            if matrix[i, j] > 0:
                plt.text(j, i, f'{matrix[i, j]:.1f}', 
                        ha='center', va='center',
                        color='white' if matrix[i, j] > 0.7 else 'black')
    
    plt.colorbar(im, label='Interaction Strength')
    plt.title('Component Interaction Matrix', fontsize=16, weight='bold')
    plt.tight_layout()
    plt.savefig('component_interaction_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_data_flow_diagram():
    """Create a data flow diagram showing how data moves through the system"""
    G = nx.DiGraph()
    
    # Define data flow stages
    stages = {
        'Market Data': (0, 4),
        'API Gateway': (1, 4),
        'Rate Limiter': (2, 4),
        'Data Manager': (3, 4),
        'Feature Engine': (4, 3),
        'ML Models': (5, 3),
        'Prediction Engine': (6, 3),
        'Risk Assessment': (7, 2),
        'Trading Decision': (8, 2),
        'Order Execution': (9, 1),
        'MT5/Exchange': (10, 1),
        'Monitoring': (5, 0),
        'Database': (3, 0)
    }
    
    # Add nodes
    for node, pos in stages.items():
        G.add_node(node, pos=pos)
    
    # Define data flow edges
    flows = [
        ('Market Data', 'API Gateway'),
        ('API Gateway', 'Rate Limiter'),
        ('Rate Limiter', 'Data Manager'),
        ('Data Manager', 'Feature Engine'),
        ('Data Manager', 'Database'),
        ('Feature Engine', 'ML Models'),
        ('ML Models', 'Prediction Engine'),
        ('Prediction Engine', 'Risk Assessment'),
        ('Risk Assessment', 'Trading Decision'),
        ('Trading Decision', 'Order Execution'),
        ('Order Execution', 'MT5/Exchange'),
        ('Data Manager', 'Monitoring'),
        ('ML Models', 'Monitoring'),
        ('Trading Decision', 'Monitoring'),
        ('Database', 'Feature Engine')
    ]
    
    G.add_edges_from(flows)
    
    # Visualize
    plt.figure(figsize=(16, 10))
    pos = nx.get_node_attributes(G, 'pos')
    
    # Draw nodes with gradient
    for node, (x, y) in pos.items():
        # Gradient effect
        for i in range(5, 0, -1):
            circle = plt.Circle((x, y), 0.3 + i*0.05, 
                              color='#3498db', alpha=0.1)
            plt.gca().add_patch(circle)
        
        # Main node
        circle = plt.Circle((x, y), 0.3, color='#3498db', 
                          ec='#2c3e50', linewidth=3)
        plt.gca().add_patch(circle)
        
        # Label
        plt.text(x, y, node, ha='center', va='center',
                fontsize=10, weight='bold', color='white')
    
    # Draw edges with flow animation effect
    for edge in G.edges():
        x1, y1 = pos[edge[0]]
        x2, y2 = pos[edge[1]]
        
        # Arrow with gradient
        plt.arrow(x1, y1, (x2-x1)*0.8, (y2-y1)*0.8,
                 head_width=0.15, head_length=0.1,
                 fc='#e74c3c', ec='#c0392b', linewidth=2,
                 alpha=0.7)
    
    plt.xlim(-1, 11)
    plt.ylim(-1, 5)
    plt.axis('off')
    plt.title('AI Trading System - Data Flow Diagram', 
             fontsize=20, weight='bold')
    plt.tight_layout()
    plt.savefig('data_flow_diagram.png', dpi=300, bbox_inches='tight')
    plt.show()

if __name__ == "__main__":
    print("Creating AI Trading System DeepGraph Visualization...")
    
    # Create main architecture graph
    G, node_categories = create_trading_system_graph()
    visualize_deepgraph(G, node_categories)
    
    # Create component interaction matrix
    create_component_interaction_matrix()
    
    # Create data flow diagram
    create_data_flow_diagram()
    
    print("\nVisualization complete! Generated files:")
    print("- ai_trading_system_deepgraph.png")
    print("- ai_trading_system_deepgraph.pdf")
    print("- component_interaction_matrix.png")
    print("- data_flow_diagram.png")
    
    # Print graph statistics
    print(f"\nGraph Statistics:")
    print(f"- Total Nodes: {G.number_of_nodes()}")
    print(f"- Total Edges: {G.number_of_edges()}")
    print(f"- Average Degree: {sum(dict(G.degree()).values()) / G.number_of_nodes():.2f}")
    print(f"- Density: {nx.density(G):.3f}")
    
    # Find most connected components
    degree_centrality = nx.degree_centrality(G)
    top_nodes = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"\nMost Connected Components:")
    for node, centrality in top_nodes:
        print(f"- {node}: {centrality:.3f}")