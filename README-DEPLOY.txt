UNICARE CLEANING V4 — BREVO

STACK
- Site estático em HTML, CSS e JavaScript
- Netlify Function para integração segura com a API v3 do Brevo
- Sem Formspree

PUBLICAÇÃO
1. Leia BREVO-SETUP.txt e configure as listas, gatilhos e variáveis.
2. Conecte o repositório ao Netlify ou publique usando a Netlify CLI.
3. Não use apenas o deploy manual por arrastar arquivos: a função do Brevo precisa ser processada.
4. Depois do deploy, conecte unicarecleaning.com.
5. No Google Search Console, envie https://unicarecleaning.com/sitemap.xml.

FLUXOS CONECTADOS
- Home Assessment → BREVO_ASSESSMENT_LIST_ID = 17
- Lista de espera → BREVO_WAITLIST_LIST_ID = 18
- The Science of Cleaning → BREVO_BOOK_LIST_ID = 19

ARQUIVOS DA INTEGRAÇÃO
- netlify/functions/brevo-submit.mjs
- netlify.toml
- _redirects
- BREVO-SETUP.txt

SEGURANÇA
- A chave BREVO_API_KEY fica somente nas variáveis de ambiente do Netlify.
- O navegador nunca recebe a chave.
- Todos os formulários possuem campo anti-spam invisível e validação no servidor.
