import { Card, CardContent } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 16 de abril de 2026
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 prose prose-sm dark:prose-invert max-w-none">
          <div className="flex items-center gap-3 mb-6 not-prose">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              No Finn, sua privacidade é prioridade. Este documento explica de forma clara como tratamos seus dados.
            </p>
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3">1. Dados que coletamos</h2>
          <p className="text-sm text-muted-foreground mb-2">Coletamos apenas o necessário para o funcionamento do serviço:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>Dados de cadastro:</strong> nome, e-mail e senha (criptografada)</li>
            <li><strong>Dados financeiros:</strong> transações, contas, categorias, orçamentos e metas que você cadastra</li>
            <li><strong>Dados do WhatsApp:</strong> número do chat para envio de alertas (não armazenamos conversas)</li>
            <li><strong>Áudios:</strong> transcritos em tempo real e imediatamente descartados — não armazenamos gravações</li>
            <li><strong>Fotos de cupons:</strong> processadas em tempo real e não armazenadas</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">2. Como usamos seus dados</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Exibir suas finanças no painel do Finn</li>
            <li>Gerar insights financeiros personalizados via inteligência artificial</li>
            <li>Enviar lembretes de pagamento pelo WhatsApp</li>
            <li>Melhorar a experiência do produto</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Nunca</strong> vendemos, compartilhamos ou divulgamos seus dados financeiros para terceiros.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">3. Base legal (LGPD)</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>Execução de contrato:</strong> processar seus dados para fornecer o serviço que você contratou</li>
            <li><strong>Consentimento:</strong> para funcionalidades opcionais como insights por IA e integração com WhatsApp</li>
            <li><strong>Obrigação legal:</strong> manter registros financeiros por 5 anos conforme legislação fiscal</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">4. Armazenamento e segurança</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Dados armazenados em servidores seguros com criptografia em trânsito (TLS 1.3)</li>
            <li>Senhas criptografadas com algoritmos irreversíveis</li>
            <li>Acesso restrito — nem a equipe do Finn consegue ver suas senhas ou dados financeiros</li>
            <li>Backups automáticos e monitoramento contínuo</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">5. Compartilhamento com terceiros</h2>
          <p className="text-sm text-muted-foreground mb-2">Utilizamos os seguintes serviços para operar o Finn:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>Supabase:</strong> autenticação e banco de dados</li>
            <li><strong>Vercel:</strong> hospedagem da aplicação</li>
            <li><strong>Anthropic (Claude):</strong> geração de insights e interpretação de transações</li>
            <li><strong>OpenAI (Whisper):</strong> transcrição de áudio (dados não são retidos)</li>
            <li><strong>Meta (WhatsApp):</strong> envio de mensagens, alertas de pagamento e conversa com o assistente via WhatsApp Business</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Estes serviços processam dados conforme suas próprias políticas de privacidade e não têm acesso ao conjunto completo dos seus dados financeiros.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">6. Seus direitos (LGPD Art. 18)</h2>
          <p className="text-sm text-muted-foreground mb-2">Você tem direito a:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li><strong>Acesso:</strong> saber quais dados temos sobre você</li>
            <li><strong>Correção:</strong> atualizar dados incorretos ou incompletos</li>
            <li><strong>Exportação:</strong> baixar todos os seus dados (disponível em Configurações)</li>
            <li><strong>Exclusão:</strong> apagar sua conta e todos os dados associados (disponível em Configurações)</li>
            <li><strong>Revogação:</strong> revogar consentimento a qualquer momento</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">7. Retenção de dados</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Dados da conta: mantidos enquanto a conta estiver ativa</li>
            <li>Transações: mantidas por 5 anos após o registro (obrigação fiscal)</li>
            <li>Ao excluir a conta: todos os dados são removidos permanentemente em até 15 dias úteis, exceto os retidos por obrigação legal</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">8. Contato</h2>
          <p className="text-sm text-muted-foreground">
            Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato:
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>E-mail:</strong> privacidade@finn.com.br
          </p>

          <div className="mt-8 pt-6 border-t text-xs text-muted-foreground">
            Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas por e-mail ou pelo aplicativo.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
