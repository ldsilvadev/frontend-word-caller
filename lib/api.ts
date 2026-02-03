import {
  Message,
  Document,
  Draft,
  ConversationSummary,
  ConversationDetail,
  ConversationMetadata,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export interface SendMessageResponse extends Message {
  draftUpdated?: boolean;
  updatedDraftId?: string | null; // MongoDB ObjectId
}

export async function sendMessage(
  content: string,
  activeDraftId?: string | null,
  editorContent?: any,
  conversationId?: string | null
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: content,
      activeDraftId: activeDraftId || null,
      conversationId: conversationId || null,
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
  return docs;
}

export async function getLatestDocument(): Promise<ArrayBuffer | null> {
  const docs = await getDocuments();
  if (!docs || docs.length === 0) return null;

  const latestDoc = docs[0];
  const contentRes = await fetch(`${API_URL}/documents/${latestDoc.id}`);
  if (!contentRes.ok) throw new Error("Failed to fetch document content");

  return await contentRes.arrayBuffer();
}

export async function getDraft(id: string): Promise<Draft> {
  const response = await fetch(`${API_URL}/drafts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch draft");
  return await response.json();
}

export interface DraftStatus {
  id: string; // MongoDB ObjectId
  title: string;
  status: string;
  filePath: string | null;
  fileExists?: boolean;
  fileModifiedAt?: string | null;
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

export async function getDraftStatus(id: string): Promise<DraftStatus> {
  const response = await fetch(`${API_URL}/drafts/${id}/status`);
  if (!response.ok) throw new Error("Failed to fetch draft status");
  return await response.json();
}

export async function updateDraft(
  id: string,
  content: any
): Promise<Draft> {
  const response = await fetch(`${API_URL}/drafts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to update draft");
  return await response.json();
}

export async function generateDocument(
  id: string
): Promise<{ success: boolean; filename: string; filePath: string }> {
  const response = await fetch(`${API_URL}/drafts/${id}/generate`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to generate document");
  return await response.json();
}

export async function publishDraft(
  id: string
): Promise<{ result: string; filename: string; downloadUrl: string | null }> {
  const response = await fetch(`${API_URL}/drafts/${id}/publish`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to publish draft");
  return await response.json();
}

export interface UploadDocumentResponse {
  success: boolean;
  draftId: string; // MongoDB ObjectId
  filename: string;
  message: string;
}

export async function uploadDocument(
  file: File
): Promise<UploadDocumentResponse> {
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


// ==================== CONVERSATIONS API ====================

export async function getConversations(
  search?: string
): Promise<ConversationSummary[]> {
  const url = search
    ? `${API_URL}/conversations?search=${encodeURIComponent(search)}`
    : `${API_URL}/conversations`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch conversations");
  return response.json();
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const response = await fetch(`${API_URL}/conversations/${id}`);
  if (!response.ok) throw new Error("Failed to fetch conversation");
  return response.json();
}

export interface CreateConversationParams {
  title?: string;
  draftId?: string;
  metadata?: {
    entidade: string;
    area: string;
    tipologia: string;
  };
}

export async function createConversation(
  params?: CreateConversationParams
): Promise<ConversationSummary> {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  if (!response.ok) throw new Error("Failed to create conversation");
  return response.json();
}

export async function updateConversationTitle(
  id: string,
  title: string
): Promise<void> {
  const response = await fetch(`${API_URL}/conversations/${id}/title`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("Failed to update conversation title");
}

export async function openConversationDocument(
  id: string
): Promise<{ draftId: string; isNew: boolean }> {
  const response = await fetch(`${API_URL}/conversations/${id}/open-document`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to open document");
  return response.json();
}

export async function archiveConversation(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/conversations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to archive conversation");
}

// ==================== ONEDRIVE PREVIEW API ====================

export interface PreviewData {
  previewUrl: string;
  fileName: string;
  title: string;
  lastModified: string;
  downloadUrl: string;
  webUrl?: string;
}

export async function getOneDrivePreview(id: string): Promise<PreviewData> {
  const response = await fetch(`${API_URL}/onedrive/preview/${id}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Failed to fetch preview" }));
    throw new Error(error.message || "Failed to fetch OneDrive preview");
  }
  return await response.json();
}

export function getOneDriveDownloadUrl(id: string): string {
  return `${API_URL}/onedrive/download/${id}`;
}
