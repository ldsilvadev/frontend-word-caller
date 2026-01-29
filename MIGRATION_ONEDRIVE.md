# Plano de Migração Frontend: OnlyOffice → OneDrive + Office Online Preview

## Contexto

O frontend atual usa **OnlyOfficeEditor** para edição colaborativa de documentos. Com a migração do backend para OneDrive, precisamos substituir o editor por um **visualizador somente leitura** usando Office Online Viewer.

**Mudanças principais:**
- ❌ Remover OnlyOffice (edição em tempo real via iframe)
- ✅ Adicionar Office Online Viewer (preview read-only via iframe)
- ✅ Manter botão de download do documento
- ✅ Edições apenas via IA/chat (sem edição manual)

---

## Análise da Arquitetura Atual

### Componentes Afetados

| Componente | Uso Atual | Precisa Mudar? |
|-----------|-----------|----------------|
| `OnlyOfficeEditor.tsx` | Editor OnlyOffice | **SIM** - Substituir por Office Online Viewer |
| `DocumentEditor.tsx` | Wrapper do OnlyOffice | **SIM** - Ajustar para usar novo visualizador |
| `DraftEditor.tsx` | Editor de markdown (TipTap) | **NÃO** - Continua funcionando |
| `page.tsx` | Layout principal | **NÃO** - Apenas ajustes mínimos |
| `lib/api.ts` | Chamadas API | **SIM** - Adicionar funções para OneDrive |

### Fluxo Atual (OnlyOffice)

```
1. DocumentEditor carrega draft via getDraftStatus()
2. Passa draftId para OnlyOfficeEditor
3. OnlyOfficeEditor:
   - Checa disponibilidade: /onlyoffice/status
   - Carrega script: <onlyoffice-url>/web-apps/apps/api/documents/api.js
   - Obtém config JWT: /onlyoffice/config/:id
   - Inicializa editor com config + callbacks
4. Edições automáticas via callbacks do OnlyOffice
5. Publicar → POST /drafts/:id/publish
6. Download via downloadUrl do Supabase
```

### Fluxo Novo (OneDrive + Office Online)

```
1. DocumentEditor carrega draft via getDraftStatus()
2. Passa draftId para OfficeOnlineViewer
3. OfficeOnlineViewer:
   - Chama: GET /onedrive/preview/:id
   - Recebe: { previewUrl, downloadUrl, fileName, ... }
   - Renderiza iframe com previewUrl (Office Online)
4. Edições SOMENTE via chat/IA (sem edição manual)
5. Publicar → POST /drafts/:id/publish
6. Download → GET /onedrive/download/:id OU webUrl do OneDrive
```

---

## Estratégia de Migração

### Fase 1: Criar Novo Componente OfficeOnlineViewer

**Arquivo:** `components/draft/OfficeOnlineViewer.tsx`

**Responsabilidades:**
- Buscar preview URL do backend
- Renderizar iframe do Office Online (somente leitura)
- Exibir loading state
- Error handling (OneDrive não configurado, arquivo não encontrado, etc.)
- Refresh/reload do preview

**Props:**
```typescript
interface OfficeOnlineViewerProps {
  draftId: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

interface OfficeOnlineViewerRef {
  reloadPreview: () => Promise<void>;
}
```

**Dados retornados pelo backend:**
```typescript
interface PreviewData {
  previewUrl: string;        // URL do Office Online Viewer
  fileName: string;          // Nome do arquivo
  title: string;             // Título do draft
  lastModified: string;      // Data da última modificação
  downloadUrl: string;       // URL de download direto
  webUrl?: string;           // URL do OneDrive (opcional)
}
```

### Fase 2: Atualizar api.ts com Funções OneDrive

**Adicionar funções:**

```typescript
// Obter preview do OneDrive
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
  if (!response.ok) throw new Error("Failed to fetch preview");
  return await response.json();
}

// Download do OneDrive
export function getOneDriveDownloadUrl(id: string): string {
  return `${API_URL}/onedrive/download/${id}`;
}
```

### Fase 3: Atualizar DocumentEditor.tsx

