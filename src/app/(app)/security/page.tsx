import { Card, CardContent } from '@/components/ui/card'
import {
  Shield, Lock, Eye, Server, Trash2, Download,
  Key, Globe, MessageCircle, FileCheck,
} from 'lucide-react'
import Link from 'next/link'

const SECURITY_ITEMS = [
  {
    icon: Lock,
    title: 'Criptografia de ponta a ponta',
    description:
      'Todos os dados trafegam com criptografia TLS 1.3, o mesmo padrão usado por bancos. Ninguém pode interceptar suas informações.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Eye,
    title: 'Somente você vê seus dados',
    description:
      'Sua senha é criptografada e nem a equipe do Finn tem acesso a ela. Seus dados financeiros são visíveis apenas para você.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Key,
    title: 'Autenticação segura',
    description:
      'Login protegido via Supabase Auth com suporte a Google OAuth. Sessões expiram automaticamente por inatividade.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Server,
    title: 'Infraestrutura confiável',
    description:
      'Hospedado na Vercel com servidores protegidos, backups automáticos e monitoramento 24/7. Seus dados estão sempre seguros.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: MessageCircle,
    title: 'Assistente WhatsApp protegido',
    description:
      'A comunicação com o assistente passa pela WhatsApp Cloud API com verificação de assinatura. Áudios são transcritos e imediatamente descartados — não armazenamos gravações.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Globe,
    title: 'Conformidade com a LGPD',
    description:
      'Seguimos a Lei Geral de Proteção de Dados (LGPD). Você tem direito de acessar, corrigir, exportar e excluir seus dados a qualquer momento.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: Download,
    title: 'Exporte seus dados',
    description:
      'Você pode exportar todas as suas informações financeiras a qualquer momento em Configurações. Seus dados pertencem a você.',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    icon: Trash2,
    title: 'Exclusão completa',
    description:
      'Se quiser sair, pode excluir sua conta e todos os dados associados. A exclusão é permanente e irreversível.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: FileCheck,
    title: 'Política de Privacidade',
    description:
      'Documentamos de forma transparente como coletamos, usamos e protegemos seus dados. Leia nossa política completa.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    link: '/privacy',
  },
]

export default function SecurityPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Sua Segurança</h1>
        <p className="text-sm text-muted-foreground">
          Protegemos seus dados como você protege suas finanças — com cuidado absoluto.
        </p>
      </div>

      {/* Trust banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Seus dados estão protegidos</h2>
              <p className="text-sm text-muted-foreground">
                Ninguém no Finn acessa sua senha ou vê seus dados financeiros.
                Tudo é criptografado e somente você tem acesso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security items grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
        {SECURITY_ITEMS.map((item) => {
          const content = (
            <Card key={item.title} className="h-full hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} mb-3`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
                {item.link && (
                  <span className="text-xs text-primary font-medium mt-2 inline-block">
                    Ler política completa →
                  </span>
                )}
              </CardContent>
            </Card>
          )

          if (item.link) {
            return <Link key={item.title} href={item.link}>{content}</Link>
          }
          return <div key={item.title}>{content}</div>
        })}
      </div>

      {/* Bottom note */}
      <p className="text-xs text-muted-foreground text-center py-4">
        Dúvidas sobre segurança? Entre em contato pelo e-mail{' '}
        <strong>privacidade@finn.com.br</strong>
      </p>
    </div>
  )
}
