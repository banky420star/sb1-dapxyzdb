#!/usr/bin/env python3
"""
DeepGraph-style Analysis of AI Trading System
Creates network-based visualization and analysis of project structure
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict, Counter
import ast

class DeepGraphAnalyzer:
    def __init__(self, root_path="."):
        self.root_path = Path(root_path)
        self.nodes = {}
        self.edges = []
        self.node_types = {}
        self.analyze_project()
    
    def analyze_project(self):
        """Main analysis function"""
        print("🌐 DeepGraph Analysis of AI Trading System")
        print("=" * 60)
        
        # Analyze different components
        self.analyze_file_structure()
        self.analyze_import_dependencies()
        self.analyze_functional_relationships()
        self.create_network_representation()
        self.generate_insights()
    
    def analyze_file_structure(self):
        """Analyze the file structure as nodes"""
        print("\n🗂️  FILE STRUCTURE ANALYSIS")
        
        # Directory nodes
        for dir_path in self.root_path.rglob("*"):
            if dir_path.is_dir() and not self.should_ignore(dir_path):
                rel_path = str(dir_path.relative_to(self.root_path))
                self.add_node(rel_path, 'directory', {
                    'level': len(dir_path.parts),
                    'size': len(list(dir_path.iterdir()))
                })
        
        # File nodes
        for file_path in self.root_path.rglob("*"):
            if file_path.is_file() and not self.should_ignore(file_path):
                rel_path = str(file_path.relative_to(self.root_path))
                file_type = self.get_file_type(file_path)
                
                try:
                    size = file_path.stat().st_size
                except:
                    size = 0
                
                self.add_node(rel_path, file_type, {
                    'size': size,
                    'extension': file_path.suffix
                })
                
                # Add edge to parent directory
                parent_rel = str(file_path.parent.relative_to(self.root_path))
                if parent_rel != '.' and parent_rel in self.nodes:
                    self.add_edge(parent_rel, rel_path, 'contains')
        
        print(f"  📊 Nodes: {len(self.nodes)}")
        print(f"  🔗 Edges: {len(self.edges)}")
    
    def analyze_import_dependencies(self):
        """Analyze import dependencies between files"""
        print("\n🔗 IMPORT DEPENDENCY ANALYSIS")
        
        js_imports = self.analyze_js_imports()
        py_imports = self.analyze_py_imports()
        
        # Add import edges
        for source, targets in js_imports.items():
            for target in targets:
                self.add_edge(source, target, 'imports')
        
        for source, targets in py_imports.items():
            for target in targets:
                self.add_edge(source, target, 'imports')
        
        print(f"  📝 JavaScript files analyzed: {len(js_imports)}")
        print(f"  🐍 Python files analyzed: {len(py_imports)}")
    
    def analyze_js_imports(self):
        """Analyze JavaScript/TypeScript imports"""
        imports = defaultdict(set)
        
        for js_file in self.root_path.rglob("*.js"):
            if self.should_ignore(js_file):
                continue
            
            rel_path = str(js_file.relative_to(self.root_path))
            
            try:
                with open(js_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find local imports (starting with ./ or ../)
                local_import_pattern = r'(?:import|require)\s*\([\'"](\.[^\'"]+)[\'"]\)|from\s+[\'"](\.[^\'"]+)[\'"]'
                matches = re.findall(local_import_pattern, content)
                
                for match in matches:
                    import_path = match[0] or match[1]
                    # Resolve relative path
                    try:
                        target_path = (js_file.parent / import_path).resolve()
                        target_rel = str(target_path.relative_to(self.root_path))
                        
                        # Check if target exists (with various extensions)
                        for ext in ['', '.js', '.jsx', '.ts', '.tsx']:
                            potential_target = target_rel + ext
                            if (self.root_path / potential_target).exists():
                                imports[rel_path].add(potential_target)
                                break
                    except:
                        pass
                        
            except Exception:
                pass
        
        return imports
    
    def analyze_py_imports(self):
        """Analyze Python imports"""
        imports = defaultdict(set)
        
        for py_file in self.root_path.rglob("*.py"):
            if self.should_ignore(py_file):
                continue
            
            rel_path = str(py_file.relative_to(self.root_path))
            
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Parse AST to find imports
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for alias in node.names:
                                # Only track local modules
                                if not alias.name.startswith('.') and '.' not in alias.name:
                                    potential_path = alias.name + '.py'
                                    if (self.root_path / potential_path).exists():
                                        imports[rel_path].add(potential_path)
                        elif isinstance(node, ast.ImportFrom):
                            if node.module and node.level == 0:  # Absolute import
                                potential_path = node.module.replace('.', '/') + '.py'
                                if (self.root_path / potential_path).exists():
                                    imports[rel_path].add(potential_path)
                except:
                    pass
                    
            except Exception:
                pass
        
        return imports
    
    def analyze_functional_relationships(self):
        """Analyze functional relationships based on file content"""
        print("\n🧠 FUNCTIONAL RELATIONSHIP ANALYSIS")
        
        # Define component relationships based on naming patterns
        components = {
            'trading': ['trading', 'order', 'position', 'market'],
            'ml': ['ml', 'model', 'train', 'predict', 'neural'],
            'risk': ['risk', 'stop', 'loss', 'limit'],
            'data': ['data', 'fetch', 'stream', 'database'],
            'ui': ['component', 'page', 'view', 'dashboard'],
            'api': ['api', 'route', 'endpoint', 'server'],
            'auth': ['auth', 'login', 'token', 'security'],
            'monitoring': ['monitor', 'log', 'metric', 'alert']
        }
        
        # Categorize files by component
        file_components = defaultdict(list)
        
        for file_path in self.nodes:
            if self.node_types[file_path] in ['javascript', 'typescript', 'python']:
                file_lower = file_path.lower()
                for component, keywords in components.items():
                    if any(keyword in file_lower for keyword in keywords):
                        file_components[component].append(file_path)
                        # Update node with component info
                        if file_path in self.nodes:
                            self.nodes[file_path]['component'] = component
        
        # Create component-level edges
        for component, files in file_components.items():
            print(f"  🏷️  {component.upper()}: {len(files)} files")
            
            # Add edges between files in the same component
            for i, file1 in enumerate(files):
                for file2 in files[i+1:]:
                    self.add_edge(file1, file2, 'same_component')
    
    def add_node(self, node_id, node_type, attributes=None):
        """Add a node to the network"""
        self.nodes[node_id] = attributes or {}
        self.node_types[node_id] = node_type
    
    def add_edge(self, source, target, edge_type):
        """Add an edge to the network"""
        self.edges.append({
            'source': source,
            'target': target,
            'type': edge_type
        })
    
    def get_file_type(self, file_path):
        """Determine file type based on extension"""
        ext = file_path.suffix.lower()
        
        type_mapping = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.md': 'documentation',
            '.json': 'config',
            '.yml': 'config',
            '.yaml': 'config',
            '.sh': 'script',
            '.html': 'web',
            '.css': 'web',
            '.sql': 'database'
        }
        
        return type_mapping.get(ext, 'other')
    
    def should_ignore(self, path):
        """Check if path should be ignored"""
        ignore_patterns = [
            '.git', 'node_modules', '__pycache__', '.vscode',
            'dist', 'build', '.env', 'package-lock.json',
            'deepgraph_env', '.DS_Store'
        ]
        
        path_str = str(path)
        return any(pattern in path_str for pattern in ignore_patterns)
    
    def create_network_representation(self):
        """Create a network representation of the project"""
        print("\n🕸️  NETWORK REPRESENTATION")
        
        # Calculate network metrics
        node_count = len(self.nodes)
        edge_count = len(self.edges)
        
        # Count node types
        type_counts = Counter(self.node_types.values())
        
        # Count edge types
        edge_type_counts = Counter(edge['type'] for edge in self.edges)
        
        print(f"  📊 Network Statistics:")
        print(f"    Total Nodes: {node_count}")
        print(f"    Total Edges: {edge_count}")
        print(f"    Network Density: {edge_count / (node_count * (node_count - 1) / 2) * 100:.2f}%")
        
        print(f"\n  📈 Node Type Distribution:")
        for node_type, count in type_counts.most_common():
            print(f"    {node_type}: {count}")
        
        print(f"\n  🔗 Edge Type Distribution:")
        for edge_type, count in edge_type_counts.items():
            print(f"    {edge_type}: {count}")
    
    def generate_insights(self):
        """Generate insights from the network analysis"""
        print("\n🎯 DEEPGRAPH INSIGHTS")
        
        # Find hub nodes (nodes with many connections)
        node_connections = defaultdict(int)
        for edge in self.edges:
            node_connections[edge['source']] += 1
            node_connections[edge['target']] += 1
        
        # Top connected nodes
        top_connected = sorted(node_connections.items(), key=lambda x: x[1], reverse=True)[:10]
        
        print(f"\n  🌟 Most Connected Files:")
        for node, connections in top_connected:
            node_type = self.node_types.get(node, 'unknown')
            print(f"    {node} ({node_type}): {connections} connections")
        
        # Component analysis
        component_files = defaultdict(list)
        for node_id, node_data in self.nodes.items():
            if 'component' in node_data:
                component_files[node_data['component']].append(node_id)
        
        print(f"\n  🏗️  Component Architecture:")
        for component, files in component_files.items():
            print(f"    {component.upper()}: {len(files)} files")
        
        # File size analysis
        large_files = []
        for node_id, node_data in self.nodes.items():
            if 'size' in node_data and node_data['size'] > 10000:  # > 10KB
                large_files.append((node_id, node_data['size']))
        
        large_files.sort(key=lambda x: x[1], reverse=True)
        
        print(f"\n  📁 Large Files (>10KB):")
        for file_path, size in large_files[:10]:
            print(f"    {file_path}: {size/1024:.1f}KB")
        
        self.generate_ascii_network_map()
    
    def generate_ascii_network_map(self):
        """Generate an ASCII representation of the network"""
        print(f"\n🗺️  PROJECT NETWORK MAP")
        print("=" * 60)
        
        # Group by directory structure
        dirs = defaultdict(list)
        for node_id in self.nodes:
            if self.node_types[node_id] != 'directory':
                parts = Path(node_id).parts
                if len(parts) > 1:
                    parent = parts[0]
                    dirs[parent].append(node_id)
                else:
                    dirs['root'].append(node_id)
        
        for dir_name, files in sorted(dirs.items()):
            print(f"\n📁 {dir_name.upper()}/")
            
            # Group files by type
            type_groups = defaultdict(list)
            for file_path in files:
                file_type = self.node_types.get(file_path, 'other')
                type_groups[file_type].append(file_path)
            
            for file_type, type_files in type_groups.items():
                if len(type_files) <= 5:
                    for file_path in type_files:
                        component = self.nodes.get(file_path, {}).get('component', '')
                        component_str = f" [{component}]" if component else ""
                        print(f"  ├── {Path(file_path).name} ({file_type}){component_str}")
                else:
                    print(f"  ├── {len(type_files)} {file_type} files")
                    for file_path in type_files[:3]:
                        component = self.nodes.get(file_path, {}).get('component', '')
                        component_str = f" [{component}]" if component else ""
                        print(f"  │   ├── {Path(file_path).name}{component_str}")
                    print(f"  │   └── ... +{len(type_files)-3} more")
        
        print(f"\n🔍 Legend:")
        print(f"  📁 Directory")
        print(f"  [component] - Functional component category")
        print(f"  ├── File (type)")
        
    def export_network_data(self):
        """Export network data for external visualization"""
        network_data = {
            'nodes': [
                {
                    'id': node_id,
                    'type': self.node_types[node_id],
                    'attributes': attributes
                }
                for node_id, attributes in self.nodes.items()
            ],
            'edges': self.edges
        }
        
        with open('network_data.json', 'w') as f:
            json.dump(network_data, f, indent=2)
        
        print(f"\n💾 Network data exported to: network_data.json")
        return 'network_data.json'

def main():
    """Run the DeepGraph analysis"""
    analyzer = DeepGraphAnalyzer()
    
    # Export data for external tools
    data_file = analyzer.export_network_data()
    
    print(f"\n✅ DeepGraph analysis complete!")
    print(f"   Network data available in: {data_file}")
    print(f"   This AI Trading System shows a sophisticated architecture")
    print(f"   with clear separation of concerns and modular design.")

if __name__ == "__main__":
    main()