**Mudanças:**
1. Substituir `OnlyOfficeEditor` por `OfficeOnlineViewer`
2. Remover referência a `OnlyOfficeEditorRef`
3. Ajustar lógica de reload
4. Manter botão "Exportar" (publica para OneDrive published/)
5. Ajustar botão de download para usar endpoint OneDrive

**Antes:**
```typescript
<OnlyOfficeEditor
  ref={onlyOfficeRef}
  draftId={draftId}
  onSave={...}
  onError={...}
/>
```

**Depois:**
```typescript
<OfficeOnlineViewer
  ref={viewerRef}
  draftId={draftId}
  onLoad={...}
  onError={...}
/>
```

### Fase 4: Atualizar DraftStatus Type

**Arquivo:** `lib/api.ts`

Adicionar campos do OneDrive:
```typescript
export interface DraftStatus {
  // ... campos existentes
  oneDriveItemId?: string;
  oneDrivePath?: string;
  previewUrl?: string;
  downloadUrl?: string;  // Agora aponta para OneDrive
}
```

### Fase 5: Atualizar UI

**DocumentEditor.tsx - Header:**
- Remover botão "Recarregar" (preview auto-atualiza)
- Manter botão "Exportar" (publish)
- Adicionar botão "Abrir no OneDrive" (opcional)

**DocumentEditor.tsx - Published State:**
- Botão "Baixar Documento" → usar `/onedrive/download/:id`
- Opcional: Botão "Abrir no OneDrive" → usar `webUrl`

### Fase 6: Remover OnlyOffice

**Deletar:**
- `components/draft/OnlyOfficeEditor.tsx`

**Atualizar:**
- `package.json` - Remover dependências do OnlyOffice (se houver)

---

## Implementação Detalhada

### Arquivo 1: `components/draft/OfficeOnlineViewer.tsx` (NOVO)

```typescript
"use client";

import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOneDrivePreview, PreviewData } from "@/lib/api";
import { toast } from "sonner";

export interface OfficeOnlineViewerRef {
  reloadPreview: () => Promise<void>;
}

interface OfficeOnlineViewerProps {
  draftId: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export const OfficeOnlineViewer = forwardRef<OfficeOnlineViewerRef, OfficeOnlineViewerProps>(
  function OfficeOnlineViewer({ draftId, onLoad, onError }, ref) {
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [iframeKey, setIframeKey] = useState(0);

    const loadPreview = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getOneDrivePreview(draftId);
        setPreviewData(data);

        onLoad?.();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro ao carregar preview";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    }, [draftId, onLoad, onError]);

    useEffect(() => {
      loadPreview();
    }, [loadPreview]);

    const reload = useCallback(async () => {
      toast.info("Recarregando preview...");
      setIframeKey(prev => prev + 1);
      await loadPreview();
    }, [loadPreview]);

    useImperativeHandle(ref, () => ({
      reloadPreview: reload,
    }), [reload]);

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8">
          <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Não foi possível carregar o preview
          </h3>
          <p className="text-gray-600 text-center mb-4 max-w-md">{error}</p>
          <div className="flex gap-2">
            <Button onClick={reload} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    if (loading || !previewData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Carregando preview...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex flex-col h-full w-full">
        {/* Preview Info Bar */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <span className="font-medium">Preview Somente Leitura</span>
            <span className="text-xs text-blue-600">
              Edições via IA apenas
            </span>
          </div>
          {previewData.webUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(previewData.webUrl, "_blank")}
              className="text-blue-700 hover:text-blue-900"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir no OneDrive
            </Button>
          )}
        </div>

        {/* Office Online Iframe */}
        <iframe
          key={iframeKey}
          src={previewData.previewUrl}
          className="flex-1 w-full border-0"
          title={`Preview de ${previewData.fileName}`}
          allowFullScreen
        />
      </div>
    );
  }
);
```

### Arquivo 2: `lib/api.ts` (ATUALIZAR)

```typescript
// Adicionar no final do arquivo

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
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch OneDrive preview");
  }
  return await response.json();
}

export function getOneDriveDownloadUrl(id: string): string {
  return `${API_URL}/onedrive/download/${id}`;
}
```

### Arquivo 3: `components/draft/DocumentEditor.tsx` (MODIFICAR)

