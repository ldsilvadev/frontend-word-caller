import { Message, Document, Draft } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function sendMessage(content: string): Promise<Message> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: content }),
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
  };
}

export async function getDocuments(): Promise<Document[]> {
  const listRes = await fetch(`${API_URL}/documents`);
  if (!listRes.ok) throw new Error("Failed to fetch documents list");

  const docs = await listRes.json();
  // Sort by ID desc (newest first)
  return docs.sort((a: any, b: any) => b.id - a.id);
}

export async function getLatestDocument(): Promise<ArrayBuffer | null> {
  // 1. Get list of documents
  const docs = await getDocuments();
  if (!docs || docs.length === 0) return null;

  // 2. Get the latest one
  const latestDoc = docs[0];

  // 3. Fetch content
  const contentRes = await fetch(`${API_URL}/documents/${latestDoc.id}`);
  if (!contentRes.ok) throw new Error("Failed to fetch document content");

  return await contentRes.arrayBuffer();
}

export async function getLatestPdf(): Promise<Blob | null> {
  // 1. Get list of documents
  const docs = await getDocuments();
  if (!docs || docs.length === 0) return null;

  // 2. Get the latest one
  const latestDoc = docs[0];

  // 3. Fetch PDF content
  const contentRes = await fetch(`${API_URL}/documents/${latestDoc.id}/pdf`);

  if (contentRes.status === 404) {
    // PDF might not be ready yet or failed
    return null;
  }

  if (!contentRes.ok) throw new Error("Failed to fetch document PDF");

  return await contentRes.blob();
}

export async function getDraft(id: number): Promise<Draft> {
  const response = await fetch(`${API_URL}/drafts/${id}`);
  if (!response.ok) throw new Error("Failed to fetch draft");
  return await response.json();
}

export async function updateDraft(id: number, content: any): Promise<Draft> {
  const response = await fetch(`${API_URL}/drafts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error("Failed to update draft");
  return await response.json();
}

export async function generateDocument(
  id: number
): Promise<{ result: string; filename: string }> {
  const response = await fetch(`${API_URL}/drafts/${id}/generate`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to generate document");
  return await response.json();
}
