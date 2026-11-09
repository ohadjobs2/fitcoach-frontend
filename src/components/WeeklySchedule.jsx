import React from 'react';

// נתונים זמניים לבדיקת התצוגה
const weeklyPlan = [
  { day: 0, name: "אימון חזה ויד אחורית", isActive: true },
  { day: 1, name: "אימון גב ויד קדמית", isActive: true },
  { day: 2, name: "מנוחה", isActive: false },
  { day: 3, name: "אימון רגליים", isActive: true },
  { day: 4, name: "אימון כתפיים ובטן", isActive: true },
  { day: 5, name: "מנוחה", isActive: false },
  { day: 6, name: "אימון פול באדי (FBW)", isActive: true },
];

const daysInHebrew = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export default function WeeklySchedule() {
  const currentDayIndex = new Date().getDay(); // שולף את היום הנוכחי מ-0 (ראשון) עד 6 (שבת)
  const todayWorkout = weeklyPlan.find(w => w.day === currentDayIndex);

  return (
    <div dir="rtl" style={{ padding: '20px', fontFamily: 'system-ui', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* כרטיסיית האימון היומי (Hero) */}
      <div style={{ 
        backgroundColor: todayWorkout.isActive ? '#2563eb' : '#4b5563', 
        color: 'white', 
        padding: '30px 20px', 
        borderRadius: '16px', 
        marginBottom: '30px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.5rem' }}>היום יום {daysInHebrew[currentDayIndex]} 📅</h2>
        <h3 style={{ margin: '0', fontSize: '1.8rem' }}>
          {todayWorkout.isActive ? `יש לך ${todayWorkout.name} 💪` : "יום מנוחה, תן לשרירים להתאושש 🛋️"}
        </h3>
      </div>

      {/* רשימת התוכנית השבועית */}
      <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>התוכנית השבועית שלך:</h3>
      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {weeklyPlan.map(workout => (
          <div key={workout.day} style={{ 
            padding: '15px', 
            border: workout.day === currentDayIndex ? '2px solid #2563eb' : '1px solid #e5e7eb', 
            borderRadius: '12px',
            backgroundColor: workout.day === currentDayIndex ? '#eff6ff' : 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong>יום {daysInHebrew[workout.day]}</strong>
            <span>{workout.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}