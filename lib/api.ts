import { Message, Document, Draft } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface SendMessageResponse extends Message {
  draftUpdated?: boolean;
  updatedDraftId?: number;
}

export async function sendMessage(
  content: string, 
  activeDraftId?: number | null,
  editorContent?: any
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      message: content,
      activeDraftId: activeDraftId || null,
      editorContent: editorContent || null,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  const data = await response.json();

  return {
    id: Date.now().toString(),
    role: "assistant",
    content: data.response,
    timestamp: new Date(),
    draftUpdated: data.draftUpdated || false,
    updatedDraftId: data.updatedDraftId || null,
  };
}

export async function getDocuments(): Promise<Document[]> {
  const listRes = await fetch(`${API_URL}/documents`);
  if (!listRes.ok) throw new Error("Failed to fetch documents list");

  const docs = await listRes.json();
  return docs.sort((a: Document, b: Document) => b.id - a.id);
}

export async function getLatestDocument(): Promise<ArrayBuffer | null> {
  const docs = await getDocuments();
  if (!docs || docs.length === 0) return null;

  const latestDoc = docs[0];
  const contentRes = await fetch(`${API_URL}/documents/${latestDoc.id}`);
  if (!contentRes.ok) throw new Error("Failed to fetch document content");

  return await contentRes.arrayBuffer();
}

export async function getDraft(id: number): Promise<Draft> {
  const response = await fetch(`${API_URL}/drafts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch draft");
  return await response.json();
}

export interface DraftStatus {
  id: number;
  title: string;
  status: string;
  filePath: string | null;
  fileExists: boolean;
  fileModifiedAt: string | null;
  lastModified: string | null;
  downloadUrl?: string | null;
  publishedAt?: string | null;
  metadata: {
    assunto: string;
    codigo: string;
    departamento: string;
    revisao: string;
    data_publicacao: string;
    data_vigencia: string;
  } | null;
}

export async function getDraftStatus(id: number): Promise<DraftStatus> {
  const response = await fetch(`${API_URL}/drafts/${id}/status`);
  if (!response.ok) throw new Error("Failed to fetch draft status");
  return await response.json();
}

export async function publishDraft(
  id: number
): Promise<{ result: string; filename: string; downloadUrl: string | null }> {
  const response = await fetch(`${API_URL}/drafts/${id}/publish`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to publish draft");
  return await response.json();
}

export interface UploadDocumentResponse {
  success: boolean;
  draftId: number;
  filename: string;
  message: string;
}

export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/drafts/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload document");
  }

  return await response.json();
}
