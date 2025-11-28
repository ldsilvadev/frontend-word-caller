export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Document {
  id: number;
  filename: string;
  publicUrl?: string | null;
  createdAt?: string;
}
