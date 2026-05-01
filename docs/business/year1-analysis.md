# Finn — Análise de Negócio · Ano 1

**Status:** MVP recém-lançado · zero clientes pagantes · solo founder · mercado BR
**Data:** 2026-05-01
**Especialistas consultados:** Hormozi Pricing (unit economics), COO Architect (cash flow), Market Researcher (competitive landscape)

---

## Sumário executivo

| Métrica | Valor |
|---|---|
| Pricing recomendado | **R$ 14.90/mês** + R$ 119/ano + R$ 397 LTD (100 vagas) |
| LTV bruto por PRO | R$ 186 (12.5 meses × R$ 14.90) |
| COGS por user/mês | R$ 5.65 |
| Contribution margin | **R$ 9.25 (62% gross)** |
| LTV líquido | R$ 115 |
| CAC ceiling saudável | **R$ 38** (LTV:CAC 3:1) |
| Cenário realista mês 12 | **124 PRO ativos · MRR R$ 1.85k** |
| Cenário otimista mês 12 | 195 PRO ativos · MRR R$ 2.9k |
| Break-even operacional | Mês **14-16** (Y2 Q1) |
| Capital necessário | **R$ 15-18k de runway** (além dos R$ 5k iniciais) |

**Bottom line:** Y1 é sobre **sobreviver até break-even**, não sobre crescer. Caixa de R$ 5k é apertado. Lançar **Founders Lifetime R$ 397** em Q1 pra capturar runway via 50-100 vendas (= R$ 20-40k upfront).

---

## 1. Análise competitiva — onde Finn se posiciona

### Mercado BR 2026 — 2 tiers

