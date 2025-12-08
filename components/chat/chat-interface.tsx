"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Bot, User, FileUp, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types";
import { sendMessage, getDraftStatus, uploadDocument } from "@/lib/api";
import { toast } from "sonner";

interface EditorContent {
  markdown: string;
  metadata: {
    assunto: string;
    codigo: string;
    departamento: string;
    revisao: string;
    data_publicacao: string;
    data_vigencia: string;
  };
}

interface ChatInterfaceProps {
  onMessageSuccess?: () => void;
  onOpenDraft?: (id: number) => void;
  onDraftUpdated?: (draftId: number) => void;
  activeDraftId?: number | null;
  getEditorContent?: () => EditorContent | null;
}

export function ChatInterface({
  onMessageSuccess,
  onOpenDraft,
  onDraftUpdated,
  activeDraftId,
  getEditorContent,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track which draft IDs we've already opened to avoid re-opening
  const [openedDraftIds, setOpenedDraftIds] = useState<Set<string>>(new Set());

  // Helper function to extract draft ID from message content
  const extractDraftId = (content: string): number | null => {
    const patterns = [
      /ID\s*:?\s*\**(\d+)\**/i,
      /draft[_\s-]*id\s*:?\s*\**(\d+)\**/i,
      /rascunho[_\s-]*id\s*:?\s*\**(\d+)\**/i,
      /#(\d+)/,
      /draft\s*#?\s*(\d+)/i,
      /rascunho\s*#?\s*(\d+)/i,
      /"id"\s*:\s*(\d+)/i,
      /criado.*?(\d+)/i,
      /created.*?(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant" && onOpenDraft) {
      const draftId = extractDraftId(lastMessage.content);
      const messageKey = `${lastMessage.id}-${draftId}`;
      
      if (draftId && !openedDraftIds.has(messageKey)) {
        console.log("ChatInterface: Auto-detecting draft ID:", draftId);
        setOpenedDraftIds(prev => new Set(prev).add(messageKey));
        onOpenDraft(draftId);
      }
    }
  }, [messages, onOpenDraft, openedDraftIds]);

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const isModificationRequest = (text: string): boolean => {
    const keywords = [
      "mude", "altere", "modifique", "edite", "troque", "substitua",
      "adicione", "inclua", "insira", "remova", "exclua", "delete",
      "corrija", "ajuste", "melhore", "atualize", "crie", "escreva",
      "change", "modify", "edit", "update", "add", "remove", "fix", "create", "write",
    ];
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".docx")) {
        toast.error("Apenas arquivos .docx são suportados");
        return;
      }
      setSelectedFile(file);
      toast.info(`Arquivo selecionado: ${file.name}`);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const result = await uploadDocument(selectedFile);
      
      // Add system message about the upload
      const uploadMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `📎 Documento "${selectedFile.name}" importado com sucesso!\n\nO documento está pronto para edição. Você pode me pedir para fazer modificações.\n\nID do Rascunho: #${result.draftId}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, uploadMessage]);
      
      // Open the draft
      onOpenDraft?.(result.draftId);
      
      toast.success("Documento importado com sucesso!");
      setSelectedFile(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar documento");
    } finally {
      setIsUploading(false);
    }
  };

  // Cancel file selection
  const handleCancelFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (forceMessage?: string) => {
    const messageToSend = typeof forceMessage === "string" ? forceMessage : inputValue;
    if (!messageToSend || !messageToSend.trim()) return;

    if (activeDraftId && isModificationRequest(messageToSend) && typeof forceMessage !== "string") {
      try {
        const status = await getDraftStatus(activeDraftId);
        
        // Se o documento foi publicado, avisar o usuário para anexar
        if (status.status === "published") {
          toast.warning(
            "📎 Este documento já foi exportado e não está mais disponível para edição. Anexe o documento novamente usando o botão de clipe para continuar editando.",
            { duration: 8000 }
          );
          
          const warningMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: "⚠️ O documento atual já foi exportado e o arquivo local foi removido.\n\nPara continuar editando, você precisa:\n1. Baixar o documento exportado\n2. Clicar no botão 📎 (clipe) ao lado do campo de mensagem\n3. Selecionar o arquivo .docx\n4. Clicar em \"Importar\"\n\nAssim poderei fazer as modificações que você precisa!",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, { 
            id: (Date.now() - 1).toString(), 
            role: "user", 
            content: messageToSend, 
            timestamp: new Date() 
          }, warningMessage]);
          setInputValue("");
          return;
        }
      } catch (error) {
        console.error("Erro ao verificar status do draft:", error);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const currentEditorContent = getEditorContent?.() || null;
      const response = await sendMessage(userMessage.content, activeDraftId, currentEditorContent);
      setMessages((prev) => [...prev, response]);
      
      if (response.draftUpdated && response.updatedDraftId && onDraftUpdated) {
        console.log("ChatInterface: Draft was updated by AI, notifying parent. Draft ID:", response.updatedDraftId);
        onDraftUpdated(response.updatedDraftId);
      }
      
      if (onMessageSuccess) {
        onMessageSuccess();
      }
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden relative">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".docx"
        className="hidden"
      />

      {/* Área de mensagens com scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full p-4 py-6 md:py-10">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[40vh] md:h-[50vh] text-center space-y-4 opacity-50 px-4">
                <h2 className="text-lg md:text-2xl font-medium text-gray-400">
                  Fique à vontade, Lucas. Estou aqui para o que precisar.
                </h2>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 md:gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="w-7 h-7 md:w-8 md:h-8 border shadow-sm shrink-0">
                    <AvatarFallback
                      className={
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white text-blue-600"
                      }
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        <Bot className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`rounded-2xl px-3 md:px-4 py-2 md:py-3 max-w-[85%] md:max-w-[80%] text-xs md:text-sm shadow-sm overflow-hidden ${
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white text-gray-800 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap wrap-anywhere">
                      {message.content}
                    </div>
                    {message.role === "assistant" && (() => {
                      const draftId = extractDraftId(message.content);
                      if (draftId) {
                        return (
                          <div className="mt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                console.log("ChatInterface: Button clicked for draft ID:", draftId);
                                onOpenDraft?.(draftId);
                              }}
                            >
                              Abrir Rascunho #{draftId}
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-2 md:gap-4">
                <Avatar className="w-7 h-7 md:w-8 md:h-8 border shadow-sm shrink-0">
                  <AvatarFallback className="bg-white text-blue-600">
                    <Bot className="w-4 h-4 md:w-5 md:h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white rounded-2xl rounded-tl-none px-3 md:px-4 py-2 md:py-3 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Selected file indicator */}
      {selectedFile && (
        <div className="shrink-0 px-4 py-2 bg-blue-50 border-t border-blue-100">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <FileUp className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-blue-500 text-xs">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelFile}
                className="text-gray-500 hover:text-red-500 h-7 px-2"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white h-7"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <FileUp className="w-4 h-4 mr-1" />
                )}
                Importar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input fixo no bottom */}
      <div className="shrink-0 p-3 md:p-4 pb-4 md:pb-8 bg-linear-to-t from-background via-background to-transparent">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative flex items-end bg-white rounded-2xl md:rounded-3xl shadow-md border border-gray-200 px-3 md:px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Input
              placeholder="Digite sua pergunta aqui..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isUploading}
              className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-gray-700 placeholder:text-gray-400 h-10 md:h-11 py-2 md:py-3 text-sm"
            />
            <div className="flex items-center gap-1 md:gap-2 ml-1 md:ml-2 mb-0.5 md:mb-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading}
                className="text-gray-400 hover:text-blue-600 rounded-full h-7 w-7 md:h-8 md:w-8"
                title="Anexar documento .docx"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleSendMessage()}
                disabled={isLoading || isUploading || !inputValue.trim()}
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:bg-blue-50 rounded-full h-7 w-7 md:h-8 md:w-8"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="text-center mt-1 md:mt-2 text-[10px] md:text-xs text-gray-400">v 1.11.0</div>
        </div>
      </div>
    </div>
  );
}
