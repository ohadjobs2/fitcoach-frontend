import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function Dashboard({ isSidebarOpen, setIsSidebarOpen, userData, setUserData, onLogout }) {
  const userId = userData?.id; // שולפים את ה-UUID מהדאטאבייס לטובת שמירות בשרת

  const daysList = [
    { id: 'sun', label: "ראשון", index: 0, short: "א'" },
    { id: 'mon', label: "שני", index: 1, short: "ב'" },
    { id: 'tue', label: "שלישי", index: 2, short: "ג'" },
    { id: 'wed', label: "רביעי", index: 3, short: "ד'" },
    { id: 'thu', label: "חמישי", index: 4, short: "ה'" },
    { id: 'fri', label: "שישי", index: 5, short: "ו'" },
    { id: 'sat', label: "שבת", index: 6, short: "ש'" }
  ];

  const todayIndex = new Date().getDay();
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const goals = ["היפרטרופיה", "חיטוב", "ריקומפוזיציה", "מסה"];
  const [limitations, setLimitations] = useState("");
  const [activeTab, setActiveTab] = useState('ai'); 
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState("סקוואט חופשי");
  const [isChartsOpen, setIsChartsOpen] = useState(false);
  // תפריטים נפרדים
  const [isWorkoutBuilderOpen, setIsWorkoutBuilderOpen] = useState(false); 
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  // אימון פעיל
  const [activeWorkout, setActiveWorkout] = useState(null); 
  const [liveExercises, setLiveExercises] = useState([]); 

  // --- טעינת LocalStorage ---
  const [tempData, setTempData] = useState(() => {
    const saved = localStorage.getItem('fitcoach_tempData');
    return saved ? JSON.parse(saved) : { 
      ...userData, 
      goal: userData?.fitnessGoal || "היפרטרופיה", // תוקן בהתאם למודל שלך
      muscleFocus: userData?.muscleFocus || "כללי",
      gender: userData?.gender || "male",
      selectedDays: ['sun', 'tue', 'thu', 'fri']
    };
  });

  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    const saved = localStorage.getItem('fitcoach_weeklyPlan');
    return saved ? JSON.parse(saved) : [
      { index: 0, day: "א'", name: "ראשון", type: "רגליים וכתפיים", isRest: false, isDone: false, exercises: [{ name: "סקוואט חופשי / סמית'", sets: 4, reps: "8-10", loggedSets: [] }] },
      { index: 1, day: "ב'", name: "שני", type: "חזה ויד אחורית", isRest: false, isDone: false, exercises: [{ name: "לחיצת חזה בדאמבלים", sets: 4, reps: "8-10", loggedSets: [] }] },
      { index: 2, day: "ג'", name: "שלישי", type: "מנוחה", isRest: true, isDone: false, exercises: [] },
      { index: 3, day: "ד'", name: "רביעי", type: "גב ויד קדמית", isRest: false, isDone: false, exercises: [{ name: "משיכת פולי עליון", sets: 4, reps: "8-12", loggedSets: [] }] },
      { index: 4, day: "ה'", name: "חמישי", type: "מנוחה", isRest: true, isDone: false, exercises: [] },
      { index: 5, day: "ו'", name: "שישי", type: "פלג גוף עליון / ידיים", isRest: false, isDone: false, exercises: [] },
      { index: 6, day: "ש'", name: "שבת", type: "מנוחה", isRest: true, isDone: false, exercises: [] },
    ];
  });
  const availableExercises = Array.from(new Set(weeklyPlan.flatMap(day => day.exercises ? day.exercises.map(ex => ex.name) : [])));
  const [nutrition, setNutrition] = useState(() => {
    const saved = localStorage.getItem('fitcoach_nutrition');
    return saved ? JSON.parse(saved) : { calories: { current: 0, target: userData?.targetCalories || 2800 }, protein: { current: 0, target: userData?.targetProtein || 180 }, carbs: { current: 0, target: userData?.targetCarbs || 320 }, fat: { current: 0, target: userData?.targetFats || 75 }, fiber: { current: 0, target: 35 } };
  });

  const [mealsLog, setMealsLog] = useState(() => {
    const saved = localStorage.getItem('fitcoach_mealsLog');
    return saved ? JSON.parse(saved) : [];
  });

  // שמירה אוטומטית בכל שינוי בסטייט למקומי (כדי שיהיה מהיר)
  useEffect(() => { localStorage.setItem('fitcoach_tempData', JSON.stringify(tempData)); }, [tempData]);
  useEffect(() => { localStorage.setItem('fitcoach_weeklyPlan', JSON.stringify(weeklyPlan)); }, [weeklyPlan]);
  useEffect(() => { localStorage.setItem('fitcoach_nutrition', JSON.stringify(nutrition)); }, [nutrition]);
  useEffect(() => { localStorage.setItem('fitcoach_mealsLog', JSON.stringify(mealsLog)); }, [mealsLog]);
 useEffect(() => {
    if (isChartsOpen && userId) {
      fetch(`${API_BASE_URL}/api/programs/progress/${userId}/${selectedExercise}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- הוספנו את הטוקן כאן לאימות מול השרת
        }
      })
        .then(res => res.json())
        .then(data => {
          // סינון נתונים: שמירת משקל השיא בלבד לכל תאריך ספציפי
          const groupedData = data.reduce((acc, curr) => {
            // אם התאריך אצלך נשמר עם שעות (כמו 2026-10-26T10:00:00Z), נחתוך רק את התאריך
            // אם הוא כבר מגיע כ- "2026-10-26", זה יעבוד אותו דבר
            const currDate = curr.date.split('T')[0]; 
            
            if (!acc[currDate] || acc[currDate].weight < curr.weight) {
              // שומרים את האובייקט עם המשקל הגבוה ביותר לאותו יום
              acc[currDate] = { ...curr, date: currDate }; 
            }
            return acc;
          }, {});

          // 2. המרה חזרה למערך ומיון לפי סדר כרונולוגי כדי שהגרף לא ישתגע
          const finalData = Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
          
          setChartData(finalData);
        })
        .catch(err => console.error("Error fetching chart data", err));
    }
  }, [isChartsOpen, selectedExercise, userId]);
 const saveWeightToDB = async (exerciseName, weightToSave) => {
    if (!userId) return;
    try {
      await fetch(`${API_BASE_URL}/api/programs/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          exercise: exerciseName, 
          weight: weightToSave 
        })
      });
      console.log(`✅ משקל ${weightToSave} ק"ג לתרגיל ${exerciseName} נשמר בהצלחה!`);
    } catch (error) {
      console.error("Error saving weight", error);
    }
  };
  // --- משיכת נתונים מהשרת בהפעלה ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}/sync`);
        if (response.ok) {
          const data = await response.json();
          
          // 1. עדכון יעדי התזונה לפי ה-DB
          if (data.nutritionGoals) {
            setNutrition(prev => ({
              ...prev,
              calories: { ...prev.calories, target: data.nutritionGoals.calories },
              protein: { ...prev.protein, target: data.nutritionGoals.protein },
              carbs: { ...prev.carbs, target: data.nutritionGoals.carbs },
              fat: { ...prev.fat, target: data.nutritionGoals.fat }
            }));
          }

          // 2. עדכון תוכנית אימונים (אם ישנה בעתיד)
          if (data.weeklyPlan && data.weeklyPlan.length > 0) {
            setWeeklyPlan(data.weeklyPlan);
          }

          // 3. עדכון היסטוריית ארוחות וחישוב מחדש
          if (data.mealsLog && data.mealsLog.length > 0) {
            setMealsLog(data.mealsLog);
            const currentCals = data.mealsLog.reduce((acc, m) => acc + (m.calories || 0), 0);
            const currentPro = data.mealsLog.reduce((acc, m) => acc + (m.protein || 0), 0);
            const currentCarbs = data.mealsLog.reduce((acc, m) => acc + (m.carbs || 0), 0);
            const currentFat = data.mealsLog.reduce((acc, m) => acc + (m.fat || 0), 0);
            const currentFib = data.mealsLog.reduce((acc, m) => acc + (m.fiber || 0), 0);
            
            setNutrition(prev => ({
              ...prev,
              calories: { ...prev.calories, current: currentCals },
              protein: { ...prev.protein, current: currentPro },
              carbs: { ...prev.carbs, current: currentCarbs },
              fat: { ...prev.fat, current: currentFat },
              fiber: { ...prev.fiber, current: currentFib }
            }));
          }
        }
      } catch (error) {
        console.error("שגיאה בסנכרון נתונים מהשרת", error);
      }
    };

    fetchUserData();
  }, [userId]);
  const [manualDayIndex, setManualDayIndex] = useState(0);
  const [manualWorkoutType, setManualWorkoutType] = useState("");
  const [manualIsRest, setManualIsRest] = useState(false);
  const [manualExercises, setManualExercises] = useState([{ name: "", sets: 3, reps: "10-12" }]);
  const [isQuickExOpen, setIsQuickExOpen] = useState(false);
  const [quickEx, setQuickEx] = useState({ name: "", sets: 3, reps: "10" });
  
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [aiMealPrompt, setAiMealPrompt] = useState("");
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [isDietPlannerOpen, setIsDietPlannerOpen] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);
  const [generatedDiet, setGeneratedDiet] = useState(null);
  const toggleDaySelection = (dayId) => {
    const currentDays = tempData.selectedDays || [];
    setTempData({ 
      ...tempData, 
      selectedDays: currentDays.includes(dayId) ? currentDays.filter(d => d !== dayId) : [...currentDays, dayId] 
    });
  };

  const selectedWorkout = weeklyPlan.find(d => d.index === selectedDayIndex);

  const calcPct = (curr, targ) => Math.min(100, Math.round(((curr || 0) / (targ || 1)) * 100));
  const proteinPct = calcPct(nutrition.protein.current, nutrition.protein.target);
  const carbsPct = calcPct(nutrition.carbs.current, nutrition.carbs.target);
  const fatPct = calcPct(nutrition.fat.current, nutrition.fat.target);
  const fiberPct = calcPct(nutrition.fiber?.current, nutrition.fiber?.target);
  const caloriesPct = calcPct(nutrition.calories.current, nutrition.calories.target);

  // --- אימון פעיל (Workout Player) ---
  const handleStartWorkout = () => {
    if(!selectedWorkout.exercises || selectedWorkout.exercises.length === 0) {
      return alert("אין תרגילים באימון זה.");
    }
    
    const liveReady = selectedWorkout.exercises.map(ex => ({
      ...ex,
      liveSets: Array.from({length: ex.sets}).map((_, i) => ({
        weight: ex.loggedSets?.[i]?.weight || "",
        reps: ex.loggedSets?.[i]?.reps || ex.reps.split('-')[0] || "",
        done: false
      }))
    }));

    setLiveExercises(liveReady);
    setActiveWorkout(selectedWorkout);
  };

  const updateLiveSet = (exIdx, setIdx, field, value) => {
    const updated = [...liveExercises];
    updated[exIdx].liveSets[setIdx][field] = value;
    setLiveExercises(updated);
  };

  const toggleSetDone = (exIdx, setIdx) => {
    const updated = [...liveExercises];
    updated[exIdx].liveSets[setIdx].done = !updated[exIdx].liveSets[setIdx].done;
    setLiveExercises(updated);
  };
  
 const handleFinishWorkout = async () => {
  // חישוב משקל שיא תיאורטי (1RM) ושמירה לטבלת ProgressLog
  for (const ex of liveExercises) {
    let max1RM = 0;
    
    ex.liveSets.forEach(set => {
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      
      if (weight > 0 && reps > 0) {
        // נוסחת Epley לחישוב 1RM
        const estimated1RM = weight * (1 + (reps / 30));
        if (estimated1RM > max1RM) {
          max1RM = estimated1RM;
        }
      }
    });
    
    if (max1RM > 0) {
      // מעגלים לחצי הקילו הקרוב
      const finalScore = Math.round(max1RM * 2) / 2;
      
      // שולחים את הנתון ישירות לשרת (עם הנתיב המלא /api/programs/progress)
      try {
        if (userId) {
          await fetch(`${API_BASE_URL}/api/programs/progress`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userId: userId, 
              exercise: ex.name, 
              weight: finalScore 
            })
          });
        }
      } catch (err) {
        console.error("שגיאה בשמירת נתוני גרף לתרגיל", ex.name, err);
      }
    }
  }

  // עדכון UI מקומי באופן מיידי
  setWeeklyPlan(prev => prev.map(day => {
    if (day.index === activeWorkout.index) {
      return {
        ...day,
        isDone: true,
        exercises: liveExercises.map(ex => ({ ...ex, loggedSets: ex.liveSets }))
      };
    }
    return day;
  }));
  
  setActiveWorkout(null);
  alert("אימון הושלם והתקדמות המשקלים (1RM) נשמרה בשרת בהצלחה! 💪");
  console.log("Sending finish request for user:", userId);
  
  // שליחה לשרת (DB) לשמירת הסטטוס של האימון השבועי (V ירוק)
  try {
    if (userId) {
      await fetch(`${API_BASE_URL}/api/programs/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dayIndex: activeWorkout.index, exercises: liveExercises })
      });
    }
  } catch (e) { 
    console.error("שגיאה בשמירת האימון במסד הנתונים", e); 
  }
};// --- יצירת תוכניות AI וידני ---
  const handleSaveAndGenerateAI = async () => {
    if(setUserData) setUserData(tempData);
    setIsWorkoutBuilderOpen(false); 
    setIsLoadingAI(true); 

    try {
      const response = await fetch(`${API_BASE_URL}/api/programs/generate`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, // הוספנו את המזהה כדי שהשרת יידע למי לשמור
          age: tempData.age,
          weight: tempData.weight,
          height: tempData.height,
          gender: tempData.gender,
          fitnessGoal: tempData.goal,
          muscleFocus: tempData.muscleFocus,
          limitations,
          workoutsPerWeek: tempData.selectedDays.length,
          availableDays: tempData.selectedDays
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      if (data.weeklyPlan) setWeeklyPlan(data.weeklyPlan);
      if (data.nutrition) {
        setNutrition(prev => ({
          calories: { current: prev.calories.current, target: data.nutrition.calories?.target || 2600 },
          protein: { current: prev.protein.current, target: data.nutrition.protein?.target || 170 },
          carbs: { current: prev.carbs.current, target: data.nutrition.carbs?.target || 280 },
          fat: { current: prev.fat.current, target: data.nutrition.fat?.target || 75 },
          fiber: { current: prev.fiber.current, target: data.nutrition.fiber?.target || 35 }
        }));
      }
    } catch (error) { 
      alert("שגיאה בייצור התוכנית מול השרת."); 
    } finally { 
      setIsLoadingAI(false); 
    }
  };

  const handleSaveManualDay = async () => {
    if (!manualIsRest && !manualWorkoutType.trim()) return alert("נא לתת שם לאימון");
    const filteredExercises = manualIsRest ? [] : manualExercises.filter(ex => ex.name.trim() !== "");
    
    // 1. עדכון מקומי
    setWeeklyPlan(prev => prev.map(day => {
      if (day.index === manualDayIndex) {
        return { ...day, type: manualIsRest ? "מנוחה" : manualWorkoutType, isRest: manualIsRest, exercises: filteredExercises };
      }
      return day;
    }));
    setSelectedDayIndex(manualDayIndex); 
    setIsWorkoutBuilderOpen(false);

    // 2. עדכון השרת (DB)
    try {
      if (userId) {
        await fetch(`${API_BASE_URL}/api/programs/updateDay`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, dayIndex: manualDayIndex, type: manualWorkoutType, isRest: manualIsRest, exercises: filteredExercises })
        });
      }
    } catch(e) { console.error("שגיאה בשמירת התוכנית", e); }
  };

  const addManualExerciseRow = () => setManualExercises([...manualExercises, { name: "", sets: 3, reps: "10-12" }]);
  
  const updateManualExerciseRow = (idx, field, val) => { 
    const updated = [...manualExercises]; 
    updated[idx][field] = val; 
    setManualExercises(updated); 
  };
  
  const removeManualExerciseRow = (idx) => setManualExercises(manualExercises.filter((_, i) => i !== idx));

  const handleAddQuickExercise = () => {
    if (!quickEx.name.trim()) return;
    setWeeklyPlan(prev => prev.map(day => {
      if (day.index === selectedDayIndex) {
        return { 
          ...day, 
          isRest: false, 
          type: day.isRest ? "אימון מותאם אישית" : day.type, 
          exercises: [...(day.exercises || []), { name: quickEx.name, sets: Number(quickEx.sets) || 3, reps: quickEx.reps || "10", loggedSets: [] }] 
        };
      }
      return day;
    }));
    setQuickEx({ name: "", sets: 3, reps: "10" }); 
    setIsQuickExOpen(false);
  };

  const handleDeleteExercise = (exIndex) => {
    setWeeklyPlan(prev => prev.map(day => {
      if (day.index === selectedDayIndex) {
        return { ...day, exercises: (day.exercises || []).filter((_, idx) => idx !== exIndex) };
      }
      return day;
    }));
  };

  const toggleWorkoutDone = () => {
    setWeeklyPlan(prev => prev.map(day => {
      if (day.index === selectedDayIndex) return { ...day, isDone: !day.isDone };
      return day;
    }));
  };

  // --- ניהול תזונה AI ---
  const handleAnalyzeMealWithAI = async () => {
    if (!aiMealPrompt.trim()) return alert("נא לתאר מה אכלת");
    setIsAnalyzingMeal(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/programs/analyze-meal`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ description: aiMealPrompt }) 
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      if (data.meal) {
        setNewMeal({ 
          name: data.meal.name || aiMealPrompt, 
          calories: data.meal.calories ?? 0, 
          protein: data.meal.protein ?? 0, 
          carbs: data.meal.carbs ?? 0, 
          fat: data.meal.fat ?? 0, 
          fiber: data.meal.fiber ?? 0 
        });
      }
    } catch (error) { 
      alert("שגיאה בחישוב הארוחה מול ה-AI."); 
    } finally { 
      setIsAnalyzingMeal(false); 
    }
  };
  const handleGenerateDiet = async () => {
    setIsGeneratingDiet(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/programs/generate-diet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calories: nutrition.calories.target,
          protein: nutrition.protein.target,
          ingredients: ingredients
        })
      });
      const data = await response.json();
      setGeneratedDiet(data.dietPlan);
    } catch (error) {
      alert("שגיאה ביצירת תפריט מול השרת.");
    } finally {
      setIsGeneratingDiet(false);
    }
  };

  const handleAddMeal = async (mealObj) => {
    const cal = Number(mealObj.calories) || 0; 
    const pro = Number(mealObj.protein) || 0; 
    const crb = Number(mealObj.carbs) || 0; 
    const ft = Number(mealObj.fat) || 0; 
    const fib = Number(mealObj.fiber) || 0;
    
    if (!mealObj.name.trim() && cal === 0) return alert("נא להזין ערכים");
    
    const addedMeal = { id: Date.now(), name: mealObj.name || "ארוחה", calories: cal, protein: pro, carbs: crb, fat: ft, fiber: fib };
    
    // 1. עדכון UI מיידי
    setMealsLog([addedMeal, ...mealsLog]);
    setNutrition(prev => ({
      calories: { ...prev.calories, current: prev.calories.current + cal }, 
      protein: { ...prev.protein, current: prev.protein.current + pro }, 
      carbs: { ...prev.carbs, current: prev.carbs.current + crb }, 
      fat: { ...prev.fat, current: prev.fat.current + ft }, 
      fiber: { ...prev.fiber, current: (prev.fiber?.current || 0) + fib }
    }));
    
    setNewMeal({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" }); 
    setAiMealPrompt(""); 
    setIsMealModalOpen(false);

    // 2. שמירה לשרת (DB)
    try {
      const savedUser = JSON.parse(localStorage.getItem('fitcoach_user'));
      const currentUserId = savedUser ? savedUser.id : userId;

     if (currentUserId) {
        await fetch(`${API_BASE_URL}/api/meals`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- הוספנו את הטוקן כאן
          },
          body: JSON.stringify({ userId: currentUserId, ...addedMeal })
        });
      }
    } catch(e) { console.error("שגיאה בשמירת הארוחה למסד הנתונים", e); }
  };

  const handleDeleteMeal = (meal) => {
    setMealsLog(mealsLog.filter(m => m.id !== meal.id));
    setNutrition(prev => ({
      calories: { ...prev.calories, current: Math.max(0, prev.calories.current - meal.calories) }, 
      protein: { ...prev.protein, current: Math.max(0, prev.protein.current - meal.protein) }, 
      carbs: { ...prev.carbs, current: Math.max(0, prev.carbs.current - meal.carbs) }, 
      fat: { ...prev.fat, current: Math.max(0, prev.fat.current - meal.fat) }, 
      fiber: { ...prev.fiber, current: Math.max(0, (prev.fiber?.current || 0) - meal.fiber) }
    }));
  };

  const handleResetDayNutrition = () => {
    setMealsLog([]); 
    setNutrition(prev => ({ 
      calories: { ...prev.calories, current: 0 }, 
      protein: { ...prev.protein, current: 0 }, 
      carbs: { ...prev.carbs, current: 0 }, 
      fat: { ...prev.fat, current: 0 }, 
      fiber: { ...prev.fiber, current: 0 } 
    }));
  };

  // --- פרופיל מבוסס מגדר ---
  const handleChangePassword = async () => {
    // 1. בדיקות תקינות מקומיות
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      return alert("נא למלא את כל השדות");
    }
    if (passwordForm.new !== passwordForm.confirm) {
      return alert("הסיסמאות אינן תואמות!");
    }

    try {
      // 2. שליחת בקשה אמיתית לשרת
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // <--- הוספנו את הטוקן גם כאן לאבטחה
        },
        body: JSON.stringify({
          userId: userId, // המזהה של המשתמש המחובר
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("הסיסמה שונתה בהצלחה!"); 
        // 3. איפוס השדות בטופס
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        // אם הסיסמה הנוכחית שגויה או יש שגיאה אחרת מהשרת
        alert(data.error || "שגיאה בשינוי הסיסמה");
      }
    } catch (err) {
      console.error("שגיאה בחיבור לשרת:", err);
      alert("שגיאת תקשורת עם השרת.");
    }
  };

  // אוואטרים חדשים - יפים, מלאים בסטייל ובלי קרחות!
