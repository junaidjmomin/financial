import type { Message } from "@/app/page"
import { format } from "date-fns"

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground border border-border rounded-bl-none"
        }`}
      >
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-2 ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {format(message.timestamp, "HH:mm")}
        </p>
      </div>
    </div>
  )
}
