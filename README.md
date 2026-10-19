# Slark Live

**Cada mente é um universo.** Experiência FeCEAP de 3–5 minutos com salas por PIN, descoberta de características por regras, Time demonstrativo complementar, missão Runaway e painel ao vivo. Repositório independente do Slark principal.

## Executar

Node.js 22 ou superior. `npm install`, depois configure `ADMIN_PASSWORD` e `SESSION_SECRET` (mínimo 32 caracteres) no ambiente. Execute `npm run dev` e abra http://localhost:3000. Para carregar um arquivo `.env` com Node: `node --env-file=.env server.js`. Copie `.env.example` e preencha localmente; nunca envie senhas ao GitHub.

O desenvolvimento usa `.data/state.json` quando não existe `DATABASE_URL`. Essa persistência atende vários navegadores conectados ao mesmo servidor local; não depende de localStorage para compartilhar salas. Na Vercel, configure obrigatoriamente um PostgreSQL em `DATABASE_URL`. A aplicação cria a tabela `slarklive_state` automaticamente; o usuário do banco precisa dessa permissão. Use banco dedicado e conexão com pool/TLS conforme o provedor. Não desative validação de certificado.

## Vercel

Importe `OVTTX/slarklive` como novo projeto, selecione **Other**, sem comando de build e com saída `public`. O `vercel.json` contém as rotas de SPA e API Node. Defina `DATABASE_URL`, `ADMIN_PASSWORD` e `SESSION_SECRET` antes de implantar. Nenhum segredo deve usar prefixo público. Sem banco ou credenciais, a interface explica a indisponibilidade; não existe senha padrão ou falso login. Este repositório não altera o projeto `slark-kvy7`.

## Operação

1. Entre em `/admin`, crie uma sala e escolha Participantes ou **Avaliador · 1 pessoa**. Duração padrão: 25 minutos (configurável de 1 a 60; para apresentação, use 20–30).
2. Clique em **Iniciar sessão** e exiba o PIN. O público usa `/` ou `/sala`, sem conta ou autenticação ChatGPT. O modo avaliador admite um único participante, com inscrição atômica no banco. O mesmo navegador pode retomar a sala com seu token.
3. O participante percorre `/experiencia`, `/descoberta`, `/universo`, `/times`, `/missao` e `/conquista`. São cinco perguntas de quatro alternativas, com voltar, progresso e cálculo determinístico. Todas as características podem predominar; empates seguem a ordem Observador, Detalhista, Criativo, Raciocínio lógico. Não é diagnóstico nem avaliação por IA.
4. O Time reúne o participante e três estudantes explicitamente fictícios, um de cada outra característica. Não representa agrupamento de participantes reais.
5. Missão: seca reduz o pasto e o leite; responder em 2–3 frases sobre atividade econômica, efeito na merenda e ação justificada. A equipe vê e corrige em `/admin` (também `/dashboard` e `/salas`). A devolutiva aparece ao atualizar a conquista. Não há correção automática de texto nem ranking.
6. Abra `/live?pin=123456` no telão. Somente dados anônimos/agregados, PIN e cronômetro, atualização de 3 em 3 segundos. Sem controles administrativos. Intervalo de 30 minutos; ao terminar o intervalo, o administrativo inicia a próxima sessão. O botão reiniciar exige confirmação e apaga as entregas da sala.

## Segurança e limites

Sessão administrativa assinada, cookie HttpOnly/SameSite e Secure na Vercel, validação no servidor, proteção de origem, consultas parametrizadas e transação com bloqueio para as vagas. Não coleta nomes, e-mails ou senhas de estudantes. Tokens de participante ficam no sessionStorage; quem obtiver o token pode acessar aquela entrega. Não compartilhe tokens. Evite dados pessoais no texto da missão.

A implementação usa uma linha JSON transacional no PostgreSQL para simplificar a demonstração; é adequada ao protótipo de feira, não ao ecossistema escolar completo. Rate limit de login é por instância; para exposição em escala, complemente com proteção centralizada/WAF. Fechar uma sessão impede novos envios; reiniciar apaga dados. A senha administrativa é compartilhada pela equipe, sem gestão de contas individuais. O telão permite consulta agregada a quem tiver o PIN. O administrativo pode alternar o telão para números ilustrativos, sempre com a faixa “MODO DEMONSTRAÇÃO — DADOS FICTÍCIOS”. Essa alternância não altera participantes nem entregas reais.

Tipografia: Plus Jakarta Sans quando instalada, com fallback system-ui, sem dependência externa. Paleta institucional #000026, #0B0697, #0651C3 e branco. As características não são rótulos permanentes.

## Verificação

`npm test` executa testes de resultados e agregação anônima. A API pode ser verificada com `node --test tests/api.test.js`; o teste inicia servidor isolado e verifica autenticação, reserva simultânea da vaga de avaliador, missão e correção. Não há dependência de IA nem chave OpenAI.
