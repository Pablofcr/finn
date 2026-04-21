# Finn Finanças — Templates de e-mail

Templates HTML para os e-mails transacionais enviados via Supabase Auth.

## Arquivos

| Arquivo | Uso |
|---|---|
| `confirm-signup.html` | E-mail enviado após cadastro pedindo ativação da conta |

## Como aplicar no Supabase

O template não é consumido pelo app Next.js — ele precisa ser **colado no dashboard do Supabase**. Passos:

### 1. Acessar o dashboard
1. Abra `https://supabase.com/dashboard/project/tllxrrqmnpqtxpecobic`
2. Menu lateral → **Authentication** → **Email Templates**

### 2. Selecionar o template "Confirm signup"
Clique na aba **Confirm signup**.

### 3. Atualizar o Subject
Cole no campo **Subject heading**:

```
Finn: confirme seu e-mail para começar
```

Alternativas testadas:
- `Finn: falta 1 passo pra ativar sua conta`
- `Finn: seu link de ativação chegou`

### 4. Atualizar o Message (HTML)
Abra o arquivo `confirm-signup.html` deste diretório, copie **todo o conteúdo**, e cole no editor de HTML do Supabase (sobrescrevendo o template padrão).

### 5. Salvar
Clique em **Save**.

### 6. Testar
Crie um novo cadastro no app em modo anônimo (ou use um e-mail de teste). Confira:
- [x] Subject começa com "Finn:"
- [x] Logo aparece no topo (gradiente indigo→purple)
- [x] Botão "Ativar minha conta" funciona (abre `{{ .ConfirmationURL }}`)
- [x] Link alternativo em texto puro aparece abaixo
- [x] Footer com "Finn Finanças · Fortaleza, CE · Brasil"
- [x] Email renderiza bem em Gmail, Outlook e mobile

---

## Próximo passo (importante): mudar remetente de `supabase.io` para domínio próprio

Hoje o e-mail chega de `noreply@mail.app.supabase.io` — feio e aumenta chance de cair no spam. Pra usar `noreply@finn.com.br` (ou similar), é necessário configurar **SMTP customizado** no Supabase.

### Opção recomendada: Resend

**Resend** é uma API moderna de e-mail transacional. 3.000 e-mails/mês no plano grátis. Fácil de configurar.

#### Passos:

1. **Registrar domínio**: você precisa ter um domínio próprio pra Finn. Sugestão: `finn.com.br`, `finnapp.com.br`, ou `finnfinancas.com.br`. Registra em registro.br (R$40/ano).

2. **Criar conta Resend**: `https://resend.com` → Sign up com GitHub ou e-mail.

3. **Adicionar domínio no Resend**:
   - Resend dashboard → **Domains** → **Add Domain**
   - Digita o domínio (ex: `finn.com.br`)
   - Resend vai mostrar registros DNS pra adicionar (SPF, DKIM, DMARC)

4. **Configurar DNS**:
   - Acessa o painel do seu registrador (registro.br, Cloudflare, etc)
   - Adiciona os registros TXT e CNAME que o Resend pediu
   - Espera propagação (5 min a algumas horas)
   - Resend marca como "Verified" quando ok

5. **Criar API Key no Resend**: dashboard → **API Keys** → **Create API Key** → copia

6. **Configurar SMTP no Supabase**:
   - Supabase dashboard → **Project Settings** → **Auth** → **SMTP Settings**
   - Ativar **Enable Custom SMTP**
   - Preencher:
     - **Host**: `smtp.resend.com`
     - **Port**: `465` (SSL) ou `587` (TLS)
     - **Username**: `resend`
     - **Password**: a API Key do Resend (cole aqui)
     - **Sender email**: `nao-responda@finn.com.br` (ou como preferir)
     - **Sender name**: `Finn Finanças`
     - **Minimum interval between emails**: 60s (protege contra abuso)
   - **Save**

7. **Testar**: faz um cadastro novo e confere se o e-mail chega de `nao-responda@finn.com.br` em vez de `supabase.io`.

### Alternativa: SendGrid, Mailgun, AWS SES
Todas funcionam igual no Supabase — basta preencher host/port/user/pass. Resend é mais simples e tem UX moderna.

---

## Dicas de deliverability (pra não cair no spam)

Mesmo com template bonito, alguns e-mails caem no spam. Pra maximizar chance de chegar na inbox:

1. **SPF, DKIM, DMARC**: garanta que os 3 registros DNS estão configurados (o Resend guia isso).
2. **Remetente não-genérico**: use `contato@`, `nao-responda@` ou `ativacao@` — evite `noreply@`.
3. **Warm-up**: nas primeiras semanas, envie pra poucos e-mails por dia, pra IPs subirem reputação.
4. **Link unsubscribe** (pra e-mails de marketing; não precisa em transacionais como esse).
5. **Copy sem gatilhos de spam**: evite palavras tipo "GRÁTIS", "URGENTE", "CLIQUE AGORA" em MAIÚSCULAS. O template atual está limpo.

---

## Manutenção

Quando for criar outros templates (reset de senha, mudança de e-mail, convite pra time), usar esse como base e só trocar o conteúdo da seção central (`{{HEADING}}`, `{{SUBTITLE}}`, CTA, link alternativo).
