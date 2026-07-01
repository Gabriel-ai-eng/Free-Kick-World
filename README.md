# Free Kick World ⚽

Jogo web (HTML5 + Canvas) de futebol/cobrança de falta. É uma página estática
autônoma: abra o `index.html` em qualquer servidor HTTP (mesma origem) e jogue.

## Estrutura

- `index.html` — o jogo inteiro (canvas, telas, controles e lógica).
- `assets/` — sprites do jogador, campo, gols e a arte de título.
- `vendor/supabase.min.js` — cliente supabase-js (usado só pela persistência).
- `supabase-config.js` — define `window.__ALPS_SB__` (URL + anon key). Vem vazio;
  o jogo roda normalmente sem ele (salvar/retomar fica desativado). Preencha para
  habilitar a persistência.

## Rodar localmente

Sirva a pasta por HTTP (não abra via `file://`, por causa dos carregamentos de
assets). Por exemplo:

```sh
python3 -m http.server 8000
# depois abra http://localhost:8000/
```
