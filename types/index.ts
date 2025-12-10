export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Document {
  id: string;
  filename: string;
  publicUrl?: string | null;
  createdAt?: string;
}

export interface DraftMetadata {
  assunto: string;
  codigo: string;
  departamento: string;
  revisao: string;
  data_publicacao: string;
  data_vigencia: string;
}

/**
 * ARQUITETURA SIMPLIFICADA:
 * - Draft no banco = metadados + caminho do arquivo .docx
 * - Arquivo .docx = fonte única de verdade
 * - OnlyOffice edita o arquivo diretamente
 * - IA modifica o arquivo via MCP
 */
export interface DraftContent {
  // Caminho do arquivo .docx (relativo ao OUTPUT_DIR)
  filePath: string;
  // Metadados do documento
  metadata: DraftMetadata;
  // Timestamp da última modificação
  lastModified?: string;
}

export interface Draft {
  id: string; // MongoDB ObjectId (24 caracteres hexadecimais)
  _id?: string; // Alias para compatibilidade
  title: string;
  content: DraftContent;
  status: "draft" | "published";
}

/**
 * Conversation - Histórico de conversas com a IA
 */
export interface ConversationDocument {
  draftId?: string;
  title?: string;
  hasDocument: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  document?: ConversationDocument;
  messagesCount: number;
  lastMessage?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}
