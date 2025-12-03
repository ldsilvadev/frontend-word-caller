export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Document {
  id: number;
  filename: string;
  publicUrl?: string | null;
  createdAt?: string;
}

export interface Draft {
  id: number;
  title: string;
  content: any; // JSON content
  status: "draft" | "generated";
}
