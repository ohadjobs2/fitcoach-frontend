import React, { useState } from 'react';
import { API_BASE_URL } from './api';
export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState(20);
  const [weight, setWeight] = useState(75);
  const [gender, setGender] = useState('male');

  const handleCustomSubmit = async (e) => {
    e.preventDefault(); // <--- מונע מהדפדפן לעשות ריפרש מיותר ולמחוק את הפעולה!
    
    if (!email || !password) {
      return alert("נא למלא אימייל וסיסמה");
    }
    // ... שאר הקוד שלך נשאר בדיוק אותו דבר ...

    // חסימה לאימיילים מזויפים
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return alert("נא להזין כתובת אימייל חוקית ואמיתית (לדוגמה: ohad@gmail.com)");
    }

    // חסימה לסיסמה קצרה מדי
    if (password.length < 6) {
      return alert("הסיסמה חייבת להכיל לפחות 6 תווים");
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    const payload = isLogin 
      ? { email, password } 
      : { 
          name: name || email.split('@')[0], 
          email, 
          password, 
          age: Number(age) || 20, 
          weight: Number(weight) || 75, 
          gender, 
          fitnessGoal: "היפרטרופיה" 
        };

     try {
     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
     });
      const data = await response.json();
      console.log("התשובה המלאה מהשרת:", data);
      if (!response.ok) {
        alert(data.error || data.message); 
        return;
      }

      // ---> כאן התוספת הקריטית שלנו! שומרים את הטוקן אם השרת החזיר אותו <---
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      localStorage.setItem('fitcoach_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);

    } catch (error) {
      alert("שגיאת תקשורת מול השרת. ודא ששרת ה-Node.js פועל.");
    }
  };

  return (
    <div className="min-h-screen bg-[#03040b] flex justify-center items-center p-4 font-sans selection:bg-cyan-500/30 relative overflow-hidden" dir="rtl">
      
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[400px] bg-[#070913]/90 backdrop-blur-3xl rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 relative flex flex-col p-8 z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black italic tracking-wider text-white mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">Fit</span>Coach
          </h1>
          <p className="text-zinc-400 text-xs font-bold mt-2">האפליקציה החכמה לבניית גוף ותזונה</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 bg-black/40 p-1.5 rounded-2xl border border-white/5">
          <button type="button" onClick={() => setIsLogin(false)} className={`py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${!isLogin ? 'bg-fuchsia-500 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>הרשמה</button>
          <button type="button" onClick={() => setIsLogin(true)} className={`py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${isLogin ? 'bg-cyan-500 text-[#03040b] shadow-md' : 'text-zinc-400 hover:text-white'}`}>התחברות</button>
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <input type="text" placeholder="שם מלא" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#111322] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:border-fuchsia-500 focus:outline-none"/>
            </div>
          )}
          <div>
            <input type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#111322] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:border-cyan-400 focus:outline-none"/>
          </div>
          <div>
            <input type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#111322] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold focus:border-cyan-400 focus:outline-none"/>
          </div>

          {!isLogin && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <input type="number" placeholder="גיל" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:border-fuchsia-500 focus:outline-none"/>
              <input type="number" placeholder="משקל (ק״ג)" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:border-fuchsia-500 focus:outline-none"/>
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setGender('male')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${gender === 'male' ? 'bg-cyan-500 text-[#03040b] border-cyan-400' : 'bg-black/40 text-zinc-400 border-white/10'}`}>גבר</button>
                <button type="button" onClick={() => setGender('female')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${gender === 'female' ? 'bg-fuchsia-500 text-white border-fuchsia-400' : 'bg-black/40 text-zinc-400 border-white/10'}`}>אישה</button>
              </div>
            </div>
          )}

           <button 
            type="submit" // <--- או להשאיר type="button" ולוודא שאין ריפרש
           onClick={(e) => handleCustomSubmit(e)} 
    
            className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition cursor-pointer mt-4 ${isLogin ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-[#03040b]' : 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white'}`}
          >
            {isLogin ? "כניסה 🚀" : "צור חשבון חדש ✨"}
          </button>
        </div>

      </div>
    </div>
  );
}