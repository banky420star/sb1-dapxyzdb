import OpenAI from 'openai';
import chalk from 'chalk';
import { AuthManager } from '../auth/AuthManager.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { ModelType, ReasoningLevel, Message } from '../types/index.js';

export class ModelManager {
  private authManager: AuthManager;
  private configManager: ConfigManager;
  private openai: OpenAI | null = null;

  constructor(authManager: AuthManager, configManager: ConfigManager) {
    this.authManager = authManager;
    this.configManager = configManager;
    this.openai = authManager.getOpenAIClient();
  }

  async getCompletion(
    messages: Message[], 
    model: ModelType, 
    reasoningLevel: ReasoningLevel
  ): Promise<string> {
    if (!this.openai) {
      this.openai = this.authManager.getOpenAIClient();
      if (!this.openai) {
        throw new Error('Not authenticated. Please run "codex auth" to authenticate.');
      }
    }

    try {
      // Convert messages to OpenAI format
      const openaiMessages = this.convertMessages(messages, reasoningLevel);
      
      // Map model names to OpenAI model IDs
      const modelMap: Record<ModelType, string> = {
        'gpt-5': 'gpt-4-turbo-preview',  // Using GPT-4 Turbo as placeholder
        'gpt-5-codex': 'gpt-4-turbo-preview',
        'o4-mini': 'gpt-3.5-turbo',
        'gpt-4-turbo': 'gpt-4-turbo-preview',
        'gpt-3.5-turbo': 'gpt-3.5-turbo'
      };

      const response = await this.openai.chat.completions.create({
        model: modelMap[model],
        messages: openaiMessages,
        temperature: this.getTemperature(reasoningLevel),
        max_tokens: this.getMaxTokens(reasoningLevel),
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Authentication failed. Please check your credentials.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service error. Please try again.');
      }
      throw error;
    }
  }

  private convertMessages(messages: Message[], reasoningLevel: ReasoningLevel): any[] {
    const systemPrompt = this.getSystemPrompt(reasoningLevel);
    
    const openaiMessages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of messages) {
      if (msg.images && msg.images.length > 0) {
        // Handle messages with images
        openaiMessages.push({
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            ...msg.images.map(img => ({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${img}` }
            }))
          ]
        });
      } else {
        // Regular text messages
        openaiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    return openaiMessages;
  }

  private getSystemPrompt(reasoningLevel: ReasoningLevel): string {
    const basePrompt = `You are Codex, an advanced AI coding assistant. You help users with coding tasks, 
    answer questions about code, debug issues, and provide implementation suggestions. 
    You have access to read and write files, execute commands, and analyze codebases.`;

    const reasoningPrompts = {
      low: `${basePrompt} Provide quick, concise responses focusing on immediate solutions.`,
      medium: `${basePrompt} Provide balanced responses with explanations and best practices when relevant.`,
      high: `${basePrompt} Provide comprehensive responses with detailed explanations, 
      consider edge cases, performance implications, and architectural considerations. 
      Think through problems step-by-step and explain your reasoning.`
    };

    return reasoningPrompts[reasoningLevel];
  }

  private getTemperature(reasoningLevel: ReasoningLevel): number {
    const temperatures = {
      low: 0.3,
      medium: 0.5,
      high: 0.7
    };
    return temperatures[reasoningLevel];
  }

  private getMaxTokens(reasoningLevel: ReasoningLevel): number {
    const tokens = {
      low: 2000,
      medium: 3000,
      high: 4000
    };
    return tokens[reasoningLevel];
  }

  async streamCompletion(
    messages: Message[], 
    model: ModelType, 
    reasoningLevel: ReasoningLevel,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    if (!this.openai) {
      this.openai = this.authManager.getOpenAIClient();
      if (!this.openai) {
        throw new Error('Not authenticated');
      }
    }

    const openaiMessages = this.convertMessages(messages, reasoningLevel);
    
    const modelMap: Record<ModelType, string> = {
      'gpt-5': 'gpt-4-turbo-preview',
      'gpt-5-codex': 'gpt-4-turbo-preview',
      'o4-mini': 'gpt-3.5-turbo',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-3.5-turbo': 'gpt-3.5-turbo'
    };

    const stream = await this.openai.chat.completions.create({
      model: modelMap[model],
      messages: openaiMessages,
      temperature: this.getTemperature(reasoningLevel),
      max_tokens: this.getMaxTokens(reasoningLevel),
      stream: true
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        onChunk(content);
        fullResponse += content;
      }
    }

    return fullResponse;
  }

  getAvailableModels(): ModelType[] {
    return ['gpt-5', 'gpt-5-codex', 'o4-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }

  getModelInfo(model: ModelType): any {
    const modelInfo = {
      'gpt-5': {
        name: 'GPT-5',
        description: 'Latest and most capable model',
        contextWindow: 128000,
        recommended: true
      },
      'gpt-5-codex': {
        name: 'GPT-5 Codex',
        description: 'Optimized for coding tasks',
        contextWindow: 128000,
        recommended: true
      },
      'o4-mini': {
        name: 'O4 Mini',
        description: 'Fast and efficient for simple tasks',
        contextWindow: 16000,
        recommended: false
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        description: 'Previous generation, still very capable',
        contextWindow: 128000,
        recommended: false
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        description: 'Legacy model, fast but less capable',
        contextWindow: 16000,
        recommended: false
      }
    };

    return modelInfo[model];
  }
}


