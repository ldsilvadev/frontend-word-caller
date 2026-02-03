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

/**
 * Metadados da política (pré-preenchidos antes do chat)
 */
export interface ConversationMetadata {
  entidade: string; // FIERGS | SESI | SENAI | IEL | CIERGS
  area: string; // RH, TI, FIN, etc.
  tipologia: string; // POL, PROC, INST, etc.
  codigo: string; // FIERGS-RH-POL (gerado automaticamente)
  revisao: string; // "01"
  dataValidade: string; // DD/MM/AAAA
}

export interface ConversationSummary {
  id: string;
  title: string;

  // Campos individuais de metadata
  entidade?: string;
  area?: string;
  tipologia?: string;
  codigo?: string;
  revisao?: string;
  dataValidade?: string;

  // Objeto metadata
  metadata?: ConversationMetadata;

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
