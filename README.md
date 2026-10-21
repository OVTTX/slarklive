# Slark Live · versão 2

**Cada mente é um universo.** Salas ao vivo no fim de cada capítulo das trilhas Runaway: somente slides, somente quizzes ou uma sequência mesclada. O professor apresenta e os quartetos já definidos na Slark discutem e enviam uma resposta por pergunta.

A versão 2 substitui o fluxo anterior de questionário de características e missão individual. Nenhum quarteto real é sorteado ou criado aqui.

## Jornada

1. O professor entra em `/admin` com e-mail e senha da Slark. O servidor autentica no mesmo Supabase da Slark e aceita os perfis professor, diretor e admin_slark. Alunos continuam entrando pelo PIN do quarteto.
2. Escolhe uma de suas trilhas e informa o capítulo. No editor, adiciona slides e quizzes, edita, exclui ou reordena itens. Cada quiz tem quatro alternativas, gabarito, explicação e tempo entre 5 e 300 segundos.
3. Ao criar a sala, o servidor carrega `times` e `time_membros` da turma da trilha. Somente times com exatamente quatro integrantes válidos participam. Integrantes duplicados entre quartetos são rejeitados. Não altera os times do Slark.
4. A sala gera um PIN. Em `/professor?pin=...`, o professor vê os códigos privados de cada quarteto e abre `/live?pin=...` no telão. Os alunos usam PIN + código do seu quarteto, sem conta ChatGPT. Um dispositivo controla a resposta da equipe; o token permite retomar na mesma aba.
5. O professor inicia, avança slides, abre as perguntas e encerra/revela o gabarito. Uma pergunta não pode ser reaberta; cada quarteto pode responder uma vez. O relógio é validado no servidor. O quiz não avança automaticamente: o professor controla a discussão.
6. Respostas e tempos são registrados por quarteto. Não há ranking público nem atribuição automática de características individuais.
7. O professor seleciona o aluno, a característica observada e descreve uma evidência. O registro é salvo em `observacoes` da Slark, com autoria do professor e referência ao capítulo. Não altera automaticamente a característica ou o selo do estudante; a análise da Luna continua no fluxo de Observações da Slark.

## Configuração e execução

Node.js >=22. `npm ci`. Copie `.env.example` para `.env` e preencha **somente no servidor**:

- `DATABASE_URL`: PostgreSQL para o estado transacional das salas. Pode ser banco separado.
- `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`: mesmo projeto Supabase da Slark (`isnurzrircathvvmdtzc`). Autenticação e consultas usam a sessão do usuário, com RLS; não há chave service_role ou acesso amplo adicional.
- `SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres.

Execute `node --env-file=.env server.js`. Abra http://localhost:3000. `npm test` testa API e domínio sem banco externo. Na ausência de `DATABASE_URL`, o servidor local persiste em `.data/state.json`. Na Vercel a conexão de estado é obrigatória.

Para uma demonstração sem dados reais: `ENABLE_DEMO=1`, configure `ADMIN_PASSWORD`, deixe o e-mail em branco no login. Os dois quartetos e oito alunos são fictícios, sempre identificados com “MODO DEMONSTRAÇÃO — DADOS FICTÍCIOS”. O modo não lê ou escreve dados na Slark. Não existe senha padrão.

## Vercel

Importe este repositório como novo projeto, framework Other, saída `public`, sem comando de build. Configure as variáveis acima antes de implantar. `vercel.json` define API Node, rotas e cabeçalhos. A implantação não foi realizada por este commit. Não reutilize o projeto de produção da Slark principal.

O armazenamento cria `slarklive_state`, com RLS habilitada e sem políticas públicas; a conexão de servidor precisa de permissões de criação/leitura/escrita e acesso apropriado ao RLS. Use credencial de servidor e não a exponha ao navegador. Consultas existentes da Slark têm filtros explícitos por professor, trilha, turma e aluno. A conexão deve usar TLS com validação de certificado.

## Integração nas trilhas do Slark

A alteração complementar do app Slark acrescenta `conteudo.liveRoom.pin` aos blocos de capítulo existentes. O professor preenche o campo ao editar o capítulo; o aluno vê um cartão no fim do conteúdo. Configure `VITE_SLARK_LIVE_URL=https://<dominio-do-slark-live>` no projeto Vercel do Slark para o botão de entrada. Apenas esse endereço de ambiente é utilizado, nunca URLs arbitrárias fornecidas por alunos.

