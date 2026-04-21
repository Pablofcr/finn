import { Card, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: 20 de abril de 2026
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 prose prose-sm dark:prose-invert max-w-none">
          <div className="flex items-center gap-3 mb-6 not-prose">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Estes termos regulam o uso do Finn. Ao criar uma conta, você concorda com as regras abaixo.
            </p>
          </div>

          <h2 className="text-lg font-bold mt-6 mb-3">1. Aceitação dos termos</h2>
          <p className="text-sm text-muted-foreground">
            Ao se cadastrar, acessar ou usar o Finn (&quot;Serviço&quot;), você (&quot;Usuário&quot;) concorda integralmente com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize o Serviço.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">2. Sobre o Finn</h2>
          <p className="text-sm text-muted-foreground mb-2">O Finn é um aplicativo de finanças pessoais com inteligência artificial que permite:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Registrar transações por texto, áudio ou foto de cupom fiscal</li>
            <li>Receber alertas de vencimento via WhatsApp e Telegram</li>
            <li>Visualizar insights financeiros gerados por IA</li>
            <li>Gerenciar contas, categorias, orçamentos e metas</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">3. Cadastro e conta</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Você deve ter ao menos 18 anos ou estar representado por responsável legal</li>
            <li>Informações do cadastro devem ser verdadeiras, completas e atualizadas</li>
            <li>Você é responsável por manter suas credenciais em sigilo</li>
            <li>Qualquer atividade realizada na sua conta é de sua responsabilidade</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">4. Uso adequado</h2>
          <p className="text-sm text-muted-foreground mb-2">Ao usar o Finn, você se compromete a NÃO:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Usar o Serviço para atividades ilegais, fraudulentas ou que violem direitos de terceiros</li>
            <li>Tentar acessar indevidamente outras contas ou dados do sistema</li>
            <li>Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte</li>
            <li>Usar bots, scrapers ou automações não autorizadas</li>
            <li>Sobrecarregar a infraestrutura do Serviço de forma proposital</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">5. Propriedade intelectual</h2>
          <p className="text-sm text-muted-foreground">
            Todo o conteúdo do Finn — incluindo marca, logotipo, design, código-fonte, algoritmos de IA e textos — pertence exclusivamente à empresa operadora do Serviço. Nenhuma parte pode ser copiada, modificada, distribuída ou utilizada comercialmente sem autorização prévia e por escrito.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Os dados financeiros que você registra permanecem de sua propriedade — o Finn apenas os processa para fornecer o Serviço, conforme a Política de Privacidade.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">6. Planos, pagamentos e cancelamento</h2>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>O Finn oferece plano gratuito com limites e plano pago com recursos adicionais</li>
            <li>Valores e condições do plano pago estão detalhados na página de Preços</li>
            <li>O cancelamento pode ser feito a qualquer momento nas configurações da conta</li>
            <li>Em caso de cancelamento, o acesso ao plano pago é mantido até o fim do período já pago; não há reembolso proporcional</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">7. Limitação de responsabilidade</h2>
          <p className="text-sm text-muted-foreground mb-2">O Finn é uma ferramenta de apoio à gestão financeira. Você entende e concorda que:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Insights gerados por IA são sugestões, não aconselhamento financeiro profissional</li>
            <li>Decisões tomadas com base em dados do Finn são de sua exclusiva responsabilidade</li>
            <li>Não garantimos que o Serviço estará sempre disponível, livre de erros ou atenderá a todas suas expectativas</li>
            <li>Não somos responsáveis por indisponibilidades de serviços de terceiros (Supabase, Vercel, Telegram, WhatsApp, etc.)</li>
          </ul>

          <h2 className="text-lg font-bold mt-6 mb-3">8. Encerramento da conta</h2>
          <p className="text-sm text-muted-foreground">
            Podemos suspender ou encerrar sua conta em caso de violação destes Termos, fraude ou uso indevido. Você também pode encerrar sua conta a qualquer momento pelas Configurações. Após o encerramento, seus dados serão tratados conforme a seção &quot;Retenção de dados&quot; da Política de Privacidade.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">9. Cessão e sucessão</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Você reconhece e concorda que a empresa operadora do Finn poderá, a seu exclusivo critério, ceder, transferir ou atribuir este contrato e a operação do Serviço a outra entidade, incluindo, mas não se limitando a, casos de:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Reestruturação societária, fusão, cisão ou incorporação</li>
            <li>Criação de nova pessoa jurídica controlada pelos mesmos sócios</li>
            <li>Venda total ou parcial do negócio, incluindo sua base de usuários, marca e ativos</li>
            <li>Transferência do CNPJ titular da operação</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Em todos esses casos, a sucessora assumirá integralmente os direitos e obrigações deste contrato, e não será necessário consentimento individual prévio do Usuário. Você será notificado da mudança por e-mail ou pelo aplicativo quando ocorrer, mantendo o direito de encerrar sua conta sem penalidade caso não concorde.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">10. Alterações nestes Termos</h2>
          <p className="text-sm text-muted-foreground">
            Podemos atualizar estes Termos a qualquer momento. Mudanças significativas serão comunicadas por e-mail ou pelo aplicativo com antecedência de ao menos 15 dias. O uso continuado do Serviço após a data de vigência representa aceitação dos Termos atualizados.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">11. Legislação aplicável e foro</h2>
          <p className="text-sm text-muted-foreground">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Fortaleza/CE para dirimir quaisquer controvérsias, renunciando as partes a qualquer outro, por mais privilegiado que seja, salvo as hipóteses de competência absoluta definidas pelo Código de Defesa do Consumidor.
          </p>

          <h2 className="text-lg font-bold mt-6 mb-3">12. Contato</h2>
          <p className="text-sm text-muted-foreground">
            Dúvidas, sugestões ou solicitações jurídicas:
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>E-mail:</strong> juridico@finnapp.com.br
          </p>

          <div className="mt-8 pt-6 border-t text-xs text-muted-foreground">
            Ao continuar a utilizar o Finn, você declara ter lido, compreendido e aceito estes Termos de Uso na íntegra.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
