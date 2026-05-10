import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, setDoc, updateDoc, onSnapshot, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { COLORS } from '../games/Carcassonne/data';

export default function Lobby({ user }) {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [roomsList, setRoomsList] = useState([]);

  useEffect(() => {
    // 真實專案路徑簡化：直接存放在根目錄的集合中
    const roomsRef = collection(db, `rooms_${gameId}`);
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const rooms = []; 
      snapshot.forEach((doc) => rooms.push({ id: doc.id, ...doc.data() })); 
      setRoomsList(rooms);
    });
    return () => unsubscribe();
  }, [gameId]);

  const createRoom = async () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, `rooms_${gameId}`, newRoomId);
    await setDoc(roomRef, {
      host: user.uid, status: 'waiting',
      players: [{ id: user.uid, name: user.displayName || '玩家', color: COLORS[0], score: 0, meeples: 7, abbots: 1 }],
      createdAt: new Date().toISOString()
    });
    navigate(`/room/${gameId}/${newRoomId}`);
  };

  const joinRoom = async (targetRoomId) => {
    const roomRef = doc(db, `rooms_${gameId}`, targetRoomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists() || roomSnap.data().status !== 'waiting') return;
    if (!roomSnap.data().players.find(p => p.id === user.uid)) {
      await updateDoc(roomRef, { 
        players: arrayUnion({ id: user.uid, name: user.displayName || '玩家', color: COLORS[roomSnap.data().players.length % COLORS.length], score: 0, meeples: 7, abbots: 1 }) 
      });
    }
    navigate(`/room/${gameId}/${targetRoomId}`);
  };

  return (
    <div className="min-h-screen bg-stone-200 text-stone-800 font-sans overflow-hidden">
      <div className="max-w-5xl mx-auto p-4 md:p-6 pt-10 min-h-screen">
          <div className="flex justify-between items-end mb-8 border-b-2 border-stone-300 pb-6">
              <div>
                <button onClick={() => navigate('/hub')} className="text-stone-500 font-bold mb-4 flex items-center gap-1"><ArrowRight size={16} className="rotate-180"/> 返回大廳</button>
                <h1 className="text-4xl font-black uppercase">{gameId} 大廳</h1>
              </div>
              <button onClick={createRoom} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors"><Plus size={20}/> 建立房間</button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomsList.map(room => (
                 <div key={room.id} className="bg-white rounded-3xl p-5 border-2 border-stone-200 hover:shadow-lg transition-shadow">
                     <h3 className="font-black text-xl mb-4 text-stone-700">#{room.id}</h3>
                     <div className="flex items-center gap-2 text-stone-500 mb-6"><Users size={18}/> 玩家: <span className="font-bold text-stone-800">{room.players?.length || 0}</span> 人</div>
                     <button onClick={() => joinRoom(room.id)} disabled={room.status !== 'waiting'} className={`w-full py-3 rounded-2xl font-bold ${room.status === 'waiting' ? 'bg-blue-50 text-blue-600 border-2 border-blue-600 hover:bg-blue-600 hover:text-white transition-colors' : 'bg-stone-100 text-stone-400'}`}>
                       {room.status === 'waiting' ? '加入遊戲' : '遊戲已開局'}
                     </button>
                 </div>
              ))}
          </div>
      </div>
    </div>
  );
}

