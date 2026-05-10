export const CARCASSONNE_TILES = {
  starter: { id: 'starter', edges: ['C','R','F','R'], count: 1, conn: { C: [[0]], R: [[1,3]], F: [[2]] }, shields: 0 },
  C4_shield: { id: 'C4_shield', edges: ['C','C','C','C'], count: 1, conn: { C: [[0,1,2,3]], F: [] }, shields: 1 },
  C3_shield: { id: 'C3_shield', edges: ['C','C','F','C'], count: 1, conn: { C: [[0,1,3]], F: [[2]] }, shields: 1 },
  C3: { id: 'C3', edges: ['C','C','F','C'], count: 2, conn: { C: [[0,1,3]], F: [[2]] }, shields: 0 },
  C3_garden: { id: 'C3_garden', edges: ['C','C','F','C'], count: 1, conn: { C: [[0,1,3]], F: [[2]] }, shields: 0, hasGarden: true },
  C3_R_shield: { id: 'C3_R_shield', edges: ['C','C','R','C'], count: 2, conn: { C: [[0,1,3]], R: [[2]], F: [] }, shields: 1 },
  C3_R: { id: 'C3_R', edges: ['C','C','R','C'], count: 1, conn: { C: [[0,1,3]], R: [[2]], F: [] }, shields: 0 },
  C2_opp: { id: 'C2_opp', edges: ['C','F','C','F'], count: 2, conn: { C: [[0],[2]], F: [[1],[3]] }, shields: 0 }, 
  C2_opp_garden: { id: 'C2_opp_garden', edges: ['C','F','C','F'], count: 1, conn: { C: [[0],[2]], F: [[1],[3]] }, shields: 0, hasGarden: true },
  C2_adj_shield: { id: 'C2_adj_shield', edges: ['C','C','F','F'], count: 2, conn: { C: [[0,1]], F: [[2,3]] }, shields: 1 }, 
  C2_adj: { id: 'C2_adj', edges: ['C','C','F','F'], count: 2, conn: { C: [[0,1]], F: [[2,3]] }, shields: 0 },
  C2_adj_garden: { id: 'C2_adj_garden', edges: ['C','C','F','F'], count: 1, conn: { C: [[0,1]], F: [[2,3]] }, shields: 0, hasGarden: true },
  C2_sep: { id: 'C2_sep', edges: ['C','F','F','C'], count: 2, conn: { C: [[0],[3]], F: [[1,2]] }, shields: 0 }, 
  C1: { id: 'C1', edges: ['C','F','F','F'], count: 4, conn: { C: [[0]], F: [[1,2,3]] }, shields: 0 },
  C1_garden: { id: 'C1_garden', edges: ['C','F','F','F'], count: 1, conn: { C: [[0]], F: [[1,2,3]] }, shields: 0, hasGarden: true },
  C1_R_straight: { id: 'C1_R_straight', edges: ['C','R','F','R'], count: 2, conn: { C: [[0]], R: [[1,3]], F: [[2]] }, shields: 0 },
  C1_R_straight_garden: { id: 'C1_R_straight_garden', edges: ['C','R','F','R'], count: 1, conn: { C: [[0]], R: [[1,3]], F: [[2]] }, shields: 0, hasGarden: true },
  C1_R_curve_right: { id: 'C1_R_curve_right', edges: ['C','R','R','F'], count: 3, conn: { C: [[0]], R: [[1,2]], F: [[3]] }, shields: 0 },
  C1_R_curve_left: { id: 'C1_R_curve_left', edges: ['C','F','R','R'], count: 3, conn: { C: [[0]], R: [[2,3]], F: [[1]] }, shields: 0 },
  C1_R_cross_3: { id: 'C1_R_cross_3', edges: ['C','R','R','R'], count: 3, conn: { C: [[0]], R: [[1],[2],[3]], F: [] }, shields: 0 }, 
  R_straight: { id: 'R_straight', edges: ['F','R','F','R'], count: 6, conn: { R: [[1,3]], F: [[0],[2]] }, shields: 0 },
  R_straight_garden: { id: 'R_straight_garden', edges: ['F','R','F','R'], count: 2, conn: { R: [[1,3]], F: [[0],[2]] }, shields: 0, hasGarden: true },
  R_curve: { id: 'R_curve', edges: ['F','F','R','R'], count: 8, conn: { R: [[2,3]], F: [[0,1]] }, shields: 0 },
  R_curve_garden: { id: 'R_curve_garden', edges: ['F','F','R','R'], count: 1, conn: { R: [[2,3]], F: [[0,1]] }, shields: 0, hasGarden: true },
  R_cross_4: { id: 'R_cross_4', edges: ['R','R','R','R'], count: 1, conn: { R: [[0],[1],[2],[3]], F: [] }, shields: 0 },
  R_cross_3: { id: 'R_cross_3', edges: ['F','R','R','R'], count: 4, conn: { R: [[1],[2],[3]], F: [[0]] }, shields: 0 },
  Cloister: { id: 'Cloister', edges: ['F','F','F','F'], count: 4, special: 'cloister', conn: { F: [[0,1,2,3]] }, shields: 0 },
  Cloister_R: { id: 'Cloister_R', edges: ['F','F','R','F'], count: 2, special: 'cloister', conn: { R: [[2]], F: [[0,1,3]] }, shields: 0 },
};

