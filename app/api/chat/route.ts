import { GoogleGenerativeAI } from "@google/generative-ai"

const FINANCIAL_SYSTEM_PROMPT = `You are FinanceAI, a professional financial advisor AI assistant. Your role is to help users with:

1. Investment guidance and portfolio analysis
2. Personal budgeting and financial planning
3. Tax strategies and optimization
4. Debt management and credit improvement
5. Retirement planning
6. Savings strategies
7. Financial goal setting

Guidelines:
- Provide practical, actionable advice
- Always remind users that you're not a licensed financial advisor and they should consult with professionals for major decisions
- Use simple language for complex financial concepts
- Include specific examples and scenarios when helpful
- Ask clarifying questions to provide personalized advice
- Stay focused on financial topics; politely redirect non-financial questions
- When documents are provided, carefully analyze their content and reference specific details in your responses
- Extract key financial data from documents and provide insights

Keep responses concise but informative (2-3 paragraphs typically).`

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface UploadedDocument {
  id: string
  name: string
  size: number
  type: string
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  userMessage: string
  documents?: UploadedDocument[]
}

// Helper function to sleep/wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('429')) {
        const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await sleep(delay)
        continue
      }
      
      // If it's not a rate limit error, throw immediately
      throw error
    }
  }
  
  throw lastError
}

export async function POST(request: Request) {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured")
      return Response.json(
        { 
          error: "GEMINI_API_KEY is not configured. Please add it to your .env.local file.",
          details: "Create a .env.local file in your project root and add: GEMINI_API_KEY=your_key_here"
        },
        { status: 500 },
      )
    }

    const body: RequestBody = await request.json()

    console.log("=== API Request ===")
    console.log("User message:", body.userMessage)
    console.log("Documents attached:", body.documents?.length || 0)

    let enhancedUserMessage = body.userMessage

    // Process documents and add their content to the message
    if (body.documents && body.documents.length > 0) {
      console.log("Processing documents...")
      
      enhancedUserMessage += `\n\n📎 ATTACHED DOCUMENTS:\n\n`
      
      for (const doc of body.documents) {
        console.log(`Document: ${doc.name}, content length: ${doc.content.length}`)
        
        enhancedUserMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
        enhancedUserMessage += `📄 FILE: ${doc.name}\n`
        enhancedUserMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
        enhancedUserMessage += doc.content
        enhancedUserMessage += `\n\n`
      }
      
      enhancedUserMessage += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      enhancedUserMessage += `Please analyze the above document(s) and answer this question:\n${body.userMessage}`
      
      console.log("Enhanced message created, total length:", enhancedUserMessage.length)
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

    // Ensure conversation always starts with a user message for Gemini API compatibility
    const conversationHistory = body.messages
      .filter((msg, index) => index > 0) // Skip the initial assistant welcome message
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }))

    console.log("Conversation history length:", conversationHistory.length)

    // Use gemini-1.5-flash for better rate limits (stable model)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: FINANCIAL_SYSTEM_PROMPT,
    })

    const chat =
      conversationHistory.length > 0
        ? model.startChat({
            history: conversationHistory,
            generationConfig: {
              maxOutputTokens: 2048,
              temperature: 0.7,
            },
          })
        : model.startChat({
            generationConfig: {
              maxOutputTokens: 2048,
              temperature: 0.7,
            },
          })

    console.log("Sending message to Gemini...")
    
    // Use retry logic for rate limit handling
    const result = await retryWithBackoff(
      async () => await chat.sendMessage(enhancedUserMessage),
      2, // Max 2 retries
      2000 // Start with 2 second delay
    )

    const response = result.response
    const reply = response.text()
    
    console.log("Response received, length:", reply.length)
    console.log("=== API Request Complete ===\n")

    return Response.json({ reply })
  } catch (error) {
    console.error("=== API Error ===")
    console.error("Error:", error)

    if (error instanceof Error) {
      console.error("Error message:", error.message)
      
      // Handle specific error types
      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
        return Response.json(
          { 
            error: "Rate limit exceeded. The Gemini API free tier has daily/hourly limits.",
            details: "Please wait a moment and try again, or consider upgrading your API plan at https://ai.google.dev/pricing"
          },
          { status: 429 },
        )
      }
      
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key')) {
        return Response.json(
          { 
            error: "Invalid Gemini API key. Please check your API key in .env.local",
            details: error.message
          },
          { status: 401 },
        )
      }
    }

    return Response.json({ 
      error: "Failed to process your request. Please try again in a moment.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
