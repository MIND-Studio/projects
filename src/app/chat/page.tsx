"use client";

// F1 — chat with Kai. The browser writes user messages into the user's own
// chat folder (WAC = identity), the /api/chat route lets Kai answer.

import { Button, cn, Symbol } from "@mind-studio/ui";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Shell, useHub } from "@/components/Shell";
import { profile } from "@/lib/profile";
import { type ChatMsg, loadChat, sendChat } from "@/lib/solid/data";
import { t } from "@/lib/strings";

const SUGGESTIONS = [t.chatSuggest1, t.chatSuggest2, t.chatSuggest3, t.chatSuggest4];

function KaiBubble({ text, pending }: { text?: string; pending?: boolean }) {
  return (
    <div className="animate-rise flex items-start gap-2.5">
      <Symbol
        className={cn("mt-1 size-7 shrink-0 rounded-md", pending && "emai-glow-pulse")}
        alt={profile.assistantName}
      />
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border bg-card px-4 py-2.5">
        <p className="mb-1 text-xs font-semibold text-primary">
          {profile.assistantName} · {t.assistantAiLabel}
        </p>
        {pending ? (
          <span
            className="inline-flex gap-1 py-1"
            aria-label={t.assistantThinking(profile.assistantName)}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-primary motion-reduce:animate-none"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        ) : (
          <Markdown>{text ?? ""}</Markdown>
        )}
      </div>
    </div>
  );
}

function Chat() {
  const hub = useHub();
  const [messages, setMessages] = useState<ChatMsg[] | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat(hub.username)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [hub.username]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setError(null);
    setBusy(true);
    setInput("");
    setMessages((m) => [...(m ?? []), { author: "user", text, at: Date.now() }]);
    try {
      const reply = await sendChat(hub.username, text);
      setMessages((m) => [...(m ?? []), { author: "kai", text: reply, at: Date.now() }]);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes("unavailable") ? t.assistantUnavailable(profile.assistantName) : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-14rem)] max-w-3xl flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages === null && (
          <p className="text-sm text-muted-foreground">{t.loadingConversation}</p>
        )}
        {messages?.length === 0 && (
          <div className="animate-rise mt-12 flex flex-col items-center text-center">
            <Symbol className="mb-4 size-12 rounded-xl" />
            <p className="font-display text-lg font-semibold">
              {t.askAssistantTitle(profile.assistantName)}
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {t.chatEmptyHint(profile.assistantName)}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages?.map((m, n) =>
          m.author === "user" ? (
            <div key={n} className="animate-rise flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">
                {m.text}
              </div>
            </div>
          ) : (
            <KaiBubble key={n} text={m.text} />
          ),
        )}
        {busy && <KaiBubble pending />}
        <div ref={bottom} />
      </div>
      {error && <p className="py-2 text-sm text-error">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            busy
              ? t.assistantReplying(profile.assistantName)
              : t.messageToAssistant(profile.assistantName)
          }
          disabled={busy}
          className={cn(
            "h-11 flex-1 rounded-xl border bg-card px-4 text-sm outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60",
          )}
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 rounded-xl"
          disabled={busy || !input.trim()}
          aria-label={t.send}
        >
          <ArrowUp className="size-5" />
        </Button>
      </form>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {t.chatPrivacy(profile.assistantName)}
      </p>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  // The assistant is opt-in; if disabled, this route shouldn't render.
  useEffect(() => {
    if (!profile.assistant) router.replace("/");
  }, [router]);
  if (!profile.assistant) return null;
  return (
    <Shell>
      <Chat />
    </Shell>
  );
}
