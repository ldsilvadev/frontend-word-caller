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
  assunto?: string;
  codigo?: string;
  departamento?: string;
  revisao?: string;
  data_publicacao?: string;
  data_vigencia?: string;
}

export interface DraftSection {
  titulo?: string;
  title?: string;
  paragrafo?: string;
  content?: string;
  texto?: string;
  conteudo?: string;
  tabela_dinamica?: Record<string, unknown>;
  items?: string[] | Record<string, unknown>[];
  itens?: string[] | Record<string, unknown>[];
  subsections?: DraftSection[];
  subsecoes?: DraftSection[];
}

export interface DraftContent {
  assunto?: string;
  codigo?: string;
  departamento?: string;
  revisao?: string;
  data_publicacao?: string;
  data_vigencia?: string;
  sections?: DraftSection[];
  secao?: DraftSection[];
  secoes?: DraftSection[];
  markdownContent?: string; // Novo formato com markdown direto
}

export interface Draft {
  id: number;
  title: string;
  content: DraftContent | string;
  status: "draft" | "generated";
}