**Mudanças principais:**

1. **Imports:**
```typescript
// REMOVER
import { OnlyOfficeEditor, OnlyOfficeEditorRef } from "./OnlyOfficeEditor";

// ADICIONAR
import { OfficeOnlineViewer, OfficeOnlineViewerRef } from "./OfficeOnlineViewer";
import { getOneDriveDownloadUrl } from "@/lib/api";
```

2. **Refs:**
```typescript
// ANTES
const onlyOfficeRef = useRef<OnlyOfficeEditorRef>(null);

// DEPOIS
const viewerRef = useRef<OfficeOnlineViewerRef>(null);
```

3. **useImperativeHandle:**
```typescript
useImperativeHandle(ref, () => ({
  reloadDocument: async () => {
    if (status?.status === "published" || publishedInfo) {
      console.log("[DocumentEditor] Documento já publicado, ignorando reload");
      return;
    }

    setIsReloading(true);
    toast.info("Recarregando preview...");

    await viewerRef.current?.reloadPreview();  // MUDANÇA
    await loadStatus();

    setIsReloading(false);
    toast.success("Preview recarregado!");
  },
}), [status?.status, publishedInfo]);
```

4. **handleDownload:**
```typescript
const handleDownload = () => {
  // Usar endpoint do OneDrive
  const downloadUrl = getOneDriveDownloadUrl(draftId);
  window.open(downloadUrl, "_blank");
};
```

5. **handleReload:**
```typescript
const handleReload = async () => {
  setIsReloading(true);
  await viewerRef.current?.reloadPreview();  // MUDANÇA
  await loadStatus();
  setIsReloading(false);
};
```

6. **Render do editor:**
```typescript
// ANTES
<OnlyOfficeEditor
  ref={onlyOfficeRef}
  draftId={draftId}
  onSave={() => {
    toast.success("Documento salvo!");
    loadStatus();
  }}
  onError={(error) => {
    toast.error(`Erro: ${error}`);
  }}
/>

// DEPOIS
<OfficeOnlineViewer
  ref={viewerRef}
  draftId={draftId}
  onLoad={() => {
    console.log("[DocumentEditor] Preview carregado");
  }}
  onError={(error) => {
    toast.error(`Erro no preview: ${error}`);
  }}
/>
```

7. **Header - Remover botão "Recarregar"** (opcional):
   - Office Online auto-atualiza, então o botão de reload pode ser removido ou mantido para forçar refresh manual

---

## Ordem de Implementação

1. ✅ **Criar OfficeOnlineViewer.tsx**
   - Componente novo com preview read-only
   - Testar isoladamente

2. ✅ **Atualizar lib/api.ts**
   - Adicionar `getOneDrivePreview()`
   - Adicionar `getOneDriveDownloadUrl()`

3. ✅ **Modificar DocumentEditor.tsx**
   - Substituir OnlyOfficeEditor por OfficeOnlineViewer
   - Atualizar lógica de download
   - Testar fluxo completo

4. ✅ **Deletar OnlyOfficeEditor.tsx**
   - Remover arquivo antigo
   - Verificar imports quebrados

5. ✅ **Testes End-to-End**
   - Criar draft via chat
   - Visualizar preview
   - Editar via IA (chat)
   - Reload do preview
   - Publicar documento
   - Download do documento publicado

6. ✅ **Atualizar documentação**
   - README do frontend
   - Comentários no código

---

## Diferenças de Comportamento

| Aspecto | OnlyOffice (Antes) | Office Online (Depois) |
|---------|-------------------|------------------------|
| **Edição** | Colaborativa em tempo real | **Somente leitura** |
| **Callbacks** | onSave, onReady, onError | onLoad, onError |
| **Sincronização** | Automática via callbacks | Manual via reload |
| **Modo de edição** | Editor completo | Preview apenas |
| **Download** | Via Supabase URL | Via OneDrive endpoint |
| **Requisitos** | Docker container OnlyOffice | Azure AD configurado |

---

## Configuração Necessária

### Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Nenhuma variável adicional necessária no frontend - toda configuração OneDrive é no backend.

---

## Testes

### Casos de Teste

