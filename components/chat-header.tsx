export default function ChatHeader() {
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">FinanceAI</h1>
          <p className="text-sm text-muted-foreground">Your Financial Assistant</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
            Active
          </div>
        </div>
      </div>
    </header>
  )
}