const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${userData?.name || 'User'}&backgroundColor=0ea5e9&textColor=ffffff`;
  return (
    <div className="min-h-screen bg-[#03040b] flex justify-center items-center p-4 font-sans selection:bg-cyan-500/30 relative overflow-hidden" dir="rtl">
      
      {/* מסך הדשבורד הראשי */}
      <div className="w-full max-w-[430px] bg-[#070913]/90 backdrop-blur-3xl rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 relative overflow-hidden flex flex-col min-h-[860px] p-6 z-10">
        
        <div className="absolute top-10 right-0 w-[200px] h-[200px] bg-cyan-500/15 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute top-1/3 -left-10 w-[250px] h-[250px] bg-fuchsia-600/10 rounded-full blur-[90px] pointer-events-none"></div>

        {/* Header */}
       <header className="mb-5 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsProfileOpen(true)} className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button onClick={() => setIsChartsOpen(true)} className="text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cyan-400/20 transition cursor-pointer text-lg shadow-lg" title="סטטיסטיקות ומעקב">📈</button>
          </div>
          <h1 className="text-2xl font-black italic tracking-wider text-white"><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">Fit</span>Coach</h1>
          <div onClick={() => setIsWorkoutBuilderOpen(true)} className="relative p-[2px] rounded-full bg-gradient-to-bl from-cyan-400 via-fuchsia-500 to-purple-600 cursor-pointer hover:scale-105 transition-transform">
            <img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-full bg-[#070913]" />
          </div>
        </header>
        {/* Days Navigator */}
        <section className="mb-5 relative z-10">
          <div className="flex justify-between items-center gap-1.5">
            {weeklyPlan.map((item) => {
              const isSelected = selectedDayIndex === item.index;
              const isToday = todayIndex === item.index;
              return (
                <button 
                  key={item.index} 
                  onClick={() => setSelectedDayIndex(item.index)} 
                  className={`relative flex flex-col items-center justify-center w-12 h-[4.2rem] rounded-xl border transition-all duration-300 cursor-pointer ${
                    isSelected ? "bg-gradient-to-b from-cyan-300 to-cyan-500 border-transparent shadow-[0_0_20px_rgba(34,211,238,0.6)] text-[#03040b] scale-105 z-10" 
                      : item.isDone ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" 
                      : item.isRest ? "bg-[#111322]/40 border-white/5 text-zinc-500" 
                      : "bg-[#111322]/80 border-purple-500/20 text-white"
                  }`}
                >
                  {isToday && <div className="absolute -top-2.5 bg-cyan-300 text-[#03040b] text-[9px] font-black px-1.5 py-0.5 rounded-full">היום</div>}
                  <span className="text-sm font-black mt-1 mb-1">{item.day}</span>
                  {item.isDone ? <span className="text-xs">✅</span> : item.isRest ? <span className="text-[10px] opacity-40">💤</span> : <span className="text-fuchsia-400 text-xs">💪</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Workout Card */}
        <section className="mb-4 relative z-10">
          {selectedWorkout?.isRest && !isQuickExOpen ? (
            <div className="p-px rounded-[28px] bg-gradient-to-b from-zinc-700/50 to-transparent">
              <div className="bg-[#0a0b16]/90 backdrop-blur-xl rounded-[27px] p-5 text-center flex flex-col justify-center items-center border border-white/5">
                <div className="text-3xl mb-2 opacity-60">🔋</div>
                <h3 className="text-xl font-black text-white">יום מנוחה</h3>
                <p className="text-zinc-400 text-xs mt-1 mb-3">זמן להתאוששות וגדילת שריר.</p>
                <button 
                  onClick={() => { 
                    setWeeklyPlan(prev => prev.map(day => day.index === selectedDayIndex ? { ...day, isRest: false, type: "אימון מותאם אישית", exercises: [] } : day)); 
                    setIsQuickExOpen(true); 
                  }} 
                  className="text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-3 py-1.5 rounded-xl hover:bg-cyan-400/20 transition cursor-pointer"
                >
                  + בא לי להתאמן בכל זאת
                </button>
              </div>
            </div>
          ) : (
            <div className="relative p-px rounded-[28px] bg-gradient-to-br from-fuchsia-500 via-purple-600 to-cyan-400 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
              <div className="bg-[#070913]/95 backdrop-blur-2xl rounded-[27px] p-4 relative overflow-hidden">
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-fuchsia-400 text-[11px] font-bold">אימון ליום {selectedWorkout?.name}</span>
                    <h3 className="text-xl font-black text-white">{selectedWorkout?.type || "אימון אישי"}</h3>
                  </div>
                  <button 
                    onClick={() => setIsQuickExOpen(!isQuickExOpen)} 
                    className="bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2.5 py-1 rounded-xl text-xs font-black cursor-pointer"
                  >
                    + תרגיל אישי
                  </button>
                </div>

                {isQuickExOpen && (
                  <div className="bg-[#111322] border border-cyan-500/40 rounded-2xl p-3 mb-3 space-y-2">
                    <input type="text" placeholder="שם התרגיל" value={quickEx.name} onChange={e => setQuickEx({...quickEx, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-cyan-400 focus:outline-none"/>
                    <div className="flex gap-2">
                      <input type="number" placeholder="סטים" value={quickEx.sets} onChange={e => setQuickEx({...quickEx, sets: e.target.value})} className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-cyan-400 focus:outline-none"/>
                      <input type="text" placeholder="חזרות" value={quickEx.reps} onChange={e => setQuickEx({...quickEx, reps: e.target.value})} className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-cyan-400 focus:outline-none"/>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleAddQuickExercise} className="flex-1 bg-cyan-400 text-[#03040b] font-black text-xs py-1.5 rounded-xl cursor-pointer">שמור</button>
                      <button onClick={() => setIsQuickExOpen(false)} className="px-3 bg-white/5 text-zinc-400 text-xs py-1.5 rounded-xl cursor-pointer">ביטול</button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 mb-3 max-h-[140px] overflow-y-auto pr-1">
                  {selectedWorkout?.exercises && selectedWorkout.exercises.length > 0 ? (
                    selectedWorkout.exercises.map((ex, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 flex justify-between items-center text-xs">
                        <span className="font-bold text-white">{ex.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-extrabold">{ex.sets} × {ex.reps}</span>
                          <button onClick={() => handleDeleteExercise(i)} className="text-zinc-500 hover:text-red-400 text-xs cursor-pointer">✕</button>
                        </div>
                      </div>
                    ))
                  ) : <p className="text-center text-zinc-500 text-xs py-2">אין תרגילים מוגדרים</p>}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleStartWorkout} 
                    className="flex-1 py-2.5 rounded-2xl font-black text-sm shadow-lg transition cursor-pointer bg-gradient-to-r from-cyan-400 to-emerald-400 text-[#03040b]"
                  >
                    התחל אימון פעיל 🏋️
                  </button>
                  <button 
                    onClick={toggleWorkoutDone} 
                    className={`px-4 py-2.5 rounded-2xl font-black text-sm transition cursor-pointer ${selectedWorkout?.isDone ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-zinc-400"}`}
                  >
                    {selectedWorkout?.isDone ? "✅" : "סמן"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Nutrition Card */}
        <section className="relative z-10 mt-auto bg-[#0b0d19]/90 border border-white/5 rounded-[28px] p-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-sm font-black text-white">מעקב מאקרו</h2>
              <p className="text-[11px] text-zinc-400">נאכל: <span className="text-cyan-400 font-black">{nutrition.calories.current}</span> / {nutrition.calories.target} קק"ל</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setIsDietPlannerOpen(true)} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-black px-2.5 py-2 rounded-xl shadow-lg transition cursor-pointer">🪄 תפריט AI</button>
              <button onClick={() => setIsMealModalOpen(true)} className="bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-[11px] font-black px-2.5 py-2 rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.4)] transition cursor-pointer">+ ארוחה</button>
            </div>
          </div>
          
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-500" style={{ width: `${caloriesPct}%` }}></div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[ 
              { k: 'protein', l: "חלבון", c: "text-purple-500", pct: proteinPct }, 
              { k: 'carbs', l: "פחמימה", c: "text-cyan-400", pct: carbsPct }, 
              { k: 'fat', l: "שומן", c: "text-orange-400", pct: fatPct }, 
              { k: 'fiber', l: "סיבים", c: "text-emerald-400", pct: fiberPct }
            ].map((m, i) => (
              <div key={i} className="bg-[#111322] border border-white/5 rounded-2xl p-2 flex flex-col items-center">
                <span className="text-zinc-300 text-[10px] font-black mb-1">{m.l}</span>
                <div className="relative w-11 h-11 flex items-center justify-center mb-1">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle stroke="currentColor" fill="transparent" strokeWidth="3.5" r="15.9155" cx="18" cy="18" className="text-zinc-800" />
                    <circle stroke="currentColor" fill="transparent" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 - m.pct} r="15.9155" cx="18" cy="18" className={`${m.c} transition-all duration-500`} />
                  </svg>
                  <span className="absolute text-white font-black text-[10px]">{m.pct}%</span>
                </div>
                <span className="text-zinc-400 text-[10px] font-bold">{nutrition[m.k].current}/{nutrition[m.k].target}g</span>
              </div>
            ))}
          </div>

          {mealsLog.length > 0 ? (
            <div className="max-h-[95px] overflow-y-auto space-y-1 pt-1 border-t border-white/5 pr-1">
              {mealsLog.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-black/30 px-2.5 py-1.5 rounded-xl text-[11px]">
                  <span className="text-zinc-200 font-bold truncate max-w-[160px]">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{m.calories} קק"ל</span>
                    <span className="text-purple-400 font-bold">{m.protein}g ח'</span>
                    <button onClick={() => handleDeleteMeal(m)} className="text-zinc-500 hover:text-red-400 cursor-pointer">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-zinc-500 text-[11px] pt-1 border-t border-white/5">עוד לא הזנת ארוחות להיום</p>}
        </section>

        {/* Loading overlay */}
        {isLoadingAI && (
          <div className="absolute inset-0 z-50 bg-[#070913]/90 backdrop-blur-sm flex flex-col justify-center items-center rounded-[40px]">
             <div className="w-16 h-16 border-t-4 border-cyan-400 rounded-full animate-spin mb-4"></div>
             <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">ה-AI מייצר תוכנית...</h2>
          </div>
        )}
      </div>

      {/* --- מסך אימון פעיל (Workout Player) --- */}
      {activeWorkout && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#070913] p-4 overflow-hidden">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
            <h2 className="text-2xl font-black text-white">🏋️ {activeWorkout.type}</h2>
            <button onClick={() => setActiveWorkout(null)} className="text-zinc-400 bg-white/5 px-3 py-1.5 rounded-xl cursor-pointer">יציאה</button>
          </div>
          
          <div className="flex-grow overflow-y-auto pb-6 space-y-4 pr-1">
            {liveExercises.map((ex, exIdx) => (
              <div key={exIdx} className="bg-[#111322] border border-cyan-500/20 rounded-2xl p-4 shadow-lg">
                <h3 className="text-lg font-black text-cyan-400 mb-3">{ex.name} <span className="text-zinc-500 text-xs font-normal">({ex.sets} סטים)</span></h3>
                <div className="space-y-2">
                  <div className="flex text-zinc-400 text-[10px] font-bold px-1 mb-1">
                    <div className="w-12 text-center">סט</div>
                    <div className="flex-1 text-center">משקל (kg)</div>
                    <div className="flex-1 text-center">חזרות</div>
                    <div className="w-10 text-center">סיום</div>
                  </div>
                  {ex.liveSets.map((setObj, setIdx) => (
                    <div key={setIdx} className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${setObj.done ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-black/30 border border-white/5'}`}>
                      <div className="w-12 text-center text-zinc-300 font-bold text-xs">{setIdx + 1}</div>
                      <input 
                        type="number" placeholder="kg" disabled={setObj.done} 
                        value={setObj.weight} onChange={(e) => updateLiveSet(exIdx, setIdx, 'weight', e.target.value)} 
                        className="flex-1 min-w-0 w-full bg-[#0a0b16] border border-white/10 rounded-lg px-2 py-2 text-white text-center text-sm font-bold disabled:opacity-50 focus:border-cyan-400 focus:outline-none"
                      />
                      <input 
                        type="number" placeholder="reps" disabled={setObj.done} 
                        value={setObj.reps} onChange={(e) => updateLiveSet(exIdx, setIdx, 'reps', e.target.value)} 
                        className="flex-1 min-w-0 w-full bg-[#0a0b16] border border-white/10 rounded-lg px-2 py-2 text-white text-center text-sm font-bold disabled:opacity-50 focus:border-cyan-400 focus:outline-none"
                      />
                      <button 
                        onClick={() => toggleSetDone(exIdx, setIdx)} 
                        className={`w-10 h-10 rounded-lg flex justify-center items-center font-black transition-colors cursor-pointer ${setObj.done ? 'bg-emerald-500 text-black' : 'bg-white/10 text-zinc-400'}`}
                      >
                        {setObj.done ? '✓' : ''}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <button onClick={handleFinishWorkout} className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#03040b] font-black py-4 rounded-2xl text-lg shadow-[0_0_20px_rgba(52,211,153,0.4)] cursor-pointer">
              סיים אימון ושמור התקדמות 🏆
            </button>
          </div>
        </div>
      )}
      {/* --- מודל סטטיסטיקות מחובר לדאטאבייס --- */}
      {isChartsOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[400px] bg-[#0c0f1d] border border-white/10 rounded-3xl p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h3 className="text-lg font-black text-white">📈 מעקב התקדמות</h3>
              <button onClick={() => setIsChartsOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer text-base">✕</button>
            </div>
            
            <div className="mb-4">
              <label className="text-zinc-400 text-xs font-bold block mb-1">בחר תרגיל למעקב:</label>
              <select 
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="w-full bg-[#111322] border border-cyan-500/30 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                {availableExercises.length > 0 ? (
                  availableExercises.map((exerciseName, index) => (
                    <option key={index} value={exerciseName}>{exerciseName}</option>
                  ))
                ) : (
                  <option value="">אין תרגילים בתוכנית</option>
                )}
              </select>
            </div>

            <div className="h-[220px] w-full mt-2" dir="ltr">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#070913', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#22d3ee' }}
                      formatter={(value) => [`${value} kg`, 'ציון כוח מחושב (1RM)']}
                      labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#22d3ee" 
                      strokeWidth={3} 
                      dot={{ fill: '#0c0f1d', stroke: '#22d3ee', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6, fill: '#22d3ee', stroke: '#03040b', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm font-medium">
                  אין עדיין נתונים לתרגיל זה.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- מודל קופץ ארוחה --- */}
      {isMealModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[390px] max-h-[90vh] bg-[#0c0f1d] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3 flex-shrink-0">
              <h3 className="text-lg font-black text-white">🍽️ הוספת ארוחה ליומן</h3>
              <button onClick={() => setIsMealModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer text-base">✕</button>
            </div>
            
            <div className="overflow-y-auto space-y-3 pr-1 flex-grow">
              <div className="bg-[#111322] border border-cyan-500/30 rounded-2xl p-3 space-y-2">
                <label className="text-xs font-black text-cyan-400 block">🤖 תאר מה אכלת:</label>
                <textarea rows="2" placeholder="לדוגמה: 200 גרם חזה עוף ו-150 גרם אורז..." value={aiMealPrompt} onChange={e => setAiMealPrompt(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs font-bold resize-none focus:outline-none focus:border-cyan-400" />
                <button type="button" onClick={handleAnalyzeMealWithAI} disabled={isAnalyzingMeal} className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-[#03040b] font-black py-2 rounded-xl text-xs shadow-md hover:opacity-95 transition cursor-pointer disabled:opacity-50">
                  {isAnalyzingMeal ? "מחשב... ⏳" : "✨ חשב אוטומטית עם AI"}
                </button>
              </div>

              <div className="space-y-2 pt-1 border-t border-white/5">
                <p className="text-xs font-bold text-fuchsia-400">✍️ ערכי הארוחה:</p>
                <input type="text" placeholder="שם הארוחה" value={newMeal.name} onChange={e => setNewMeal({...newMeal, name: e.target.value})} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-0.5">קלוריות:</span>
                    <input type="number" value={newMeal.calories} onChange={e => setNewMeal({...newMeal, calories: e.target.value})} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-0.5">חלבון:</span>
                    <input type="number" value={newMeal.protein} onChange={e => setNewMeal({...newMeal, protein: e.target.value})} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-0.5">פחמימות:</span>
                    <input type="number" value={newMeal.carbs} onChange={e => setNewMeal({...newMeal, carbs: e.target.value})} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-0.5">שומן:</span>
                    <input type="number" value={newMeal.fat} onChange={e => setNewMeal({...newMeal, fat: e.target.value})} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-0.5">סיבים:</span>
                  <input type="number" value={newMeal.fiber} onChange={e => setNewMeal({...newMeal, fiber: e.target.value})} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex-shrink-0 mt-2">
              <button onClick={() => handleAddMeal(newMeal)} className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#03040b] font-black py-2.5 rounded-xl text-sm shadow-lg cursor-pointer hover:opacity-95 transition">
                הוסף לחישוב היומי ✅
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- מודל בניית תפריט AI מותאם אישית --- */}
      {isDietPlannerOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-[390px] max-h-[90vh] bg-[#0c0f1d] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3 flex-shrink-0">
              <h3 className="text-lg font-black text-white">🪄 בניית תפריט AI</h3>
              <button onClick={() => setIsDietPlannerOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer text-base">✕</button>
            </div>
            
            <div className="overflow-y-auto pr-1 flex-grow space-y-4">
              <p className="text-xs text-zinc-400">ה-AI ירכיב לך תפריט יומי של <span className="text-cyan-400 font-bold">{nutrition.calories.target} קק"ל</span> ו-<span className="text-purple-400 font-bold">{nutrition.protein.target}g חלבון</span>.</p>
              
              <div>
                <label className="text-cyan-400 text-xs font-bold block mb-1">מה יש לך במקרר/במזווה? (אופציונלי)</label>
                <textarea 
                  rows="2" 
                  placeholder="לדוגמה: 3 ביצים, אורז, קוטג', טונה..." 
                  value={ingredients} 
                  onChange={e => setIngredients(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white text-xs font-bold resize-none focus:outline-none focus:border-cyan-400" 
                />
              </div>

              <button 
                onClick={handleGenerateDiet} 
                disabled={isGeneratingDiet} 
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black py-2.5 rounded-xl text-sm shadow-lg cursor-pointer disabled:opacity-50 transition hover:opacity-90"
              >
                {isGeneratingDiet ? "ה-AI מרכיב לך תפריט... ⏳" : "✨ צור תפריט עכשיו"}
              </button>

              {generatedDiet && (
                <div className="bg-[#111322] border border-cyan-500/30 rounded-2xl p-3 whitespace-pre-wrap text-[11px] text-zinc-200 font-medium leading-relaxed border-t-2 border-t-cyan-500">
                  {generatedDiet}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- תפריט שמאלי (העיגול) בניית תוכניות AI / ידני --- */}
      <div className={`fixed inset-0 z-50 flex transition-opacity ${isWorkoutBuilderOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setIsWorkoutBuilderOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
        <div className={`relative w-[360px] max-w-full bg-[#0a0c1a]/95 backdrop-blur-2xl h-screen border-r border-white/5 shadow-2xl p-6 flex flex-col mr-auto transition-transform duration-300 ${isWorkoutBuilderOpen ? "translate-x-0" : "-translate-x-full"}`}>
          
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
            <button onClick={() => setIsWorkoutBuilderOpen(false)} className="text-zinc-400 cursor-pointer">✕</button>
            <h2 className="text-lg font-black text-white">⚙️ בניית תוכנית</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 bg-black/30 p-1.5 rounded-2xl border border-white/5">
            <button onClick={() => setActiveTab('ai')} className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${activeTab === 'ai' ? 'bg-cyan-500 text-[#03040b] shadow-lg' : 'text-zinc-400 hover:text-white'}`}>🧠 מאמן AI</button>
            <button onClick={() => setActiveTab('manual')} className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${activeTab === 'manual' ? 'bg-fuchsia-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}>✍️ בנייה עצמית</button>
          </div>

          <div className="flex-grow overflow-y-auto pb-4 space-y-4 pr-1">
            {activeTab === 'ai' ? (
              <div className="space-y-3">
                <div className="mb-2">
                  <label className="text-zinc-400 text-xs font-bold block mb-1">🚻 מין (משפיע על קלוריות):</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTempData({...tempData, gender: 'male'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${tempData.gender === 'male' ? 'bg-cyan-500 text-[#03040b] border-cyan-400' : 'bg-[#111322] text-zinc-400 border-white/5'}`}>גבר</button>
                    <button type="button" onClick={() => setTempData({...tempData, gender: 'female'})} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${tempData.gender === 'female' ? 'bg-fuchsia-500 text-white border-fuchsia-400' : 'bg-[#111322] text-zinc-400 border-white/5'}`}>אישה</button>
                  </div>
                </div>
                <div>
               <label className="text-zinc-400 text-xs font-bold block mb-1">⚠️ פציעות / תרגילים לא רצויים:</label>
                <input 
                  type="text" 
                  placeholder="לדוגמה: כאבי גב תחתון, בלי דדליפט" 
                  value={limitations} 
                  onChange={e => setLimitations(e.target.value)} 
                  className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-red-400 focus:outline-none"
              />
              </div>

                <div>
                  <label className="text-cyan-400 text-xs font-extrabold block mb-1">🎯 מטרה כללית:</label>
                  <select value={tempData.goal} onChange={e => setTempData({ ...tempData, goal: e.target.value })} className="w-full bg-[#111322] border border-cyan-500/30 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none">
                    {goals.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-zinc-400 text-xs font-bold block mb-1">💪 דגש שרירים:</label>
                  <input type="text" value={tempData.muscleFocus} onChange={e => setTempData({ ...tempData, muscleFocus: e.target.value })} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none"/>
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-bold block mb-1">📅 ימי אימון בשבוע:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {daysList.map(d => { 
                      const isSelected = tempData.selectedDays.includes(d.id); 
                      return (
                        <button key={d.id} type="button" onClick={() => toggleDaySelection(d.id)} className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${isSelected ? 'bg-cyan-500 text-[#03040b] border-cyan-400' : 'bg-[#111322] text-zinc-400 border-white/5'}`}>
                          {d.label}
                        </button>
                      ); 
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div>
                    <label className="text-zinc-400 text-xs font-bold block mb-1">גיל:</label>
                    <input type="number" value={tempData.age} onChange={e => setTempData({ ...tempData, age: Number(e.target.value) })} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none"/>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-bold block mb-1">משקל (ק"ג):</label>
                    <input type="number" value={tempData.weight} onChange={e => setTempData({ ...tempData, weight: Number(e.target.value) })} className="w-full bg-[#111322] border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-cyan-400 focus:outline-none"/>
                  </div>
                </div>

                <button onClick={handleSaveAndGenerateAI} className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-[#03040b] py-3 rounded-2xl font-black text-sm shadow-lg cursor-pointer mt-3">
                  💾 שמור וייצר תוכנית AI
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-fuchsia-400 text-xs font-extrabold block mb-1">📅 1. בחר יום לעריכה:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {daysList.map(d => (
                      <button key={d.index} type="button" onClick={() => { 
                        setManualDayIndex(d.index); 
                        const existing = weeklyPlan.find(w => w.index === d.index); 
                        if (existing) { 
                          setManualWorkoutType(existing.isRest ? "" : existing.type); 
                          setManualIsRest(existing.isRest || false); 
                          setManualExercises(existing.exercises?.length ? existing.exercises : [{ name: "", sets: 3, reps: "10-12" }]); 
                        } 
                      }} className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${manualDayIndex === d.index ? 'bg-fuchsia-500 text-white border-fuchsia-400' : 'bg-[#111322] text-zinc-400 border-white/5'}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#111322] p-2.5 rounded-xl border border-white/5">
                  <span className="text-xs font-bold text-white">הגדר כיום מנוחה 💤</span>
                  <input type="checkbox" checked={manualIsRest} onChange={e => setManualIsRest(e.target.checked)} className="w-4 h-4 accent-fuchsia-500 cursor-pointer"/>
                </div>

                {!manualIsRest && (
                  <>
                    <div>
                      <label className="text-zinc-300 text-xs font-bold block mb-1">🏷️ 2. שם האימון באותו יום:</label>
                      <input type="text" placeholder="למשל: חזה ויד קדמית / אימון A" value={manualWorkoutType} onChange={e => setManualWorkoutType(e.target.value)} className="w-full bg-[#111322] border border-fuchsia-500/30 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-fuchsia-500 focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-zinc-300 text-xs font-bold">💪 3. תרגילים באימון:</label>
                        <button onClick={addManualExerciseRow} className="text-xs text-cyan-400 font-black cursor-pointer">+ הוסף תרגיל</button>
                      </div>
                      
                      {manualExercises.map((ex, idx) => (
                        <div key={idx} className="bg-[#111322] border border-white/10 p-2.5 rounded-xl space-y-2">
                          <div className="flex justify-between items-center gap-2">
                            <input type="text" placeholder={`שם תרגיל #${idx + 1}`} value={ex.name} onChange={e => updateManualExerciseRow(idx, 'name', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                            {manualExercises.length > 1 && (<button onClick={() => removeManualExerciseRow(idx)} className="text-red-400 text-xs px-1 cursor-pointer">✕</button>)}
                          </div>
                          <div className="flex gap-2">
                            <div className="w-1/2">
                              <span className="text-[10px] text-zinc-400 block">סטים:</span>
                              <input type="number" value={ex.sets} onChange={e => updateManualExerciseRow(idx, 'sets', Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                            </div>
                            <div className="w-1/2">
                              <span className="text-[10px] text-zinc-400 block">חזרות:</span>
                              <input type="text" value={ex.reps} onChange={e => updateManualExerciseRow(idx, 'reps', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={handleSaveManualDay} className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white py-3 rounded-2xl font-black text-sm shadow-lg cursor-pointer mt-3">
                  ✨ שמור ועדכן את יום {daysList[manualDayIndex].label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- תפריט ימני (הקווים) פרופיל והגדרות --- */}
      <div className={`fixed inset-0 z-50 flex transition-opacity ${isProfileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div onClick={() => setIsProfileOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
        <div className={`relative w-[340px] max-w-full bg-[#0a0c1a]/95 backdrop-blur-2xl h-screen border-l border-white/5 shadow-2xl p-6 flex flex-col transition-transform duration-300 ${isProfileOpen ? "translate-x-0" : "translate-x-full"}`}>
          
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
            <h2 className="text-lg font-black text-white">👤 פרופיל משתמש</h2>
            <button onClick={() => setIsProfileOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
          </div>

          <div className="space-y-5 overflow-y-auto pr-1 flex-grow">
            <div className="bg-[#111322] border border-white/5 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500"></div>
              <img src={avatarUrl} alt="Profile" className="w-16 h-16 rounded-full mx-auto mb-3 bg-[#070913] border-2 border-cyan-500/30" />
              <h3 className="text-white font-black text-lg">{userData?.name || 'משתמש'}</h3>
              <p className="text-zinc-400 text-xs mt-1">מטרה: <span className="text-cyan-400 font-bold">{userData?.fitnessGoal || tempData.goal || 'היפרטרופיה'}</span></p>
            </div>

            <div className="bg-[#111322] border border-white/5 rounded-2xl p-4 shadow-lg">
              <h4 className="text-fuchsia-400 text-sm font-black mb-3">🔒 שינוי סיסמה</h4>
              <div className="space-y-2">
                <input type="password" placeholder="סיסמה נוכחית" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                <input type="password" placeholder="סיסמה חדשה" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                <input type="password" placeholder="אימות סיסמה חדשה" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:border-fuchsia-500 focus:outline-none"/>
                <button onClick={handleChangePassword} className="w-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 font-black py-2.5 rounded-xl text-xs hover:bg-fuchsia-500/20 transition cursor-pointer mt-2">שמור סיסמה חדשה</button>
              </div>
            </div>
            
            <button onClick={onLogout} className="w-full bg-red-500/10 text-red-400 border border-red-500/30 font-black py-3 rounded-2xl text-sm hover:bg-red-500/20 transition cursor-pointer mt-auto">התנתק מהמערכת 👋</button>
          </div>
        </div>
      </div>

    </div>
  );
}