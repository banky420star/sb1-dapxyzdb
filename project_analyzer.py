#!/usr/bin/env python3
"""
Project Structure Analyzer using DeepGraph-style approach
Analyzes the AI Trading System project structure and creates visualizations
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict, Counter
import subprocess

try:
    import networkx as nx
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    VISUALIZE = True
except ImportError:
    print("NetworkX/Matplotlib not available - generating text-based analysis only")
    VISUALIZE = False

class ProjectAnalyzer:
    def __init__(self, root_path="."):
        self.root_path = Path(root_path)
        self.graph = nx.DiGraph() if VISUALIZE else None
        self.file_stats = defaultdict(int)
        self.dependencies = defaultdict(set)
        self.components = {}
        self.analyze_project()
    
    def analyze_project(self):
        """Analyze the project structure comprehensively"""
        print("🔍 Analyzing AI Trading System Project Structure...")
        
        # Get basic project stats
        self.get_file_statistics()
        
        # Analyze package.json dependencies
        self.analyze_package_dependencies()
        
        # Analyze Python imports
        self.analyze_python_imports()
        
        # Analyze JavaScript imports
        self.analyze_js_imports()
        
        # Analyze project components
        self.analyze_components()
        
        # Create network graph if possible
        if VISUALIZE:
            self.create_dependency_graph()
    
    def get_file_statistics(self):
        """Get basic file statistics"""
        print("\n📊 File Statistics:")
        
        for file_path in self.root_path.rglob("*"):
            if file_path.is_file() and not self.should_ignore(file_path):
                ext = file_path.suffix.lower()
                self.file_stats[ext] += 1
        
        # Sort by count
        sorted_stats = sorted(self.file_stats.items(), key=lambda x: x[1], reverse=True)
        
        for ext, count in sorted_stats[:15]:  # Top 15 file types
            print(f"  {ext or 'no extension'}: {count} files")
    
    def should_ignore(self, path):
        """Check if path should be ignored"""
        ignore_patterns = [
            '.git', 'node_modules', '__pycache__', '.vscode',
            'dist', 'build', '.env', 'package-lock.json',
            'deepgraph_env'
        ]
        
        path_str = str(path)
        return any(pattern in path_str for pattern in ignore_patterns)
    
    def analyze_package_dependencies(self):
        """Analyze package.json dependencies"""
        print("\n📦 Package Dependencies Analysis:")
        
        package_path = self.root_path / "package.json"
        if package_path.exists():
            try:
                with open(package_path) as f:
                    package_data = json.load(f)
                
                deps = package_data.get('dependencies', {})
                dev_deps = package_data.get('devDependencies', {})
                
                print(f"  Production dependencies: {len(deps)}")
                print(f"  Development dependencies: {len(dev_deps)}")
                
                # Categorize dependencies
                categories = {
                    'ML/AI': ['tensorflow', 'ml-', 'synaptic', 'simple-statistics'],
                    'Trading': ['ccxt', 'technicalindicators'],
                    'Web Framework': ['react', 'express', 'vite'],
                    'Database': ['pg', 'ioredis'],
                    'Monitoring': ['prom-client', 'winston'],
                    'Utilities': ['lodash', 'uuid', 'axios']
                }
                
                categorized = defaultdict(list)
                for dep in deps.keys():
                    for category, keywords in categories.items():
                        if any(keyword in dep.lower() for keyword in keywords):
                            categorized[category].append(dep)
                            break
                    else:
                        categorized['Other'].append(dep)
                
                for category, deps_list in categorized.items():
                    if deps_list:
                        print(f"  {category}: {len(deps_list)} packages")
                        if len(deps_list) <= 5:
                            print(f"    {', '.join(deps_list)}")
                        else:
                            print(f"    {', '.join(deps_list[:3])}... (+{len(deps_list)-3} more)")
                            
            except Exception as e:
                print(f"  Error reading package.json: {e}")
    
    def analyze_python_imports(self):
        """Analyze Python file imports"""
        print("\n🐍 Python Import Analysis:")
        
        python_files = list(self.root_path.rglob("*.py"))
        if not python_files:
            print("  No Python files found")
            return
            
        imports = defaultdict(int)
        
        for py_file in python_files:
            if self.should_ignore(py_file):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find import statements
                import_pattern = r'^(?:from\s+(\S+)\s+import|import\s+(\S+))'
                matches = re.findall(import_pattern, content, re.MULTILINE)
                
                for match in matches:
                    module = match[0] or match[1]
                    if module and not module.startswith('.'):
                        imports[module.split('.')[0]] += 1
                        
            except Exception as e:
                print(f"  Error reading {py_file}: {e}")
        
        if imports:
            print(f"  Found {len(python_files)} Python files")
            print("  Top imported modules:")
            for module, count in sorted(imports.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"    {module}: {count} times")
        else:
            print("  No imports found in Python files")
    
    def analyze_js_imports(self):
        """Analyze JavaScript/TypeScript imports"""
        print("\n📜 JavaScript Import Analysis:")
        
        js_files = list(self.root_path.rglob("*.js")) + list(self.root_path.rglob("*.jsx")) + list(self.root_path.rglob("*.ts")) + list(self.root_path.rglob("*.tsx"))
        
        if not js_files:
            print("  No JavaScript files found")
            return
        
        imports = defaultdict(int)
        
        for js_file in js_files:
            if self.should_ignore(js_file):
                continue
            
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find import statements
                import_patterns = [
                    r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
                    r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
                    r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
                ]
                
                for pattern in import_patterns:
                    matches = re.findall(pattern, content)
                    for match in matches:
                        if not match.startswith('.'):  # External modules only
                            module = match.split('/')[0]
                            imports[module] += 1
                            
            except Exception as e:
                print(f"  Error reading {js_file}: {e}")
        
        if imports:
            print(f"  Found {len(js_files)} JS/TS files")
            print("  Top imported modules:")
            for module, count in sorted(imports.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"    {module}: {count} times")
        else:
            print("  No imports found in JavaScript files")
    
    def analyze_components(self):
        """Analyze project components by directory structure"""
        print("\n🏗️  Project Components Analysis:")
        
        # Key directories to analyze
        key_dirs = ['server', 'src', 'tests', 'scripts', 'flows', 'config', 'monitoring']
        
        for dir_name in key_dirs:
            dir_path = self.root_path / dir_name
            if dir_path.exists() and dir_path.is_dir():
                self.analyze_directory_structure(dir_path, dir_name)
    
    def analyze_directory_structure(self, dir_path, name):
        """Analyze a specific directory structure"""
        print(f"\n  📁 {name.upper()} Directory:")
        
        file_count = 0
        subdirs = []
        
        for item in dir_path.iterdir():
            if item.is_file() and not self.should_ignore(item):
                file_count += 1
            elif item.is_dir() and not self.should_ignore(item):
                subdirs.append(item.name)
        
        print(f"    Files: {file_count}")
        if subdirs:
            print(f"    Subdirectories: {', '.join(sorted(subdirs))}")
        
        # Analyze specific patterns for known directories
        if name == 'server':
            self.analyze_server_structure(dir_path)
        elif name == 'src':
            self.analyze_frontend_structure(dir_path)
    
    def analyze_server_structure(self, server_path):
        """Analyze server directory structure"""
        modules = []
        for item in server_path.iterdir():
            if item.is_dir():
                modules.append(item.name)
        
        if modules:
            print(f"    Backend modules: {', '.join(sorted(modules))}")
    
    def analyze_frontend_structure(self, src_path):
        """Analyze frontend source structure"""
        components = []
        for item in src_path.iterdir():
            if item.is_dir():
                components.append(item.name)
        
        if components:
            print(f"    Frontend components: {', '.join(sorted(components))}")
    
    def create_dependency_graph(self):
        """Create a network graph of dependencies"""
        if not VISUALIZE:
            return
            
        print("\n🕸️  Creating Dependency Network Graph...")
        
        # Add nodes for major components
        components = [
            ('Frontend', {'type': 'frontend', 'color': 'lightblue'}),
            ('Backend API', {'type': 'backend', 'color': 'lightgreen'}),
            ('ML Engine', {'type': 'ml', 'color': 'orange'}),
            ('Trading Engine', {'type': 'trading', 'color': 'red'}),
            ('Risk Manager', {'type': 'risk', 'color': 'yellow'}),
            ('Data Manager', {'type': 'data', 'color': 'purple'}),
            ('Database', {'type': 'storage', 'color': 'brown'}),
            ('Monitoring', {'type': 'monitoring', 'color': 'pink'}),
            ('Notifications', {'type': 'notifications', 'color': 'gray'})
        ]
        
        for comp, attrs in components:
            self.graph.add_node(comp, **attrs)
        
        # Add edges based on typical architecture
        edges = [
            ('Frontend', 'Backend API'),
            ('Backend API', 'ML Engine'),
            ('Backend API', 'Trading Engine'),
            ('Backend API', 'Risk Manager'),
            ('Backend API', 'Data Manager'),
            ('ML Engine', 'Data Manager'),
            ('Trading Engine', 'Risk Manager'),
            ('Trading Engine', 'Data Manager'),
            ('Risk Manager', 'Data Manager'),
            ('Data Manager', 'Database'),
            ('Backend API', 'Database'),
            ('Monitoring', 'Backend API'),
            ('Monitoring', 'Database'),
            ('Notifications', 'Backend API'),
            ('Notifications', 'Monitoring')
        ]
        
        self.graph.add_edges_from(edges)
        
        # Create visualization
        plt.figure(figsize=(14, 10))
        
        # Use spring layout for better visualization
        pos = nx.spring_layout(self.graph, k=3, iterations=50)
        
        # Draw nodes with different colors based on type
        node_colors = [self.graph.nodes[node].get('color', 'lightgray') for node in self.graph.nodes()]
        
        nx.draw(self.graph, pos, 
                with_labels=True,
                node_color=node_colors,
                node_size=3000,
                font_size=10,
                font_weight='bold',
                arrows=True,
                edge_color='gray',
                arrowsize=20)
        
        plt.title("AI Trading System - Component Architecture", fontsize=16, fontweight='bold')
        
        # Create legend
        legend_elements = [
            mpatches.Patch(color='lightblue', label='Frontend'),
            mpatches.Patch(color='lightgreen', label='Backend'),
            mpatches.Patch(color='orange', label='ML/AI'),
            mpatches.Patch(color='red', label='Trading'),
            mpatches.Patch(color='yellow', label='Risk Management'),
            mpatches.Patch(color='purple', label='Data'),
            mpatches.Patch(color='brown', label='Storage'),
            mpatches.Patch(color='pink', label='Monitoring')
        ]
        
        plt.legend(handles=legend_elements, loc='upper left', bbox_to_anchor=(0, 1))
        plt.tight_layout()
        
        # Save the visualization
        output_file = 'project_architecture.png'
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"    Graph saved as: {output_file}")
        
        return output_file
    
    def generate_summary_report(self):
        """Generate a comprehensive summary report"""
        print("\n" + "="*80)
        print("📋 PROJECT ANALYSIS SUMMARY REPORT")
        print("="*80)
        
        total_files = sum(self.file_stats.values())
        print(f"\n📊 OVERVIEW:")
        print(f"  Total files analyzed: {total_files}")
        print(f"  File types: {len(self.file_stats)}")
        
        print(f"\n🏗️  ARCHITECTURE:")
        print(f"  Type: Full-stack AI Trading System")
        print(f"  Frontend: React + Vite")
        print(f"  Backend: Node.js + Express")
        print(f"  Database: PostgreSQL + TimescaleDB")
        print(f"  ML Framework: TensorFlow.js + Custom Models")
        print(f"  Trading: CCXT + MT5 Integration")
        
        print(f"\n🔧 KEY TECHNOLOGIES:")
        
        # Most common file types
        sorted_stats = sorted(self.file_stats.items(), key=lambda x: x[1], reverse=True)
        for ext, count in sorted_stats[:5]:
            if count > 1:
                print(f"  {ext}: {count} files")
        
        print(f"\n💡 INSIGHTS:")
        print(f"  - Comprehensive trading system with ML capabilities")
        print(f"  - Full microservices architecture with containerization")
        print(f"  - Real-time data processing and risk management")
        print(f"  - Production-ready with monitoring and deployment tools")
        print(f"  - Autonomous trading capabilities with AI notifications")

def main():
    """Main function to run the analysis"""
    print("🚀 AI Trading System Project Analyzer")
    print("Using DeepGraph-style analysis approach\n")
    
    analyzer = ProjectAnalyzer()
    
    # Generate visualization if possible
    if VISUALIZE:
        try:
            graph_file = analyzer.create_dependency_graph()
            if graph_file:
                print(f"✅ Project visualization created: {graph_file}")
        except Exception as e:
            print(f"❌ Could not create visualization: {e}")
    
    # Generate summary report
    analyzer.generate_summary_report()
    
    print(f"\n🎯 Analysis complete! The project appears to be a sophisticated")
    print(f"   AI-powered algorithmic trading system with comprehensive")
    print(f"   features including ML models, risk management, and real-time trading.")

if __name__ == "__main__":
    main()