Não é necessária migração para o campo: `trilha_blocos.conteudo` já é JSONB. O PIN não substitui o código privado do quarteto. O catálogo do Live é restrito às trilhas do professor autenticado. A publicação do PIN na trilha é manual, como definido na proposta.

## Segurança e limites

Cookie administrativo HttpOnly, SameSite=Strict, Secure na Vercel, expiração em 1h; assinatura HMAC; validação do perfil do professor em cada solicitação autenticada. O acesso à sala é restrito ao seu criador. Credenciais de professor são verificadas pelo Supabase, sem gravar a senha. Não há refresh automático do login; após expiração, entre novamente.

Códigos e tokens privados das equipes não aparecem no telão; tampouco nomes individuais ou observações. O gabarito e a explicação ficam ocultos na API dos alunos até a revelação. Resultados são liberados após revelar/avançar/encerrar. A primeira resposta válida do quarteto é definitiva, inclusive sob envios simultâneos.

A composição de cada quarteto é uma fotografia da base no momento em que a sala é criada. Para refletir mudanças, crie uma nova sala. Times com menos ou mais de quatro integrantes ficam de fora. Professores veem suas trilhas, diretores ficam restritos à escola e admin_slark lê conforme as políticas existentes. Nenhuma política do Supabase é ampliada. Algumas operações podem continuar negadas pela RLS (por exemplo, escrita de observações por administradores). Regras de co-docência não estão implementadas. Antes de publicar com dados reais, valide o schema e as permissões na instância da escola: o teste automatizado usa a demonstração, sem acesso ao banco real.

O estado usa uma linha JSON transacional e polling de 2s: adequado ao protótipo, sujeito a contenção para muitas salas simultâneas. Rate limit de login por instância, sem WAF distribuído. Observações são inseridas no banco Slark antes de registrar o recibo local; se houver falha entre essas operações, uma tentativa repetida pode duplicar o texto. Não há análise de IA no Live, upload de PPTX/PDF ou importação de slides externos; slides são criados no editor de título/texto.

## Verificação

`npm test`: valida sequências nos três modos, sigilo do gabarito, tempo e bloqueio de respostas, envio simultâneo único, controle exclusivo do professor, observação de aluno válido e privacidade do telão. Validações de banco real e visual no navegador devem ser feitas na hospedagem configurada.

## Identidade e acesso compartilhado

A Plus Jakarta Sans variável (200–800, normal e itálico, conjunto Latin com acentos do português) é servida pelo próprio site, com licença OFL em `public/assets/fonts/OFL.txt`. A logo vetorial fornecida pelo usuário é `public/assets/slark-live.svg`, preservando cores e gradientes.

O login usa e-mail e senha que já existem no Supabase da Slark. Senhas não são copiadas ou redefinidas. O access token fica em cookie HttpOnly e é validado por `/auth/v1/user`; as consultas à Data API respeitam RLS e não usam conexão privilegiada. A sessão expira em até uma hora, sem refresh automático. Testes de login usam servidor simulado; não foi utilizada a senha de nenhuma conta real.

Estado de implantação: em 19/10/2026, a criação do projeto Vercel `slarklive` foi negada pela API (403, sem permissão). Ainda é necessário criar/importar o projeto com uma conta autorizada e configurar SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SESSION_SECRET e DATABASE_URL. O cadastro e as senhas no Supabase não foram alterados.

## Slark Live 3.0 — mata-mata

O modo mata-mata aceita de 2 a 64 quartetos já definidos. O sorteio inicial forma confrontos; cada fase tem cinco perguntas compartilhadas pelos confrontos simultâneos. Vence quem acertar mais. Empates usam perguntas extras até haver vencedor, sem vantagem por velocidade. Quartetos sem adversário avançam automaticamente.

