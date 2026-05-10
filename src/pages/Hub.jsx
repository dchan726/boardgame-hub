import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogOut, ArrowRight } from 'lucide-react';

export default function Hub({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-200 text-stone-800 font-sans overflow-hidden">
      <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-screen">
        <div className="flex justify-between items-center mb-10 bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl uppercase">{(user?.displayName || 'P').charAt(0)}</div>
              <div>
                <h1 className="text-2xl font-black text-stone-800">歡迎，{user?.displayName || '玩家'}</h1>
                <p className="text-stone-500 font-medium text-sm">選擇一款遊戲開始吧！</p>
              </div>
           </div>
           <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"><LogOut size={18}/> 登出</button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
           <button onClick={() => navigate('/lobby/carcassonne')} className="group relative overflow-hidden bg-white rounded-[2rem] p-8 border-2 border-stone-200 shadow-sm hover:shadow-2xl hover:border-blue-500 text-left transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <h2 className="text-3xl font-black mb-2">卡卡頌</h2>
              <p className="text-stone-500 mb-6">Carcassonne</p>
              <p className="text-stone-600 mb-8">經典板塊放置遊戲。已包含「農夫」與「修道院長」擴充規則及精準計分系統。</p>
              <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">進入遊戲大廳 <ArrowRight size={18}/></div>
           </button>
        </div>
      </div>
    </div>
  );
}

