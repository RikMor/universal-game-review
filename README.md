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
  - piso superior/inferior (Nuke, Train, Vertigo…).
- Radares incluídos para 25 mapas (ver `assets/radars/radars.json`).

## Ainda não existe

- Deadlock (o `.dem` é Source 2, deve usar o mesmo parser; falta testar e ter o radar).
- Vista 3D com o mapa texturizado.
- Desenhos, gravação de voz, treinos múltiplos por partida, exportação PDF/vídeo/projeto (fases 3–9 do plano).

## Estrutura

```
index.html                 página única (hash routing: #cs2, #cs2/<projeto>)
css/style.css              estilos (tema claro/escuro automático)
js/app.js                  rotas, IndexedDB, biblioteca, leitor de vídeo e marcadores
js/demo-viewer.js          leitura da demo, radar 2D e interface de reprodução
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
