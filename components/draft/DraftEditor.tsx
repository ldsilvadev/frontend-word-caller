"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { Markdown } from "tiptap-markdown";
import { Draft, DraftContent } from "@/types";
import { getDraft, updateDraft, generateDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2, Save, FileText, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Heading1, Heading2, Heading3, Quote,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Highlighter,
  Undo, Redo, Table as TableIcon, Minus, Strikethrough, ListTree, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

// Interface para expor métodos do editor via ref
export interface DraftEditorRef {
  reloadDraft: () => Promise<void>;
  getCurrentContent: () => { markdown: string; metadata: DocumentMeta } | null;
}

// A4 dimensions in pixels (96 DPI)
const A4_WIDTH = 794; // 210mm
const A4_HEIGHT = 1123; // 297mm
const PAGE_MARGIN_TOP = 40;
const PAGE_MARGIN_BOTTOM = 40;
const HEADER_HEIGHT = 140;
const FOOTER_HEIGHT = 40;
const CONTENT_HEIGHT = A4_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - PAGE_MARGIN_TOP - PAGE_MARGIN_BOTTOM;

interface TocItem {
  id: string;
  text: string;
  level: number;
  number: string;
}

interface DocumentMeta {
  assunto: string;
  codigo: string;
  departamento: string;
  revisao: string;
  data_publicacao: string;
  data_vigencia: string;
}

interface DraftEditorProps {
  draftId: string;
  onGenerateSuccess?: () => void;
}


function extractToc(editor: Editor | null): TocItem[] {
  if (!editor) return [];
  const items: TocItem[] = [];
  const counters = [0, 0, 0];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      const text = node.textContent;

      if (level === 1) { counters[0]++; counters[1] = 0; counters[2] = 0; }
      else if (level === 2) { counters[1]++; counters[2] = 0; }
      else if (level === 3) { counters[2]++; }

      let number = "";
      if (level === 1) number = `${counters[0]}`;
      else if (level === 2) number = `${counters[0]}.${counters[1]}`;
      else if (level === 3) number = `${counters[0]}.${counters[1]}.${counters[2]}`;

      items.push({ id: `heading-${pos}`, text, level, number });
    }
  });
  return items;
}

function generateNumberedMarkdown(editor: Editor | null): string {
  if (!editor) return "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markdown = (editor.storage as Record<string, any>).markdown.getMarkdown();
  const lines = markdown.split("\n");
  const counters = [0, 0, 0];

  return lines.map((line: string) => {
    if (line.startsWith("# ")) {
      counters[0]++; counters[1] = 0; counters[2] = 0;
      return `# ${counters[0]}. ${line.slice(2)}`;
    } else if (line.startsWith("## ")) {
      counters[1]++; counters[2] = 0;
      return `## ${counters[0]}.${counters[1]} ${line.slice(3)}`;
    } else if (line.startsWith("### ")) {
      counters[2]++;
      return `### ${counters[0]}.${counters[1]}.${counters[2]} ${line.slice(4)}`;
    }
    return line;
  }).join("\n");
}

function extractMetadata(content: DraftContent | string, title: string): DocumentMeta {
  const defaultMeta: DocumentMeta = {
    assunto: title,
    codigo: "---",
    departamento: "---",
    revisao: "01",
    data_publicacao: new Date().toLocaleDateString("pt-BR"),
    data_vigencia: "---",
  };
  if (typeof content === "string") return defaultMeta;

  // Se content tem metadata, usar ele; senão usar os campos diretos (backward compatibility)
  const meta = content.metadata || (content as any);

  return {
    assunto: meta.assunto || title,
    codigo: meta.codigo || defaultMeta.codigo,
    departamento: meta.departamento || defaultMeta.departamento,
    revisao: meta.revisao || defaultMeta.revisao,
    data_publicacao: meta.data_publicacao || defaultMeta.data_publicacao,
    data_vigencia: meta.data_vigencia || defaultMeta.data_vigencia,
  };
}

