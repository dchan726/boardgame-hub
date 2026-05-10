import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { LogOut, Play, Trash2, RotateCw } from 'lucide-react';
import { generateDeck } from '../games/Carcassonne/data';
import CarcassonneEngine from '../games/Carcassonne/Engine';

export default function Room({ user }) {
  const { gameId, roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    const roomRef = doc(db, `rooms_${gameId}`, roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoomData(docSnap.data());
      } else {
        navigate(`/lobby/${gameId}`); // 房間被解散
      }
    });
    return () => unsubscribe();
  }, [gameId, roomId, navigate]);

  const startGame = async () => {
    if (!user || !roomData || roomData.host !== user.uid) return;
    const roomRef = doc(db, `rooms_${gameId}`, roomId);
    await updateDoc(roomRef, {
      status: 'playing', 
      deck: generateDeck(), 
      board: { "0,0": { type: 'starter', rotation: 0, meeples: [] } },
      turnIndex: 0, 
      currentPhase: 'draw', 
      currentDrawnTile: null, 
      lastPlacedCoord: "0,0"
    });
  };

  const deleteRoom = async () => {
    await deleteDoc(doc(db, `rooms_${gameId}`, roomId));
    navigate(`/lobby/${gameId}`);
  };

  if (!roomData) return <div className="flex items-center justify-center min-h-screen bg-stone-200"><RotateCw className="animate-spin" /></div>;

  // 遊戲已經開始或結束，把資料交給特定的遊戲引擎！
  if (roomData.status === 'playing' || roomData.status === 'game_over') {
    if (gameId === 'carcassonne') {
      return <CarcassonneEngine roomId={roomId} roomData={roomData} userId={user.uid} />;
    }
    return <div>未知的遊戲引擎</div>;
  }

  // 等待室介面
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-200 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] border-4 border-stone-800 shadow-2xl relative">
        <button onClick={() => navigate(`/lobby/${gameId}`)} className="absolute top-4 right-4 p-2 text-stone-400 hover:bg-stone-100 rounded-full"><LogOut size={20}/></button>
        <h2 className="text-3xl font-black text-center mb-8">等待室 <span className="text-blue-600 tracking-wider">#{roomId}</span></h2>
        
        <div className="space-y-3 mb-8">
          {roomData.players.map(p => (
            <div key={p.id} className="flex items-center gap-4 bg-stone-50 p-3 rounded-2xl border-2 border-stone-200">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black uppercase" style={{background:p.color}}>{p.name?.[0] || '?'}</div>
              <span className="font-bold flex-1 text-lg">{p.name || '匿名'}</span>
              {p.id === roomData.host && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-md font-bold">房主</span>}
            </div>
          ))}
        </div>

        {user.uid === roomData.host ? (
          <div className="space-y-3">
            <button onClick={startGame} className="w-full bg-stone-800 hover:bg-stone-900 text-white font-bold py-4 rounded-2xl flex justify-center gap-2 transition-transform hover:scale-105"><Play/> 開始遊戲</button>
            <button onClick={deleteRoom} className="w-full text-red-600 font-bold py-3 bg-red-50 hover:bg-red-100 rounded-2xl border-2 border-red-100 flex justify-center gap-2"><Trash2 size={18}/> 解散房間</button>
          </div>
        ) : (
          <div className="text-center text-stone-500 font-bold py-4 bg-stone-100 rounded-2xl border-2 border-stone-200 animate-pulse">等待房主開始...</div>
        )}
      </div>
    </div>
  );
}