export const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7'];

export const getRotatedEdges = (edges, rotation) => {
  const steps = rotation % 4; const newEdges = [];
  for (let i = 0; i < 4; i++) newEdges[i] = edges[(i - steps + 4) % 4];
  return newEdges;
};

export const generateDeck = () => {
  let deck = [];
  for (const [key, tile] of Object.entries(CARCASSONNE_TILES)) {
    if (key === 'starter') continue;
    for (let i = 0; i < tile.count; i++) deck.push({ id: `${key}_${i}`, type: key });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const runDFS = (boardData, startCoord, startEdge, featType) => {
  let queue = [{ coord: startCoord, edge: startEdge }];
  let visitedEdges = new Set(); let featTiles = new Set(); let featMeeples = []; let isComplete = true;

  while(queue.length > 0) {
      let curr = queue.shift(); let key = `${curr.coord}-${curr.edge}`;
      if(visitedEdges.has(key)) continue; visitedEdges.add(key);

      if (!boardData[curr.coord]) { isComplete = false; continue; }
      featTiles.add(curr.coord);

      let tileData = boardData[curr.coord]; let tileDef = CARCASSONNE_TILES[tileData.type];
      let rot = tileData.rotation; let origEdge = (curr.edge - rot + 4) % 4;
      
      let connectedOrigEdges = [origEdge];
      if(tileDef.conn[featType]) {
          for(let group of tileDef.conn[featType]) { if(group.includes(origEdge)) { connectedOrigEdges = group; break; } }
      }

      let connectedRotEdges = connectedOrigEdges.map(e => (e + rot) % 4);

      (tileData.meeples || []).forEach((m, idx) => {
          if (m.position === 'center' || m.position === 'garden') return; 
          let mEdge = { 'top': 0, 'right': 1, 'bottom': 2, 'left': 3 }[m.position];
          if (connectedRotEdges.includes(mEdge)) {
              if (!featMeeples.find(fm => fm.coord === curr.coord && fm.mIndex === idx)) featMeeples.push({ player: m.player, coord: curr.coord, mIndex: idx, type: m.type });
          }
      });

      for(let rotEdge of connectedRotEdges) {
          visitedEdges.add(`${curr.coord}-${rotEdge}`);
          let [x, y] = curr.coord.split(',').map(Number);
          if(rotEdge===0) y-=1; if(rotEdge===1) x+=1; if(rotEdge===2) y+=1; if(rotEdge===3) x-=1;
          let nCoord = `${x},${y}`; let targetEdge = (rotEdge + 2) % 4;

          if (!boardData[nCoord]) { isComplete = false; } 
          else if(!visitedEdges.has(`${nCoord}-${targetEdge}`)) { queue.push({ coord: nCoord, edge: targetEdge }); }
      }
  }
  return { isComplete, featTiles, featMeeples, traversedEdges: visitedEdges };
};

export const autoScoreBoard = (boardData, playersData) => {
  let b = JSON.parse(JSON.stringify(boardData)); let p = JSON.parse(JSON.stringify(playersData)); let visitedFeatures = new Set();

  for (const coord of Object.keys(b)) {
      const tile = b[coord]; const tileDef = CARCASSONNE_TILES[tile.type];
      if (tileDef.special === 'cloister' || tileDef.hasGarden) {
          const cIdx = tile.meeples.findIndex(m => m.position === 'center' || m.position === 'garden');
          if (cIdx !== -1) {
              const [x, y] = coord.split(',').map(Number); let count = 0;
              for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++) if(b[`${x+dx},${y+dy}`]) count++;
              if (count === 9) { 
                  const m = tile.meeples[cIdx]; const pIdx = p.findIndex(pl => pl.id === m.player);
                  if(pIdx !== -1) { p[pIdx].score += 9; if (m.type === 'abbot') p[pIdx].abbots++; else p[pIdx].meeples++; }
                  b[coord].meeples.splice(cIdx, 1);
              }
          }
      }

      for (let i=0; i<4; i++) {
          let rot = tile.rotation; let origEdge = (i - rot + 4) % 4; let featType = tileDef.edges[origEdge];
          if ((featType === 'C' || featType === 'R') && !visitedFeatures.has(`${coord}-${i}`)) {
              let { isComplete, featTiles, featMeeples, traversedEdges } = runDFS(b, coord, i, featType);
              traversedEdges.forEach(e => visitedFeatures.add(e));
              if (isComplete && featMeeples.length > 0) {
                  let shieldCount = 0; featTiles.forEach(c => { shieldCount += CARCASSONNE_TILES[b[c].type].shields || 0; });
                  const pts = (featTiles.size + shieldCount) * (featType === 'C' ? 2 : 1);
                  let counts = {}; featMeeples.forEach(m => { counts[m.player] = (counts[m.player] || 0) + 1; });
                  let maxMeeples = Math.max(...Object.values(counts)); let winners = Object.keys(counts).filter(id => counts[id] === maxMeeples);
                  winners.forEach(wId => { const pIdx = p.findIndex(pl => pl.id === wId); if(pIdx !== -1) p[pIdx].score += pts; });

                  let meeplesToRemove = {}; 
                  featMeeples.forEach(m => {
                      if(!meeplesToRemove[m.coord]) meeplesToRemove[m.coord] = [];
                      meeplesToRemove[m.coord].push(m.mIndex);
                      const pIdx = p.findIndex(pl => pl.id === m.player);
                      if(pIdx !== -1) { if (m.type === 'abbot') p[pIdx].abbots++; else p[pIdx].meeples++; }
                  });
                  for(let c in meeplesToRemove) meeplesToRemove[c].sort((a,b)=>b-a).forEach(idx => { b[c].meeples.splice(idx, 1); });
              }
          }
      }
  }
  return { updatedBoard: b, updatedPlayers: p };
};

export const performFinalScoring = (boardData, playersData) => {
  let b = JSON.parse(JSON.stringify(boardData));
  let p = JSON.parse(JSON.stringify(playersData));

  // 1. 結算未完成地形
  for (const coord of Object.keys(b)) {
      for (let i = b[coord].meeples.length - 1; i >= 0; i--) {
          const m = b[coord].meeples[i];
          if (!m.isFarmer) {
              let score = 0;
              const tile = b[coord]; const tileDef = CARCASSONNE_TILES[tile.type];
              if (m.position === 'center' || m.position === 'garden') {
                  const [x, y] = coord.split(',').map(Number);
                  for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++) if(b[`${x+dx},${y+dy}`]) score++;
              } else {
                  const mEdge = { 'top': 0, 'right': 1, 'bottom': 2, 'left': 3 }[m.position];
                  if (mEdge !== undefined) {
                      let origEdge = (mEdge - tile.rotation + 4) % 4; let featType = tileDef.edges[origEdge];
                      if (featType === 'C' || featType === 'R') {
                          let { featTiles } = runDFS(b, coord, mEdge, featType);
                          let shieldCount = 0; featTiles.forEach(c => { shieldCount += CARCASSONNE_TILES[b[c].type].shields || 0; });
                          score = featTiles.size + shieldCount;
                      }
                  }
              }
              const pIdx = p.findIndex(pl => pl.id === m.player);
              if (pIdx !== -1) p[pIdx].score += score;
              b[coord].meeples.splice(i, 1); 
          }
      }
  }

  // 2. 結算農夫
  let visitedFieldEdges = new Set();
  for (const coord of Object.keys(b)) {
      const tile = b[coord]; const tileDef = CARCASSONNE_TILES[tile.type];
      for (let edge = 0; edge < 4; edge++) {
          let rot = tile.rotation; let origEdge = (edge - rot + 4) % 4;
          if (tileDef.edges[origEdge] === 'F' && !visitedFieldEdges.has(`${coord}-${edge}`)) {
              let { featTiles, featMeeples, traversedEdges } = runDFS(b, coord, edge, 'F');
              traversedEdges.forEach(e => visitedFieldEdges.add(e));

              if (featMeeples.length > 0) {
                  let touchingCities = new Set();
                  featTiles.forEach(fCoord => {
                      const fTile = b[fCoord]; const fTileDef = CARCASSONNE_TILES[fTile.type];
                      let touches = true;
                      if (fTileDef.id === 'starter' || fTileDef.id.startsWith('C1_R_straight')) touches = false;
                      
                      if (touches) {
                          for (let cEdge = 0; cEdge < 4; cEdge++) {
                              let cOrig = (cEdge - fTile.rotation + 4) % 4;
                              if (fTileDef.edges[cOrig] === 'C') {
                                  let cityDFS = runDFS(b, fCoord, cEdge, 'C');
                                  if (cityDFS.isComplete) touchingCities.add(Array.from(cityDFS.traversedEdges).sort().join('|'));
                              }
                          }
                      }
                  });

                  const points = touchingCities.size * 3; 
                  let counts = {};
                  featMeeples.forEach(m => { counts[m.player] = (counts[m.player] || 0) + 1; });
                  let maxMeeples = Math.max(...Object.values(counts));
                  let winners = Object.keys(counts).filter(id => counts[id] === maxMeeples);

                  winners.forEach(wId => {
                      const pIdx = p.findIndex(pl => pl.id === wId);
                      if (pIdx !== -1) p[pIdx].score += points;
                  });

                  featMeeples.forEach(m => {
                      const mTile = b[m.coord];
                      const mIdx = mTile.meeples.findIndex(x => x.player === m.player && x.isFarmer);
                      if (mIdx !== -1) mTile.meeples.splice(mIdx, 1);
                  });
              }
          }
      }
  }

  p.sort((a, b) => b.score - a.score);
  return { finalBoard: b, finalPlayers: p };
};