Na primeira fase, as telas públicas e dos participantes recebem apenas apelidos genéricos. Nomes são revelados ao avançar para a próxima fase (ou ao concluir a final de um torneio com apenas dois quartetos). O painel privado do professor conserva os nomes e a observação individual. A API pública não expõe integrantes, códigos, tokens nem gabaritos antecipados.

O banco precisa de pelo menos `5 × ceil(log2(quartetos))` perguntas: 15 para oito quartetos, 20 para dezesseis. O exemplo tem 25 perguntas. Slides continuam disponíveis no modo apresentação; o mata-mata seleciona apenas quizzes. O professor pode adicionar uma pergunta de desempate caso as extras acabem.

`/demo` permite testar um torneio com oito quartetos fictícios, salvo apenas na sessão desta aba. Não exige login e não cria uma sala real. As salas reais continuam dependendo de `DATABASE_URL` no Vercel, além da configuração de autenticação Slark existente.

## Persistência privada

O backend usa a tabela `state` inicializada pelo provisionamento, sem executar DDL a cada requisição. A conexão usa TLS validado, uma conexão por instância e `SELECT ... FOR UPDATE` para impedir perda de respostas simultâneas. Falhas desfazem a transação.

Produção usa `slarklive_private` e o role restrito `slarklive_app`; a branch de preview usa `slarklive_preview_private` e `slarklive_preview_app`. Nenhum desses schemas deve ser exposto na Data API. Os roles têm apenas USAGE no próprio schema e SELECT/UPDATE da própria tabela, com RLS e sem privilégios administrativos. As senhas são provisionadas separadamente e guardadas como secrets do Vercel; não fazem parte do repositório.

Configuração: `DATABASE_URL` com o pooler Supabase; `SLARKLIVE_DATABASE_SCHEMA` seleciona um dos dois schemas permitidos. Opcionalmente `SLARKLIVE_DATABASE_CA_CERT` fornece o certificado CA em PEM. O login Supabase existente não é alterado.

Para verificar o banco de preview: `SLARKLIVE_TEST_DATABASE_URL` ativa os testes PostgreSQL em `npm test`. Eles verificam incrementos em processos independentes, rollback e isolamento de produção, usando uma chave temporária fora de `rooms`, removida ao terminar.

## Telão e códigos fixos dos quartetos

No painel do professor, crie uma sala e use **Abrir apresentação no telão**. Enquanto a sala aguarda início, `/live?pin=PIN` apresenta o PIN em destaque e os nomes dos quartetos conectados, atualizados a cada dois segundos. Há um botão de tela cheia. Após iniciar o torneio, o telão volta aos quizzes e aos confrontos anônimos da primeira fase. Códigos, integrantes, tokens e observações não são enviados ao telão.

O código numérico de seis dígitos é atribuído na primeira sala de um quarteto e salvo no registro privado `quartetCodes.slark`, pela ID original do time na Slark. Novas salas reutilizam o mesmo código, inclusive após renomear o time. A demonstração usa um registro separado. Salas antigas mantêm seus códigos originais. O PIN de cada sala continua variável e necessário para entrar.

O professor pode **Exportar códigos dos quartetos · CSV** na página de condução da sala. O arquivo contém `time_id`, `nome` e `codigo_slarklive`, para posterior cadastro no aplicativo Slark principal. A exportação não inclui integrantes. Não há alteração automática no cadastro da Slark principal.

## Teste individual com bots

Em `/demo?mode=player`, uma pessoa representa o Quarteto Conexão com três companheiros bots, contra sete quartetos de quatro bots. A pessoa envia a resposta coletiva de seu grupo; os bots nunca respondem por ela. O tempo, a revelação e o avanço das fases são automáticos. Após uma eliminação, o torneio continua como espectador. Os dados são fictícios e persistem apenas nesta aba, separados da demonstração do professor e das salas reais.

Entrada pela página inicial: PIN de teste `888888` e código do quarteto `000001`. Essa combinação abre o simulador local; não cria nem conecta uma sala real. As mesmas informações são exibidas na página do teste. O código de teste não pertence ao intervalo dos códigos reais gerados (100000–999999).
