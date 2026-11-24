# Universal Game Review

Plataforma pessoal de análise, revisão e treino de videojogos. Corre 100% no navegador: os vídeos, demos e projetos ficam guardados no teu dispositivo (IndexedDB), sem servidor nem base de dados.

## O que já funciona

- **Página inicial** com a lista de jogos (CS2 e Deadlock; mais jogos em breve).
- **Biblioteca por jogo**: projetos (pastas) com o ficheiro importado e marcadores.
- **Leitor de vídeo** (mp4/webm): velocidade 0.25×–2×, saltos de 5 s e marcadores com nota ligados ao instante.
- **Leitor de demos CS2 (`.dem`, beta)**, lido localmente com WebAssembly:
  - radar 2D com jogadores, direção do olhar, vida e killfeed;
  - placar, tempo e número da ronda;
  - timeline **só da ronda atual**, com as kills marcadas (cor da equipa);
  - seletor de rondas (◀ lista ▶) por baixo do placar;
  - velocidades 0.25× a 4× e saltos de ±5 s / ±15 s;
  - **cartas dos jogadores** com arma (principal ou pistola), dinheiro, colete/capacete, kit de defusa, bomba e utilidades (☁ smoke, ⚡ flash, 🔥 molotov/incendiária, 💥 HE);
  - **relógio da ronda** em contagem decrescente: compras (buytime) → 1:55 → bomba 0:40. A opção **Buytime** (ao lado do seletor de rondas) liga/desliga o tempo de compras na ronda e na timeline, e fica guardada no navegador;
  - **utilidades no mapa**: aparecem no canto superior esquerdo **só quando a Maquete está ligada**; Smoke / Molo / Flash / HE / Bomba são colocadas na maquete e podem ser arrastadas (botão direito ou ⌫ apaga);
  - **cor livre** nos desenhos e nas notas (seletor de cor ao lado das 5 cores);
  - **tiros**: rasto curto da arma na direção do olhar de quem dispara (opção **Tiros**);
  - **caveiras** ☠ no local onde cada jogador morreu, até ao fim da ronda;
  - **notas ao vivo**: aparecem no canto inferior direito durante 10 s a partir do instante em que foram escritas, com a cor escolhida.
  - **T à esquerda e CT à direita** (placar e cartas dos jogadores);
  - **ecrã largo**: o replay ocupa a largura toda da janela e a altura restante; o botão ⛶ passa a ecrã inteiro;
  - **utilidades dos jogadores no radar**: smokes (18 s), molotovs (enquanto ardem), flashes e HE aparecem no local de detonação, com a cor da equipa de quem lançou; a opção **Utilidades** liga/desliga. As trajetórias no ar ainda não são mostradas;
  - **notas com título e texto** (Ctrl+Enter adiciona), com cor livre; o nome do projeto aparece ao lado de "← Jogo" no topo;
  - piso superior/inferior (Nuke, Train, Vertigo…);
  - **desenhos** sobre o radar: livre, linha, seta, círculo, texto e borracha, em 5 cores, ligados ao instante da partida (visíveis 5 s / 10 s / 30 s ou a ronda toda), com desfazer e limpar ronda;
  - **notas** por instante (painel 📝 Notas): clicar numa nota salta para esse momento; aparecem como losangos amarelos na timeline da ronda;
  - desenhos e notas ficam guardados no navegador, por projeto (registo `<id>:anno` no IndexedDB), sem reescrever o ficheiro da demo.
