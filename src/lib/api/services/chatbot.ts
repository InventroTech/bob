/**
 * Pyro AI chatbot API — hybrid RAG + CRM/ERP/actions backend.
 */

import { apiClient } from '../client';

export interface ChatSource {
  title?: string;
  domain?: string;
  slug?: string;
  score?: number;
  type?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  mode?: string;
  sources?: ChatSource[];
  tool_calls?: unknown[];
  page_context?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  created_at?: string;
}

export interface ChatAskResponse {
  conversation_id: string;
  answer: string;
  mode?: string;
  sources?: ChatSource[];
  intent?: string;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface ChatAskPayload {
  message: string;
  conversation_id?: string | null;
  page_context?: Record<string, unknown>;
}

export const chatbotService = {
  ask(payload: ChatAskPayload) {
    return apiClient
      .post<ChatAskResponse>('/chat/ask/', payload)
      .then((res) => res.data);
  },

  listConversations() {
    return apiClient
      .get<Array<{ id: string; title: string; created_at: string; updated_at: string }>>(
        '/chat/conversations/'
      )
      .then((res) => res.data);
  },

  getMessages(conversationId: string) {
    return apiClient
      .get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages/`)
      .then((res) => res.data);
  },
};
