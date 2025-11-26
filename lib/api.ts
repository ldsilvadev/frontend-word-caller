import { Message } from "@/types";

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

export async function getLatestDocument(): Promise<ArrayBuffer | null> {
  // 1. Get list of documents
  const listRes = await fetch(`${API_URL}/documents`);
  if (!listRes.ok) throw new Error("Failed to fetch documents list");

  const docs = await listRes.json();
  if (!docs || docs.length === 0) return null;

  // 2. Get the latest one (assuming ID increments or we sort by date)
  // The API returns { id, filename, createdAt, ... }
  // Let's sort by ID desc
  const latestDoc = docs.sort((a: any, b: any) => b.id - a.id)[0];

  // 3. Fetch content
  const contentRes = await fetch(`${API_URL}/documents/${latestDoc.id}`);
  if (!contentRes.ok) throw new Error("Failed to fetch document content");

  return await contentRes.arrayBuffer();
}

export async function getLatestPdf(): Promise<Blob | null> {
  // 1. Get list of documents
  const listRes = await fetch(`${API_URL}/documents`);
  if (!listRes.ok) throw new Error("Failed to fetch documents list");

  const docs = await listRes.json();
  if (!docs || docs.length === 0) return null;

  // 2. Get the latest one
  const latestDoc = docs.sort((a: any, b: any) => b.id - a.id)[0];

  // 3. Fetch PDF content
  const contentRes = await fetch(`${API_URL}/documents/${latestDoc.id}/pdf`);

  if (contentRes.status === 404) {
    // PDF might not be ready yet or failed
    return null;
  }

  if (!contentRes.ok) throw new Error("Failed to fetch document PDF");

  return await contentRes.blob();
}
