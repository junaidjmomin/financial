import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

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
- When documents are referenced, analyze them in the context of the user's financial questions

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
}

interface RequestBody {
  messages: ChatMessage[]
  userMessage: string
  documents?: UploadedDocument[]
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured. Please add it to your environment variables." },
        { status: 500 },
      )
    }

    let enhancedUserMessage = body.userMessage
    if (body.documents && body.documents.length > 0) {
      const docList = body.documents.map((d) => `- ${d.name} (${d.size} bytes)`).join("\n")
      enhancedUserMessage += `\n\nDocuments for context:\n${docList}\nPlease analyze these documents in relation to the question.`
    }

    // Ensure conversation always starts with a user message for Gemini API compatibility
    const conversationHistory = body.messages
      .filter((msg, index) => index > 0) // Skip the initial assistant welcome message
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }))

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Updated from deprecated gemini-1.5-flash to current gemini-2.5-flash
      systemInstruction: FINANCIAL_SYSTEM_PROMPT,
    })

    const chat =
      conversationHistory.length > 0
        ? model.startChat({
            history: conversationHistory,
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.7,
            },
          })
        : model.startChat({
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.7,
            },
          })

    const result = await chat.sendMessage(enhancedUserMessage)

    const response = result.response
    const reply = response.text()

    return Response.json({ reply })
  } catch (error) {
    console.error("Chat error:", error)

    if (error instanceof Error && error.message.includes("API key")) {
      return Response.json(
        { error: "Invalid or missing GEMINI_API_KEY. Please check your environment variables." },
        { status: 401 },
      )
    }

    return Response.json({ error: "Failed to process your request. Please try again." }, { status: 500 })
  }
}
