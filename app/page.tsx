"use client"

import { useState, useRef, useEffect } from "react"
import ChatMessage from "@/components/chat-message"
import MessageInput from "@/components/message-input"
import ChatHeader from "@/components/chat-header"

export interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

// This interface must match the one in document-upload.tsx and message-input.tsx
interface UploadedDocument {
  id: string
  name: string
  size: number
  type: string
  content: string
  file: File
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your Financial Assistant. I can help you with financial questions, investment advice, budgeting tips, and more. You can also upload financial documents like bank statements, tax returns, or investment statements to analyze them together. What would you like to know?",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string, documents: UploadedDocument[]) => {
    if (!content.trim()) return

    console.log(`Sending message with ${documents.length} documents`)

    // Display message with attachment info
    let messageContent = content
    if (documents.length > 0) {
      messageContent += `\n\n📎 Attached: ${documents.map((d) => d.name).join(", ")}`
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      console.log("Preparing API request...")
      
      // Prepare documents for API (remove the File object as it's not serializable)
      const documentsForAPI = documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        type: doc.type,
        content: doc.content
      }))

      console.log(`Sending ${documentsForAPI.length} documents to API`)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          userMessage: content,
          documents: documentsForAPI,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.reply) {
        throw new Error("No reply received from API")
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.reply,
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      
      let errorContent = "Sorry, I encountered an unexpected error. Please try again."
      
      if (error instanceof Error) {
        if (error.message.includes("429") || error.message.includes("rate limit") || error.message.includes("quota")) {
          errorContent = "⏳ Rate limit reached. The Gemini API has usage limits. Please wait a minute and try again, or check your API quota at https://ai.google.dev/gemini-api/docs/rate-limits"
        } else if (error.message.includes("API key") || error.message.includes("401")) {
          errorContent = "🔑 API key issue. Please check that your GEMINI_API_KEY is correctly set in your .env.local file."
        } else {
          errorContent = `Sorry, I encountered an error: ${error.message}`
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: errorContent,
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="max-w-3xl mx-auto w-full">
          {messages.map((message) => (
            <div key={message.id} className="message-enter">
              <ChatMessage message={message} />
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-card text-card-foreground rounded-lg p-4 shadow-sm max-w-md">
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 py-6">
        <div className="max-w-3xl mx-auto w-full">
          <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  )
}
