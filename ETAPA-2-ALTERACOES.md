# Etapa 2 — correções de autenticação e perfil

Base: `projeto-final.zip` extraído em 31/08/2026.

## Alterações aplicadas

- Google OAuth continua em PKCE, mas sem validação manual de `state` que podia rejeitar o retorno legítimo do Supabase.
- O verificador PKCE passou de `sessionStorage` para `localStorage`, permitindo concluir retorno em nova aba no mesmo navegador.
- Cadastro por e-mail agora usa redirect explícito para o app e PKCE quando há confirmação por e-mail.
- Recuperação de senha usa PKCE e volta para o app; o callback diferencia recuperação de login comum.
- Callback trata erros devolvidos pelo Supabase e remove parâmetros sensíveis da URL depois da troca do código.
- Renovação de sessão passa a renovar também quando a sessão já está a menos de 60 segundos de expirar.
- Respostas de autenticação no proxy recebem `Cache-Control: no-store`.
- URLs públicas de avatar apontam direto para o bucket público do Supabase, reduzindo dependência do proxy do Replit.
- Upload de avatar aceita somente JPG, PNG, WEBP e GIF, até 5 MB.
- Políticas de update/delete do bucket usam a pasta do usuário em vez do campo `owner_id`, evitando incompatibilidade de tipo e mantendo isolamento por usuário.
- Foi criado `supabase/stage-2-hardening.sql`, idempotente, para reaplicar apenas o hardening do bucket.
- `VITE_SUPABASE_URL` pode ser usado futuramente para trocar o projeto Supabase sem editar o código; o projeto atual segue como fallback.

## Verificações locais realizadas

- Os quatro arquivos TypeScript/TSX alterados foram transpilados pelo TypeScript sem erros de sintaxe.
- O diff foi conferido contra o ZIP original para garantir que apenas os pontos planejados foram alterados.
- O build completo não pôde ser executado neste ambiente porque o ZIP correto não inclui `node_modules` e o ambiente não possui acesso ao npm para reinstalar as dependências.

## Teste controlado necessário após publicar

1. Login com e-mail e senha.
2. Logout e login novamente.
3. Criar conta nova e confirmar e-mail.
4. Login com Google e retorno ao app.
5. Esqueci minha senha, abrir e-mail e criar nova senha.
6. Criar perfil com username válido.
7. Tentar username duplicado.
8. Alterar perfil e consentimentos opcionais.
9. Enviar avatar JPG/PNG/WEBP/GIF menor que 5 MB.
10. Confirmar que SVG e arquivos acima de 5 MB são recusados.
11. Manter sessão aberta até ocorrer refresh automático.
12. Confirmar que parede, pan, zoom, pinch e seleção continuam intactos.