- **Quadro tático (só o mapa)**: num projeto vazio do CS2, "Usar só o mapa" abre o radar do mapa escolhido (25 mapas, com piso inferior) para desenhar estratégias e escrever notas, sem precisar de demo. Cada mapa guarda os seus próprios desenhos e notas.
- **🧩 Maquete** (no quadro tático e dentro da demo): jogadores T/CT arrastáveis no radar para montar estratégias. `+ T` / `+ CT` adicionam, duplo clique renomeia, `⌫` apaga e `☠ Matar` liga atirador → vítima (setas numeradas; a vítima fica a cinzento com ☠; lista de mortes no canto inferior esquerdo). Na demo, **cada vez que clicas em Maquete** os jogadores ficam nas posições do instante atual e `↻ Repor` volta a tirar a "fotografia". Ao criar uma nota com a maquete ligada, a opção "Anexar a maquete" guarda uma cópia (jogadores, mortes e utilidades) na nota; ao abrir a nota a maquete é restaurada; no quadro, parte de 5 T + 5 CT. Guardada por ronda (demo) ou por mapa (quadro).
- **Barra de ferramentas** (cursor, desenho, ↶, 🗑, Maquete, Notas, Utilidades, Tiros, ⛶) no canto inferior esquerdo, fora da timeline.
- **Buytime**: ao desligar, salta logo o tempo de compras na ronda atual e nas seguintes.
- **Notas**: só o título aparece (nas notas ao vivo e na lista); o ✕ para apagar fica no canto superior esquerdo; o botão 📝 Notas abre a lista no canto inferior direito e, ao escolher uma nota, mostra o texto e salta para o momento.
- Radares incluídos para 25 mapas (ver `assets/radars/radars.json`).

## Ainda não existe

- Deadlock (o `.dem` é Source 2, deve usar o mesmo parser; falta testar e ter o radar).
- Vista 3D com o mapa texturizado.
- Desenhos e notas no leitor de vídeo (por agora só nas demos), gravação de voz, treinos múltiplos por partida, exportação PDF/vídeo/projeto (fases 4–9 do plano).

## Estrutura

```
index.html                 página única (hash routing: #cs2, #cs2/<projeto>)
css/style.css              estilos (tema claro/escuro automático)
js/app.js                  rotas, IndexedDB, biblioteca, leitor de vídeo e marcadores
js/demo-viewer.js          leitura da demo, radar 2D, reprodução, desenhos e notas
js/vendor/demoparser.js    glue do parser (expõe window.DPM)
assets/wasm/               demoparser_bg.wasm (parser de demos)
assets/radars/             imagens dos radares (.webp) + radars.json (calibração)
.nojekyll                  evita processamento Jekyll no GitHub Pages
```

## Como correr

O parser WASM e os radares são carregados com `fetch`, por isso o site tem de ser servido por HTTP (abrir `index.html` com duplo clique não funciona).

```sh
cd universal-game-review
python3 -m http.server 8000
# abrir http://localhost:8000
```

## Publicar no GitHub Pages

1. Cria um repositório e envia todos os ficheiros desta pasta.
2. Em Settings → Pages, escolhe a branch `main` e a pasta `/ (root)`.
3. O site fica disponível em `https://<utilizador>.github.io/<repositório>/`.

## Como usar

1. Escolhe um jogo e cria um projeto.
2. Importa um vídeo (mp4/webm) ou uma demo `.dem`.
3. Na demo, espera a leitura (a página pode ficar parada alguns segundos; demos grandes ~200 MB demoram mais e usam bastante memória, por isso usa um PC).

## Notas técnicas

- Posições amostradas a 4 vezes por segundo (a cada 16 ticks) e interpoladas na reprodução.
- Radar: `px = (X - pos_x) / scale`, `py = (pos_y - Y) / scale`, sobre imagens de 1024×1024. O piso inferior usa o limiar de altitude de `radars.json` (`th`).
- Os dados do navegador podem ser apagados pelo utilizador ou pelo sistema: a exportação de cópias de segurança está prevista (fase 6).

## Créditos e licenças

- Parser de demos: [`@counterstrat/demoparser`](https://www.npmjs.com/package/@counterstrat/demoparser) (MIT), baseado no demoparser2 de LaihoE.
- Imagens de radar e calibração: extraídas do repositório [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons). Os radares são conteúdo da Valve; este projeto não é afiliado nem aprovado pela Valve. Uso pessoal.
