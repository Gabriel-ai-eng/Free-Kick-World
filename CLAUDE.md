# Free Kick World (FKW)

Jogo web (HTML5 + Canvas), página estática, deploy na **Vercel**. Servido em
produção sob `alpsprime.com.br/fkw/` (proxy do AlpsPrime-OS).

## Fluxo de trabalho com Git (preferência do dono do projeto)

O dono **autorizou** que toda alteração vá **direto para a branch `main`**, sem
Pull Request e sem ele precisar abrir o GitHub. A Vercel publica a partir da
`main` (Production Branch = `main`), então ele acompanha o resultado direto
pelo jogo em produção.

Por isso, ao concluir qualquer mudança:

1. Fazer commit das alterações com mensagem clara.
2. Mesclar/enviar **direto para `main`** e dar `git push` para a `origin/main`.
3. Antes de enviar, testar o fluxo básico (abrir o jogo, telas principais) —
   ver a skill `verify`/`run` quando disponível.
4. Não criar Pull Request a menos que seja explicitamente pedido.

Push em qualquer outro branch vira "Preview" na Vercel (não aparece no site
real) — por isso o trabalho deve ir direto para a `main`.
