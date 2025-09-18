import { promises as fs } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../config/ConfigManager.js';
import { FileOperation } from '../types/index.js';

export class FileManager {
  private configManager: ConfigManager;
  private workingDirectory: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.workingDirectory = configManager.getWorkingDirectory();
  }

  async readFile(path: string): Promise<string> {
    const fullPath = this.resolvePath(path);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    
    // Ensure directory exists
    const dir = dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async deleteFile(path: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await fs.unlink(fullPath);
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = this.resolvePath(path);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    const fullPath = this.resolvePath(path);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    return entries.map(entry => {
      if (entry.isDirectory()) {
        return `${entry.name}/`;
      }
      return entry.name;
    });
  }

  async getFileInfo(path: string): Promise<any> {
    const fullPath = this.resolvePath(path);
    const stats = await fs.stat(fullPath);
    
    return {
      path: fullPath,
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime
    };
  }

  isWithinWorkingDirectory(path: string): boolean {
    const fullPath = this.resolvePath(path);
    return fullPath.startsWith(this.workingDirectory);
  }

  private resolvePath(path: string): string {
    if (isAbsolute(path)) {
      return path;
    }
    return join(this.workingDirectory, path);
  }

  async searchFiles(pattern: string, directory?: string): Promise<string[]> {
    const searchDir = directory ? this.resolvePath(directory) : this.workingDirectory;
    const { glob } = await import('glob');
    
    const files = await glob(pattern, {
      cwd: searchDir,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });
    
    return files;
  }

  async readJSON(path: string): Promise<any> {
    const content = await this.readFile(path);
    return JSON.parse(content);
  }

  async writeJSON(path: string, data: any, pretty: boolean = true): Promise<void> {
    const content = pretty ? 
      JSON.stringify(data, null, 2) : 
      JSON.stringify(data);
    await this.writeFile(path, content);
  }

  async appendToFile(path: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await fs.appendFile(fullPath, content, 'utf-8');
  }

  async copyFile(source: string, destination: string): Promise<void> {
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);
    
    // Ensure destination directory exists
    const destDir = dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    
    await fs.copyFile(sourcePath, destPath);
  }

  async moveFile(source: string, destination: string): Promise<void> {
    const sourcePath = this.resolvePath(source);
    const destPath = this.resolvePath(destination);
    
    // Ensure destination directory exists
    const destDir = dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    
    await fs.rename(sourcePath, destPath);
  }
}

