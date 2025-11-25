import { SplitView } from "@/components/layout/split-view";
import { ChatInterface } from "@/components/chat/chat-interface";
import { DocumentViewer } from "@/components/viewer/document-viewer";

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <SplitView
        left={<ChatInterface />}
        right={<DocumentViewer />}
      />
    </main>
  );
}
