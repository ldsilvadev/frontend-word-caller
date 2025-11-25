import { Message } from "@/types";

// Mock delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function sendMessage(content: string): Promise<Message> {
  // Simulate API call
  await delay(1500);
  
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: `I received your request: "${content}". I'm processing it with the MCP backend to update the document.`,
    timestamp: new Date()
  };
}

export async function getLatestDocument(): Promise<string> {
  // Simulate API call
  await delay(1000);

  // Mock HTML content (simulating mammoth output)
  return `
    <h2>Project Proposal: AI Integration</h2>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>Status:</strong> Draft (v${Math.floor(Math.random() * 10)})</p>
    <h3>1. Executive Summary</h3>
    <p>This document outlines the proposed integration of Artificial Intelligence into our existing workflow. The goal is to automate repetitive tasks and improve decision-making processes.</p>
    <h3>2. Objectives</h3>
    <ul>
      <li>Reduce manual data entry by 50%</li>
      <li>Provide real-time analytics</li>
      <li>Enhance user experience with natural language interfaces</li>
    </ul>
    <h3>3. Timeline</h3>
    <p>The project is expected to take 3 months to complete, starting from Q1 2026.</p>
    <p><em>(Updated via MCP Backend)</em></p>
  `;
}
