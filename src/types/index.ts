export type ModelType = 
  | 'gpt-5'
  | 'gpt-5-codex'
  | 'o4-mini'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo';

export type ReasoningLevel = 'low' | 'medium' | 'high';

export type ApprovalMode = 'auto' | 'read-only' | 'full';

export interface CodexConfig {
  model: ModelType;
  reasoningLevel: ReasoningLevel;
  approvalMode: ApprovalMode;
  authType?: 'chatgpt' | 'api-key';
  apiKey?: string;
  chatgptToken?: string;
  sessions?: Record<string, CodexSessionData>;
  history?: CommandHistoryEntry[];
  workingDirectory: string;
}

export interface CodexSessionData {
  id: string;
  lastUpdated: string;
  [key: string]: unknown;
}

export interface CommandHistoryEntry {
  command: string;
  timestamp: string;
}

export interface CodexOptions {
  model: ModelType;
  approvalMode: ApprovalMode;
  authManager: any;
  configManager: any;
  execMode?: boolean;
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'create';
  path: string;
  content?: string;
  requiresApproval: boolean;
}

export interface CommandOperation {
  command: string;
  args: string[];
  cwd: string;
  requiresApproval: boolean;
  hasNetworkAccess: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export interface CodexSession {
  id: string;
  messages: Message[];
  model: ModelType;
  reasoningLevel: ReasoningLevel;
  approvalMode: ApprovalMode;
  startTime: Date;
}


