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
  id: number;
  title: string;
  content: DraftContent;
  status: "draft" | "published";
}
