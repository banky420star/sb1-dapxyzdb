import Configstore from 'configstore';
import { CodexConfig, ModelType, ReasoningLevel, ApprovalMode, CodexSessionData, CommandHistoryEntry } from '../types/index.js';
import { homedir } from 'os';
import { join } from 'path';

export class ConfigManager {
  private config: Configstore;
  private defaults: Partial<CodexConfig> = {
    model: 'gpt-5',
    reasoningLevel: 'medium',
    approvalMode: 'auto',
    workingDirectory: process.cwd()
  };

  constructor() {
    // Initialize Configstore with package name
    this.config = new Configstore('@openai/codex', this.defaults);
  }

  get<K extends keyof CodexConfig>(key: K): CodexConfig[K] | undefined {
    return this.config.get(key) as CodexConfig[K] | undefined;
  }

  set<K extends keyof CodexConfig>(key: K, value: CodexConfig[K]): void {
    this.config.set(key, value);
  }

  delete(key: keyof CodexConfig | string): void {
    this.config.delete(key);
  }

  getAll(): Partial<CodexConfig> {
    return this.config.all as Partial<CodexConfig>;
  }

  reset(): void {
    this.config.clear();
    Object.entries(this.defaults).forEach(([key, value]) => {
      this.config.set(key, value);
    });
  }

  getModel(): ModelType {
    return this.get('model') || 'gpt-5';
  }

  setModel(model: ModelType): void {
    this.set('model', model);
  }

  getReasoningLevel(): ReasoningLevel {
    return this.get('reasoningLevel') || 'medium';
  }

  setReasoningLevel(level: ReasoningLevel): void {
    this.set('reasoningLevel', level);
  }

  getApprovalMode(): ApprovalMode {
    return this.get('approvalMode') || 'auto';
  }

  setApprovalMode(mode: ApprovalMode): void {
    this.set('approvalMode', mode);
  }

  getWorkingDirectory(): string {
    return this.get('workingDirectory') || process.cwd();
  }

  setWorkingDirectory(dir: string): void {
    this.set('workingDirectory', dir);
  }

  // Session management
  saveSession(sessionId: string, data: Record<string, unknown>): void {
    const sessions = (this.config.get('sessions') as Record<string, CodexSessionData> | undefined) || {};
    sessions[sessionId] = {
      id: sessionId,
      ...data,
      lastUpdated: new Date().toISOString()
    } as CodexSessionData;
    this.config.set('sessions', sessions);
  }

  getSession(sessionId: string): CodexSessionData | undefined {
    const sessions = (this.config.get('sessions') as Record<string, CodexSessionData> | undefined) || {};
    return sessions[sessionId];
  }

  getAllSessions(): Record<string, CodexSessionData> {
    return (this.config.get('sessions') as Record<string, CodexSessionData> | undefined) || {};
  }

  deleteSession(sessionId: string): void {
    const sessions = (this.config.get('sessions') as Record<string, CodexSessionData> | undefined) || {};
    delete sessions[sessionId];
    this.config.set('sessions', sessions);
  }

  // History management
  addToHistory(command: string): void {
    const history = (this.config.get('history') as CommandHistoryEntry[] | undefined) || [];
    history.push({
      command,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 commands
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.config.set('history', history);
  }

  getHistory(): CommandHistoryEntry[] {
    return (this.config.get('history') as CommandHistoryEntry[] | undefined) || [];
  }

  clearHistory(): void {
    this.config.set('history', []);
  }
}