**Tier A — PFMs tradicionais (gigantes):**
- **Mobills** (líder, 10M+ downloads) — R$ 8.40/mês Premium · sem WhatsApp · sem áudio · sem AI
- **Organizze** (#2 premium) — R$ 19.90-59.90/mês · sem WhatsApp · explicitamente "sem AI"
- **PicPay** (substituiu Guiabolso) — grátis · WhatsApp só pra Pix, não pra PFM

**Tier B — WhatsApp bots (peer group real do Finn):**
- **Porquim** — R$ 67/ano (R$ 5.58/mês equiv) · WhatsApp-only, sem app · sem Open Finance
- **Financinha** — R$ 26.90-36.90/mês · mais caro do mercado bot · família 5 users · multi-currency
- **ZapGastos** — R$ 9.90-39.90/mês · 4 tiers · Open Finance no Conectado Pro
- **Jota.ai** — grátis · ex-PagBank · conta digital + Pix · PFM raso
- **GranaZen** — pricing opaco · família · sem Open Finance

**Mortos/absorvidos:** Olivia (encerrada jul/2024 pelo Nubank), Guiabolso (absorvido pelo PicPay nov/2022).

### Comparativo Finn vs mercado

| Feature | Mobills | Organizze | PicPay | Porquim | Financinha | ZapGastos | Jota | GranaZen |
|---|---|---|---|---|---|---|---|---|
| WhatsApp bot conversacional | 🟢 | 🟢 | 🟡 (só Pix) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Áudio pra registro | 🟢 | 🟢 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Foto cupom OCR | 🟢 | 🟢 | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Q&A sobre dados | 🟢 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | 🟡 | ✅ |
| **Open Finance auto-import** | 🔴 | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 (R$ 39.90) | 🔴 | 🟢 |
| Recorrências + alertas | ✅ | ✅ | 🟢 | 🟢 | ✅ | ✅ | 🟢 | ✅ |
| Fatura cartão | 🔴 | 🔴 | 🟡 | 🟢 | ✅ | ✅ | 🟡 | ✅ |
| **Família (multi-user)** | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ |
| Web dashboard | 🔴 | 🔴 | 🔴 | 🟢 | ✅ | ✅ | 🟢 | ✅ |
| iOS+Android | 🔴 | 🔴 | 🔴 | 🟢 | 🟡 | 🟡 | 🟢 | 🟡 |

🟢 Finn vence · 🔴 Finn perde · ✅ ambos · 🟡 parcial

### Onde Finn está PROVADAMENTE à frente

- **vs Mobills/Organizze (10M users)**: Finn tem WhatsApp bot completo (áudio + OCR + AI). Mobills não ship em 2026; Organizze explicitamente "sem AI". **Moat estrutural.**
- **vs Porquim**: Finn tem app + dashboard. Porquim é WhatsApp-only — sem onde ver histórico de longo prazo.
- **vs Jota**: Jota é primariamente conta digital + Pix. PFM raso. Finn é purpose-built como cérebro de finanças.
- **AI conversational depth** (Sonnet 4.6 + 10 tools): nenhum competidor tem essa profundidade.

### Onde Finn está ATRÁS

1. **Open Finance auto-import** — gap existencial. Mobills/Organizze/PicPay/ZapGastos Conectado/Jota/Financinha (anunciado) todos têm ou estão shipando. Pra user com 4 contas + 3 cartões, importação > entrada conversacional.
2. **Família/multi-user** — Financinha (5), ZapGastos Plus (5), GranaZen — todos vendem. Finn single-user fecha o segmento "casal/família" inteiro.
3. **Marca/base instalada** — Mobills tem 10M downloads de inércia. Finn está em zero.
4. **Multi-currency** — Financinha vende BRL/USD/EUR/JPY pra freelancers/remotos.

### Pricing positioning

| Faixa | Players |
|---|---|
| Grátis | Jota · Mobills (free tier) · Organizze (free tier) |
| Cheap (≤R$10) | **Mobills R$ 8.40** · Porquim R$ 5.58 · ZapGastos WhatsApp R$ 9.90 |
| **Mid (R$10-20) — Finn vive aqui** | **Finn R$ 14.90** · Organizze Manual R$ 19.90 · ZapGastos PRO R$ 19.90 |
| Premium (R$25-40) | Financinha R$ 26.90 · ZapGastos Plus R$ 29.90 · Mobills Família R$ 33.40 · ZapGastos Conectado R$ 39.90 · Organizze Conectado R$ 39.90 |
| Luxury (R$60+) | Organizze Conectado Plus R$ 59.90 |

Finn em R$ 14.90 é **mid-market** — 2x mais caro que Mobills (gigante generalista) mas undercutting todos os bots com Open Finance.

---

## 2. Unit economics — a verdade nua

### LTV e margem

Premissas (conservadoras pra solo founder BR B2C):
- **Churn 8%/mês** (banda honesta 5-10%)
- **Lifetime médio: 12.5 meses** (1 / 0.08)
- **ARPU: R$ 14.90/mês**

```
Gross LTV          = 12.5 × R$ 14.90 = R$ 186.25
COGS por user/mês  = R$ 5.65
Contribution       = R$ 9.25 (62% gross margin)
Net LTV            = 12.5 × R$ 9.25  = R$ 115.60
```

### COGS detalhado por user/mês

| Item | R$ |
|---|---|
| Anthropic API (Sonnet agent + Haiku router/parser, ~80 msgs heavy) | 2.50 |
| Whisper áudio (~30 áudios) | 0.40 |
| GPT-4o-vision (~10 cupons) | 0.80 |
| WhatsApp utility templates (~30 alertas) | 0.95 |
| WhatsApp marketing templates (~4 weekly insights) | 0.40 |
| Supabase + Vercel rateado | 0.60 |
| **Total COGS** | **~R$ 5.65** |

### CAC ceiling

- **Break-even CAC: R$ 115** (acima disso, queima caixa)
- **CAC saudável: R$ 38** (LTV:CAC 3:1) — **a linha que importa**
- **CAC agressivo: R$ 23** (LTV:CAC 5:1) — pra paid scale

Se Meta Ads custa mais de R$ 38 pra adquirir um PRO, é prejuízo. **Spoiler: em fintech BR, vai custar R$ 80-200.** Skip Meta Ads em Y1.

### Pricing — recomendação Hormozi

**Estrutura a shipar nessa semana:**
1. **PRO Mensal — R$ 14.90/mês** (manter)
2. **PRO Anual — R$ 119/ano** (= R$ 9.92/mês equiv, 33% desconto, R$ 119 upfront → cash flow oxygen)
3. **Founders Lifetime — R$ 397 once · primeiros 100 clientes:**
   - = ~26 meses de ARPU upfront. **2× LTV em cash hoje.**
   - 100 vendidos = **R$ 39.700 imediato.** Funda runway de Y1 inteira.
   - "Founders" = tribal status, marketing free, cria evangelistas
   - Escassez (100) cria urgência

**NÃO baixar pra R$ 9.90.** Contribution colapsa pra R$ 4.25, LTV pra R$ 53, CAC ceiling pra R$ 18. Death spiral. Resposta nunca é baixar preço — é aumentar valor percebido.

### Canais de aquisição realistas

**Top 3 pra solo founder, em ordem:**

1. **Organic TikTok/Reels** (CAC: R$ 0-15)
   *"POV: registrei meu Uber falando no WhatsApp."* Demonstra o bot. Brasileiros amam. Custo = tempo. **Canal #1.** 1 vídeo viral = 500 signups.

2. **Parcerias com micro-influencers de finanças BR** (CAC: R$ 20-60)
   Não Nathália Arcuri. Achar 5k-30k seguidores fazendo "planilha de gastos". Oferecer lifetime PRO + revshare. CAC pago em tempo, não cash.

3. **SEO blog content** (CAC: R$ 5-20, payback 6+ meses)
   *"Como controlar gastos pelo WhatsApp"*, *"Mobills vs Organizze vs Finn"*, *"Categorizar gastos com IA"*. Composta. Começar agora, paga em mês 8+.

**Pular em Y1:**
- Meta Ads finance BR (special category, fraude filter, CPM inflado, CAC R$ 80-200)
- Google Ads ("aplicativo de finanças" CPC R$ 4-12, CAC inviável)
- App Store ASO (diferencial é WhatsApp, não app)

### Oferta que explode crescimento

**Trial de 14 dias PRO grátis, sem cartão, finalizando com:** *"Ativa Founders Lifetime por R$ 397 OU continua PRO mensal R$ 14.90"*.

- Sem cartão = signups 3-5x maiores
- 14 dias = ciclo de paycheck, 1 weekly insight, aha moments
- Final-of-trial = força decisão. Anchor R$ 397 faz R$ 14.90 parecer free
- **Referral kicker:** "Indique 3 amigos que ativem PRO → ganha 6 meses". Custa R$ 56 em COGS, ganha 3 PROs com R$ 347 net LTV. **6:1 retorno.**

### Trap que mata SaaS founders

**Você vai querer baixar o preço quando crescimento parecer lento.** Mês 4. 28 PROs. Amigo diz "R$ 14.90 é caro pra app brasileiro." **Não baixe.** O caminho é aumentar valor percebido (Founders bonus, anual, garantia). Re-anchoring up depois é brutal.

---

## 3. Custos operacionais — todos eles

### One-time setup (Mês 0)

| Item | R$ |
|---|---|
| Abertura empresa (CNPJ + cartório + alvará + Junta) | 1.200 |
| Certificado digital A1 (e-CNPJ) | 200 |
| Capital social mínimo + custas | 100 |
| **Total setup** | **1.500** |

### Regime tributário recomendado: **Simples Nacional Anexo III** (com fator R)

- **MEI: descartado** — CNAE 6201-5/01 (desenvolvimento software) não permitido em MEI desde 2022
- **Lucro Presumido:** ~13.33% sobre receita — caro pra esse estágio
- **Simples Nacional Anexo V:** 15.5% padrão
- **Simples Nacional Anexo III** (via fator R): **6%** primeira faixa (até R$ 180k/ano) — **se folha incluindo pro-labore ≥ 28% da receita** (Pablo bate fácil)

**Confirmar com contador no mês 1.**

### Custos fixos mensais

| Item | R$/mês | Notas |
|---|---|---|
| Contabilidade | 300 | Já contratado |
| Pro-labore Pablo (mês 4+) | 1.518 | Mínimo p/ INSS = SM (R$ 1.518 em 2026) |
| INSS sobre pro-labore (11%) | 167 | |
| Vercel Pro | 110 ($20) | A partir de ~5k users OU 100GB bandwidth |
| Supabase Pro | 140 ($25) | Free tier morre em 500MB DB ou 50k MAU (~mês 4-6) |
| Resend (email transacional) | 85 ($15) | Necessário desde mês 1 |
| Domínio + SSL | 5 (anual ~60) | Vercel SSL grátis |
| Bitwarden / 1Password | 0-25 | Free serve solo |
| Sentry (free tier) | 0 | |
| **Subtotal (sem pro-labore)** | **~520** | |
| **Subtotal (com pro-labore mês 4+)** | **~2.345** | |

### Custos variáveis por user/mês

- **Anthropic API**: R$ 0.50 média (com prompt caching, 70% redução)
- **OpenAI**: R$ 0.12 (Whisper + Vision)
- **WhatsApp**: R$ 0.16 (utility templates apenas, marketing pula em Y1)
- **Pix processing (Asaas/Iugu)**: **R$ 2.15 por transação PRO/mês** = ~14% do ticket. **Doloroso** em ticket baixo.
  - Stripe BR não tem Pix recorrente nativo (jan/2026)
  - Mercado Pago: Pix recorrência via cartão é 4.99% — pior

### Marketing budget

- **Mês 1-3: R$ 0** — orgânico (Twitter/LinkedIn de Pablo, indicação, Product Hunt BR, comunidades)
- **Mês 4-6: R$ 200-500/mês** — se CAC payback < 6 meses validado
- **Mês 7-12: até R$ 1.000/mês** — condicional a LTV:CAC > 3:1 medido

### Outros (não recorrentes em Y1)

- LGPD — privacy policy + termos com advogado júnior: R$ 800-1.500
- DPO externo: pular Y1 (regulamento ANPD permite operador menor porte ter DPO informal)
- Cyber liability insurance: pular Y1

---

## 4. Fluxo de caixa Year 1 — cenário realista (COO)

**Premissas:**
- Caixa inicial: R$ 5.000
- Pro-labore R$ 1.518 + INSS R$ 167 = R$ 1.685 começa **mês 4**
- Vercel/Supabase Pro entram **mês 5**
- Churn 7%/mês sobre PRO ativos
- Receita líquida pós Pix fee + DAS 6% = **R$ 11.99 por PRO**

| Mês | Signups novos | Total signups | PRO ativos | MRR bruto | Receita líq. | Custos fixos | Custos variáveis | Lucro/mês | Caixa acumulado |
|---|---|---|---|---|---|---|---|---|---|
| 0 | — | — | — | 0 | 0 | 1.500 setup | 0 | -1.500 | 3.500 |
| 1 | 30 | 30 | 3 | 45 | 36 | 410 | 25 | -399 | 3.101 |
| 2 | 35 | 65 | 7 | 104 | 84 | 410 | 50 | -376 | 2.725 |
| 3 | 45 | 110 | 12 | 179 | 144 | 410 | 80 | -346 | 2.379 |
| 4 | 55 | 165 | 19 | 283 | 228 | 2.095 | 115 | -1.982 | 397 |
| 5 | 60 | 225 | 28 | 417 | 336 | 2.345 | 165 | -2.174 | **-1.777** ⚠️ |
| 6 | 65 | 290 | 38 | 566 | 456 | 2.345 | 215 | -2.104 | -3.881 |
| 7 | 70 | 360 | 49 | 730 | 588 | 2.345 | 270 | -2.027 | -5.908 |
| 8 | 75 | 435 | 61 | 909 | 732 | 2.345 | 330 | -1.943 | -7.851 |
| 9 | 80 | 515 | 75 | 1.118 | 900 | 2.345 | 400 | -1.845 | -9.696 |
| 10 | 90 | 605 | 90 | 1.341 | 1.080 | 2.345 | 470 | -1.735 | -11.431 |
| 11 | 100 | 705 | 107 | 1.594 | 1.284 | 2.345 | 555 | -1.616 | -13.047 |
| 12 | 105 | 810 | 124 | 1.848 | 1.488 | 2.345 | 635 | -1.492 | **-14.539** |

**Conclusões duras:**
- Break-even operacional **não acontece em Y1** com pro-labore. MRR mês 12 = R$ 1.848 vs custos fixos R$ 2.345.
- **Caixa fura zero no mês 5** com pro-labore.
- Pablo precisa de **R$ 15-18k de runway adicional** OU adiar pro-labore.

### Cenário sem pro-labore (Pablo aguenta segurar)

Custos fixos caem pra ~R$ 660. **Break-even ~mês 8** (75 PRO × R$ 12 = R$ 900 > R$ 660). Caixa volta positivo ~mês 11. Plausível.

### Cenário pessimista (conversão 50% menor)

PRO mês 12 = 60 (não 124), MRR R$ 894. Sem pro-labore: ainda fecha mês 12 negativo R$ 200/mês. **Break-even só em Y2.**

### Cenário Hormozi (otimista)

3.4k signups, 195 PRO mês 12, MRR R$ 2.9k, ARR run-rate R$ 35k. **Possível com 1 vídeo viral OU 1 parceria boa de influencer.** Não garantir.

---

## 5. Plano de metas — Year 1

### Marcos por trimestre

**Q1 (Mês 1-3) — Validação + Founders LTD**
- Lançar Founders Lifetime (R$ 397, 100 vagas)
- Meta: vender **30-50 LTDs** (= R$ 12-20k upfront, runway de 6-9 meses)
- Conteúdo orgânico: 3 Reels/semana, blog SEO 1 post/semana
- Mês 3: **120 signups, 10-15 PROs**
- **Confirmar fator R com contador**, garantir Anexo III (6%)

**Q2 (Mês 4-6) — Aceleração orgânica**
- Pro-labore mínimo (R$ 1.518) começa mês 4
- 1-2 parcerias com influencers micro (5k-30k)
- A/B test: trial 14 dias sem cartão
- Mês 6: **290 signups, 38 PROs, MRR R$ 566**

**Q3 (Mês 7-9) — Tração compounding**
- SEO content começa a indexar (pages com "Mobills vs Finn" rankeiam)
- Marketing budget R$ 200-500/mês
- Mês 9: **515 signups, 75 PROs, MRR R$ 1.1k**

**Q4 (Mês 10-12) — Aproximação do break-even**
- Marketing budget até R$ 1.000/mês (condicional LTV:CAC > 3)
- Considerar Open Finance via Pluggy (gap competitivo crítico)
- Mês 12: **810 signups, 124 PROs, MRR R$ 1.85k**

### Métricas a trackear semanalmente

1. **PRO conversion rate (signup → paid)** — **threshold superior > 12%, inferior < 7%**
   - >12% = ramp up (ads, contractor)
   - <7% = problema de produto, pausar gastos, voltar pra interviews
   - Hormozi assume 17%, COO realista 8-15%, BR fintech típico 5-8%
2. **Churn mensal** — alvo <8%, alarme >12%
3. **Custo de AI por user** — soft cap em R$ 5/free, R$ 15/PRO
4. **NPS / CSAT** mensal pelo bot

---

## 6. Top 5 riscos ao cash flow

1. **AI cost spike de power users** — user com 500 msgs/mês custa R$ 8 e paga R$ 14.90. Margem some.
   - **Mitigação:** rate limit (50 msgs/dia free, 500/dia PRO) + monitoring de custo por user_id

2. **WhatsApp template approval / display name rejection** ⚠️
   - Memory: display name ainda rejeitado (5x). Sem template aprovado + payment method na WABA, alertas proativos morrem.
   - **Risco direto à conversão e retenção PRO.** Resolver na semana 1.

3. **Churn > 7%** — fintech B2C BR média 10-15%. Se bater 12%, MRR mês 12 cai 30%.

4. **Imposto miscalculation** — não bater fator R, cai no Anexo V (15.5%), perde 10pp de margem.

5. **Pro-labore agressivo demais** — sacar R$ 3k+ desde mês 1 queima caixa em 3 meses.

---

## 7. Recomendações — 3 cofres TODAY

### 1. Reserva técnica de 6 meses de fixed costs em conta separada
- Hoje: R$ **14.000 mínimo** (custos fixos com pro-labore × 6)
- Se Pablo só tem R$ 5k, decidir: (a) adiar pro-labore até mês 8+, ou (b) vender Founders LTD pra captar R$ 15-20k de runway, ou (c) family round
- **Sem buffer, qualquer hiccup quebra**

### 2. Dashboard de unit economics no Supabase (view SQL)
Calcula em tempo real:
- Custo Anthropic/OpenAI por user_id no mês
- MRR por cohort
- Churn rolling 30d
- Margem por PRO

### 3. Soft cap de gastos AI em código
Middleware que bloqueia chamadas Anthropic/OpenAI se user_id passou de R$ 5/mês (free) ou R$ 15/mês (PRO). **Implementar antes de viralizar.**

---

## 8. As 3 alavancas estratégicas Y1

### Alavanca 1: Fechar gap de Open Finance (Pluggy)
Mobills, Organizze, PicPay, ZapGastos Conectado, Jota, Financinha (anunciado) — todos têm. Brazilian Open Finance é table-stakes em 2026. Pra user com 4 contas + 3 cartões, importação > entrada conversacional. **Implementar Pluggy em Q3-Q4** (pode entrar como tier "PRO+ R$ 24.90" ou já no R$ 14.90).

### Alavanca 2: Double-down no moat — AI Q&A profunda
Sonnet 4.6 + 10 tools + dados completos do user. **Ninguém na tabela tem isso.**
- **Posicionamento:** *"Seu CFO no WhatsApp"* — camada *advisory*, não *contábil*
- Marketing wedge inteiro em conversational AI sobre seu próprio dinheiro
- Exemplos: *"Qual meu gasto médio com restaurante nos últimos 6 meses, comparado ao trimestre anterior, descontando viagens?"* — só Finn responde

### Alavanca 3: Targeting — usuários Mobills cansados de digitar
- Mobills tem 10M downloads · maior fraqueza nas reviews: *"depende de input manual"*
- Finn resolve isso EXATAMENTE via áudio/foto
- Cohort já paga R$ 8.40 — upgrade pra R$ 14.90 é psicologicamente nada se framear como "tempo economizado"
- Capturar 1-2% = 100-200k users
- Canal: conteúdo orgânico *"Mobills users switching to Finn"* + landing flow WhatsApp
- **Evitar** head-to-head com Organizze (psicografia diferente, querem manual limpo, sem AI)
- **Evitar** head-to-head com Porquim (mais barato, lifestyle brand)

---

## Bottom line

> **Y1 é sobreviver até break-even, não crescer.**
>
> R$ 14.90 mensal + R$ 119 anual + R$ 397 LTD (100 vagas).
> Conteúdo orgânico + influencer parcerias **only**. Nada de Meta Ads.
> Plano realista: ~124 PRO mês 12, MRR R$ 1.85k.
> Vender 100 LTDs em Q1 → instant R$ 39k runway, paga Y1 inteira.
> **Nunca baixar preço. Aumentar valor até R$ 14.90 parecer typo.**
>
> Próximos passos imediatos:
> 1. Resolver display name + WhatsApp templates (memory pendente)
> 2. Implementar Founders LTD + landing
> 3. Confirmar fator R com contador
> 4. Setup Asaas/Iugu pra Pix recorrente
> 5. Soft cap AI no código
> 6. Reserva técnica em conta separada
