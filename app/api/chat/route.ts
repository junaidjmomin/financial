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
    console.log("API Key present:", !!process.env.GEMINI_API_KEY)
    console.log("API Key length:", process.env.GEMINI_API_KEY?.length || 0)

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
    let genAI;
    try {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      console.log("GoogleGenerativeAI initialized successfully")
    } catch (error) {
      console.error("Failed to initialize GoogleGenerativeAI:", error)
      return Response.json(
        { 
          error: "Failed to initialize Gemini AI",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 },
      )
    }

    // Ensure conversation always starts with a user message for Gemini API compatibility
    const conversationHistory = body.messages
      .filter((msg, index) => index > 0) // Skip the initial assistant welcome message
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }))

    console.log("Conversation history length:", conversationHistory.length)

    // Create model and chat
    let model;
    try {
      model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // Stable model with better rate limits
        systemInstruction: FINANCIAL_SYSTEM_PROMPT,
      })
      console.log("Model created successfully")
    } catch (error) {
      console.error("Failed to create model:", error)
      return Response.json(
        { 
          error: "Failed to create Gemini model",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 },
      )
    }

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
    
    let result;
    try {
      result = await chat.sendMessage(enhancedUserMessage)
      console.log("Received response from Gemini")
    } catch (error) {
      console.error("Error sending message to Gemini:", error)
      
      if (error instanceof Error) {
        // Check for specific API errors
        if (error.message.includes("API_KEY_INVALID") || error.message.includes("API key")) {
          return Response.json(
            { 
              error: "Invalid Gemini API key. Please check your API key in .env.local",
              details: error.message
            },
            { status: 401 },
          )
        }
        
        return Response.json(
          { 
            error: "Failed to get response from Gemini",
            details: error.message
          },
          { status: 500 },
        )
      }
      
      throw error
    }

    const response = result.response
    const reply = response.text()
    
    console.log("Response length:", reply.length)
    console.log("=== API Request Complete ===\n")

    return Response.json({ reply })
  } catch (error) {
    console.error("=== API Error ===")
    console.error("Error:", error)

    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    console.error("===================\n")

    return Response.json({ 
      error: "Failed to process your request. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
