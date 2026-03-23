import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot } from 'lucide-react'

export default function BotPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assistente Finn</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Conecte seu WhatsApp ou Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Registre gastos por mensagem de voz ou texto. Diga "Finn, gastei R$20 no almoço"
            e a transação será registrada automaticamente.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Funcionalidade em desenvolvimento.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
