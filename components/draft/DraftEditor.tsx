"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { Draft } from "@/types";
import { getDraft, updateDraft, generateDocument } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Save,
  FileText,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
} from "lucide-react";
import { toast } from "sonner";

interface DraftEditorProps {
  draftId: number;
  onGenerateSuccess?: () => void;
}

export function DraftEditor({ draftId, onGenerateSuccess }: DraftEditorProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    const loadDraft = async () => {
      try {
        console.log("DraftEditor: Loading draft ID:", draftId);
        setLoading(true);
        const data = await getDraft(draftId);
        console.log("DraftEditor: Loaded data:", data);
        setDraft(data);

        // Convert JSON content to Markdown
        let md = `# ${data.title}\n\n`;
        if (data.content) {
          if (typeof data.content === "string") {
            md += data.content;
          } else {
            // If it's a JSON object, try to be smart or just dump it
            // Ideally, we'd have a converter here.
            // For now, let's assume the user wants to edit the structure as MD.
            // If the backend sends { sections: [{ title: '...', content: '...' }] }
            // We could map it.
            // Let's do a basic mapping if it looks like our standard structure
            // Check for 'sections' (English) or 'secao' (Portuguese)
            const sections = data.content.sections || data.content.secao;

            if (sections && Array.isArray(sections)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              sections.forEach((section: any) => {
                const title = section.title || section.titulo;
                const content =
                  section.content || section.paragrafo || section.texto;

                if (title) {
                  md += `## ${title}\n\n`;
                }

                if (content) {
                  md += `${content}\n\n`;
                }

                // Handle dynamic tables if present
                if (section.tabela_dinamica) {
                  // Simple table representation or just dump it
                  // For now, let's try to make it readable
                  md += `**Tabela:**\n\n\`\`\`json\n${JSON.stringify(
                    section.tabela_dinamica,
                    null,
                    2
                  )}\n\`\`\`\n\n`;
                }
              });
            } else {
              md +=
                "```json\n" + JSON.stringify(data.content, null, 2) + "\n```";
            }
          }
        }

        if (editor) {
          editor.commands.setContent(md);
        }
      } catch {
        toast.error("Error loading draft", {
          description: "Could not fetch draft details",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [draftId, editor]);

  const handleSave = async () => {
    if (!draft || !editor) return;
    try {
      setSaving(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (editor.storage as any).markdown.getMarkdown();

      // Convert Markdown back to JSON structure if possible/needed
      // For now, we'll save the markdown string as 'content' or wrap it
      // If the backend expects the same structure we received, we might need to parse.
      // But the user said "transforme em markdown".
      // Let's try to reconstruct the sections if we detected them, otherwise send string.
      // Actually, parsing MD back to structured JSON is hard without a parser.
      // I'll send the markdown string for now, assuming backend can handle it or we update the Draft type to allow string content.

      await updateDraft(draft.id, markdown);

      toast.success("Draft saved", {
        description: "Your changes have been saved.",
      });
    } catch {
      toast.error("Error saving draft", {
        description: "Could not save changes",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!draft) return;
    try {
      setGenerating(true);
      await handleSave();

      const result = await generateDocument(draft.id);
      toast.success("Document generated", {
        description: `File created: ${result.filename}`,
      });
      if (onGenerateSuccess) onGenerateSuccess();
    } catch {
      toast.error("Generation failed", {
        description: "Could not generate final document",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Draft not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Editing: {draft.title}</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Document
          </Button>
        </div>
      </div>

      <div className="flex-1 border rounded-md overflow-hidden bg-white flex flex-col">
        <div className="border-b p-2 flex gap-1 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
            className={editor?.isActive("bold") ? "bg-muted" : ""}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
            className={editor?.isActive("italic") ? "bg-muted" : ""}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            disabled={!editor}
            className={
              editor?.isActive("heading", { level: 1 }) ? "bg-muted" : ""
            }
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            disabled={!editor}
            className={
              editor?.isActive("heading", { level: 2 }) ? "bg-muted" : ""
            }
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
            className={editor?.isActive("bulletList") ? "bg-muted" : ""}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
            className={editor?.isActive("orderedList") ? "bg-muted" : ""}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
            className={editor?.isActive("blockquote") ? "bg-muted" : ""}
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  );
}
