import { LibrarySidebar } from "@/components/LibrarySidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { PasscodeGate } from "@/components/PasscodeGate";

export default function Home() {
  return (
    <PasscodeGate>
      <div className="flex h-screen w-full">
        <LibrarySidebar />
        <ChatPanel />
      </div>
    </PasscodeGate>
  );
}