// Page Header Component
function PageHeader({ metadata }: { metadata: DocumentMeta }) {
  return (
    <div className="page-header px-8 pt-6 pb-3 border-b-2 border-gray-300">
      <div className="flex justify-center mb-3">
        <div className="text-center">
          <div className="text-[10px] text-gray-500">Sistema</div>
          <div className="text-xl font-bold text-red-600 tracking-tight">
            F<span className="text-blue-600">i</span>ERGS
          </div>
          <div className="text-[7px] text-gray-400 tracking-widest">SESI SENAI IEL CIERGS</div>
        </div>
      </div>
      <table className="w-full border-collapse text-xs">
        <tbody>
          <tr>
            <td className="border border-gray-400 px-2 py-1.5 text-center font-medium bg-gray-50 w-1/2">
              {metadata.assunto}
            </td>
            <td className="border border-gray-400 px-2 py-1.5 text-center w-1/2">
              {metadata.codigo}
            </td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-2 py-1.5 text-center bg-gray-50">
              <div className="text-[10px] text-gray-500">Procedimento</div>
              <div>{metadata.departamento}</div>
            </td>
            <td className="border border-gray-400 px-2 py-1.5 text-center">
              <span className="underline">Revisão:</span>{metadata.revisao}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Page Footer Component
function PageFooter({ metadata, pageNum, totalPages }: { metadata: DocumentMeta; pageNum: number; totalPages: number }) {
  return (
    <div className="page-footer px-8 py-2 border-t border-gray-300">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Documento Publicado em: {metadata.data_publicacao}</span>
        <span>Data de Vigência: {metadata.data_vigencia}</span>
        <span>Página {pageNum} de {totalPages}</span>
      </div>
    </div>
  );
}


export const DraftEditor = forwardRef<DraftEditorRef, DraftEditorProps>(function DraftEditor({ draftId, onGenerateSuccess }, ref) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [metadata, setMetadata] = useState<DocumentMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isReloading, setIsReloading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Placeholder.configure({ placeholder: "Comece a escrever seu documento..." }),
      TextStyle, Color, FontFamily,
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    editorProps: { attributes: { class: "word-editor" } },
    immediatelyRender: false,
  });

  // Calculate pages based on content height
  const calculatePages = useCallback(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const pages = Math.max(1, Math.ceil(contentHeight / CONTENT_HEIGHT));
      setTotalPages(pages);
    }
  }, []);

  useEffect(() => {
    calculatePages();
    window.addEventListener("resize", calculatePages);
    return () => window.removeEventListener("resize", calculatePages);
  }, [calculatePages]);

  useEffect(() => {
    if (editor) {
      const timeout = setTimeout(calculatePages, 100);
      editor.on("update", () => setTimeout(calculatePages, 50));
      return () => clearTimeout(timeout);
    }
  }, [editor, calculatePages, editorKey]);

  const loadDraft = useCallback(async () => {
    if (!editor) return;
    try {
      setLoading(true);
      const data = await getDraft(draftId);
      setDraft(data);
      const meta = extractMetadata(data.content, data.title);
      setMetadata(meta);

      let md = "";
      if (data.content) {
        if (typeof data.content === "string") {
          md = data.content;
        } else {
          // Verificar se tem markdownContent (novo formato salvo pelo editor)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contentObj = data.content as any;
          if (contentObj.markdownContent) {
            // Usar o markdown diretamente
            md = contentObj.markdownContent;
          } else {
            // Formato antigo com sections/secao
            const sections = contentObj.sections || contentObj.secao || contentObj.secoes;
            if (sections && Array.isArray(sections)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              sections.forEach((section: Record<string, any>) => {
                const title = section.title || section.titulo;
                const content = section.content || section.paragrafo || section.texto || section.conteudo;
                const items = section.items || section.itens || section.lista;

                if (title) md += `# ${title}\n\n`;
                if (content) md += `${content}\n\n`;

                if (items && Array.isArray(items)) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  items.forEach((item: string | Record<string, any>) => {
                    if (typeof item === "string") md += `- ${item}\n`;
                    else if (item.texto || item.content) md += `- ${item.texto || item.content}\n`;
                  });
                  md += "\n";
                }

                if (section.subsections || section.subsecoes) {
                  const subs = section.subsections || section.subsecoes;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  subs.forEach((sub: Record<string, any>) => {
                    const subTitle = sub.title || sub.titulo;
                    const subContent = sub.content || sub.texto || sub.conteudo;
                    if (subTitle) md += `## ${subTitle}\n\n`;
                    if (subContent) md += `${subContent}\n\n`;
                  });
                }

                if (section.tabela_dinamica || section.table || section.tabela) {
                  const tableData = section.tabela_dinamica || section.table || section.tabela;
                  md += `\n\`\`\`json\n${JSON.stringify(tableData, null, 2)}\n\`\`\`\n\n`;
                }
              });
            } else {
              md = "```json\n" + JSON.stringify(data.content, null, 2) + "\n```";
            }
          }
        }
      }
      editor.commands.setContent(md);
      setTimeout(calculatePages, 100);
    } catch {
      toast.error("Erro ao carregar rascunho");
    } finally {
      setLoading(false);
    }
  }, [draftId, editor, calculatePages]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  // Expor funções via ref para o componente pai
  useImperativeHandle(ref, () => ({
    reloadDraft: async () => {
      console.log("[DraftEditor] Reloading draft...");
      setIsReloading(true);
      isInitialLoadRef.current = true; // Resetar para não disparar auto-save no reload
      toast.info("Atualizando documento...", { duration: 1500 });
      await loadDraft();
      setHasUnsavedChanges(false);
      setIsReloading(false);
      toast.success("Documento atualizado!", { duration: 2000 });
    },
    getCurrentContent: () => {
      if (!editor || !metadata) return null;
      return {
        markdown: generateNumberedMarkdown(editor),
        metadata: metadata,
      };
    }
  }), [loadDraft, editor, metadata]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toc = useMemo(() => extractToc(editor), [editor, editorKey]);

  useEffect(() => {
    if (!editor) return;
    const updateToc = () => setEditorKey((k) => k + 1);
    editor.on("update", updateToc);
    return () => { editor.off("update", updateToc); };
  }, [editor]);

  // Função de salvar (usada tanto manual quanto auto-save)
  const saveContent = useCallback(async (showToast = true) => {
    if (!draft || !editor || !metadata) return;
    try {
      setSaving(true);
      
      // Preservar metadados originais junto com o conteúdo Markdown
      const contentToSave = {
        // Metadados do documento
        assunto: metadata.assunto,
        codigo: metadata.codigo,
        departamento: metadata.departamento,
        revisao: metadata.revisao,
        data_publicacao: metadata.data_publicacao,
        data_vigencia: metadata.data_vigencia,
        // Conteúdo em Markdown para ser parseado no backend
        markdownContent: generateNumberedMarkdown(editor),
      };
      
      await updateDraft(draft.id, contentToSave);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      if (showToast) {
        toast.success("Rascunho salvo");
      }
    } catch {
      if (showToast) {
        toast.error("Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }, [draft, editor, metadata]);

  // Auto-save: salva automaticamente após 2 segundos de inatividade
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      // Ignorar a primeira atualização (carregamento inicial)
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }
      
      setHasUnsavedChanges(true);
      
      // Cancelar timeout anterior
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Agendar auto-save após 2 segundos de inatividade
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log("[DraftEditor] Auto-saving...");
        saveContent(false); // Salvar sem toast
      }, 2000);
    };
    
    editor.on("update", handleUpdate);
    
    return () => {
      editor.off("update", handleUpdate);
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [editor, saveContent]);

  // Salvar ao sair da página se houver mudanças não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    await saveContent(true);
  };

  const scrollToHeading = (id: string) => {
    const pos = parseInt(id.replace("heading-", ""));
    editor?.chain().focus().setTextSelection(pos).run();
  };

  const handleGenerate = async () => {
    if (!draft) return;
    try {
      setGenerating(true);
      await handleSave();
      const result = await generateDocument(draft.id);
      toast.success("Documento gerado", { description: `Arquivo: ${result.filename}` });
      if (onGenerateSuccess) onGenerateSuccess();
    } catch {
      toast.error("Falha na geração");
    } finally {
      setGenerating(false);
    }
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!draft || !metadata) {
    return <div className="p-4 text-center text-muted-foreground">Rascunho não encontrado</div>;
  }


  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* App Header */}
      <div className={`bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm transition-colors ${isReloading ? "bg-blue-50 border-blue-200" : ""}`}>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800 truncate">{draft.title}</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {totalPages} {totalPages === 1 ? "página" : "páginas"}
          </span>
          {isReloading && (
            <span className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              IA atualizando...
            </span>
          )}
          {!isReloading && hasUnsavedChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Alterações não salvas
            </span>
          )}
          {!isReloading && !hasUnsavedChanges && lastSaved && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
              Salvo
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowToc(!showToc)} className={showToc ? "bg-blue-50" : ""}>
            <ListTree className="mr-2 h-4 w-4" />Sumário
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || isReloading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating || isReloading}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Gerar Word
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-2 py-1.5 flex flex-wrap gap-0.5 items-center shadow-sm">
        <div className="flex border-r pr-2 mr-2">
          <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Desfazer"><Undo className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Refazer"><Redo className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex border-r pr-2 mr-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Negrito"><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Itálico"><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} title="Tachado"><Strikethrough className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHighlight().run()} active={editor?.isActive("highlight")} title="Destacar"><Highlighter className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex border-r pr-2 mr-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} title="Título 1"><Heading1 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Título 2"><Heading2 className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Título 3"><Heading3 className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex border-r pr-2 mr-2">
          <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Esquerda"><AlignLeft className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Centro"><AlignCenter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Direita"><AlignRight className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().setTextAlign("justify").run()} active={editor?.isActive({ textAlign: "justify" })} title="Justificar"><AlignJustify className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex border-r pr-2 mr-2">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Lista"><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Lista numerada"><ListOrdered className="h-4 w-4" /></ToolbarButton>
        </div>
        <div className="flex">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Citação"><Quote className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Linha"><Minus className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={insertTable} title="Tabela"><TableIcon className="h-4 w-4" /></ToolbarButton>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* TOC Sidebar */}
        {showToc && (
          <div className="w-64 bg-white border-r overflow-y-auto p-4 shrink-0">
            <h3 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Sumário</h3>
            {toc.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Adicione títulos ao documento</p>
            ) : (
              <nav className="space-y-1">
                {toc.map((item) => (
                  <button key={item.id} onClick={() => scrollToHeading(item.id)}
                    className={`block w-full text-left text-sm hover:bg-blue-50 hover:text-blue-700 rounded px-2 py-1.5 transition-colors truncate ${
                      item.level === 1 ? "font-semibold text-gray-800" : item.level === 2 ? "pl-4 text-gray-700" : "pl-6 text-gray-600 text-xs"
                    }`}
                    title={`${item.number} ${item.text}`}
                  >
                    <span className="text-blue-600 mr-1.5">{item.number}</span>{item.text}
                  </button>
                ))}
              </nav>
            )}
          </div>
        )}

        {/* Document - Continuous scroll with page breaks */}
        <div className="flex-1 overflow-auto p-6 bg-gray-300">
          <div className="flex flex-col items-center">
            <div
              className="a4-document bg-white shadow-xl"
              style={{ width: A4_WIDTH }}
            >
              {/* Document Header */}
              <PageHeader metadata={metadata} />
              
              {/* Document Content - continuous */}
              <div 
                ref={contentRef}
                className="doc-content px-8 py-4"
                style={{ 
                  minHeight: CONTENT_HEIGHT,
                  backgroundImage: `repeating-linear-gradient(
                    to bottom,
                    transparent,
                    transparent ${CONTENT_HEIGHT - 1}px,
                    #e5e7eb ${CONTENT_HEIGHT - 1}px,
                    #e5e7eb ${CONTENT_HEIGHT}px
                  )`,
                  backgroundSize: `100% ${CONTENT_HEIGHT}px`,
                }}
              >
                <EditorContent editor={editor} />
              </div>
              
              {/* Document Footer */}
              <PageFooter metadata={metadata} pageNum={1} totalPages={totalPages} />
            </div>
            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
});

function ToolbarButton({ children, onClick, active, disabled, title }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? "bg-blue-100 text-blue-700" : "text-gray-600"}`}
    >{children}</button>
  );
}
