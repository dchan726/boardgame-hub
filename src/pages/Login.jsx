import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Gamepad2, AlertTriangle, ArrowRight, Mail, Lock, UserCircle2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!userName.trim()) { setAuthError('請填寫玩家暱稱'); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: userName });
      }
      navigate('/hub');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setAuthError('此信箱已被註冊');
      else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') setAuthError('信箱或密碼錯誤');
      else if (err.code === 'auth/weak-password') setAuthError('密碼需至少 6 個字元');
      else setAuthError('發生錯誤，請稍後再試');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-stone-200 bg-[url('[https://www.transparenttextures.com/patterns/cream-paper.png](https://www.transparenttextures.com/patterns/cream-paper.png)')]">
      <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-2xl border-2 border-stone-200">
        <div className="flex justify-center mb-6"><Gamepad2 size={64} className="text-blue-600" /></div>
        <h1 className="text-4xl font-black text-center mb-2">桌遊聚會所</h1>
        <p className="text-center text-stone-500 font-bold mb-8">{isLoginMode ? '登入您的帳號' : '註冊新玩家'}</p>

        {authError && <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl mb-6 font-bold text-sm text-center flex items-center justify-center gap-2"><AlertTriangle size={16}/> {authError}</div>}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {!isLoginMode && (
            <div className="relative">
              <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20}/>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold text-lg outline-none focus:border-blue-600 focus:bg-white transition-colors" placeholder="玩家暱稱" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20}/>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold text-lg outline-none focus:border-blue-600 focus:bg-white transition-colors" placeholder="電子信箱 (Email)" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20}/>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-stone-50 border-2 border-stone-200 rounded-2xl font-bold text-lg outline-none focus:border-blue-600 focus:bg-white transition-colors" placeholder="密碼 (至少6碼)" required />
          </div>
          <button type="submit" className="w-full bg-stone-800 hover:bg-stone-900 text-white font-bold py-4 rounded-2xl shadow-xl flex justify-center items-center gap-2 mt-4 transition-transform hover:scale-[1.02]">
            {isLoginMode ? '登入並進入大廳' : '註冊並開始遊戲'} <ArrowRight/>
          </button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => {setIsLoginMode(!isLoginMode); setAuthError('');}} className="text-stone-500 font-bold hover:text-blue-600 transition-colors">
            {isLoginMode ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
          </button>
        </div>
      </div>
    </div>
  );
}
