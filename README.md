# Free Kick World ⚽

Jogo web (HTML5 + Canvas) de futebol/cobrança de falta. É uma página estática
autônoma: abra o `index.html` em qualquer servidor HTTP (mesma origem) e jogue.

## Estrutura

- `index.html` — só o HTML (canvas, telas, botões) e a lista de scripts.
- `css/game.css` — estilos da interface (telas, HUD, controles na tela).
- `js/` — o jogo dividido por assunto, carregado em ordem no fim do `index.html`.
  Todos os arquivos compartilham o mesmo escopo global (scripts clássicos), então
  funcionam como se fossem um só. **A ordem importa** (cada um usa o que os
  anteriores definiram):
  - `core.js` — canvas, contexto 2D, redimensionamento (retina) e orientação.
  - `assets/` — **um arquivo por imagem, com o MESMO nome do arquivo em `assets/`**
    (ex.: `assets/goal-left.png` ↔ `js/assets/goal-left.js`). Cada um carrega a sua
    imagem e diz onde ela fica e o tamanho dos quadros. O desenho em si continua em
    `stadium.js`/`render.js`.
    - `_loader.js` — infra compartilhada (contador de carga, âncoras dos gols).
    - `player_walk.js`, `player_run.js`, `player_kick.js`, `player_jump.js` — sprites.
    - `pitch-grass.js` — o gramado. `goal-left.js`, `goal-right.js` — as traves.
    - (a arte `fkw-title.jpg` é uma `<img>` direta no `index.html`.)
  - `field.js` — geometria do campo em perspectiva, escala por profundidade.
  - `stadium.js` — estádio procedural (céu, arquibancada, público, grama, luzes).
  - `state.js` — estado da partida, jogador, bola, gol e chute.
  - `camera.js` — modos Longe/Perto, zoom no campo e zoom livre (pinça).
  - `screens.js` — navegação, telas/HUD, tela cheia, início/fim e cronômetro.
  - `input.js` — joystick, botões PULAR/CHUTAR, teclado, câmera e pinça.
  - `gameplay.js` — movimento, pulo, chute, física da bola e gol.
  - `render.js` — câmera na tela, desenho do estádio, do jogador e da bola.
  - `persistence.js` — login e salvar/retomar o progresso no Supabase.
  - `loop.js` — laço principal de animação (update + render por frame).
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
