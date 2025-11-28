import { ChatInterface } from "@/components/chat/chat-interface";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      <ChatInterface />
    </AppShell>
  );
}
