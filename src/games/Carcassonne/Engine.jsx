import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Play, RotateCw, Check, Trophy, Users, Plus, Trash2, X, AlertTriangle, RefreshCcw, Award, ZoomIn, ZoomOut, Eye, Settings, PowerOff, ShieldAlert, BookOpen } from 'lucide-react';
import { CARCASSONNE_TILES, getRotatedEdges, autoScoreBoard, performFinalScoring } from './data';

export default function CarcassonneEngine({ roomId, roomData, userId }) {
  const navigate = useNavigate();
  const [localRotation, setLocalRotation] = useState(0); 
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pendingPlacement, setPendingPlacement] = useState(null); 
  const [activeMeepleType, setActiveMeepleType] = useState('normal'); 
  const [showGameOverModal, setShowGameOverModal] = useState(true);
  
  // 規則說明視窗狀態
  const [showRulesModal, setShowRulesModal] = useState(false);

  // 房主控制狀態
  const [showHostMenu, setShowHostMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); 

  const boardRef = useRef(null);

  // 加上預設值，避免 Firebase 剛建立資料但尚未同步完整時，發生 undefined 導致全白畫面 (WSOD)
  const { 
    board = {}, 
    deck = [], 
    currentPhase = 'loading', 
    currentDrawnTile = null, 
    players = [], 
    turnIndex = 0, 
    lastPlacedCoord = null 
  } = roomData || {};

  // 安全取值
  const activePlayer = players[turnIndex] || players[0] || {};
  const isMyTurn = activePlayer.id === userId;
  const isHost = roomData?.host === userId; 
  const dbDocRef = doc(db, 'rooms_carcassonne', roomId);

  const validPlacements = useMemo(() => {
    if (!currentDrawnTile || currentPhase !== 'place_tile') return [];
    const getValidSpotsForRotation = (board, tileDef, rotation) => {
        if (!tileDef) return [];
        const rotatedEdges = getRotatedEdges(tileDef.edges, rotation);
        const validSpots = []; const checkedSpots = new Set();
        Object.keys(board).forEach(coord => {
            const [x, y] = coord.split(',').map(Number);
            const neighbors = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
            neighbors.forEach(n => {
                const nx = x + n.dx; const ny = y + n.dy; const key = `${nx},${ny}`;
                if (board[key] || checkedSpots.has(key)) return;
                checkedSpots.add(key);
                let isValid = true; let hasAnyNeighbor = false;
                const spotNeighbors = [ { dx: 0, dy: -1, myEdge: 0, targetEdge: 2 }, { dx: 1, dy: 0, myEdge: 1, targetEdge: 3 }, { dx: 0, dy: 1, myEdge: 2, targetEdge: 0 }, { dx: -1, dy: 0, myEdge: 3, targetEdge: 1 } ];
                for (let sn of spotNeighbors) {
                    const neighborTileData = board[`${nx + sn.dx},${ny + sn.dy}`];
                    if (neighborTileData) {
                        hasAnyNeighbor = true; const nEdges = getRotatedEdges(CARCASSONNE_TILES[neighborTileData.type].edges, neighborTileData.rotation);
                        if (rotatedEdges[sn.myEdge] !== nEdges[sn.targetEdge]) { isValid = false; break; }
                    }
                }
                if (isValid && hasAnyNeighbor) validSpots.push(key);
            });
        });
        return validSpots;
    };
    return getValidSpotsForRotation(board, CARCASSONNE_TILES[currentDrawnTile.type], localRotation);
  }, [board, currentDrawnTile, localRotation, currentPhase]);

  const isCompletelyUnplayable = useMemo(() => {
    if (!currentDrawnTile || currentPhase !== 'place_tile') return false;
    const tileDef = CARCASSONNE_TILES[currentDrawnTile.type];
    if (!tileDef) return false;
    const checkValid = (rotation) => {
        const rotatedEdges = getRotatedEdges(tileDef.edges, rotation);
        for (const coord of Object.keys(board)) {
            const [x, y] = coord.split(',').map(Number);
            const nDirs = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
            for(let n of nDirs) {
                const nx = x + n.dx; const ny = y + n.dy; const key = `${nx},${ny}`;
                if (board[key]) continue;
                let isValid = true; let hasAnyNeighbor = false;
                const snDirs = [ { dx: 0, dy: -1, myEdge: 0, targetEdge: 2 }, { dx: 1, dy: 0, myEdge: 1, targetEdge: 3 }, { dx: 0, dy: 1, myEdge: 2, targetEdge: 0 }, { dx: -1, dy: 0, myEdge: 3, targetEdge: 1 } ];
                for (let sn of snDirs) {
                    const nData = board[`${nx + sn.dx},${ny + sn.dy}`];
                    if (nData) {
                        hasAnyNeighbor = true; const nEdges = getRotatedEdges(CARCASSONNE_TILES[nData.type].edges, nData.rotation);
                        if (rotatedEdges[sn.myEdge] !== nEdges[sn.targetEdge]) { isValid = false; break; }
                    }
                }
                if (isValid && hasAnyNeighbor) return true;
            }
        }
        return false;
    }
    for (let r = 0; r < 4; r++) if (checkValid(r)) return false;
    return true; 
  }, [board, currentDrawnTile, currentPhase]);

  const isFeatureOccupied = (boardData, startCoord, startEdge) => {
      let visited = new Set(); let queue = [{ coord: startCoord, edge: startEdge }];
      const getNeighborCoord = (c, e) => {
          let [x, y] = c.split(',').map(Number);
          if (e === 0) return `${x},${y-1}`; if (e === 1) return `${x+1},${y}`; if (e === 2) return `${x},${y+1}`; if (e === 3) return `${x-1},${y}`; return null;
      };
      while(queue.length > 0) {
          let curr = queue.shift(); let key = `${curr.coord}-${curr.edge}`;
          if(visited.has(key)) continue; visited.add(key);
          let tileData = boardData[curr.coord]; if(!tileData) continue;
          let tileDef = CARCASSONNE_TILES[tileData.type];
          if (!tileDef) continue;
          let rot = tileData.rotation; let origEdge = (curr.edge - rot + 4) % 4; let featType = tileDef.edges[origEdge]; 
          let connectedOrigEdges = [origEdge];
          if(tileDef.conn[featType]) {
              for(let group of tileDef.conn[featType]) { if(group.includes(origEdge)) { connectedOrigEdges = group; break; } }
          }
          let connectedRotEdges = connectedOrigEdges.map(e => (e + rot) % 4);
          for(let m of (tileData.meeples || [])) {
              if (m.position === 'center' || m.position === 'garden') continue; 
              let mEdge = { 'top': 0, 'right': 1, 'bottom': 2, 'left': 3 }[m.position];
              if (connectedRotEdges.includes(mEdge)) return true;
          }
          for(let rotEdge of connectedRotEdges) {
              visited.add(`${curr.coord}-${rotEdge}`);
              let nCoord = getNeighborCoord(curr.coord, rotEdge); let tEdge = (rotEdge + 2) % 4; 
              if(boardData[nCoord] && !visited.has(`${nCoord}-${tEdge}`)) queue.push({ coord: nCoord, edge: tEdge });
          }
      }
      return false;
  };

  const validMeeplePositions = useMemo(() => {
      if (!isMyTurn || currentPhase !== 'place_meeple' || !lastPlacedCoord) return [];
      const tileData = board[lastPlacedCoord]; if(!tileData) return [];
      const tileDef = CARCASSONNE_TILES[tileData.type]; 
      if (!tileDef) return [];
      
      const rot = tileData.rotation;
      const positions = []; const checkedGroups = new Set(); 
      for (let i=0; i<4; i++) {
           let origEdge = (i - rot + 4) % 4; let featType = tileDef.edges[origEdge];
           if (featType === 'C' || featType === 'R' || featType === 'F') {
               let groupKey = `${featType}-${origEdge}`;
               if(tileDef.conn[featType]) for(let group of tileDef.conn[featType]) if(group.includes(origEdge)) { groupKey = `${featType}-${group.join(',')}`; break; }
               if (!checkedGroups.has(groupKey)) {
                   checkedGroups.add(groupKey);
                   if (!isFeatureOccupied(board, lastPlacedCoord, i)) positions.push({ pos: ['top', 'right', 'bottom', 'left'][i], type: featType });
               }
           }
      }
      if (tileDef.special === 'cloister') positions.push({ pos: 'center', type: 'M' });
      if (tileDef.hasGarden) positions.push({ pos: 'garden', type: 'G' });

      return positions.filter(obj => {
          if (activeMeepleType === 'abbot') return obj.type === 'M' || obj.type === 'G';
          if (activeMeepleType === 'normal') return obj.type !== 'G';
          return false;
      });
  }, [board, currentPhase, isMyTurn, lastPlacedCoord, activeMeepleType]);

  const handlePointerDown = (e) => {
    if (e.target.closest('.interactive-btn') || e.target.closest('.game-ui') || showRulesModal) return;
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };
  const handlePointerUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    if (showRulesModal) return;
    setScale(s => Math.min(Math.max(0.3, s - e.deltaY * 0.0015), 2.5));
  };

  const drawTile = async () => {
    if (!isMyTurn || currentPhase !== 'draw' || deck.length === 0) return;
    const newDeck = [...deck];
    await updateDoc(dbDocRef, { deck: newDeck, currentDrawnTile: newDeck.pop(), currentPhase: 'place_tile' });
    setLocalRotation(0); setPendingPlacement(null); setActiveMeepleType('normal');
  };

  const triggerGameEnd = async (currentBoard, currentPlayers) => {
      const { finalBoard, finalPlayers } = performFinalScoring(currentBoard, currentPlayers);
      await updateDoc(dbDocRef, { board: finalBoard, players: finalPlayers, currentPhase: 'game_over', status: 'game_over', currentDrawnTile: null });
      setShowGameOverModal(true);
  };

  const discardAndRedraw = async () => {
    if (!isMyTurn || currentPhase !== 'place_tile') return;
    const newDeck = [...deck];
    if (newDeck.length === 0) {
       await triggerGameEnd(board, players);
       return;
    }
    await updateDoc(dbDocRef, { deck: newDeck, currentDrawnTile: newDeck.pop() }); setLocalRotation(0);
  };

  const confirmTilePlacement = async () => {
    if (!isMyTurn || currentPhase !== 'place_tile' || !pendingPlacement) return;
    const newBoard = { ...board, [pendingPlacement]: { type: currentDrawnTile.type, rotation: localRotation, owner: userId, meeples: [] } };
    const me = players.find(p => p.id === userId);
    if (me && me.meeples === 0 && me.abbots > 0) setActiveMeepleType('abbot');
    await updateDoc(dbDocRef, { board: newBoard, currentPhase: 'place_meeple', lastPlacedCoord: pendingPlacement });
    setPendingPlacement(null);
  };

  const processNextTurnOrEnd = async (newBoard, newPlayers) => {
      if (deck.length === 0) {
          await triggerGameEnd(newBoard, newPlayers);
      } else {
          await updateDoc(dbDocRef, { board: newBoard, players: newPlayers, currentPhase: 'draw', currentDrawnTile: null, turnIndex: (turnIndex + 1) % players.length });
      }
  };

  const placeMeeple = async (coordStr, positionObj) => {
    if (!isMyTurn || currentPhase !== 'place_meeple') return;
    const mePlayerIndex = players.findIndex(p => p.id === userId);
    if (activeMeepleType === 'normal' && players[mePlayerIndex].meeples <= 0) return;
    if (activeMeepleType === 'abbot' && players[mePlayerIndex].abbots <= 0) return;

    const newMeeples = [...(board[coordStr].meeples || []), { player: userId, color: activePlayer.color, position: positionObj.pos, isFarmer: positionObj.type === 'F', type: activeMeepleType }];
    const newBoard = { ...board, [coordStr]: { ...board[coordStr], meeples: newMeeples } };
    
    let newPlayers = players.map(p => {
        if (p.id === userId) return { ...p, meeples: activeMeepleType === 'normal' ? p.meeples - 1 : p.meeples, abbots: activeMeepleType === 'abbot' ? p.abbots - 1 : p.abbots };
        return p;
    });

    const scoredData = autoScoreBoard(newBoard, newPlayers);
    await processNextTurnOrEnd(scoredData.updatedBoard, scoredData.updatedPlayers);
  };

  const skipMeeplePhase = async () => {
    if (!isMyTurn || currentPhase !== 'place_meeple') return;
    const scoredData = autoScoreBoard(board, players);
    await processNextTurnOrEnd(scoredData.updatedBoard, scoredData.updatedPlayers);
  };

  const recallAbbot = async () => {
    if (!isMyTurn || currentPhase !== 'place_meeple') return;
    let abbotCoord = null; let abbotIndex = -1;
    for (const coord of Object.keys(board)) {
        const idx = board[coord].meeples.findIndex(m => m.player === userId && m.type === 'abbot');
        if (idx !== -1) { abbotCoord = coord; abbotIndex = idx; break; }
    }
    if (!abbotCoord) return;

    const [x, y] = abbotCoord.split(',').map(Number);
    let score = 0;
    for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++) if(board[`${x+dx},${y+dy}`]) score++;

    let newBoard = { ...board, [abbotCoord]: { ...board[abbotCoord], meeples: board[abbotCoord].meeples.filter((_, i) => i !== abbotIndex) } };
    let newPlayers = players.map(p => {
        if (p.id === userId) return { ...p, score: p.score + score, abbots: p.abbots + 1 };
        return p;
    });

    const scoredData = autoScoreBoard(newBoard, newPlayers);
    await processNextTurnOrEnd(scoredData.updatedBoard, scoredData.updatedPlayers);
  };

  const myAbbotOnBoard = useMemo(() => {
      for (const coord of Object.keys(board)) if (board[coord].meeples.some(m => m.player === userId && m.type === 'abbot')) return true;
      return false;
  }, [board, userId]);

  const forceEndGame = async () => {
    setConfirmModal(null);
    setShowHostMenu(false);
    await triggerGameEnd(board, players);
  };

  const forceCloseRoom = async () => {
    setConfirmModal(null);
    setShowHostMenu(false);
    await deleteDoc(dbDocRef); 
  };

  const renderTileSVG = (type, rotation, isGhost = false) => {
    const tileDef = CARCASSONNE_TILES[type];
    if (!tileDef) return null;
    const rotDeg = rotation * 90;

    const cGrass = '#a7c97e', cGrassDark = '#8aab69';
    const cRoadEdge = '#b5ad9e', cRoadCenter = '#ebe6de';
    const cCityBase = '#e2cda3', cCityWall = '#8b6045';

    const renderCityGroup = (group, hasShield) => {
        let pathD = ""; let shieldPos = {x: 50, y: 50}; let gRot = 0;
        if (group.length === 1) { gRot = group[0] * 90; pathD = "M 0 0 L 100 0 L 85 30 C 65 40, 35 40, 15 30 Z"; shieldPos = {x: 50, y: 20}; } 
        else if (group.length === 2) {
            if (Math.abs(group[0] - group[1]) === 2) { gRot = group[0] * 90; pathD = "M 0 0 L 100 0 L 100 20 L 0 20 Z M 0 100 L 100 100 L 100 80 L 0 80 Z"; } 
            else { let is03 = (group.includes(0) && group.includes(3)); gRot = is03 ? 270 : Math.min(group[0], group[1]) * 90; pathD = "M 0 0 L 100 0 L 100 100 C 50 100, 0 50, 0 0 Z"; shieldPos = {x: 65, y: 35}; }
        } 
        else if (group.length === 3) { let missing = [0,1,2,3].find(e => !group.includes(e)); gRot = ((missing + 2) % 4) * 90; pathD = "M 0 100 L 0 0 L 100 0 L 100 100 C 75 65, 25 65, 0 100 Z"; shieldPos = {x: 50, y: 35}; } 
        else if (group.length === 4) { pathD = "M 0 0 L 100 0 L 100 100 L 0 100 Z"; }

        return (
            <g transform={`rotate(${gRot} 50 50)`}>
                <path d={pathD} fill={cCityBase} stroke={cCityWall} strokeWidth="4" strokeLinejoin="round" />
                {hasShield && (
                    <g transform={`translate(${shieldPos.x - 10}, ${shieldPos.y - 12}) scale(0.6)`}>
                        <path d="M 0 0 L 30 0 L 30 20 C 30 35, 15 45, 15 45 C 15 45, 0 35, 0 20 Z" fill="#2563eb" stroke="#fff" strokeWidth="4"/>
                        <path d="M 5 5 L 25 5 L 25 15 C 25 25, 15 35, 15 35 C 15 35, 5 25, 5 15 Z" fill="#93c5fd" />
                    </g>
                )}
            </g>
        );
    };

    const renderRoadGroup = (group) => {
        let gRot = 0; let pathOut = "";
        if (group.length === 2) {
            if (Math.abs(group[0] - group[1]) === 2) { gRot = group[0] * 90; pathOut = "M 50 0 L 50 100"; } 
            else { let is03 = (group.includes(0) && group.includes(3)); gRot = is03 ? 270 : Math.min(group[0], group[1]) * 90; pathOut = "M 50 0 Q 50 50 100 50"; }
        } else if (group.length === 1) { gRot = group[0] * 90; pathOut = "M 50 0 L 50 50"; }
        return (
            <g transform={`rotate(${gRot} 50 50)`}>
                <path d={pathOut} fill="none" stroke={cRoadEdge} strokeWidth="20" strokeLinecap="butt" />
                <path d={pathOut} fill="none" stroke={cRoadCenter} strokeWidth="14" strokeLinecap="butt" />
            </g>
        );
    };

    return (
      <svg viewBox="0 0 100 100" className={`w-full h-full ${isGhost ? 'opacity-80 drop-shadow-lg' : ''}`} style={{ transform: `rotate(${rotDeg}deg)`, transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <defs>
          <pattern id="grass" patternUnits="userSpaceOnUse" width="25" height="25">
            <rect width="25" height="25" fill={cGrass} />
            <circle cx="5" cy="5" r="1.5" fill={cGrassDark} opacity="0.6"/>
            <path d="M 12 20 Q 14 16 16 20" stroke={cGrassDark} fill="none" opacity="0.5" strokeWidth="1.5"/>
            <path d="M 18 10 Q 20 6 22 10" stroke={cGrassDark} fill="none" opacity="0.3" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grass)" />
        <rect width="100" height="100" fill="none" stroke="#799958" strokeWidth="0.5" /> 
        {tileDef.conn.R?.map((group, idx) => <React.Fragment key={`road-${idx}`}>{renderRoadGroup(group)}</React.Fragment>)}
        {tileDef.id.includes('cross') && <rect x={40} y={40} width={20} height={20} fill={cRoadEdge} />}
        {tileDef.id.includes('cross') && <rect x={43} y={43} width={14} height={14} fill={cRoadCenter} />}
        {tileDef.conn.C?.map((group, idx) => <React.Fragment key={`city-${idx}`}>{renderCityGroup(group, idx === 0 && tileDef.shields > 0)}</React.Fragment>)}
        {tileDef.special === 'cloister' && (
          <g transform="translate(50, 50)">
            <circle cx="0" cy="0" r="22" fill="#c4ad8d" />
            <circle cx="0" cy="0" r="18" fill="none" stroke="#a38f72" strokeWidth="1" strokeDasharray="3 3"/>
            <rect x="-14" y="-12" width="28" height="26" fill="#cfcdca" stroke="#5c5c5c" strokeWidth="2" rx="2" />
            <rect x="-6" y="2" width="12" height="12" fill="#8c8b88" /> 
            <path d="M -16 0 L 0 -16 L 16 0 Z" fill="#b04331" stroke="#5c5c5c" strokeWidth="2" strokeLinejoin="round" />
            <rect x="-2" y="-22" width="4" height="10" fill="#333" />
            <path d="M 0 -25 L 0 -17 M -4 -21 L 4 -21" stroke="#ecc749" strokeWidth="2.5" />
          </g>
        )}
        {tileDef.hasGarden && (
          <g transform="translate(25, 25)">
            <circle cx="0" cy="0" r="14" fill="#15803d" />
            <circle cx="0" cy="0" r="11" fill="#22c55e" />
            <circle cx="-5" cy="-5" r="2.5" fill="#fbbf24" />
            <circle cx="5" cy="3" r="2.5" fill="#3b82f6" />
            <circle cx="-3" cy="6" r="2" fill="#ef4444" />
            <circle cx="4" cy="-4" r="1.5" fill="#a855f7" />
          </g>
        )}
      </svg>
    );
  };

  const MeepleIcon = ({ color, size = 24, isAbbot = false }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(2px 4px 2px rgba(0,0,0,0.5))' }}>
      <path d={isAbbot ? "M 50 5 C 62 5 65 18 65 25 C 65 32 60 38 50 40 L 80 60 C 85 63 85 70 80 75 L 65 70 L 65 95 C 65 100 55 100 55 95 L 50 75 L 45 95 C 45 100 35 100 35 95 L 35 70 L 20 75 C 15 70 15 63 20 60 L 50 40 C 40 38 35 32 35 25 C 35 18 38 5 50 5 Z" : "M 50 10 C 60 10 65 18 65 25 C 65 32 60 38 50 40 L 80 60 C 85 63 85 70 80 75 L 65 70 L 65 90 C 65 95 55 95 55 90 L 50 70 L 45 90 C 45 95 35 95 35 90 L 35 70 L 20 75 C 15 70 15 63 20 60 L 50 40 C 40 38 35 32 35 25 C 35 18 40 10 50 10 Z"} fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M 45 15 C 50 15 55 20 55 25" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {isAbbot && <path d="M 50 35 L 50 60 M 40 45 L 60 45" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" />}
    </svg>
  );

  const getMeeplePositionStyle = (pos, isFarmer = false, rotation = 0) => {
    let base = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    if (pos === 'top') base = { top: '15%', left: '50%', transform: 'translate(-50%, -50%)' };
    else if (pos === 'bottom') base = { top: '85%', left: '50%', transform: 'translate(-50%, -50%)' };
    else if (pos === 'left') base = { top: '50%', left: '15%', transform: 'translate(-50%, -50%)' };
    else if (pos === 'right') base = { top: '50%', left: '85%', transform: 'translate(-50%, -50%)' };
    else if (pos === 'garden') {
        let gTop = '25%', gLeft = '25%';
        if (rotation === 1) { gTop = '25%'; gLeft = '75%'; }
        if (rotation === 2) { gTop = '75%'; gLeft = '75%'; }
        if (rotation === 3) { gTop = '75%'; gLeft = '25%'; }
        base = { top: gTop, left: gLeft, transform: 'translate(-50%, -50%)' };
    }
    if (isFarmer) base.transform += ' rotate(90deg) scale(0.85)';
    return base;
  };

  const TILE_SIZE = 100;

  // 如果載入階段尚未完成（Firestore 同步中），顯示簡單載入畫面避免全白
  if (currentPhase === 'loading') {
      return <div className="w-full h-screen bg-stone-200 flex items-center justify-center font-bold text-stone-500">正在同步遊戲資料...</div>;
  }

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] bg-[#9c7b5a] flex flex-col shadow-inner select-none touch-none">
      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

      {showRulesModal && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fade-in_0.2s_ease-out]">
          <div className="bg-white max-w-xl w-full h-[80vh] md:h-auto md:max-h-[85vh] rounded-[2rem] shadow-2xl border-4 border-stone-800 flex flex-col overflow-hidden">
            <div className="bg-stone-800 p-5 text-white flex justify-between items-center shrink-0">
               <h2 className="text-2xl font-black flex items-center gap-2"><BookOpen size={24}/> 卡卡頌規則指南</h2>
               <button onClick={() => setShowRulesModal(false)} className="interactive-btn p-2 hover:bg-stone-600 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-stone-700 bg-stone-50">
               <section>
                 <h3 className="text-xl font-black mb-2 text-stone-800 border-b-2 border-stone-200 pb-1">📌 回合流程</h3>
                 <ol className="list-decimal pl-5 space-y-1 font-bold text-stone-600">
                   <li><span className="text-blue-600">翻開版圖：</span>從牌堆抽出一張新版圖。</li>
                   <li><span className="text-blue-600">放置版圖：</span>旋轉並拼接到場上，<strong className="text-red-500">必須與相鄰的所有地形完全吻合</strong>。</li>
                   <li><span className="text-blue-600">派駐親信 (選用)：</span>只能放在剛拼接的這張版圖上。前提是該地形的延伸範圍內 <strong className="text-red-500">沒有其他人的親信</strong>。</li>
                   <li><span className="text-blue-600">計分與回收：</span>若有道路、城堡或修道院因此完成，立即計算分數並收回該處的親信。</li>
                 </ol>
               </section>
               
               <section>
                 <h3 className="text-xl font-black mb-2 text-stone-800 border-b-2 border-stone-200 pb-1">🏰 一般地形計分</h3>
                 <ul className="list-disc pl-5 space-y-2 font-bold text-stone-600">
                   <li><span className="text-stone-800 border-b-2 border-stone-400">道路：</span>兩端皆為路口或城鎮即算完成。每塊版圖 <strong className="text-blue-600">1 分</strong>。</li>
                   <li><span className="text-stone-800 border-b-2 border-yellow-500">城堡：</span>城牆完全封閉即算完成。每塊版圖 <strong className="text-blue-600">2 分</strong>，每個盾牌額外 <strong className="text-blue-600">2 分</strong>。</li>
                   <li><span className="text-stone-800 border-b-2 border-purple-500">修道院：</span>周圍 8 個宮格（連同自己共 9 格）全被包圍即算完成。得 <strong className="text-blue-600">9 分</strong>。</li>
                 </ul>
               </section>

               <section>
                 <h3 className="text-xl font-black mb-2 text-stone-800 border-b-2 border-stone-200 pb-1">🧑‍🌾 擴充規則：農夫與院長</h3>
                 <ul className="list-disc pl-5 space-y-3 font-bold text-stone-600">
                   <li>
                     <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded">農夫 (躺平)：</span>
                     放置在草地上，<strong className="text-red-500">直到遊戲結束前都無法收回</strong>。遊戲結束時，該草地所連接著的每一座「已完成城堡」，可為農夫帶來 <strong className="text-blue-600">3 分</strong>。
                   </li>
                   <li>
                     <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded">修道院長：</span>
                     只能放置在修道院或花園上。在你的回合中，如果選擇「不派駐新親信」，你可以<strong className="text-purple-600">提早收回院長</strong>，並立即獲得當下的版圖數量分數。
                   </li>
                 </ul>
               </section>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-[2rem] shadow-2xl border-4 border-stone-800 text-center animate-[bounce_0.3s_ease-out]">
            <AlertTriangle className="mx-auto text-red-500 w-16 h-16 mb-4" />
            <h3 className="text-2xl font-black mb-2 text-stone-800">
              {confirmModal === 'end_game' ? '提前結算遊戲？' : '強制解散房間？'}
            </h3>
            <p className="text-stone-500 font-bold mb-6">
              {confirmModal === 'end_game' 
                ? '將立刻中斷遊戲，並自動為所有未完成的地形與農夫計分！' 
                : '此操作將刪除房間所有資料，正在遊玩的玩家將被踢回大廳！'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="interactive-btn flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold py-3 rounded-xl transition-colors">取消</button>
              <button onClick={confirmModal === 'end_game' ? forceEndGame : forceCloseRoom} className="interactive-btn flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg">確定執行</button>
            </div>
          </div>
        </div>
      )}

      {currentPhase === 'game_over' && showGameOverModal && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-white max-w-md w-full rounded-[2rem] border-4 border-stone-800 shadow-2xl overflow-hidden animate-[bounce_0.5s_ease-out]">
                <div className="bg-blue-600 p-6 text-center text-white relative overflow-hidden">
                    <Award size={64} className="mx-auto mb-2 text-yellow-300 drop-shadow-md" />
                    <h2 className="text-4xl font-black relative z-10">遊戲結束</h2>
                    <p className="text-sm text-blue-100 font-bold mt-2 relative z-10">已自動結算農夫與未完成地形</p>
                </div>
                <div className="p-6 space-y-4">
                    {players.map((p, idx) => (
                        <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 ${idx === 0 ? 'bg-amber-50 border-amber-300 shadow-md transform scale-105' : 'bg-stone-50 border-stone-200'}`}>
                            <div className={`font-black text-2xl w-8 text-center ${idx === 0 ? 'text-amber-500' : 'text-stone-400'}`}>#{idx + 1}</div>
                            <MeepleIcon color={p.color} size={36} />
                            <div className="flex-1 font-black text-xl text-stone-700">{p.name}</div>
                            <div className="font-black text-3xl text-blue-600">{p.score} <span className="text-sm text-stone-500">分</span></div>
                        </div>
                    ))}
                </div>
                <div className="bg-stone-100 p-4 space-y-2">
                     <button onClick={() => setShowGameOverModal(false)} className="interactive-btn w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                       <Eye size={20}/> 觀賞最終版圖
                     </button>
                     <button onClick={() => navigate('/hub')} className="interactive-btn w-full bg-stone-800 hover:bg-stone-900 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-105">
                       回到大廳
                     </button>
                </div>
            </div>
         </div>
      )}

      <div className="game-ui absolute top-2 left-2 right-2 z-10 flex justify-between items-start pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md border-2 border-stone-200 p-2 rounded-2xl shadow-lg flex gap-2 overflow-x-auto px-1 hide-scrollbar pointer-events-auto">
          {players.map((p, idx) => (
            <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${idx === turnIndex && currentPhase !== 'game_over' ? 'bg-blue-50 ring-2 ring-blue-500 shadow-sm' : 'opacity-80'}`}>
              <MeepleIcon color={p.color} size={24} />
              <div>
                <div className="text-xs font-black text-stone-800 flex items-center gap-1">
                  {p.name} {idx === turnIndex && currentPhase !== 'game_over' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                </div>
                <div className="text-[10px] font-bold text-stone-500 flex gap-2">
                  <span className="flex items-center gap-0.5"><Trophy size={10} className="text-amber-500" /> {p.score}</span>
                  <span className="flex items-center gap-0.5"><Users size={10} className="text-stone-400" /> {p.meeples}</span>
                  <span className="flex items-center gap-0.5"><Plus size={10} className="text-blue-500" /> {p.abbots}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex gap-2 h-[52px]">
             <button onClick={() => setShowRulesModal(true)} className="interactive-btn px-3 h-full bg-blue-100 text-blue-700 rounded-xl shadow-md border-2 border-blue-200 hover:bg-blue-200 transition-colors flex items-center justify-center" title="規則說明">
               <BookOpen size={22} />
             </button>

             <div className="text-right px-4 py-1 bg-stone-100 rounded-xl border-2 border-stone-300 shadow-md flex flex-col justify-center">
               <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider leading-none mb-1">剩餘牌堆</div>
               <div className="text-xl font-black text-stone-800 font-mono leading-none">{deck.length}</div>
             </div>
             
             {isHost && currentPhase !== 'game_over' && (
               <div className="relative h-full">
                 <button onClick={() => setShowHostMenu(!showHostMenu)} className="interactive-btn p-3 h-full bg-stone-800 text-white rounded-xl shadow-md hover:bg-stone-700 transition-colors">
                   <Settings size={22} />
                 </button>
                 {showHostMenu && (
                   <div className="absolute right-0 top-[110%] w-48 bg-white border-2 border-stone-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-[fade-in_0.2s_ease-out]">
                     <button onClick={() => setConfirmModal('end_game')} className="interactive-btn w-full flex items-center gap-2 px-4 py-3 font-bold text-amber-600 hover:bg-amber-50 border-b border-stone-100 text-left transition-colors">
                       <PowerOff size={18} /> 提前結算遊戲
                     </button>
                     <button onClick={() => setConfirmModal('close_room')} className="interactive-btn w-full flex items-center gap-2 px-4 py-3 font-bold text-red-600 hover:bg-red-50 text-left transition-colors">
                       <ShieldAlert size={18} /> 強制解散房間
                     </button>
                   </div>
                 )}
               </div>
             )}
          </div>
          
          {currentPhase === 'game_over' && !showGameOverModal && (
             <button onClick={() => setShowGameOverModal(true)} className="interactive-btn bg-blue-600 text-white font-bold px-4 py-2 rounded-xl shadow-lg animate-bounce flex items-center gap-2">
               <Trophy size={18}/> 顯示計分板
             </button>
          )}
        </div>
      </div>

      <div className="game-ui absolute left-4 top-24 z-10 flex flex-col gap-2 bg-white/80 backdrop-blur p-2 rounded-xl border border-stone-200 shadow-md">
          <button onClick={()=>setScale(s=>Math.min(2.5, s+0.2))} className="interactive-btn p-2 hover:bg-stone-200 rounded-lg text-stone-600"><ZoomIn size={20}/></button>
          <div className="text-xs font-bold text-center text-stone-400">{Math.round(scale*100)}%</div>
          <button onClick={()=>setScale(s=>Math.max(0.3, s-0.2))} className="interactive-btn p-2 hover:bg-stone-200 rounded-lg text-stone-600"><ZoomOut size={20}/></button>
      </div>

      <div 
        ref={boardRef}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative z-0"
        onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      >
        <div className="absolute top-1/2 left-1/2 origin-center transition-transform duration-75 ease-out" 
             style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})` }}>
          
          {Object.entries(board).map(([coordStr, tileData]) => {
            const [x, y] = coordStr.split(',').map(Number);
            const isLastPlaced = isMyTurn && currentPhase === 'place_meeple' && coordStr === lastPlacedCoord;

            return (
              <div key={coordStr} className="absolute shadow-[1px_1px_4px_rgba(0,0,0,0.3)]" style={{ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}>
                {renderTileSVG(tileData.type, tileData.rotation)}
                
                {tileData.meeples?.map((m, i) => (
                    <div key={i} className="absolute z-10 pointer-events-none" style={getMeeplePositionStyle(m.position, m.isFarmer, tileData.rotation)}>
                      <MeepleIcon color={m.color} size={28} isAbbot={m.type === 'abbot'} />
                    </div>
                ))}

                {isLastPlaced && validMeeplePositions.map(obj => (
                   <button 
                     key={obj.pos}
                     className={`interactive-btn absolute z-20 transition-all border-2 border-white/80 bg-white/30 hover:bg-white/60 flex items-center justify-center
                       ${obj.pos === 'center' || obj.pos === 'garden' ? 'w-[40%] h-[40%] rounded-full' : 'w-[30%] h-[30%] rounded-lg'}
                     `}
                     style={getMeeplePositionStyle(obj.pos, obj.type === 'F', tileData.rotation)}
                     onClick={(e) => { e.stopPropagation(); placeMeeple(coordStr, obj); }}
                     title={obj.type === 'F' ? "放置農夫" : (activeMeepleType === 'abbot' ? '指派修道院長' : '佔領地形')}
                   >
                      <MeepleIcon color={activePlayer.color} size={24} isAbbot={activeMeepleType === 'abbot'} />
                   </button>
                ))}
              </div>
            );
          })}

          {isMyTurn && currentPhase === 'place_tile' && !isCompletelyUnplayable && validPlacements.map((coordStr) => {
            const [x, y] = coordStr.split(',').map(Number);
            if (pendingPlacement === coordStr) {
               return (
                  <div key={`pending-${coordStr}`} className="absolute z-30" style={{ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}>
                     {renderTileSVG(currentDrawnTile.type, localRotation, true)}
                     <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
                        <button onClick={(e) => { e.stopPropagation(); confirmTilePlacement(); }} className="interactive-btn bg-green-500 hover:bg-green-600 text-white p-2 rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110"><Check size={24}/></button>
                        <button onClick={(e) => { e.stopPropagation(); setPendingPlacement(null); }} className="interactive-btn bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white transition-transform hover:scale-110"><X size={24}/></button>
                     </div>
                  </div>
               );
            }
            return (
              <div key={`hint-${coordStr}`} className="interactive-btn absolute bg-white/30 border-2 border-dashed border-blue-400 cursor-pointer z-10 rounded-lg flex items-center justify-center transition-all hover:bg-white/50" style={{ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }} onClick={() => setPendingPlacement(coordStr)}>
                 <Plus size={24} className="text-blue-600 opacity-70" />
              </div>
            );
          })}
        </div>
      </div>

      {isMyTurn && currentPhase !== 'game_over' && (
        <>
          {currentPhase === 'place_tile' && currentDrawnTile && (
            <div className="game-ui absolute bottom-24 md:bottom-8 left-4 z-10 flex flex-col gap-3" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
              <div className={`relative w-24 h-24 shadow-2xl border-4 rounded-lg overflow-hidden bg-stone-100 ${isCompletelyUnplayable ? 'border-red-500 opacity-80' : 'border-stone-800'}`}>
                {renderTileSVG(currentDrawnTile.type, localRotation)}
                {isCompletelyUnplayable && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><AlertTriangle className="text-red-600 w-12 h-12 opacity-80" /></div>}
              </div>
              <div className="flex gap-2">
                 <button onClick={() => {setLocalRotation(r=>(r+1)%4); setPendingPlacement(null);}} disabled={isCompletelyUnplayable} className="interactive-btn flex-1 bg-white/95 hover:bg-stone-100 disabled:opacity-50 text-stone-800 border-2 border-stone-300 font-bold py-2 px-2 rounded-xl shadow-lg flex justify-center items-center gap-1">
                   <RotateCw size={18} /> 旋轉
                 </button>
              </div>
            </div>
          )}

          <div className="game-ui absolute bottom-24 md:bottom-8 right-4 md:left-1/2 md:-translate-x-1/2 z-10" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
            {currentPhase === 'draw' && (
              <button onClick={drawTile} className="interactive-btn bg-stone-800 text-white font-black py-4 px-8 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.4)] flex items-center gap-2 text-lg animate-bounce">
                <Play fill="currentColor" size={20} /> 翻開版圖
              </button>
            )}
            
            {currentPhase === 'place_meeple' && (
              <div className="flex flex-col items-center gap-3">
                 <div className="flex gap-2 bg-white/90 p-2 rounded-2xl shadow-lg border border-stone-200">
                    <button onClick={() => setActiveMeepleType('normal')} className={`interactive-btn flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${activeMeepleType === 'normal' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' : 'text-stone-500 hover:bg-stone-100'}`}>
                      <MeepleIcon color={activeMeepleType==='normal'?activePlayer.color:'#9ca3af'} size={20}/> 普通 ({activePlayer.meeples})
                    </button>
                    <button onClick={() => setActiveMeepleType('abbot')} className={`interactive-btn flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${activeMeepleType === 'abbot' ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400' : 'text-stone-500 hover:bg-stone-100'}`}>
                      <MeepleIcon color={activeMeepleType==='abbot'?activePlayer.color:'#9ca3af'} size={20} isAbbot={true}/> 院長 ({activePlayer.abbots})
                    </button>
                 </div>
                 <div className="flex gap-2">
                    {myAbbotOnBoard && (
                        <button onClick={recallAbbot} className="interactive-btn bg-purple-600 text-white hover:bg-purple-700 font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 text-md transition-transform hover:scale-105">
                           <RefreshCcw size={18} strokeWidth={3} /> 收回院長得分
                        </button>
                    )}
                    <button onClick={skipMeeplePhase} className="interactive-btn bg-stone-700 text-white hover:bg-stone-800 font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 text-md transition-transform hover:scale-105">
                      <Check size={20} strokeWidth={3} /> 結束行動 (不派兵)
                    </button>
                 </div>
              </div>
            )}
            
            {currentPhase === 'place_tile' && isCompletelyUnplayable ? (
               <div className="flex flex-col items-center gap-3">
                 <div className="bg-red-600 text-white px-5 py-2 rounded-full font-bold shadow-lg border-2 border-red-800 flex items-center gap-2 animate-pulse"><AlertTriangle size={18}/> 此板塊無法拼接</div>
                 <button onClick={discardAndRedraw} className="interactive-btn bg-stone-800 text-white hover:bg-stone-900 font-bold py-3 px-6 rounded-full shadow-xl flex items-center gap-2 text-md transition-transform hover:scale-105"><RefreshCcw size={18} /> 作廢並重抽一張</button>
               </div>
            ) : currentPhase === 'place_tile' && validPlacements.length === 0 && (
               <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full font-bold shadow-lg border border-amber-300">此角度無法拼接，請旋轉</div>
            )}
          </div>
        </>
      )}

      {!isMyTurn && currentPhase !== 'game_over' && (
         <div className="game-ui absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-stone-200 font-bold text-stone-500 whitespace-nowrap z-10 pointer-events-none" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
           等待 <span className="text-blue-600">{activePlayer?.name || '對手'}</span> 行動...
         </div>
      )}

    </div>
  );
}