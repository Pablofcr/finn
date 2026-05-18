# Plano de Marketing — Finn (Ano 1)

> **Status:** Rascunho inicial — 2026-05-17
> **Owner:** Pablo
> **Período:** Jul/2026 (M0) → Jun/2027 (M11)

## Sumário

1. [Contexto e premissas comuns](#1-contexto-e-premissas-comuns)
2. [Cenário Pessimista](#2-cenário-pessimista)
3. [Cenário Esperado (Base)](#3-cenário-esperado-base)
4. [Cenário Otimista](#4-cenário-otimista)
5. [Comparativo final do ano 1](#5-comparativo-final-do-ano-1)
6. [Alavancas que movem o cenário](#6-alavancas-que-movem-o-cenário)
7. [Pontos de decisão / gates](#7-pontos-de-decisão--gates)

---

## 1. Contexto e premissas comuns

**Produto:** Finn — assistente financeiro pessoal via WhatsApp (áudio + texto + foto), com agente IA conversacional.

**Pricing (fixo, não-negociável neste plano):**
- Diagnóstico Financeiro 14 dias — grátis, sem cartão
- Desafio Controle Total 30d — **R$ 14,90/mês ou R$ 119/ano**
- Garantia Raio-X (clareza) 30 dias

**Canal principal:** Ads pagos (Meta + Google) — formato Click-to-WhatsApp.

**Budget de marketing:** **R$ 1.500/mês** (R$ 18.000/ano).

**Mix de plano assumido:** 70% mensal / 30% anual no ano 1.
- ARPU normalizado: `0,7 × 14,90 + 0,3 × (119/12) = R$ 13,41/mês`.

**Custos operacionais:**
- Fixos: R$ 200/mês (Supabase Pro + domínio + Vercel free tier).
- Variáveis: R$ 3/usuário ativo/mês (WhatsApp Cloud API + tokens Anthropic + Whisper).
  - "Ativo" = usuário em Diagnóstico OU pagante ativo no mês.

**O que NÃO está incluído neste plano:**
- Open Finance via agregador (Pluggy/Belvo) — descartado pré-PMF.
- Influenciador pago/parcerias — pode entrar como segundo canal após M3.
- Time/CLT — operação solo de Pablo.

---

## 2. Cenário Pessimista

### Premissas
| Variável | Valor | Justificativa |
|----------|-------|---------------|
| CPL (R$/lead WhatsApp) | R$ 12 | Faixa pessimista BR para finanças. Otimização ruim de criativo + audiência mal segmentada. |
| Leads/mês | 125 | R$ 1.500 ÷ R$ 12 |
| Ativação (lead → Diagnóstico completo) | 30% | Piso. Onboarding com fricção; muitos abandonam antes do dia 14. |
| Conversão (Diagnóstico → Pago) | 5% | Trial-to-paid B2C ruim. Raio-X PDF entrega valor abaixo do esperado. |
| Churn mensal de pagantes | 15% | Consumer SaaS BR de baixo engajamento. |
| Novos pagantes/mês | ~2 | Ativados × conversão |

### Funil e receita mensal

| Mês | Calendário | Leads | Ativados | Novos pagantes | Pagantes ativos | Receita |
|-----|-----------|-------|----------|----------------|-----------------|---------|
| 0   | jul/26    | 125   | 38       | 0¹             | 0               | R$ 0    |
| 1   | ago/26    | 125   | 38       | 2              | 2               | R$ 27   |
| 2   | set/26    | 125   | 38       | 2              | 4               | R$ 54   |
| 3   | out/26    | 125   | 38       | 2              | 5               | R$ 68   |
| 4   | nov/26    | 125   | 38       | 2              | 6               | R$ 84   |
| 5   | dez/26    | 125   | 38       | 2              | 7               | R$ 99   |
| 6   | jan/27    | 125   | 38       | 2              | 8               | R$ 111  |
| 7   | fev/27    | 125   | 38       | 2              | 9               | R$ 121  |
| 8   | mar/27    | 125   | 38       | 2              | 10              | R$ 130  |
| 9   | abr/27    | 125   | 38       | 2              | 10              | R$ 137  |
| 10  | mai/27    | 125   | 38       | 2              | 11              | R$ 144  |
| 11  | jun/27    | 125   | 38       | 2              | **11**          | R$ 149  |

¹ M0: leads ainda dentro do Diagnóstico 14d, pagantes só convertem em M1.

### Fluxo de caixa

| Mês | Receita | Marketing | Operacional | Saldo mês | Acumulado |
|-----|---------|-----------|-------------|-----------|-----------|
| 0   | R$ 0    | R$ 1.500  | R$ 314      | -R$ 1.814 | -R$ 1.814 |
| 1   | R$ 27   | R$ 1.500  | R$ 320      | -R$ 1.793 | -R$ 3.607 |
| 2   | R$ 54   | R$ 1.500  | R$ 326      | -R$ 1.772 | -R$ 5.379 |
| 3   | R$ 68   | R$ 1.500  | R$ 329      | -R$ 1.761 | -R$ 7.140 |
| 4   | R$ 84   | R$ 1.500  | R$ 332      | -R$ 1.748 | -R$ 8.888 |
| 5   | R$ 99   | R$ 1.500  | R$ 335      | -R$ 1.736 | -R$ 10.624 |
| 6   | R$ 111  | R$ 1.500  | R$ 338      | -R$ 1.727 | -R$ 12.351 |
| 7   | R$ 121  | R$ 1.500  | R$ 341      | -R$ 1.720 | -R$ 14.071 |
| 8   | R$ 130  | R$ 1.500  | R$ 344      | -R$ 1.714 | -R$ 15.785 |
| 9   | R$ 137  | R$ 1.500  | R$ 344      | -R$ 1.707 | -R$ 17.492 |
| 10  | R$ 144  | R$ 1.500  | R$ 347      | -R$ 1.703 | -R$ 19.195 |
| 11  | R$ 149  | R$ 1.500  | R$ 347      | -R$ 1.698 | **-R$ 20.893** |

### Resumo
- **Pagantes ativos no fim do ano 1:** ~11
- **Total de novos pagantes (12m, bruto):** 22
- **Receita acumulada 12m:** R$ 1.124
- **Investimento total:** R$ 22.017
- **Burn acumulado:** R$ 20.893
- **CAC efetivo:** ~R$ 1.000/pagante
- **LTV:** R$ 89/usuário (R$ 13,41 ÷ 0,15)
- **LTV/CAC:** 0,09 — **inviável**, é sinal pra pivotar canal ou produto

---

## 3. Cenário Esperado (Base)

### Premissas
| Variável | Valor | Justificativa |
|----------|-------|---------------|
| CPL | R$ 8 | Faixa média BR finanças. Criativo razoável + audiência segmentada. |
| Leads/mês | 187 | R$ 1.500 ÷ R$ 8 |
| Ativação | 50% | Benchmark WhatsApp onboarding com mensagens guiadas. |
| Conversão Diagnóstico → Pago | 8% | Trial-to-paid B2C com Raio-X funcionando como anchor. |
| Churn mensal | 10% | Bom pra consumer SaaS BR; abaixo do mercado generalista. |
| Novos pagantes/mês | ~7,5 | 187 × 0,5 × 0,08 |

### Funil e receita mensal

| Mês | Calendário | Leads | Ativados | Novos pagantes | Pagantes ativos | Receita |
|-----|-----------|-------|----------|----------------|-----------------|---------|
| 0   | jul/26    | 187   | 94       | 0              | 0               | R$ 0    |
| 1   | ago/26    | 187   | 94       | 8              | 8               | R$ 101  |
| 2   | set/26    | 187   | 94       | 7              | 14              | R$ 191  |
| 3   | out/26    | 187   | 94       | 7              | 20              | R$ 273  |
| 4   | nov/26    | 187   | 94       | 7              | 26              | R$ 346  |
| 5   | dez/26    | 187   | 94       | 7              | 31              | R$ 412  |
| 6   | jan/27    | 187   | 94       | 7              | 35              | R$ 471  |
| 7   | fev/27    | 187   | 94       | 7              | 39              | R$ 525  |
| 8   | mar/27    | 187   | 94       | 7              | 43              | R$ 573  |
| 9   | abr/27    | 187   | 94       | 7              | 46              | R$ 616  |
| 10  | mai/27    | 187   | 94       | 7              | 49              | R$ 655  |
| 11  | jun/27    | 187   | 94       | 7              | **51**          | R$ 690  |

### Fluxo de caixa

| Mês | Receita | Marketing | Operacional | Saldo mês | Acumulado |
|-----|---------|-----------|-------------|-----------|-----------|
| 0   | R$ 0    | R$ 1.500  | R$ 482      | -R$ 1.982 | -R$ 1.982 |
| 1   | R$ 101  | R$ 1.500  | R$ 506      | -R$ 1.905 | -R$ 3.887 |
| 2   | R$ 191  | R$ 1.500  | R$ 524      | -R$ 1.833 | -R$ 5.720 |
| 3   | R$ 273  | R$ 1.500  | R$ 542      | -R$ 1.769 | -R$ 7.489 |
| 4   | R$ 346  | R$ 1.500  | R$ 560      | -R$ 1.714 | -R$ 9.203 |
| 5   | R$ 412  | R$ 1.500  | R$ 575      | -R$ 1.663 | -R$ 10.866 |
| 6   | R$ 471  | R$ 1.500  | R$ 587      | -R$ 1.616 | -R$ 12.482 |
| 7   | R$ 525  | R$ 1.500  | R$ 599      | -R$ 1.574 | -R$ 14.056 |
| 8   | R$ 573  | R$ 1.500  | R$ 611      | -R$ 1.538 | -R$ 15.594 |
| 9   | R$ 616  | R$ 1.500  | R$ 620      | -R$ 1.504 | -R$ 17.098 |
| 10  | R$ 655  | R$ 1.500  | R$ 629      | -R$ 1.474 | -R$ 18.572 |
| 11  | R$ 690  | R$ 1.500  | R$ 635      | -R$ 1.445 | **-R$ 20.017** |

### Resumo
- **Pagantes ativos no fim do ano 1:** ~51
- **Total de novos pagantes (12m, bruto):** 83
- **Receita acumulada 12m:** R$ 4.853
- **Investimento total:** R$ 24.870
- **Burn acumulado:** R$ 20.017
- **CAC efetivo:** ~R$ 300/pagante
- **LTV:** R$ 134/usuário (R$ 13,41 ÷ 0,10)
- **LTV/CAC:** 0,45 — ainda negativo no ano 1, **mas com sinal de viabilidade**. Em 18-24 meses fica saudável.

---

## 4. Cenário Otimista

### Premissas
| Variável | Valor | Justificativa |
|----------|-------|---------------|
| CPL | R$ 5 | Criativo viral + audiência muito bem definida (ex: público de creators financeiros). |
| Leads/mês | 300 | R$ 1.500 ÷ R$ 5 |
| Ativação | 60% | Onboarding excelente + Raio-X PDF como gancho forte. |
| Conversão Diagnóstico → Pago | 12% | Top de mercado pra trial gratuito não-gated. |
| Churn mensal | 6% | Excelente. Mix anual sobe pra 50% reduzindo churn aparente. |
| Novos pagantes/mês | ~21,6 | 300 × 0,6 × 0,12 |

### Funil e receita mensal

| Mês | Calendário | Leads | Ativados | Novos pagantes | Pagantes ativos | Receita |
|-----|-----------|-------|----------|----------------|-----------------|---------|
| 0   | jul/26    | 300   | 180      | 0              | 0               | R$ 0    |
| 1   | ago/26    | 300   | 180      | 22             | 22              | R$ 290  |
| 2   | set/26    | 300   | 180      | 21             | 42              | R$ 562  |
| 3   | out/26    | 300   | 180      | 21             | 61              | R$ 818  |
| 4   | nov/26    | 300   | 180      | 20             | 79              | R$ 1.058 |
| 5   | dez/26    | 300   | 180      | 20             | 96              | R$ 1.285 |
| 6   | jan/27    | 300   | 180      | 20             | 112             | R$ 1.497 |
| 7   | fev/27    | 300   | 180      | 19             | 127             | R$ 1.697 |
| 8   | mar/27    | 300   | 180      | 19             | 141             | R$ 1.885 |
| 9   | abr/27    | 300   | 180      | 19             | 154             | R$ 2.061 |
| 10  | mai/27    | 300   | 180      | 19             | 166             | R$ 2.227 |
| 11  | jun/27    | 300   | 180      | 18             | **178**         | R$ 2.383 |

### Fluxo de caixa

| Mês | Receita | Marketing | Operacional | Saldo mês | Acumulado |
|-----|---------|-----------|-------------|-----------|-----------|
| 0   | R$ 0    | R$ 1.500  | R$ 740      | -R$ 2.240 | -R$ 2.240 |
| 1   | R$ 290  | R$ 1.500  | R$ 806      | -R$ 2.016 | -R$ 4.256 |
| 2   | R$ 562  | R$ 1.500  | R$ 866      | -R$ 1.804 | -R$ 6.060 |
| 3   | R$ 818  | R$ 1.500  | R$ 923      | -R$ 1.605 | -R$ 7.665 |
| 4   | R$ 1.058| R$ 1.500  | R$ 977      | -R$ 1.419 | -R$ 9.084 |
| 5   | R$ 1.285| R$ 1.500  | R$ 1.028    | -R$ 1.243 | -R$ 10.327 |
| 6   | R$ 1.497| R$ 1.500  | R$ 1.076    | -R$ 1.079 | -R$ 11.406 |
| 7   | R$ 1.697| R$ 1.500  | R$ 1.121    | -R$ 924   | -R$ 12.330 |
| 8   | R$ 1.885| R$ 1.500  | R$ 1.163    | -R$ 778   | -R$ 13.108 |
| 9   | R$ 2.061| R$ 1.500  | R$ 1.202    | -R$ 641   | -R$ 13.749 |
| 10  | R$ 2.227| R$ 1.500  | R$ 1.238    | -R$ 511   | -R$ 14.260 |
| 11  | R$ 2.383| R$ 1.500  | R$ 1.274    | -R$ 391   | **-R$ 14.651** |

### Resumo
- **Pagantes ativos no fim do ano 1:** ~178
- **Total de novos pagantes (12m, bruto):** 218
- **Receita acumulada 12m:** R$ 15.763
- **Investimento total:** R$ 30.414
- **Burn acumulado:** R$ 14.651
- **CAC efetivo:** ~R$ 140/pagante
- **LTV:** R$ 224/usuário (R$ 13,41 ÷ 0,06)
- **LTV/CAC:** 1,6 — **viável**. Break-even mensal por volta de M14-M16.

---

## 5. Comparativo final do ano 1

### 5.1 Pagantes ativos por mês

| Mês | Calendário | Pessimista | Esperado | Otimista |
|-----|-----------|-----------:|---------:|---------:|
| 0   | jul/26    | 0          | 0        | 0        |
| 1   | ago/26    | 2          | 8        | 22       |
| 2   | set/26    | 4          | 14       | 42       |
| 3   | out/26    | 5          | 20       | 61       |
| 4   | nov/26    | 6          | 26       | 79       |
| 5   | dez/26    | 7          | 31       | 96       |
| 6   | jan/27    | 8          | 35       | 112      |
| 7   | fev/27    | 9          | 39       | 127      |
| 8   | mar/27    | 10         | 43       | 141      |
| 9   | abr/27    | 10         | 46       | 154      |
| 10  | mai/27    | 11         | 49       | 166      |
| 11  | jun/27    | **11**     | **51**   | **178**  |

### 5.2 Saldo do mês (R$)

| Mês | Calendário | Pessimista | Esperado | Otimista |
|-----|-----------|-----------:|---------:|---------:|
| 0   | jul/26    | -1.814     | -1.982   | -2.240   |
| 1   | ago/26    | -1.793     | -1.905   | -2.016   |
| 2   | set/26    | -1.772     | -1.833   | -1.804   |
| 3   | out/26    | -1.761     | -1.769   | -1.605   |
| 4   | nov/26    | -1.748     | -1.714   | -1.419   |
| 5   | dez/26    | -1.736     | -1.663   | -1.243   |
| 6   | jan/27    | -1.727     | -1.616   | -1.079   |
| 7   | fev/27    | -1.720     | -1.574   |   -924   |
| 8   | mar/27    | -1.714     | -1.538   |   -778   |
| 9   | abr/27    | -1.707     | -1.504   |   -641   |
| 10  | mai/27    | -1.703     | -1.474   |   -511   |
| 11  | jun/27    | -1.698     | -1.445   |   -391   |

### 5.3 Saldo acumulado (R$)

| Mês | Calendário | Pessimista | Esperado | Otimista |
|-----|-----------|-----------:|---------:|---------:|
| 0   | jul/26    |  -1.814    |  -1.982  |  -2.240  |
| 1   | ago/26    |  -3.607    |  -3.887  |  -4.256  |
| 2   | set/26    |  -5.379    |  -5.720  |  -6.060  |
| 3   | out/26    |  -7.140    |  -7.489  |  -7.665  |
| 4   | nov/26    |  -8.888    |  -9.203  |  -9.084  |
| 5   | dez/26    | -10.624    | -10.866  | -10.327  |
| 6   | jan/27    | -12.351    | -12.482  | -11.406  |
| 7   | fev/27    | -14.071    | -14.056  | -12.330  |
| 8   | mar/27    | -15.785    | -15.594  | -13.108  |
| 9   | abr/27    | -17.492    | -17.098  | -13.749  |
| 10  | mai/27    | -19.195    | -18.572  | -14.260  |
| 11  | jun/27    | **-20.893**| **-20.017** | **-14.651** |

### 5.4 Resumo executivo do ano 1

| Métrica | Pessimista | Esperado | Otimista |
|---------|-----------|----------|----------|
| Pagantes ativos M11 | **11** | **51** | **178** |
| Novos pagantes brutos (12m) | 22 | 83 | 218 |
| Receita acumulada (12m) | R$ 1.124 | R$ 4.853 | R$ 15.763 |
| Investimento (12m) | R$ 22.017 | R$ 24.870 | R$ 30.414 |
| Burn (12m) | -R$ 20.893 | -R$ 20.017 | -R$ 14.651 |
| Receita M11 (run-rate mensal) | R$ 149 | R$ 690 | R$ 2.383 |
| CAC efetivo | R$ 1.000 | R$ 300 | R$ 140 |
| LTV | R$ 89 | R$ 134 | R$ 224 |
| LTV/CAC | 0,09 (inviável) | 0,45 (frágil) | 1,6 (viável) |

### 5.5 Leitura comparativa dos fluxos

1. **Os três cenários consomem caixa parecido nos primeiros 4 meses.** Até nov/26 (M4), a diferença entre o pior e o melhor saldo do mês é de apenas ~R$ 196. Razão: o marketing fixo (R$ 1.500/mês) domina o gasto, e nenhum cenário gera receita relevante antes de M3-M4.

2. **O otimista começa a divergir a partir de M4.** Em nov/26 o saldo mensal otimista já é melhor que o do esperado; em M6 fica visivelmente melhor que o pessimista.

3. **O esperado e o pessimista andam quase juntos até M6 e divergem timidamente depois.** A diferença de saldo acumulado entre eles ao fim do ano 1 é só R$ 876 (-R$ 20.017 vs -R$ 20.893). O ganho do esperado **NÃO está em cash flow imediato — está no estado da máquina** ao fim do ano (51 vs 11 pagantes) que destrava receita futura no ano 2.

4. **Nenhum cenário atinge break-even no ano 1.** Mesmo o otimista, com 178 pagantes ao fim, fecha M11 em -R$ 391. Break-even mensal projetado para M13-M14 (ago/27).

5. **Runway necessário pra sobreviver o ano 1:** entre R$ 15k (otimista) e R$ 21k (pessimista). Recomendação: planejar com **R$ 25-30k de reserva de caixa** — cobre o pessimista + buffer pra ajustes de criativo e meses imprevistos.

> **Observação chave:** o burn dos três cenários no ano 1 é parecido (R$ 14-21k) porque o gasto é dominado por marketing fixo. O que muda DRAMATICAMENTE é o **estado da máquina ao final do ano** — no otimista, sai com 178 pagantes ativos e R$ 2.383/mês de receita recorrente; no pessimista, com 11 e R$ 149.

---

## 6. Alavancas que movem o cenário

Em ordem de impacto, do mais alto pro mais baixo:

### 1. CPL (custo por lead)
- De **R$ 12 → R$ 6**: dobra o número de leads sem aumentar budget = dobra o platô.
- **Como mover:** criativos UGC + Click-to-WhatsApp + segmentação granular (idade 25-40, lookalike de clientes de apps financeiros, interesse em "controle financeiro"). Iterar criativo semanalmente.

### 2. Conversão Diagnóstico → Pago
- De **5% → 12%**: triplica a saída de pagantes.
- **Como mover:** garantir que o Raio-X PDF do dia 14 seja *insanamente* específico e personalizado. Mensagem de upgrade no dia 12 (não dia 14) com prova social. Plano de Ataque PDF como bônus exclusivo.

### 3. Churn mensal
- De **15% → 6%**: 2,5× o LTV (R$ 89 → R$ 224).
- **Como mover:** Garantia Raio-X clara, conteúdo de retenção (insights semanais via WhatsApp), gamificação de hábito (streak de dias registrados).

### 4. Ativação (lead → completa Diagnóstico)
- De **30% → 60%**: dobra a base que passa pelo gargalo de conversão.
- **Como mover:** MSG1/MSG2 do welcome flow forte; primeiro registro fácil; conexão emocional cedo.

---

## 7. Pontos de decisão / gates

| Gate | Quando | Critério | Ação se falhar |
|------|--------|----------|----------------|
| **G1: CPL** | M2 (set/26) | CPL ≤ R$ 10 | Pausar ads, iterar criativo, contratar especialista Meta. |
| **G2: Ativação** | M3 (out/26) | ≥ 40% dos leads completam Diagnóstico 14d | Refazer onboarding (MSG1/MSG2). |
| **G3: Conversão D→P** | M4 (nov/26) | ≥ 6% dos ativados pagam | Refazer entrega do Raio-X e copy do paywall. |
| **G4: Churn M30** | M5 (dez/26) | < 12% mensal | Investigar onboarding pós-pagamento + criar conteúdo de retenção. |
| **G5: Sean Ellis** | M6 (jan/27) | ≥ 40% dos usuários ativos dizem "muito decepcionado" se Finn sumisse | Sinal de PMF. Se < 25%, considerar pivotar produto. |
| **G6: Decisão Open Finance** | M9 (abr/27) | Cenário base atingido + retenção mensal de pagante ≥ 88% por 3 meses | Avaliar integração via Pluggy/Belvo, modelar custo. |

**Cenário esperado é o que devemos planejar pra sobreviver. Pessimista é o que devemos ter caixa pra suportar. Otimista é o objetivo.**

---

> **Próximos passos imediatos (pré-launch jul/26):**
> 1. Implementar trial 14d completo (schema + cron + paywall).
> 2. Configurar pagamento (cartão + PIX Automático).
> 3. Pipeline de geração do Raio-X PDF.
> 4. Setup de Meta Ads + audiência inicial (lookalike + interesse).
> 5. 3 criativos UGC pra teste A/B no primeiro mês.
