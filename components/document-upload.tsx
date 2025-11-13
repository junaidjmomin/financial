
"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, X, File } from "lucide-react"

export interface UploadedDocument {
  id: string
  name: string
  size: number
  type: string
  content: string // Added: actual file content
}

interface DocumentUploadProps {
  onDocumentsChange: (documents: UploadedDocument[]) => void
  disabled: boolean
}

export default function DocumentUpload({ onDocumentsChange, disabled }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`))
      }

      // Read as text for most document types
      if (file.type.includes('text') || 
          file.name.endsWith('.txt') || 
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json')) {
        reader.readAsText(file)
      } else {
        // For binary files (PDF, DOCX, etc.), read as data URL
        reader.readAsDataURL(file)
      }
    })
  }

  const handleFiles = async (files: FileList) => {
    setIsProcessing(true)
    
    try {
      const newDocs = await Promise.all(
        Array.from(files).map(async (file) => {
          try {
            const content = await readFileContent(file)
            return {
              id: Date.now().toString() + Math.random(),
              name: file.name,
              size: file.size,
              type: file.type,
              content: content
            }
          } catch (error) {
            console.error(`Error reading ${file.name}:`, error)
            return null
          }
        })
      )

      // Filter out failed reads
      const validDocs = newDocs.filter((doc): doc is UploadedDocument => doc !== null)
      const updatedDocs = [...documents, ...validDocs]
      setDocuments(updatedDocs)
      onDocumentsChange(updatedDocs)
    } catch (error) {
      console.error("Error processing files:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !disabled) {
      handleFiles(e.target.files)
    }
  }

  const removeDocument = (id: string) => {
    const updated = documents.filter((doc) => doc.id !== id)
    setDocuments(updated)
    onDocumentsChange(updated)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border"
        } ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          disabled={disabled || isProcessing}
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.csv,.json"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className="w-full flex flex-col items-center gap-2 py-4 hover:opacity-80 transition-opacity disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5 text-muted-foreground" />
          <div className="text-sm">
            {isProcessing ? (
              <span className="font-medium text-foreground">Processing files...</span>
            ) : (
              <>
                <span className="font-medium text-foreground">Click to upload</span>
                <span className="text-muted-foreground"> or drag and drop</span>
              </>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            PDF, TXT, DOC, DOCX, XLS, XLSX, CSV, JSON
          </span>
        </button>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Uploaded Documents ({documents.length})
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:bg-card/80 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeDocument(doc.id)}
                  disabled={disabled}
                  className="p-1 hover:bg-destructive/10 rounded transition-colors disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