1. **Preview de documento existente**
   - Criar draft via chat
   - Verificar preview carregado
   - ✅ Iframe renderiza Office Online
   - ✅ Documento visível e navegável

2. **Download de documento**
   - Clicar em "Baixar Documento"
   - ✅ Download inicia
   - ✅ Arquivo .docx válido

3. **Edição via IA**
   - Pedir IA para adicionar seção
   - Aguardar resposta
   - Reload manual ou automático
   - ✅ Preview atualizado com nova seção

4. **Publicar documento**
   - Clicar em "Exportar"
   - ✅ Status muda para "published"
   - ✅ Tela de sucesso exibida
   - ✅ Botão de download funciona

5. **Erro: OneDrive não configurado**
   - Backend sem credenciais Azure
   - ✅ Mensagem de erro clara
   - ✅ Botão "Tentar novamente"

6. **Reload de preview**
   - Editar via IA
   - Clicar em "Recarregar"
   - ✅ Preview atualizado
   - ✅ Sem perda de contexto

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Office Online não carregar iframe | Fallback com mensagem de erro e botão de download |
| Preview URL expirar | Regenerar URL no backend a cada solicitação |
| Performance de preview lento | Loading state claro, timeout de 10s |
| Usuário tentar editar (frustração) | Banner claro: "Somente Leitura - Edições via IA" |
| CORS issues com Office Online | Office Online permite iframes por padrão |

---

## Melhorias Futuras (Opcionais)

1. **Auto-reload após edição IA**
   - Quando chat retorna `draftUpdated: true`, auto-reload do preview
   - Implementar via polling ou WebSocket

2. **Comparação de versões**
   - Mostrar diff entre versão atual e anterior
   - Histórico de edições

3. **Comentários inline**
   - Permitir comentários (via IA ou manual)
   - Armazenar no MongoDB

4. **Preview de múltiplos formatos**
   - PDF, DOCX, XLSX via Office Online
   - Fallback para preview genérico

5. **Sincronização em tempo real**
   - WebSocket para notificar mudanças
   - Auto-refresh do preview

---

## Comparação de Código

### ANTES (OnlyOffice)

```typescript
// DocumentEditor.tsx
<div className="flex-1 overflow-hidden">
  <OnlyOfficeEditor
    ref={onlyOfficeRef}
    draftId={draftId}
    onSave={() => toast.success("Documento salvo!")}
    onError={(error) => toast.error(`Erro: ${error}`)}
  />
</div>
```

### DEPOIS (Office Online)

```typescript
// DocumentEditor.tsx
<div className="flex-1 overflow-hidden">
  <OfficeOnlineViewer
    ref={viewerRef}
    draftId={draftId}
    onLoad={() => console.log("Preview loaded")}
    onError={(error) => toast.error(`Erro no preview: ${error}`)}
  />
</div>
```

---

## Checklist de Migração

- [ ] Backend: Endpoints `/onedrive/preview/:id` e `/onedrive/download/:id` funcionando
- [ ] Frontend: Criar `OfficeOnlineViewer.tsx`
- [ ] Frontend: Atualizar `lib/api.ts` com funções OneDrive
- [ ] Frontend: Modificar `DocumentEditor.tsx` para usar novo visualizador
- [ ] Frontend: Remover `OnlyOfficeEditor.tsx`
- [ ] Testar: Preview de documento existente
- [ ] Testar: Download via OneDrive
- [ ] Testar: Edição via IA + reload
- [ ] Testar: Publicação de documento
- [ ] Testar: Error handling (OneDrive não configurado)
- [ ] Documentação: Atualizar README.md
- [ ] Deploy: Atualizar variáveis de ambiente

---

## Notas Finais

**Vantagens da nova abordagem:**
- ✅ Não precisa de Docker (OnlyOffice)
- ✅ Integração nativa com Microsoft 365
- ✅ Preview familiar para usuários de Office
- ✅ Menor complexidade de infraestrutura

**Desvantagens:**
- ❌ Sem edição manual (somente IA)
- ❌ Dependência de Microsoft Graph API
- ❌ Necessário Azure AD configurado

**Decisão de produto:**
Este é um trade-off aceitável dado que o foco do produto é **edição assistida por IA**, não edição colaborativa manual.
