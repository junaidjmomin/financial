"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import DocumentUpload from "./document-upload"

interface UploadedDocument {
  id: string
  name: string
  size: number
  type: string
}

interface MessageInputProps {
  onSendMessage: (message: string, documents: UploadedDocument[]) => void
  disabled: boolean
}

export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [input, setInput] = useState("")
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [showDocuments, setShowDocuments] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSendMessage(input, documents)
      setInput("")
      setDocuments([])
      setShowDocuments(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }

  return (
    <div className="space-y-3">
      {showDocuments && <DocumentUpload onDocumentsChange={setDocuments} disabled={disabled} />}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask me about investments, budgeting, savings, taxes..."
          disabled={disabled}
          className="flex-1 min-h-12 max-h-32 p-3 rounded-lg border border-border bg-input text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowDocuments(!showDocuments)}
            disabled={disabled}
            className="h-12 w-12"
            title="Upload documents"
          >
            📎
          </Button>
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </Button>
        </div>
      </form>

      {documents.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""} attached
        </div>
      )}
    </div>
  )
}
