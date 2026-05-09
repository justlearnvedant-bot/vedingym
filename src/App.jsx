import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

// ─── THEME ────────────────────────────────────────────────────
const C = {
  gold:"#c8a97e", goldDim:"#8a6e4a", goldBg:"rgba(200,169,126,0.12)",
  purple:"#9b8fd4", purpleBg:"rgba(155,143,212,0.12)",
  teal:"#6bbfa0", tealBg:"rgba(107,191,160,0.12)",
  coral:"#e09070", coralBg:"rgba(224,144,112,0.12)",
  blue:"#64a0dc", blueBg:"rgba(100,160,220,0.12)",
  red:"#d06060", redBg:"rgba(208,96,96,0.12)",
  bg0:"#0d1117", bg1:"#161b22", bg2:"#1c2128", bg3:"#21262d",
  text:"#e6edf3", muted:"#7d8590", faint:"#21262d", border:"#30363d",
  accent:"#c8a97e",
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

const fadeUp = {
  hidden:{ opacity:0, y:24 },
  visible:{ opacity:1, y:0, transition:{ duration:.5, ease:[.16,1,.3,1] } },
  exit:{ opacity:0, y:-12, transition:{ duration:.25 } },
};
const stagger = { visible:{ transition:{ staggerChildren:.07 } } };
const scaleIn = {
  hidden:{ opacity:0, scale:.92 },
  visible:{ opacity:1, scale:1, transition:{ duration:.4, ease:[.16,1,.3,1] } },
};
const slideRight = {
  hidden:{ opacity:0, x:-20 },
  visible:{ opacity:1, x:0, transition:{ duration:.4, ease:[.16,1,.3,1] } },
};

// ─── CONSTANTS ────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ACNE_LABELS = ["Clear","Minimal","Moderate","Visible","Severe"];
const ACNE_COLORS = ["#6bbfa0","#9be0c0","#c8a97e","#e09070","#d06060"];
const MILESTONE_LABELS = ["First milestone","Halfway there","Great progress","Almost there","Goal reached!"];

const GOAL_MODES = {
  gain:{ label:"Weight Gain", icon:"📈", color:C.teal,  dailyCal:2600, proteinMultiplier:1.8, workoutFocus:"Hypertrophy",       calLabel:"Surplus target", defaultStart:45, defaultGoal:60 },
  lose:{ label:"Weight Loss", icon:"📉", color:C.coral, dailyCal:1800, proteinMultiplier:2.2, workoutFocus:"Cardio + Strength", calLabel:"Deficit target", defaultStart:85, defaultGoal:70 },
};

const LOSE_MEALS = [
  {id:"breakfast",label:"Breakfast",time:"8:00 AM",cal:350,icon:"🥗"},
  {id:"snack1",   label:"Snack",    time:"11:00 AM",cal:150,icon:"🍎"},
  {id:"lunch",    label:"Lunch",    time:"1:00 PM", cal:450,icon:"🥙"},
  {id:"dinner",   label:"Dinner",   time:"7:00 PM", cal:500,icon:"🍱"},
];
const GAIN_MEALS = [
  {id:"breakfast",  label:"Breakfast",  time:"8:30 AM",  cal:500,icon:"🍳"},
  {id:"snack1",     label:"Snack",       time:"11:00 AM", cal:300,icon:"🥜"},
  {id:"lunch",      label:"Lunch",       time:"1:00 PM",  cal:580,icon:"🍱"},
  {id:"preworkout", label:"Pre-Workout", time:"4:00 PM",  cal:400,icon:"🍌"},
  {id:"dinner",     label:"Dinner",      time:"7:00 PM",  cal:650,icon:"🍛"},
  {id:"bedsnack",   label:"Bed Snack",   time:"10:00 PM", cal:260,icon:"🥛"},
];
const GAIN_WORKOUT_DAYS = [
  {id:"d1",name:"Day 1 — Chest + Triceps",exercises:[{id:"e1",name:"Bench Press",sets:4,reps:"8–10"},{id:"e2",name:"Incline DB Press",sets:3,reps:"10"},{id:"e3",name:"Chest Fly",sets:3,reps:"12"},{id:"e4",name:"Tricep Pushdown",sets:3,reps:"12"},{id:"e5",name:"Dips",sets:3,reps:"max"}]},
  {id:"d2",name:"Day 2 — Back + Biceps",exercises:[{id:"e6",name:"Lat Pulldown",sets:4,reps:"10"},{id:"e7",name:"Barbell Row",sets:3,reps:"8–10"},{id:"e8",name:"Seated Row",sets:3,reps:"12"},{id:"e9",name:"Dumbbell Curl",sets:3,reps:"10"},{id:"e10",name:"Hammer Curl",sets:3,reps:"10"}]},
  {id:"d3",name:"Day 3 — Rest / Light Walk",exercises:[]},
  {id:"d4",name:"Day 4 — Legs",exercises:[{id:"e11",name:"Squat",sets:4,reps:"8"},{id:"e12",name:"Leg Press",sets:3,reps:"12"},{id:"e13",name:"Romanian Deadlift",sets:3,reps:"10"},{id:"e14",name:"Lunges",sets:3,reps:"10 each"}]},
  {id:"d5",name:"Day 5 — Shoulders",exercises:[{id:"e15",name:"Overhead Press",sets:4,reps:"8"},{id:"e16",name:"Lateral Raise",sets:4,reps:"12"},{id:"e17",name:"Rear Delt Fly",sets:3,reps:"12"}]},
  {id:"d6",name:"Day 6 — Optional",exercises:[{id:"e18",name:"Abs",sets:3,reps:"15"},{id:"e19",name:"Stretching",sets:1,reps:"10 min"},{id:"e20",name:"Light Cardio",sets:1,reps:"20 min"}]},
  {id:"d7",name:"Day 7 — Rest",exercises:[]},
];
const LOSE_WORKOUT_DAYS = [
  {id:"d1",name:"Day 1 — Full Body Cardio",exercises:[{id:"e1",name:"Treadmill",sets:1,reps:"30 min"},{id:"e2",name:"Jumping Jacks",sets:3,reps:"30"},{id:"e3",name:"Burpees",sets:3,reps:"10"},{id:"e4",name:"Mountain Climbers",sets:3,reps:"20"}]},
  {id:"d2",name:"Day 2 — Upper Body",exercises:[{id:"e5",name:"Push-ups",sets:4,reps:"12"},{id:"e6",name:"Dumbbell Row",sets:3,reps:"12"},{id:"e7",name:"Shoulder Press",sets:3,reps:"12"},{id:"e8",name:"Tricep Dips",sets:3,reps:"12"}]},
  {id:"d3",name:"Day 3 — HIIT",exercises:[{id:"e9",name:"Sprint Intervals",sets:8,reps:"30s on/30s off"},{id:"e10",name:"Box Jumps",sets:3,reps:"10"},{id:"e11",name:"Kettlebell Swing",sets:3,reps:"15"}]},
  {id:"d4",name:"Day 4 — Lower Body",exercises:[{id:"e12",name:"Squats",sets:4,reps:"15"},{id:"e13",name:"Lunges",sets:3,reps:"12 each"},{id:"e14",name:"Glute Bridge",sets:3,reps:"15"},{id:"e15",name:"Calf Raises",sets:4,reps:"20"}]},
  {id:"d5",name:"Day 5 — Active Recovery",exercises:[{id:"e16",name:"Yoga / Stretching",sets:1,reps:"30 min"},{id:"e17",name:"Light Walk",sets:1,reps:"20 min"}]},
  {id:"d6",name:"Day 6 — Cardio",exercises:[{id:"e18",name:"Cycling / Swimming",sets:1,reps:"45 min"},{id:"e19",name:"Core Circuit",sets:3,reps:"15"}]},
  {id:"d7",name:"Day 7 — Rest",exercises:[]},
];

const DEFAULT_SETTINGS = {
  goalMode:"gain", startWeight:45, goalWeight:60, dailyCal:2600,
  heightM:1.70, proteinMultiplier:1.8,
  homeWidgets:{weight:true,meals:true,workout:true,medicine:true,skin:true,steps:true,calories:true,protein:true},
  meals:GAIN_MEALS,
  study:[
    {id:"s1",label:"Session 1",time:"4:00 AM",topic:"Hardest topics"},
    {id:"s2",label:"Session 2",time:"7:00 AM",topic:"Revision & MCQs"},
    {id:"s3",label:"Session 3",time:"9:00 AM",topic:"Moderate difficulty"},
    {id:"s4",label:"Session 4",time:"11:20 AM",topic:"Wrap up morning"},
    {id:"s5",label:"Session 5",time:"2:00 PM",topic:"Light revision"},
    {id:"s6",label:"Session 6",time:"8:00 PM",topic:"Evening review"},
  ],
  skincare:[
    {id:"am_cleanse",label:"AM Cleanse",phase:"am"},
    {id:"niacinamide",label:"Niacinamide 10%",phase:"am"},
    {id:"am_moist",label:"AM Moisturiser",phase:"am"},
    {id:"spf",label:"SPF 50+",phase:"am"},
    {id:"pm_cleanse",label:"PM Double Cleanse",phase:"pm"},
    {id:"active",label:"Active (BHA/Retinol)",phase:"pm"},
    {id:"pm_moist",label:"PM Moisturiser",phase:"pm"},
  ],
  medicine:[
    {id:"med1",label:"Vitamin D3",time:"8:00 AM",dose:"1 tablet"},
    {id:"med2",label:"Omega 3",time:"1:00 PM",dose:"2 capsules"},
    {id:"med3",label:"Magnesium",time:"10:00 PM",dose:"1 tablet"},
  ],
  workout:{days:GAIN_WORKOUT_DAYS},
};

// ─── UTILS ───────────────────────────────────────────────────
function calcMilestones(start,goal,mode) {
  const isLose=mode==="lose";const diff=Math.abs(goal-start);
  return MILESTONE_LABELS.map((label,i)=>({
    w:isLose?Math.round((start-diff*((i+1)/5))*10)/10:Math.round((start+diff*((i+1)/5))*10)/10,label,
  }));
}
const todayKey   = ()  => new Date().toISOString().slice(0,10);
const dayKey     = (d) => d.toISOString().slice(0,10);
const fmtDate    = (k) => new Date(k+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const fmtShort   = (k) => new Date(k+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"});
const fmtWeekday = (k) => new Date(k+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long"});
const dayAbbrev  = (k) => ["Su","Mo","Tu","We","Th","Fr","Sa"][new Date(k+"T12:00:00").getDay()];
const genId      = ()  => Math.random().toString(36).slice(2,8);

function lastNKeys(n) {
  return Array.from({length:n},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(n-1-i));return dayKey(d);});
}
function defaultDay() {
  return {meals:{},study:{},skincare:{},medicine:{},workout:false,sleep:0,water:0,acneSeverity:2,steps:0,caloriesBurned:0,notes:""};
}
function getGreeting() {
  const h=new Date().getHours();
  if(h<12)return"Good morning";if(h<17)return"Good afternoon";return"Good evening";
}
function calcCal(meals,mealDefs) { return (mealDefs||[]).reduce((sum,m)=>meals?.[m.id]?sum+m.cal:sum,0); }
function calcProtein(weight,mult=1.8) { return Math.round(weight*(mult||1.8)); }
function dayScore(day,s) {
  if(!day)return 0;
  const meals=Object.values(day.meals??{}).filter(Boolean).length;
  const study=Object.values(day.study??{}).filter(Boolean).length;
  const skin=Object.values(day.skincare??{}).filter(Boolean).length;
  const sleep=Math.min(day.sleep??0,9);
  const mt=s.meals.length||1,st=s.study.length||1,kt=s.skincare.length||1;
  return Math.round((meals/mt)*30+(study/st)*25+(day.workout?20:0)+(sleep/9)*15+(skin/kt)*10);
}
function scoreColor(s) { return s>=70?C.teal:s>=40?C.gold:C.coral; }
function getMonthKeys(year,month) {
  const days=[];const d=new Date(year,month,1);
  while(d.getMonth()===month){days.push(dayKey(d));d.setDate(d.getDate()+1);}return days;
}
function getYearKeys(year) {
  const days=[];const d=new Date(year,0,1);
  while(d.getFullYear()===year){days.push(dayKey(d));d.setDate(d.getDate()+1);}return days;
}
function aggregateStats(keys,data,settings) {
  const days=keys.map(k=>data.days?.[k]).filter(Boolean);
  if(!days.length)return null;
  let max=0,cur=0;
  for(const k of keys){const day=data.days?.[k];const ok=day&&(Object.values(day.meals??{}).filter(Boolean).length>=Math.ceil(settings.meals.length/2)||day.workout);if(ok){cur++;max=Math.max(max,cur);}else cur=0;}
  return {
    totalDays:days.length,workoutDays:days.filter(d=>d.workout).length,
    avgScore:Math.round(days.reduce((s,d)=>s+dayScore(d,settings),0)/days.length),
    avgSleep:parseFloat((days.reduce((s,d)=>s+(d.sleep||0),0)/days.length).toFixed(1)),
    avgCal:Math.round(days.reduce((s,d)=>s+calcCal(d.meals,settings.meals),0)/days.length),
    avgSteps:Math.round(days.reduce((s,d)=>s+(d.steps||0),0)/days.length),
    totalSteps:days.reduce((s,d)=>s+(d.steps||0),0),
    perfectDays:days.filter(d=>dayScore(d,settings)>=80).length,
    streakMax:max,
  };
}

// ─── IMAGE TO BASE64 ─────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result.split(",")[1]);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

// ─── AI ───────────────────────────────────────────────────────
const SYSTEM_PROMPT=`You are Vedinzen AI — a personal health coach integrated into the Vedinzen health tracking app. You have full context of the user's daily health data. Be concise, specific, and actionable. Keep responses under 220 words. Use plain text only, no markdown headers. Adapt advice based on whether user is in weight gain or weight loss mode.`;

const FOOD_ANALYSIS_PROMPT=`You are a nutrition expert analyzing a food image. Provide a detailed breakdown in this exact format:

FOOD IDENTIFIED: [list foods you can see]

NUTRITION ESTIMATE (per serving):
- Calories: X kcal
- Protein: Xg
- Carbohydrates: Xg
- Fats: Xg
- Fiber: Xg
- Sugar: Xg

KEY NUTRIENTS: [vitamins, minerals present]

EATING ORDER: [what to eat first for best digestion and blood sugar]

HOW MUCH TO EAT: [portion advice based on goal mode]

WHAT TO AVOID: [any concerns — high sugar, processed ingredients, etc.]

GOAL ALIGNMENT: [does this help or hinder their weight goal]

RATING: X/10 [for their specific goal]`;

const QUICK_PROMPTS=["Analyze my progress today","What should I eat today?","Optimize my workout","Generate 7-day diet plan","Rate my sleep pattern","Am I on track this week?","Tips to reach my goal faster","Weekly health report"];

function buildAIContext(data,latestWeight,settings) {
  const mode=settings.goalMode||"gain";const today=todayKey();const td=data?.days?.[today];
  const recent=Object.entries(data?.days??{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
  const avgScore=recent.length?Math.round(recent.reduce((s,[,d])=>s+dayScore(d,settings),0)/recent.length):0;
  const avgSleep=recent.length?(recent.reduce((s,[,d])=>s+(d.sleep??0),0)/recent.length).toFixed(1):0;
  const workoutDays=recent.filter(([,d])=>d.workout).length;
  return `GOAL MODE: ${mode==="gain"?"Weight Gain":"Weight Loss"}
Weight: ${latestWeight}kg → goal ${settings.goalWeight}kg (started ${settings.startWeight}kg)
Calories today: ${calcCal(td?.meals,settings.meals)} / ${settings.dailyCal} kcal
Sleep: ${td?.sleep??0}h | Water: ${td?.water??0}/8 | Workout: ${td?.workout?"yes":"no"}
Meals: ${Object.values(td?.meals??{}).filter(Boolean).length}/${settings.meals.length}
Steps: ${td?.steps||0} | Burned: ${td?.caloriesBurned||0}
7-day avg score: ${avgScore}/100 | avg sleep: ${avgSleep}h | workouts: ${workoutDays}/7
Protein goal: ${calcProtein(latestWeight,settings.proteinMultiplier)}g/day`;
}

async function callAI({model,system,history,imageBase64,imageMime}) {
  // Build messages with optional image
  const messages=history.map((m,i)=>{
    if(i===history.length-1&&imageBase64&&m.role==="user"){
      return {
        role:"user",
        content:[
          {type:"image",source:{type:"base64",media_type:imageMime||"image/jpeg",data:imageBase64}},
          {type:"text",text:m.content},
        ],
      };
    }
    return {role:m.role,content:m.content};
  });

  // Try backend first
  try {
    const r=await fetch("http://localhost:3001/coach",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model,system,history:history.map(m=>({role:m.role,content:m.content})),imageBase64,imageMime}),
      signal:AbortSignal.timeout(3000),
    });
    if(r.ok){const d=await r.json();return d.reply;}
  } catch {}

  // Fallback to direct Claude API
  const r=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,system,messages}),
  });
  if(!r.ok)throw new Error(`API ${r.status}`);
  const d=await r.json();
  return d.content?.map(b=>b.text??"").join("")??"";
}

function useVoiceInput(onResult) {
  const [listening,setListening]=useState(false);
  const supported="webkitSpeechRecognition" in window||"SpeechRecognition" in window;
  const recRef=useRef(null);
  const start=useCallback(()=>{
    if(!supported)return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const rec=new SR();rec.lang="en-IN";rec.interimResults=false;rec.maxAlternatives=1;
    rec.onstart=()=>setListening(true);rec.onend=()=>setListening(false);rec.onerror=()=>setListening(false);
    rec.onresult=(e)=>{const t=e.results[0]?.[0]?.transcript??"";if(t)onResult(t);};
    recRef.current=rec;rec.start();
  },[supported,onResult]);
  const stop=useCallback(()=>{recRef.current?.stop();setListening(false);},[]);
  return {listening,supported,start,stop};
}

// ─── HOOKS ───────────────────────────────────────────────────
function useBreakpoint() {
  const [bp,setBp]=useState(()=>{const w=window.innerWidth;if(w>=1024)return"desktop";if(w>=640)return"tablet";return"mobile";});
  useEffect(()=>{
    const fn=()=>{const w=window.innerWidth;if(w>=1024)setBp("desktop");else if(w>=640)setBp("tablet");else setBp("mobile");};
    window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);
  },[]);
  return bp;
}
function useAuth() {
  const [user,setUser]=useState(undefined);const [loading,setLoading]=useState(true);
  useEffect(()=>{const unsub=onAuthStateChanged(auth,u=>{setUser(u);setLoading(false);});return unsub;},[]);
  return {user,loading};
}
function useFirestore(uid) {
  const [data,setData]=useState(null);const [ready,setReady]=useState(false);
  const EMPTY={days:{},weightLog:[],settings:DEFAULT_SETTINGS};
  useEffect(()=>{
    if(!uid){setData(null);setReady(false);return;}
    const ref=doc(db,"users",uid);
    const unsub=onSnapshot(ref,snap=>{
      if(snap.exists()){const d=snap.data();setData({...EMPTY,...d,settings:{...DEFAULT_SETTINGS,...d.settings,homeWidgets:{...DEFAULT_SETTINGS.homeWidgets,...(d.settings?.homeWidgets||{})},workout:{days:d.settings?.workout?.days||DEFAULT_SETTINGS.workout.days},medicine:d.settings?.medicine||DEFAULT_SETTINGS.medicine}});}
      else{setData(EMPTY);setDoc(ref,EMPTY);}
      setReady(true);
    },()=>{setData(EMPTY);setReady(true);});
    return unsub;
  },[uid]);
  const save=useCallback(async(nd)=>{setData(nd);if(!uid)return;try{await setDoc(doc(db,"users",uid),nd,{merge:true});}catch(e){console.error(e);}},[uid]);
  return {data,save,ready};
}

// ─── ANIMATED BACKGROUND ─────────────────────────────────────
function AnimatedBackground() {
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    let animId,t=0;
    const resize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;};
    resize();window.addEventListener("resize",resize);
    const particles=Array.from({length:50},()=>({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.5+.5,opacity:Math.random()*.3+.08}));
    const draw=()=>{
      t+=.004;ctx.clearRect(0,0,canvas.width,canvas.height);
      const g=ctx.createRadialGradient(canvas.width*.3+Math.sin(t)*60,canvas.height*.2+Math.cos(t*.7)*40,0,canvas.width*.5,canvas.height*.5,canvas.width*.8);
      g.addColorStop(0,"rgba(200,169,126,0.04)");g.addColorStop(.5,"rgba(107,191,160,0.02)");g.addColorStop(1,"rgba(13,17,23,0)");
      ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
      const g2=ctx.createRadialGradient(canvas.width*.8+Math.cos(t*.8)*50,canvas.height*.7+Math.sin(t*.6)*50,0,canvas.width*.7,canvas.height*.6,canvas.width*.5);
      g2.addColorStop(0,"rgba(155,143,212,0.04)");g2.addColorStop(1,"rgba(13,17,23,0)");
      ctx.fillStyle=g2;ctx.fillRect(0,0,canvas.width,canvas.height);
      particles.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0)p.x=canvas.width;if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height;if(p.y>canvas.height)p.y=0;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(200,169,126,${p.opacity})`;ctx.fill();
      });
      particles.forEach((p,i)=>particles.slice(i+1).forEach(q=>{const dx=p.x-q.x,dy=p.y-q.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<110){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(200,169,126,${.1*(1-dist/110)})`;ctx.lineWidth=.5;ctx.stroke();}}));
      animId=requestAnimationFrame(draw);
    };
    draw();
    return()=>{cancelAnimationFrame(animId);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

// ─── GLOW RING ────────────────────────────────────────────────
function GlowRing({pct=0,size=72,stroke=7,color=C.gold,track=C.faint,children}) {
  const r=size/2-stroke/2,circ=2*Math.PI*r,dash=circ*Math.min(Math.max(pct,0),1);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <div style={{position:"absolute",inset:-4,borderRadius:"50%",background:`radial-gradient(circle,${color}22 0%,transparent 70%)`,filter:"blur(8px)",opacity:pct>0?.8:0,transition:"opacity .5s"}}/>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"relative",zIndex:1}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray .6s cubic-bezier(.16,1,.3,1)",filter:`drop-shadow(0 0 4px ${color}88)`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>{children}</div>
    </div>
  );
}

// ─── GLASS CARD ───────────────────────────────────────────────
function GlassCard({children,accent,glow,style={},onClick,animate=true}) {
  const base={
    background:"rgba(28,33,40,0.82)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)",
    borderRadius:16,border:`1px solid ${accent?accent+"44":"rgba(48,54,61,0.9)"}`,
    ...(accent?{borderLeftWidth:3,borderLeftColor:accent}:{}),
    ...(glow?{boxShadow:`0 0 30px ${glow}15,0 4px 24px rgba(0,0,0,0.3)`}:{boxShadow:"0 4px 24px rgba(0,0,0,0.2)"}),
    overflow:"hidden",cursor:onClick?"pointer":"default",
  };
  if(!animate) return <div onClick={onClick} style={{...base,...style}}>{children}</div>;
  return (
    <motion.div variants={scaleIn} onClick={onClick} style={{...base,...style}}
      whileHover={onClick?{scale:1.01,boxShadow:`0 0 40px ${glow||C.gold}20,0 8px 32px rgba(0,0,0,0.3)`}:{}}
      whileTap={onClick?{scale:.99}:{}}>{children}</motion.div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────
function LoadingScreen() {
  const [progress,setProgress]=useState(0);const [phase,setPhase]=useState(0);
  const phases=["Initializing system","Syncing your data","Loading AI coach","Almost ready"];
  useEffect(()=>{
    const pi=setInterval(()=>setProgress(p=>Math.min(p+Math.random()*6+2,95)),180);
    const phi=setInterval(()=>setPhase(p=>(p+1)%phases.length),1100);
    return()=>{clearInterval(pi);clearInterval(phi);};
  },[]);
  return (
    <div style={{position:"fixed",inset:0,background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,overflow:"hidden"}}>
      <AnimatedBackground/>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes counter-spin{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
      `}</style>
      <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{duration:.8,ease:[.16,1,.3,1]}}
        style={{textAlign:"center",padding:"0 32px",position:"relative",zIndex:1}}>
        <div style={{position:"relative",width:140,height:140,margin:"0 auto 36px"}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1px solid ${C.gold}22`}}/>
          <div style={{position:"absolute",inset:8,borderRadius:"50%",border:"2px solid transparent",borderTopColor:C.gold,borderRightColor:C.gold+"44",animation:"spin 3s linear infinite",boxShadow:`0 0 20px ${C.gold}33`}}/>
          <div style={{position:"absolute",inset:18,borderRadius:"50%",border:"1.5px solid transparent",borderTopColor:C.teal,borderLeftColor:C.teal+"44",animation:"counter-spin 2s linear infinite"}}/>
          <div style={{position:"absolute",inset:28,borderRadius:"50%",border:"1px solid transparent",borderTopColor:C.purple,animation:"spin 1.5s linear infinite"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:28,fontWeight:800,color:C.gold,animation:"float 3s ease-in-out infinite",textShadow:`0 0 30px ${C.gold}66`}}>V</div>
          </div>
        </div>
        <div style={{fontSize:42,fontWeight:800,background:`linear-gradient(135deg,#c8a97e 0%,#f0d9b5 35%,#c8a97e 50%,#a88050 65%,#e8c99e 100%)`,backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",letterSpacing:10,marginBottom:8,animation:"shimmer 3s linear infinite"}}>
          VEDINZEN
        </div>
        <div style={{fontSize:11,color:C.muted,letterSpacing:5,marginBottom:48,textTransform:"uppercase"}}>Personal Health System</div>
        <div style={{width:260,margin:"0 auto"}}>
          <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:1,marginBottom:16,overflow:"hidden"}}>
            <motion.div style={{height:"100%",background:`linear-gradient(90deg,${C.goldDim},${C.gold},${C.teal})`,borderRadius:1}} animate={{width:`${progress}%`}} transition={{duration:.3,ease:"easeOut"}}/>
          </div>
          <motion.div key={phase} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{fontSize:11,color:C.muted,letterSpacing:2}}>
            {phases[phase]}…
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────
function AuthScreen() {
  const [mode,setMode]=useState("login");const [email,setEmail]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");const [loading,setLoading]=useState(false);
  const submit=async()=>{setErr("");setLoading(true);try{if(mode==="login")await signInWithEmailAndPassword(auth,email,pass);else await createUserWithEmailAndPassword(auth,email,pass);}catch(e){setErr(e.message.replace("Firebase: ","").replace(/\(.*\)/,"").trim());}setLoading(false);};
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:24,position:"relative",overflow:"hidden",background:C.bg0}}>
      <AnimatedBackground/>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <motion.div initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} transition={{duration:.8,ease:[.16,1,.3,1]}} style={{width:"100%",maxWidth:380,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{position:"relative",width:80,height:80,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <motion.div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1px solid ${C.gold}33`}} animate={{rotate:360}} transition={{duration:20,repeat:Infinity,ease:"linear"}}/>
            <motion.div style={{position:"absolute",inset:8,borderRadius:"50%",border:`1px solid ${C.gold}66`}} animate={{rotate:-360}} transition={{duration:15,repeat:Infinity,ease:"linear"}}/>
            <span style={{fontSize:32,fontWeight:800,color:C.gold,textShadow:`0 0 40px ${C.gold}88`,zIndex:1}}>V</span>
          </div>
          <div style={{fontSize:36,fontWeight:800,letterSpacing:8,marginBottom:8,background:`linear-gradient(135deg,${C.gold},#f0d9b5,${C.gold})`,backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>VEDINZEN</div>
          <div style={{fontSize:13,color:C.muted,letterSpacing:2}}>Your Personal Health System</div>
        </div>
        <GlassCard glow={C.gold} style={{padding:32}} animate={false}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.gold,marginBottom:20}}>{mode==="login"?"Sign In":"Create Account"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
            {[{placeholder:"email@address.com",value:email,onChange:e=>setEmail(e.target.value),type:"email"},{placeholder:"password",value:pass,onChange:e=>setPass(e.target.value),type:"password",onKeyDown:e=>e.key==="Enter"&&submit()}].map((f,i)=>(
              <motion.input key={i} {...f} whileFocus={{borderColor:C.gold,boxShadow:`0 0 0 2px ${C.gold}22`}} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:13,fontFamily:FONT,outline:"none",width:"100%",boxSizing:"border-box",transition:"all .2s"}}/>
            ))}
          </div>
          {err&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} style={{padding:"8px 12px",marginBottom:12,background:C.redBg,border:`1px solid ${C.red}44`,borderRadius:8,fontSize:12,color:C.red}}>{err}</motion.div>}
          <motion.button onClick={submit} disabled={loading} whileHover={{scale:1.01,boxShadow:`0 0 30px ${C.gold}33`}} whileTap={{scale:.98}} style={{width:"100%",padding:"12px 20px",background:`linear-gradient(135deg,${C.goldDim},${C.gold})`,border:"none",borderRadius:10,color:C.bg0,fontSize:13,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:FONT,opacity:loading?.7:1,letterSpacing:.5}}>
            {loading?"Connecting...":mode==="login"?"Sign In →":"Create Account →"}
          </motion.button>
          <div style={{textAlign:"center",marginTop:16}}>
            <button onClick={()=>setMode(p=>p==="login"?"signup":"login")} style={{background:"transparent",border:"none",cursor:"pointer",fontFamily:FONT,fontSize:12,color:C.muted}}>
              {mode==="login"?"No account? ":"Have account? "}<span style={{color:C.gold,textDecoration:"underline"}}>{mode==="login"?"Sign up":"Sign in"}</span>
            </button>
          </div>
        </GlassCard>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:C.faint,letterSpacing:1}}>Synced across all devices · Powered by AI</div>
      </motion.div>
    </div>
  );
}

// ─── SHARED UI ────────────────────────────────────────────────
function SectionTitle({children,color=C.gold,right}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color}}>{children}</div>
      {right&&<div style={{fontSize:11,color:C.muted}}>{right}</div>}
    </div>
  );
}
function Pill({children,color=C.gold}) {
  return <span style={{display:"inline-block",padding:"2px 10px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",color,background:color+"22"}}>{children}</span>;
}
function Btn({children,onClick,variant="outline",color=C.gold,disabled,style={},full}) {
  return (
    <motion.button onClick={onClick} disabled={disabled} whileHover={!disabled?{scale:1.02}:{}} whileTap={!disabled?{scale:.97}:{}}
      style={{padding:variant==="fill"?"10px 20px":"8px 16px",background:variant==="fill"?color:"transparent",border:`1px solid ${variant==="ghost"?"transparent":color}`,borderRadius:20,color:variant==="fill"?C.bg0:color,fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:FONT,opacity:disabled?.5:1,letterSpacing:.5,width:full?"100%":"auto",...style}}>
      {children}
    </motion.button>
  );
}
function Check({checked,onClick,label,sub,color=C.gold}) {
  return (
    <motion.button onClick={onClick} whileTap={{scale:.98}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:checked?color+"12":"transparent",border:`1px solid ${checked?color+"44":C.border}`,borderRadius:10,padding:"9px 12px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
      <motion.div animate={{background:checked?color:"transparent",borderColor:checked?color:C.muted}} style={{width:18,height:18,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${C.muted}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:checked?`0 0 8px ${color}66`:"none"}}>
        {checked&&<motion.span initial={{scale:0}} animate={{scale:1}} style={{color:C.bg0,fontSize:10,fontWeight:900,lineHeight:1}}>✓</motion.span>}
      </motion.div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:checked?C.text:C.muted,fontSize:13,fontWeight:checked?600:400}}>{label}</div>
        {sub&&<div style={{color:C.muted,fontSize:11,marginTop:1,opacity:.7}}>{sub}</div>}
      </div>
    </motion.button>
  );
}
function Toggle({checked,onChange,label,color=C.gold}) {
  return (
    <button onClick={()=>onChange(!checked)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:"6px 0",fontFamily:FONT}}>
      <motion.div animate={{background:checked?color:C.faint}} style={{width:34,height:18,borderRadius:9,border:`1px solid ${checked?color:C.border}`,position:"relative",flexShrink:0}}>
        <motion.div animate={{left:checked?17:3}} style={{position:"absolute",top:3,width:10,height:10,borderRadius:"50%",background:checked?C.bg0:C.muted}}/>
      </motion.div>
      <span style={{fontSize:13,color:checked?C.text:C.muted,fontFamily:FONT}}>{label}</span>
    </button>
  );
}

// ─── FIXED INPUT — no sticky value bug ───────────────────────
function NumInput({value,onChange,placeholder,style={},onKeyDown,autoFocus,step}) {
  const [local,setLocal]=useState(value==null||value===""?"":String(value));
  useEffect(()=>{setLocal(value==null||value===""?"":String(value));},[value]);
  return (
    <motion.input
      type="number" value={local} step={step||"any"}
      placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
      onChange={e=>{setLocal(e.target.value);const n=parseFloat(e.target.value);if(!isNaN(n))onChange(n);else if(e.target.value==="")onChange("");}}
      onBlur={()=>{if(local===""||isNaN(parseFloat(local))){setLocal(value==null||value===""?"":String(value));}}}
      whileFocus={{borderColor:C.gold,boxShadow:`0 0 0 2px ${C.gold}22`}}
      style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:FONT,outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .2s",...style}}/>
  );
}

function Input({value,onChange,placeholder,type="text",step,style={},onKeyDown,autoFocus}) {
  if(type==="number") return <NumInput value={value} onChange={onChange} placeholder={placeholder} style={style} onKeyDown={onKeyDown} autoFocus={autoFocus} step={step}/>;
  return (
    <motion.input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} onKeyDown={onKeyDown} autoFocus={autoFocus}
      whileFocus={{borderColor:C.gold,boxShadow:`0 0 0 2px ${C.gold}22`}}
      style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,fontFamily:FONT,outline:"none",width:"100%",boxSizing:"border-box",transition:"border-color .2s",...style}}/>
  );
}

function Collapsible({title,color=C.gold,badge,children}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",background:"rgba(28,33,40,0.8)",backdropFilter:"blur(12px)"}}>
      <motion.button onClick={()=>setOpen(p=>!p)} whileHover={{background:"rgba(255,255,255,0.03)"}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:open?"rgba(255,255,255,0.03)":"transparent",border:"none",cursor:"pointer",fontFamily:FONT,borderBottom:open?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color}}>{title}</span>
          {badge&&<span style={{fontSize:10,color:C.muted,background:C.faint,borderRadius:10,padding:"1px 8px"}}>{badge}</span>}
        </div>
        <motion.span animate={{rotate:open?180:0}} style={{fontSize:12,color:C.muted,display:"block"}}>▼</motion.span>
      </motion.button>
      <AnimatePresence>
        {open&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.3,ease:[.16,1,.3,1]}} style={{overflow:"hidden"}}>
            <div style={{padding:16}}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChartTip({active,payload,label,unit=""}) {
  if(!active||!payload?.length)return null;
  return (
    <div style={{background:"rgba(28,33,40,0.95)",backdropFilter:"blur(12px)",border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px"}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{fontSize:13,fontWeight:700,color:p.color||C.gold}}>{p.value}{unit}</div>)}
    </div>
  );
}

const GRID=<CartesianGrid strokeDasharray="3 3" stroke={C.faint}/>;
const stepBtnStyle={width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,color:C.text,fontSize:16,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"};
const lbl={fontSize:10,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8};

// ─── NAV ─────────────────────────────────────────────────────
const NAV_ITEMS=[
  {id:"home",label:"Home",icon:"⬡"},
  {id:"today",label:"Today",icon:"◈"},
  {id:"workout",label:"Workout",icon:"◎"},
  {id:"weight",label:"Weight",icon:"▲"},
  {id:"analytics",label:"Analytics",icon:"◫"},
  {id:"coach",label:"Coach",icon:"✦"},
  {id:"history",label:"Log",icon:"◷"},
  {id:"settings",label:"Settings",icon:"⚙"},
];

function BottomNav({current,onNav,bp}) {
  const isDesktop=bp==="desktop";
  if(isDesktop) return (
    <motion.nav initial={{x:-190}} animate={{x:0}} transition={{duration:.5,ease:[.16,1,.3,1]}}
      style={{position:"fixed",left:0,top:0,bottom:0,width:190,background:"rgba(22,27,34,0.96)",backdropFilter:"blur(20px)",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"28px 0",zIndex:100,fontFamily:FONT}}>
      <div style={{padding:"0 20px 28px"}}>
        <div style={{fontSize:18,fontWeight:800,background:`linear-gradient(135deg,${C.gold},#e8c99e)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3}}>Vedinzen</div>
        <div style={{fontSize:10,color:C.muted,marginTop:2,letterSpacing:1}}>Health System</div>
      </div>
      {NAV_ITEMS.map(n=>{
        const active=current===n.id;
        return (
          <motion.button key={n.id} onClick={()=>onNav(n.id)} whileHover={{x:4,background:"rgba(255,255,255,0.04)"}}
            style={{display:"flex",alignItems:"center",gap:10,padding:"11px 20px",background:active?"rgba(200,169,126,0.1)":"transparent",border:"none",borderLeft:`2px solid ${active?C.gold:"transparent"}`,cursor:"pointer",fontFamily:FONT,textAlign:"left",transition:"border-color .2s",width:"100%"}}>
            <motion.span animate={{color:active?C.gold:C.muted,scale:active?1.1:1}} style={{fontSize:15}}>{n.icon}</motion.span>
            <span style={{fontSize:12,color:active?C.gold:C.muted,fontWeight:active?700:400}}>{n.label}</span>
            {active&&<motion.div layoutId="nav-dot" style={{marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:C.gold,boxShadow:`0 0 8px ${C.gold}`}}/>}
          </motion.button>
        );
      })}
    </motion.nav>
  );
  return (
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:bp==="tablet"?768:520,zIndex:100}}>
      <div style={{background:"rgba(22,27,34,0.96)",backdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",alignItems:"center",padding:"6px 0 10px"}}>
        {NAV_ITEMS.map(n=>{
          const active=current===n.id;
          return (
            <motion.button key={n.id} onClick={()=>onNav(n.id)} whileTap={{scale:.85}}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"transparent",border:"none",cursor:"pointer",padding:"4px 3px",borderRadius:10,fontFamily:FONT,position:"relative"}}>
              <motion.span animate={{color:active?C.gold:C.muted,scale:active?1.15:1}} transition={{type:"spring",stiffness:400,damping:20}} style={{fontSize:bp==="tablet"?15:13}}>{n.icon}</motion.span>
              <span style={{fontSize:7,fontWeight:active?700:400,color:active?C.gold:C.muted,letterSpacing:.3}}>{n.label}</span>
              {active&&<motion.div layoutId="tab-dot" style={{position:"absolute",bottom:-2,width:20,height:2,background:C.gold,borderRadius:1,boxShadow:`0 0 8px ${C.gold}`}}/>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WEIGHT JOURNEY BAR ───────────────────────────────────────
function WeightJourneyBar({latestWeight,settings}) {
  const {startWeight,goalWeight,goalMode="gain"}=settings;
  const mode=GOAL_MODES[goalMode]||GOAL_MODES.gain;
  const isLose=goalMode==="lose";
  const milestones=calcMilestones(startWeight,goalWeight,goalMode);
  const changed=Math.abs(latestWeight-startWeight).toFixed(1);
  const toGo=Math.abs(goalWeight-latestWeight).toFixed(1);
  const totalDiff=Math.abs(goalWeight-startWeight)||1;
  const pct=Math.max(0,Math.min(1,Math.abs(latestWeight-startWeight)/totalDiff));
  const next=milestones.find(m=>isLose?m.w<latestWeight:m.w>latestWeight)??milestones.at(-1);
  return (
    <GlassCard accent={mode.color} glow={mode.color} style={{padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <SectionTitle color={mode.color}>Weight Journey</SectionTitle>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:mode.color,background:mode.color+"22",padding:"3px 10px",borderRadius:20,fontWeight:700}}>{mode.icon} {mode.label}</span>
          <div style={{fontSize:24,fontWeight:700,color:mode.color,lineHeight:1,textShadow:`0 0 20px ${mode.color}66`}}>{latestWeight}<span style={{fontSize:12,color:C.muted,fontWeight:400}}> kg</span></div>
        </div>
      </div>
      <div style={{position:"relative",height:8,background:C.faint,borderRadius:4,marginBottom:8}}>
        <motion.div initial={{width:0}} animate={{width:`${pct*100}%`}} transition={{duration:1,ease:[.16,1,.3,1]}}
          style={{height:8,background:mode.color,borderRadius:4,boxShadow:`0 0 12px ${mode.color}66`}}/>
        {milestones.map(m=>{
          const mp=Math.abs(m.w-startWeight)/totalDiff*100;
          const reached=isLose?latestWeight<=m.w:latestWeight>=m.w;
          return <motion.div key={m.w} animate={{background:reached?mode.color:C.faint,boxShadow:reached?`0 0 8px ${mode.color}`:"none"}} style={{position:"absolute",top:-2,left:`${mp}%`,width:12,height:12,borderRadius:"50%",border:`2px solid ${reached?mode.color:C.muted}`,transform:"translateX(-50%)"}}/>;
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:12}}>
        <span>{startWeight} kg</span>
        <span style={{color:mode.color,fontWeight:600}}>Next: {next.label} @ {next.w} kg</span>
        <span>{goalWeight} kg</span>
      </div>
      <div style={{display:"flex",gap:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
        {[
          {label:isLose?"lost":"gained",value:`${isLose?"-":"+"}${changed}`,color:mode.color},
          {label:"to go",value:toGo,color:C.coral},
          {label:"done",value:`${Math.round(pct*100)}%`,color:C.gold},
          {label:"protein",value:`${calcProtein(latestWeight,settings.proteinMultiplier)}g`,color:C.blue},
        ].map(s=>(
          <motion.div key={s.label} whileHover={{scale:1.05}} style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:s.color,lineHeight:1,textShadow:`0 0 10px ${s.color}44`}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────
function HomeScreen({data,todayData,updateToday,latestWeight,streak,settings,bp}) {
  const w=settings.homeWidgets||{};
  const cal=calcCal(todayData.meals,settings.meals);
  const score=dayScore(todayData,settings);
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  const goalMode=settings.goalMode||"gain";
  const mode=GOAL_MODES[goalMode];
  return (
    <div style={{paddingBottom:80,position:"relative"}}>
      <div style={{background:"rgba(22,27,34,0.9)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,padding:isTabletPlus?"28px 32px 24px":"20px 16px 18px",position:"sticky",top:0,zIndex:10}}>
        <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{duration:.5}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>
            {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontSize:isTabletPlus?26:22,fontWeight:700,color:C.text}}>{getGreeting()}</div>
              <div style={{fontSize:13,color:C.muted,marginTop:4}}>
                Score: <motion.span animate={{color:scoreColor(score)}} style={{fontWeight:700}}>{score}/100</motion.span>
                <span style={{marginLeft:10,fontSize:11,color:mode.color,background:mode.color+"22",padding:"2px 8px",borderRadius:20,fontWeight:600}}>{mode.icon} {mode.label}</span>
              </div>
            </div>
            <motion.div whileHover={{scale:1.05}} style={{textAlign:"right"}}>
              <div style={{fontSize:isTabletPlus?32:28,fontWeight:800,color:C.gold,lineHeight:1,textShadow:`0 0 30px ${C.gold}66`}}>{streak}</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:1,textTransform:"uppercase"}}>Day Streak 🔥</div>
            </motion.div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[
              {label:"Cal In",val:cal,show:w.calories,color:C.gold},
              {label:"Steps",val:todayData.steps||0,show:w.steps,color:C.blue},
              {label:"Burned",val:todayData.caloriesBurned||0,show:w.calories,color:C.coral},
              {label:"Protein",val:`${calcProtein(latestWeight,settings.proteinMultiplier)}g`,show:w.protein,color:C.purple},
            ].filter(s=>s.show!==false).slice(0,4).map(s=>(
              <div key={s.label} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 8px",textAlign:"center",backdropFilter:"blur(8px)"}}>
                <div style={{fontSize:isTabletPlus?16:14,fontWeight:700,color:s.color,lineHeight:1,textShadow:`0 0 10px ${s.color}44`}}>{s.val}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:3}}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <motion.div variants={stagger} initial="hidden" animate="visible"
        style={{padding:isTabletPlus?"20px 32px 0":"14px 16px 0",display:"grid",gridTemplateColumns:isTabletPlus?"1fr 1fr":"1fr",gap:12}}>
        {w.weight!==false&&(<motion.div variants={fadeUp} style={{gridColumn:isTabletPlus?"1/-1":"auto"}}><WeightJourneyBar latestWeight={latestWeight} settings={settings}/></motion.div>)}
        <motion.div variants={fadeUp} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {w.workout!==false&&(
            <GlassCard style={{padding:14}}>
              <div style={lbl}>Workout</div>
              <motion.button onClick={()=>updateToday({workout:!todayData.workout})} whileHover={{scale:1.02}} whileTap={{scale:.97}}
                style={{width:"100%",padding:"14px 0",background:todayData.workout?C.coralBg:"transparent",border:`1.5px solid ${todayData.workout?C.coral:C.border}`,borderRadius:10,cursor:"pointer",transition:"all .2s",boxShadow:todayData.workout?`0 0 20px ${C.coral}33`:"none"}}>
                <motion.div animate={{scale:todayData.workout?1.2:1}} style={{fontSize:20}}>{todayData.workout?"💪":"🏋️"}</motion.div>
                <div style={{fontSize:11,color:todayData.workout?C.coral:C.muted,fontWeight:600,marginTop:4}}>{todayData.workout?"Done!":"Tap to log"}</div>
              </motion.button>
            </GlassCard>
          )}
          <GlassCard style={{padding:14}}>
            <div style={lbl}>Sleep</div>
            <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
              <motion.button onClick={()=>updateToday({sleep:Math.max(0,(todayData.sleep??0)-.5)})} whileHover={{scale:1.1}} whileTap={{scale:.9}} style={stepBtnStyle}>−</motion.button>
              <div style={{textAlign:"center",minWidth:52}}>
                <motion.div animate={{color:(todayData.sleep??0)>=8?C.blue:C.coral}} style={{fontSize:26,fontWeight:700,lineHeight:1}}>{todayData.sleep??0}</motion.div>
                <div style={{fontSize:9,color:C.muted}}>hrs · goal 8+</div>
              </div>
              <motion.button onClick={()=>updateToday({sleep:Math.min(12,(todayData.sleep??0)+.5)})} whileHover={{scale:1.1}} whileTap={{scale:.9}} style={stepBtnStyle}>+</motion.button>
            </div>
          </GlassCard>
        </motion.div>
        {(w.steps!==false||w.calories!==false)&&(
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:14}}>
              <SectionTitle color={C.gold}>Activity</SectionTitle>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {w.steps!==false&&(
                  <div>
                    <div style={lbl}>Steps Today</div>
                    <Input type="number" value={todayData.steps||""} placeholder="0" onChange={v=>updateToday({steps:parseInt(v)||0})}/>
                    <div style={{height:4,background:C.faint,borderRadius:2,marginTop:6,overflow:"hidden"}}>
                      <motion.div animate={{width:`${Math.min(100,((todayData.steps||0)/10000)*100)}%`}} transition={{duration:.8}} style={{height:4,background:`linear-gradient(90deg,${C.blue}88,${C.blue})`,borderRadius:2}}/>
                    </div>
                    <div style={{fontSize:10,color:C.muted,marginTop:3}}>{(todayData.steps||0).toLocaleString()} / 10,000</div>
                  </div>
                )}
                {w.calories!==false&&(
                  <div>
                    <div style={lbl}>Calories Burned</div>
                    <Input type="number" value={todayData.caloriesBurned||""} placeholder="0" onChange={v=>updateToday({caloriesBurned:parseInt(v)||0})}/>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
        {w.meals!==false&&(
          <motion.div variants={fadeUp} style={{gridColumn:isTabletPlus?"1/-1":"auto"}}>
            <GlassCard accent={C.gold} glow={C.gold} style={{padding:14}}>
              <SectionTitle color={C.gold} right={`${cal} / ${settings.dailyCal} cal`}>Meals Today</SectionTitle>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {settings.meals.map(m=>(
                  <motion.button key={m.id} onClick={()=>{const cur=todayData.meals??{};updateToday({meals:{...cur,[m.id]:!cur[m.id]}});}}
                    whileHover={{scale:1.05}} whileTap={{scale:.93}}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",background:todayData.meals?.[m.id]?C.goldBg:"rgba(255,255,255,0.03)",border:`1px solid ${todayData.meals?.[m.id]?C.gold:C.border}`,borderRadius:10,cursor:"pointer",flex:1,minWidth:42}}>
                    <motion.span animate={{scale:todayData.meals?.[m.id]?1.2:1}} style={{fontSize:18}}>{m.icon}</motion.span>
                    <span style={{fontSize:9,color:todayData.meals?.[m.id]?C.gold:C.muted,fontWeight:600}}>{m.label.split(" ")[0]}</span>
                  </motion.button>
                ))}
              </div>
              <div style={{height:4,background:C.faint,borderRadius:2,marginTop:10,overflow:"hidden"}}>
                <motion.div animate={{width:`${Math.min(100,(cal/settings.dailyCal)*100)}%`}} transition={{duration:.8}} style={{height:4,background:`linear-gradient(90deg,${C.goldDim},${C.gold})`,borderRadius:2,boxShadow:`0 0 8px ${C.gold}66`}}/>
              </div>
            </GlassCard>
          </motion.div>
        )}
        <motion.div variants={fadeUp}>
          <GlassCard style={{padding:14}}>
            <SectionTitle color={C.blue} right={`${todayData.water??0}/8`}>Water</SectionTitle>
            <div style={{display:"flex",gap:5}}>
              {Array.from({length:8},(_,i)=>(
                <motion.button key={i} onClick={()=>updateToday({water:i<(todayData.water??0)?i:i+1})}
                  whileHover={{scale:1.1}} whileTap={{scale:.85}}
                  animate={{background:i<(todayData.water??0)?C.blueBg:"rgba(255,255,255,0.03)",borderColor:i<(todayData.water??0)?C.blue:C.border}}
                  style={{flex:1,height:34,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:14}}>💧</motion.button>
              ))}
            </div>
          </GlassCard>
        </motion.div>
        {w.medicine!==false&&(settings.medicine||[]).length>0&&(
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:14}}>
              <SectionTitle color={C.blue} right={`${Object.values(todayData.medicine??{}).filter(Boolean).length}/${settings.medicine.length}`}>Medicine</SectionTitle>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {settings.medicine.map(m=>(
                  <Check key={m.id} checked={!!todayData.medicine?.[m.id]} onClick={()=>{const cur=todayData.medicine??{};updateToday({medicine:{...cur,[m.id]:!cur[m.id]}});}} label={m.label} sub={`${m.time} · ${m.dose}`} color={C.blue}/>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
        {w.skin!==false&&(
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:14}}>
              <SectionTitle color={C.teal} right={`${Object.values(todayData.skincare??{}).filter(Boolean).length}/${settings.skincare.length}`}>Skincare</SectionTitle>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {settings.skincare.map(s=>(
                  <motion.button key={s.id} onClick={()=>{const cur=todayData.skincare??{};updateToday({skincare:{...cur,[s.id]:!cur[s.id]}});}}
                    whileHover={{scale:1.05}} whileTap={{scale:.95}}
                    style={{padding:"5px 8px",background:todayData.skincare?.[s.id]?C.tealBg:"transparent",border:`1px solid ${todayData.skincare?.[s.id]?C.teal:C.border}`,borderRadius:8,cursor:"pointer"}}>
                    <span style={{fontSize:10,color:todayData.skincare?.[s.id]?C.teal:C.muted}}>{s.label}</span>
                  </motion.button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ─── TODAY SCREEN ─────────────────────────────────────────────
function TodayScreen({todayData,updateToday,settings,bp}) {
  const toggle=(field,id)=>{const cur=todayData[field]??{};updateToday({[field]:{...cur,[id]:!cur[id]}});};
  const cal=calcCal(todayData.meals,settings.meals);
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible"
      style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:12}}>
      <motion.div variants={fadeUp} style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text,marginBottom:4}}>Daily Checklist</motion.div>
      <motion.div variants={fadeUp}>
        <GlassCard accent={C.purple} glow={C.purple} style={{padding:14}}>
          <SectionTitle color={C.purple} right={`${Object.values(todayData.study??{}).filter(Boolean).length}/${settings.study.length}`}>Study Sessions</SectionTitle>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {settings.study.map(s=><Check key={s.id} checked={!!todayData.study?.[s.id]} onClick={()=>toggle("study",s.id)} label={s.label} sub={`${s.time} · ${s.topic}`} color={C.purple}/>)}
          </div>
        </GlassCard>
      </motion.div>
      <motion.div variants={fadeUp}>
        <GlassCard accent={C.gold} glow={C.gold} style={{padding:14}}>
          <SectionTitle color={C.gold} right={`${cal}/${settings.dailyCal} kcal`}>Meals & Nutrition</SectionTitle>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {settings.meals.map(m=><Check key={m.id} checked={!!todayData.meals?.[m.id]} onClick={()=>toggle("meals",m.id)} label={`${m.icon} ${m.label}`} sub={`${m.time} · ${m.cal} cal`} color={C.gold}/>)}
          </div>
          <div style={{height:3,background:C.faint,borderRadius:2,marginTop:10,overflow:"hidden"}}>
            <motion.div animate={{width:`${Math.min(100,(cal/settings.dailyCal)*100)}%`}} transition={{duration:.8}} style={{height:3,background:`linear-gradient(90deg,${C.goldDim},${C.gold})`,borderRadius:2}}/>
          </div>
        </GlassCard>
      </motion.div>
      <motion.div variants={fadeUp}>
        <GlassCard accent={C.teal} glow={C.teal} style={{padding:14}}>
          <SectionTitle color={C.teal} right={`${Object.values(todayData.skincare??{}).filter(Boolean).length}/${settings.skincare.length}`}>Skincare Routine</SectionTitle>
          {["am","pm"].map(phase=>(
            settings.skincare.filter(s=>s.phase===phase).length>0&&(
              <div key={phase} style={{marginBottom:12}}>
                <div style={{marginBottom:8}}><Pill color={phase==="am"?C.gold:C.purple}>{phase==="am"?"☀️ Morning":"🌙 Night"}</Pill></div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {settings.skincare.filter(s=>s.phase===phase).map(s=><Check key={s.id} checked={!!todayData.skincare?.[s.id]} onClick={()=>toggle("skincare",s.id)} label={s.label} color={phase==="am"?C.teal:C.purple}/>)}
                </div>
              </div>
            )
          ))}
        </GlassCard>
      </motion.div>
      {(settings.medicine||[]).length>0&&(
        <motion.div variants={fadeUp}>
          <GlassCard accent={C.blue} glow={C.blue} style={{padding:14}}>
            <SectionTitle color={C.blue} right={`${Object.values(todayData.medicine??{}).filter(Boolean).length}/${settings.medicine.length}`}>Medicine Routine</SectionTitle>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {settings.medicine.map(m=><Check key={m.id} checked={!!todayData.medicine?.[m.id]} onClick={()=>toggle("medicine",m.id)} label={m.label} sub={`${m.time} · ${m.dose}`} color={C.blue}/>)}
            </div>
          </GlassCard>
        </motion.div>
      )}
      <motion.div variants={fadeUp} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <GlassCard style={{padding:14}}>
          <div style={lbl}>Workout</div>
          <motion.button onClick={()=>updateToday({workout:!todayData.workout})} whileHover={{scale:1.02}} whileTap={{scale:.97}}
            style={{width:"100%",padding:"16px 0",background:todayData.workout?C.coralBg:"transparent",border:`1.5px solid ${todayData.workout?C.coral:C.border}`,borderRadius:12,cursor:"pointer",boxShadow:todayData.workout?`0 0 20px ${C.coral}33`:"none"}}>
            <motion.div animate={{scale:todayData.workout?1.3:1}} style={{fontSize:22}}>{todayData.workout?"💪":"🏋️"}</motion.div>
            <div style={{fontSize:11,color:todayData.workout?C.coral:C.muted,fontWeight:600,marginTop:4}}>{todayData.workout?"Done!":"Log it"}</div>
          </motion.button>
        </GlassCard>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <GlassCard style={{padding:14}}>
            <div style={lbl}>Sleep</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <motion.button onClick={()=>updateToday({sleep:Math.max(0,(todayData.sleep??0)-.5)})} whileHover={{scale:1.1}} whileTap={{scale:.85}} style={stepBtnStyle}>−</motion.button>
              <motion.div animate={{color:(todayData.sleep??0)>=8?C.blue:C.coral}} style={{fontSize:20,fontWeight:700,lineHeight:1}}>{todayData.sleep??0}h</motion.div>
              <motion.button onClick={()=>updateToday({sleep:Math.min(12,(todayData.sleep??0)+.5)})} whileHover={{scale:1.1}} whileTap={{scale:.85}} style={stepBtnStyle}>+</motion.button>
            </div>
          </GlassCard>
          <GlassCard style={{padding:14}}>
            <div style={lbl}>Water</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
              {Array.from({length:8},(_,i)=>(
                <motion.button key={i} onClick={()=>updateToday({water:i<(todayData.water??0)?i:i+1})} whileHover={{scale:1.15}} whileTap={{scale:.8}}
                  animate={{background:i<(todayData.water??0)?C.blueBg:"rgba(255,255,255,0.05)"}}
                  style={{width:20,height:20,borderRadius:5,border:"none",cursor:"pointer",fontSize:10}}>💧</motion.button>
              ))}
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>{todayData.water??0}/8</div>
          </GlassCard>
        </div>
      </motion.div>
      <motion.div variants={fadeUp}>
        <GlassCard style={{padding:14}}>
          <SectionTitle color={C.teal}>Acne Severity</SectionTitle>
          <div style={{display:"flex",gap:6}}>
            {ACNE_LABELS.map((lb,i)=>(
              <motion.button key={i} onClick={()=>updateToday({acneSeverity:i})} whileHover={{scale:1.05}} whileTap={{scale:.93}}
                animate={{background:todayData.acneSeverity===i?ACNE_COLORS[i]+"33":"rgba(255,255,255,0.04)",boxShadow:todayData.acneSeverity===i?`0 0 12px ${ACNE_COLORS[i]}44`:"none"}}
                style={{flex:1,padding:"10px 2px",borderRadius:8,border:`1px solid ${todayData.acneSeverity===i?ACNE_COLORS[i]:C.border}`,cursor:"pointer",color:todayData.acneSeverity===i?C.text:C.muted,fontSize:9,fontWeight:600}}>{lb}</motion.button>
            ))}
          </div>
        </GlassCard>
      </motion.div>
      <motion.div variants={fadeUp}>
        <GlassCard style={{padding:14}}>
          <SectionTitle color={C.muted}>Notes</SectionTitle>
          <textarea value={todayData.notes??""} onChange={e=>updateToday({notes:e.target.value})} placeholder="How did today go?"
            style={{width:"100%",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontFamily:FONT,fontSize:13,padding:12,height:90,outline:"none",boxSizing:"border-box",lineHeight:1.6,resize:"none"}}/>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

// ─── WORKOUT SCREEN ───────────────────────────────────────────
function WorkoutScreen({data,save,settings,bp}) {
  const workout=settings.workout||DEFAULT_SETTINGS.workout;
  const [selectedDay,setSelectedDay]=useState(0);
  const [editingDay,setEditingDay]=useState(null);
  const [editingEx,setEditingEx]=useState(null);
  const [newEx,setNewEx]=useState({name:"",sets:"3",reps:"10"});
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  const goalMode=settings.goalMode||"gain";const mode=GOAL_MODES[goalMode];
  const updateWorkout=useCallback((nw)=>save({...data,settings:{...settings,workout:nw}}),[data,save,settings]);
  const addDay=()=>updateWorkout({days:[...workout.days,{id:`d${genId()}`,name:`Day ${workout.days.length+1}`,exercises:[]}]});
  const removeDay=(id)=>{updateWorkout({days:workout.days.filter(d=>d.id!==id)});if(selectedDay>=workout.days.length-1)setSelectedDay(Math.max(0,selectedDay-1));};
  const addExercise=(dayId)=>{if(!newEx.name.trim())return;const ex={id:`e${genId()}`,name:newEx.name,sets:parseInt(newEx.sets)||3,reps:newEx.reps||"10"};updateWorkout({days:workout.days.map(d=>d.id===dayId?{...d,exercises:[...d.exercises,ex]}:d)});setNewEx({name:"",sets:"3",reps:"10"});};
  const removeExercise=(dayId,exId)=>updateWorkout({days:workout.days.map(d=>d.id===dayId?{...d,exercises:d.exercises.filter(e=>e.id!==exId)}:d)});
  const updateExercise=(dayId,exId,field,value)=>updateWorkout({days:workout.days.map(d=>d.id===dayId?{...d,exercises:d.exercises.map(e=>e.id===exId?{...e,[field]:value}:e)}:d)});
  const day=workout.days[selectedDay];
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:12}}>
      <motion.div variants={fadeUp} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text}}>Workout Plan</div>
          <div style={{fontSize:11,color:mode.color,marginTop:2}}>{mode.icon} {mode.label} · {mode.workoutFocus}</div>
        </div>
        <Btn onClick={addDay} color={C.teal}>+ Add Day</Btn>
      </motion.div>
      <motion.div variants={fadeUp} style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
        {workout.days.map((d,i)=>(
          <motion.button key={d.id} onClick={()=>setSelectedDay(i)} whileHover={{scale:1.05}} whileTap={{scale:.93}}
            animate={{background:selectedDay===i?C.goldBg:"transparent",borderColor:selectedDay===i?C.gold:C.border}}
            style={{padding:"6px 14px",flexShrink:0,border:`1px solid ${C.border}`,borderRadius:20,cursor:"pointer",fontFamily:FONT}}>
            <span style={{fontSize:11,color:selectedDay===i?C.gold:C.muted,fontWeight:selectedDay===i?700:400}}>D{i+1}</span>
          </motion.button>
        ))}
      </motion.div>
      {day&&(
        <>
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                {editingDay===day.id?<Input value={day.name} onChange={v=>updateWorkout({days:workout.days.map(d=>d.id===day.id?{...d,name:v}:d)})} style={{flex:1}}/>:<div style={{fontSize:14,fontWeight:700,color:C.text,flex:1}}>{day.name}</div>}
                <div style={{display:"flex",gap:6}}>
                  <Btn onClick={()=>setEditingDay(editingDay===day.id?null:day.id)} color={C.gold} style={{padding:"6px 12px",fontSize:11}}>{editingDay===day.id?"Done":"Rename"}</Btn>
                  <Btn onClick={()=>removeDay(day.id)} color={C.red} style={{padding:"6px 12px",fontSize:11}}>Delete</Btn>
                </div>
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:6}}>{day.exercises.length} exercises</div>
            </GlassCard>
          </motion.div>
          <AnimatePresence>
            {day.exercises.map((ex,i)=>(
              <motion.div key={ex.id} variants={slideRight} initial="hidden" animate="visible" exit={{opacity:0,x:-20,height:0}}>
                <GlassCard style={{padding:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,color:C.muted,minWidth:22,fontWeight:700}}>{String(i+1).padStart(2,"0")}</span>
                    {editingEx===ex.id?(
                      <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap"}}>
                        <Input value={ex.name} onChange={v=>updateExercise(day.id,ex.id,"name",v)} style={{flex:2,minWidth:120}}/>
                        <Input value={String(ex.sets)} type="number" onChange={v=>updateExercise(day.id,ex.id,"sets",parseInt(v)||1)} style={{width:60}} placeholder="Sets"/>
                        <Input value={ex.reps} onChange={v=>updateExercise(day.id,ex.id,"reps",v)} style={{width:80}} placeholder="Reps"/>
                        <Btn onClick={()=>setEditingEx(null)} color={C.teal} style={{fontSize:11}}>Done</Btn>
                      </div>
                    ):(
                      <>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.text}}>{ex.name}</div>
                          <div style={{fontSize:11,color:C.muted,marginTop:2}}>{ex.sets} sets × {ex.reps} reps</div>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <motion.button onClick={()=>setEditingEx(ex.id)} whileHover={{scale:1.1}} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"none",color:C.muted,cursor:"pointer",fontSize:13}}>✏</motion.button>
                          <motion.button onClick={()=>removeExercise(day.id,ex.id)} whileHover={{scale:1.1}} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"none",color:C.red,cursor:"pointer",fontSize:16}}>×</motion.button>
                        </div>
                      </>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
          <motion.div variants={fadeUp}>
            <GlassCard accent={C.teal} glow={C.teal} style={{padding:14}}>
              <SectionTitle color={C.teal}>Add Exercise</SectionTitle>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Input value={newEx.name} onChange={v=>setNewEx(p=>({...p,name:v}))} placeholder="Exercise name" style={{flex:2,minWidth:120}}/>
                <Input value={newEx.sets} type="number" onChange={v=>setNewEx(p=>({...p,sets:v}))} placeholder="Sets" style={{width:65}}/>
                <Input value={newEx.reps} onChange={v=>setNewEx(p=>({...p,reps:v}))} placeholder="Reps" style={{width:80}}/>
                <Btn onClick={()=>addExercise(day.id)} variant="fill" disabled={!newEx.name.trim()}>Add</Btn>
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// ─── WEIGHT SCREEN — with edit/delete log + fixed input ───────
function WeightScreen({data,save,latestWeight,settings,bp}) {
  const [input,setInput]=useState("");
  const [showLog,setShowLog]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editIdx,setEditIdx]=useState(null);
  const [editVal,setEditVal]=useState("");
  const log=data.weightLog??[];
  const {startWeight,goalWeight,heightM,proteinMultiplier,goalMode="gain"}=settings;
  const isLose=goalMode==="lose";const mode=GOAL_MODES[goalMode];
  const milestones=calcMilestones(startWeight,goalWeight,goalMode);
  const isTabletPlus=bp==="tablet"||bp==="desktop";

  const doLog=async()=>{
    const w=parseFloat(input);if(isNaN(w)||w<20||w>300)return;
    setSaving(true);
    await save({...data,weightLog:[...log,{date:todayKey(),w,id:genId()}]});
    setInput("");setSaving(false);setShowLog(false);
  };

  const doDelete=async(idx)=>{
    const newLog=log.filter((_,i)=>i!==idx);
    await save({...data,weightLog:newLog});
  };

  const doEdit=async(idx)=>{
    const w=parseFloat(editVal);if(isNaN(w)||w<20||w>300)return;
    const newLog=log.map((e,i)=>i===idx?{...e,w}:e);
    await save({...data,weightLog:newLog});
    setEditIdx(null);setEditVal("");
  };

  const chartData=log.slice(-30).map(e=>({date:fmtDate(e.date),weight:e.w}));
  const changed=Math.abs(latestWeight-startWeight).toFixed(1);
  const toGo=Math.abs(goalWeight-latestWeight).toFixed(1);
  const totalDiff=Math.abs(goalWeight-startWeight)||1;
  const pct=Math.min(100,Math.round(Math.abs(latestWeight-startWeight)/totalDiff*100));
  const bmi=(latestWeight/(heightM*heightM)).toFixed(1);
  const weeksLeft=Math.ceil(Math.abs(goalWeight-latestWeight)/0.5);
  const protein=calcProtein(latestWeight,proteinMultiplier);
  const modeColor=mode.color;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:12}}>
      <motion.div variants={fadeUp} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text}}>Weight Tracker</div>
          <div style={{fontSize:11,color:modeColor,marginTop:2}}>{mode.icon} {mode.label}</div>
        </div>
        <Btn onClick={()=>setShowLog(true)} variant="fill">+ Log Weight</Btn>
      </motion.div>

      <motion.div variants={fadeUp} style={{display:"grid",gridTemplateColumns:isTabletPlus?"repeat(4,1fr)":"repeat(3,1fr)",gap:10}}>
        {[
          {label:"Current",val:`${latestWeight}`,unit:"kg",color:C.gold},
          {label:isLose?"Lost":"Gained",val:`${isLose?"-":"+"}${changed}`,unit:"kg",color:modeColor},
          {label:"To Goal",val:toGo,unit:"kg",color:C.coral},
          ...(isTabletPlus?[{label:"BMI",val:bmi,unit:bmi<18.5?"Low":bmi<25?"OK":"High",color:bmi<18.5?C.blue:bmi<25?C.teal:C.red}]:[]),
        ].map(s=>(
          <GlassCard key={s.label} glow={s.color} style={{padding:"12px 10px",textAlign:"center"}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:700,color:s.color,lineHeight:1,textShadow:`0 0 15px ${s.color}44`}}>{s.val}</div>
            <div style={{fontSize:11,color:C.muted}}>{s.unit}</div>
          </GlassCard>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} style={{display:"grid",gridTemplateColumns:isTabletPlus?"1fr 1fr":"1fr",gap:10}}>
        <GlassCard style={{padding:14}}>
          <SectionTitle color={C.gold}>Stats</SectionTitle>
          {[
            {l:"Progress",v:`${pct}%`,c:C.gold},
            {l:"BMI",v:bmi,c:bmi<18.5?C.blue:bmi<25?C.teal:C.red,note:bmi<18.5?"Underweight":bmi<25?"Healthy":"Overweight"},
            {l:"Goal",v:`${goalWeight} kg`,c:modeColor},
            {l:"Est. weeks",v:`${weeksLeft}w`,c:C.purple,note:"at 0.5kg/week"},
            {l:"Protein goal",v:`${protein}g/day`,c:C.blue,note:`${proteinMultiplier}g × kg`},
            {l:"Cal target",v:`${settings.dailyCal} kcal`,c:C.gold,note:isLose?"Deficit":"Surplus"},
            {l:"Entries",v:log.length,c:C.muted},
          ].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.faint}`}}>
              <span style={{fontSize:11,color:C.muted}}>{r.l}</span>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:12,fontWeight:700,color:r.c,textShadow:`0 0 8px ${r.c}44`}}>{r.v}</span>
                {r.note&&<div style={{fontSize:9,color:C.muted}}>{r.note}</div>}
              </div>
            </div>
          ))}
        </GlassCard>
        <GlassCard style={{padding:14}}>
          <SectionTitle color={modeColor}>Milestones</SectionTitle>
          {milestones.map(m=>{
            const reached=isLose?latestWeight<=m.w:latestWeight>=m.w;
            return (
              <motion.div key={m.w} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <motion.div animate={{background:reached?modeColor:C.faint,boxShadow:reached?`0 0 12px ${modeColor}66`:"none"}}
                  style={{width:26,height:26,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:reached?C.bg0:C.muted}}>
                  {reached?"✓":"·"}
                </motion.div>
                <div style={{flex:1,fontSize:13,color:reached?C.text:C.muted,fontWeight:reached?600:400}}>{m.label}</div>
                <div style={{fontSize:13,fontWeight:700,color:reached?modeColor:C.muted}}>{m.w} kg</div>
              </motion.div>
            );
          })}
        </GlassCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <GlassCard style={{padding:"14px 8px 14px 4px"}}>
          <div style={{padding:"0 12px 10px"}}><SectionTitle color={modeColor}>Weight Trend</SectionTitle></div>
          {chartData.length>=2?(
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{top:5,right:16,left:-10,bottom:0}}>
                <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={modeColor} stopOpacity={.25}/><stop offset="95%" stopColor={modeColor} stopOpacity={0}/></linearGradient></defs>
                {GRID}
                <XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis domain={[Math.min(startWeight,goalWeight)-2,Math.max(startWeight,goalWeight)+2]} tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip unit=" kg"/>}/>
                <ReferenceLine y={goalWeight} stroke={modeColor} strokeDasharray="4 4" label={{value:`Goal ${goalWeight}kg`,fill:modeColor,fontSize:9}}/>
                <Area type="monotone" dataKey="weight" stroke={modeColor} strokeWidth={2} fill="url(#wg)" dot={{fill:modeColor,r:3}} activeDot={{r:5}}/>
              </AreaChart>
            </ResponsiveContainer>
          ):(
            <div style={{height:160,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}>
              <div style={{fontSize:28}}>⚖️</div>
              <div style={{color:C.muted,fontSize:13}}>Log at least 2 entries to see chart</div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Log history with edit + delete */}
      {log.length>0&&(
        <motion.div variants={fadeUp}>
          <GlassCard style={{padding:14}}>
            <SectionTitle color={C.muted}>Log History</SectionTitle>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
              {[...log].reverse().map((e,revIdx)=>{
                const idx=log.length-1-revIdx;
                const prev=log[idx-1];
                const diff=prev?e.w-prev.w:0;
                const goodDiff=isLose?diff<0:diff>0;
                const isEditing=editIdx===idx;
                return (
                  <motion.div key={idx} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:revIdx*.02}}
                    style={{padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:`1px solid ${C.border}`}}>
                    {isEditing?(
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:11,color:C.muted,minWidth:60}}>{fmtShort(e.date)}</span>
                        <NumInput value={editVal} onChange={v=>setEditVal(v)} placeholder="kg" style={{flex:1,padding:"5px 10px",fontSize:13}} step="0.1"/>
                        <motion.button onClick={()=>doEdit(idx)} whileHover={{scale:1.05}} whileTap={{scale:.95}}
                          style={{padding:"5px 12px",background:C.teal,border:"none",borderRadius:8,color:C.bg0,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT}}>Save</motion.button>
                        <motion.button onClick={()=>{setEditIdx(null);setEditVal("");}} whileHover={{scale:1.05}}
                          style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:FONT}}>✕</motion.button>
                      </div>
                    ):(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:12,color:C.muted}}>{fmtShort(e.date)}</span>
                          {prev&&<span style={{fontSize:11,color:goodDiff?C.teal:diff===0?C.muted:C.red}}>{diff>0?"+":""}{diff.toFixed(1)} kg</span>}
                          <span style={{fontSize:14,fontWeight:700,color:modeColor,textShadow:`0 0 8px ${modeColor}44`}}>{e.w} kg</span>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <motion.button onClick={()=>{setEditIdx(idx);setEditVal(String(e.w));}} whileHover={{scale:1.1}} whileTap={{scale:.9}}
                            style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"none",color:C.gold,cursor:"pointer",fontSize:12}}>✏</motion.button>
                          <motion.button onClick={()=>doDelete(idx)} whileHover={{scale:1.1}} whileTap={{scale:.9}}
                            style={{width:26,height:26,borderRadius:"50%",background:"rgba(208,96,96,0.12)",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>🗑</motion.button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Log modal */}
      <AnimatePresence>
        {showLog&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}
            onClick={()=>{if(!saving){setShowLog(false);setInput("");}}}>
            <motion.div initial={{scale:.8,opacity:0,y:40}} animate={{scale:1,opacity:1,y:0}} exit={{scale:.8,opacity:0,y:40}} transition={{type:"spring",stiffness:300,damping:25}}
              onClick={e=>e.stopPropagation()}>
              <GlassCard glow={C.gold} style={{padding:32,width:300,textAlign:"center"}} animate={false}>
                <div style={{fontSize:18,fontWeight:700,color:C.gold,marginBottom:4,textShadow:`0 0 20px ${C.gold}66`}}>Log Weight</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:20}}>Goal: {goalWeight} kg</div>
                {/* Fixed weight input using NumInput */}
                <NumInput value={input} onChange={v=>setInput(v)} placeholder={`e.g. ${isLose?GOAL_MODES.lose.defaultStart:GOAL_MODES.gain.defaultStart}.0`} style={{fontSize:20,textAlign:"center",padding:14,marginBottom:16}} step="0.1" autoFocus/>
                <div style={{display:"flex",gap:10}}>
                  <Btn onClick={()=>{setShowLog(false);setInput("");}} style={{flex:1,padding:12}} color={C.muted} disabled={saving}>Cancel</Btn>
                  <Btn onClick={doLog} variant="fill" style={{flex:1,padding:12}} disabled={saving||input===""||input===null}>{saving?"Saving...":"Save"}</Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── ANALYTICS SCREEN ────────────────────────────────────────
function AnalyticsScreen({data,settings,bp}) {
  const now=new Date();
  const [view,setView]=useState("daily");
  const [selMonth,setSelMonth]=useState(now.getMonth());
  const [selYear,setSelYear]=useState(now.getFullYear());
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  const modeColor=settings.goalMode==="lose"?C.coral:C.teal;
  const years=useMemo(()=>{const ys=new Set();Object.keys(data.days||{}).forEach(k=>ys.add(parseInt(k.slice(0,4))));ys.add(now.getFullYear());return [...ys].sort((a,b)=>b-a);},[data]);
  const keys7=lastNKeys(7);
  const scoreData=keys7.map(k=>({date:dayAbbrev(k),score:dayScore(data.days?.[k],settings)}));
  const calData=keys7.map(k=>({date:dayAbbrev(k),cal:calcCal(data.days?.[k]?.meals,settings.meals)}));
  const sleepData=keys7.map(k=>({date:dayAbbrev(k),sleep:data.days?.[k]?.sleep??0}));
  const stepsData=keys7.map(k=>({date:dayAbbrev(k),steps:data.days?.[k]?.steps??0}));
  const wData=(data.weightLog??[]).slice(-20).map(e=>({date:fmtDate(e.date),weight:e.w}));
  const monthKeys=useMemo(()=>getMonthKeys(selYear,selMonth),[selYear,selMonth]);
  const yearKeys=useMemo(()=>getYearKeys(selYear),[selYear]);
  const monthStats=useMemo(()=>aggregateStats(monthKeys,data,settings),[monthKeys,data,settings]);
  const yearStats=useMemo(()=>aggregateStats(yearKeys,data,settings),[yearKeys,data,settings]);
  const dailyTrend=useMemo(()=>monthKeys.map(k=>{const d=new Date(k+"T12:00:00");return {day:d.getDate(),score:dayScore(data.days?.[k],settings),sleep:data.days?.[k]?.sleep||0,steps:data.days?.[k]?.steps||0};}),[monthKeys,data,settings]);
  const monthlyTrend=useMemo(()=>MONTHS.map((m,i)=>{const s=aggregateStats(getMonthKeys(selYear,i),data,settings);return {month:m,score:s?.avgScore||0,workouts:s?.workoutDays||0,sleep:s?.avgSleep||0};}),[selYear,data,settings]);
  const H=150;

  function CC({title,color,right,children}) {
    return (
      <motion.div variants={scaleIn}>
        <GlassCard style={{padding:"12px 6px 12px 2px"}}>
          <div style={{padding:"0 12px 8px"}}><SectionTitle color={color} right={right}>{title}</SectionTitle></div>
          {children}
        </GlassCard>
      </motion.div>
    );
  }
  function StatCard({label,value,unit,color=C.gold}) {
    return (
      <motion.div variants={scaleIn}>
        <GlassCard glow={color} style={{padding:"12px 10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{label}</div>
          <div style={{fontSize:20,fontWeight:700,color,lineHeight:1,textShadow:`0 0 10px ${color}44`}}>{value}</div>
          {unit&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{unit}</div>}
        </GlassCard>
      </motion.div>
    );
  }

  const activeStats=view==="monthly"?monthStats:view==="yearly"?yearStats:null;
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
      <motion.div variants={fadeUp} style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text,marginBottom:4}}>Analytics</motion.div>
      <motion.div variants={fadeUp} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",background:"rgba(28,33,40,0.8)",backdropFilter:"blur(12px)"}}>
          {["daily","monthly","yearly"].map(v=>(
            <motion.button key={v} onClick={()=>setView(v)} animate={{background:view===v?C.gold:"transparent",color:view===v?C.bg0:C.muted}}
              style={{padding:"7px 14px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:FONT,letterSpacing:.5,textTransform:"uppercase"}}>{v}</motion.button>
          ))}
        </div>
        {view!=="daily"&&(
          <>
            <select value={selYear} onChange={e=>setSelYear(parseInt(e.target.value))} style={{background:"rgba(28,33,40,0.9)",border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.text,fontSize:11,fontFamily:FONT,outline:"none",cursor:"pointer"}}>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            {view==="monthly"&&(
              <select value={selMonth} onChange={e=>setSelMonth(parseInt(e.target.value))} style={{background:"rgba(28,33,40,0.9)",border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.text,fontSize:11,fontFamily:FONT,outline:"none",cursor:"pointer"}}>
                {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            )}
          </>
        )}
      </motion.div>
      {view!=="daily"&&activeStats&&(
        <motion.div variants={fadeUp} style={{padding:"10px 14px",background:C.goldBg,border:`1px solid ${C.gold}33`,borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:C.gold,fontWeight:600}}>{view==="monthly"?`${MONTHS[selMonth]} ${selYear}`:`Full Year ${selYear}`}</span>
          <span style={{fontSize:11,color:C.muted}}>· {activeStats.totalDays} days logged</span>
        </motion.div>
      )}
      {view==="daily"&&(
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{display:"grid",gridTemplateColumns:isTabletPlus?"1fr 1fr":"1fr",gap:12}}>
          <CC title="Daily Score — 7 Days" color={C.gold}>
            <ResponsiveContainer width="100%" height={H}><BarChart data={scoreData} margin={{top:0,right:10,left:-14,bottom:0}}>{GRID}<XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit="/100"/>}/><Bar dataKey="score" fill={C.gold} radius={[4,4,0,0]} maxBarSize={36}/></BarChart></ResponsiveContainer>
          </CC>
          <CC title="Weight Trend" color={modeColor}>
            {wData.length>=2?(
              <ResponsiveContainer width="100%" height={H}><AreaChart data={wData} margin={{top:5,right:10,left:-14,bottom:0}}><defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={modeColor} stopOpacity={.22}/><stop offset="95%" stopColor={modeColor} stopOpacity={0}/></linearGradient></defs>{GRID}<XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/><YAxis domain={[Math.min(settings.startWeight,settings.goalWeight)-1,Math.max(settings.startWeight,settings.goalWeight)+1]} tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit=" kg"/>}/><ReferenceLine y={settings.goalWeight} stroke={modeColor} strokeDasharray="4 4"/><Area type="monotone" dataKey="weight" stroke={modeColor} strokeWidth={2} fill="url(#wg2)" dot={{fill:modeColor,r:2}}/></AreaChart></ResponsiveContainer>
            ):<div style={{height:H,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:C.muted,fontSize:12}}>Log weight to see trend</span></div>}
          </CC>
          <CC title="Daily Calories" color={C.gold} right={`${settings.dailyCal} target`}>
            <ResponsiveContainer width="100%" height={H}><BarChart data={calData} margin={{top:0,right:10,left:-14,bottom:0}}>{GRID}<XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/><YAxis domain={[0,settings.dailyCal+400]} tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit=" cal"/>}/><ReferenceLine y={settings.dailyCal} stroke={C.gold} strokeDasharray="4 4" strokeOpacity={.5}/><Bar dataKey="cal" fill={C.gold} radius={[4,4,0,0]} maxBarSize={36}/></BarChart></ResponsiveContainer>
          </CC>
          <CC title="Sleep" color={C.blue} right="8h target">
            <ResponsiveContainer width="100%" height={H}><AreaChart data={sleepData} margin={{top:0,right:10,left:-14,bottom:0}}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.blue} stopOpacity={.22}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/></linearGradient></defs>{GRID}<XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/><YAxis domain={[0,12]} tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit="h"/>}/><ReferenceLine y={8} stroke={C.blue} strokeDasharray="4 4" strokeOpacity={.5}/><Area type="monotone" dataKey="sleep" stroke={C.blue} strokeWidth={2} fill="url(#sg)" dot={{fill:C.blue,r:2}}/></AreaChart></ResponsiveContainer>
          </CC>
          <CC title="Steps" color={C.teal} right="10k target">
            <ResponsiveContainer width="100%" height={H}><BarChart data={stepsData} margin={{top:0,right:10,left:-14,bottom:0}}>{GRID}<XAxis dataKey="date" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/><YAxis domain={[0,12000]} tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit=" steps"/>}/><ReferenceLine y={10000} stroke={C.teal} strokeDasharray="4 4" strokeOpacity={.5}/><Bar dataKey="steps" fill={C.teal} radius={[4,4,0,0]} maxBarSize={36}/></BarChart></ResponsiveContainer>
          </CC>
        </motion.div>
      )}
      {view==="monthly"&&(
        <>
          {!monthStats?<GlassCard style={{padding:32,textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>📊</div><div style={{color:C.muted,fontSize:13}}>No data for this month yet.</div></GlassCard>:(
            <motion.div variants={stagger} initial="hidden" animate="visible" style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:isTabletPlus?"repeat(4,1fr)":"repeat(2,1fr)",gap:10}}>
                <StatCard label="Avg Score" value={monthStats.avgScore} unit="/100" color={scoreColor(monthStats.avgScore)}/>
                <StatCard label="Workout Days" value={monthStats.workoutDays} unit="sessions" color={C.coral}/>
                <StatCard label="Avg Sleep" value={`${monthStats.avgSleep}h`} unit="per night" color={C.blue}/>
                <StatCard label="Avg Calories" value={monthStats.avgCal} unit="kcal/day" color={C.gold}/>
                <StatCard label="Avg Steps" value={monthStats.avgSteps?.toLocaleString()} unit="per day" color={C.teal}/>
                <StatCard label="Total Steps" value={monthStats.totalSteps?.toLocaleString()} unit="total" color={C.teal}/>
                <StatCard label="Perfect Days" value={monthStats.perfectDays} unit="score ≥ 80" color={C.purple}/>
                <StatCard label="Best Streak" value={monthStats.streakMax} unit="days" color={C.gold}/>
              </div>
              <CC title={`Daily Score — ${MONTHS[selMonth]}`} color={C.gold}>
                <ResponsiveContainer width="100%" height={H}><BarChart data={dailyTrend} margin={{top:0,right:10,left:-14,bottom:0}}>{GRID}<XAxis dataKey="day" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit="/100"/>}/><Bar dataKey="score" fill={C.gold} radius={[3,3,0,0]} maxBarSize={20}/></BarChart></ResponsiveContainer>
              </CC>
            </motion.div>
          )}
        </>
      )}
      {view==="yearly"&&(
        <>
          {!yearStats?<GlassCard style={{padding:32,textAlign:"center"}}><div style={{fontSize:32,marginBottom:12}}>📊</div><div style={{color:C.muted,fontSize:13}}>No data for this year yet.</div></GlassCard>:(
            <motion.div variants={stagger} initial="hidden" animate="visible" style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:isTabletPlus?"repeat(4,1fr)":"repeat(2,1fr)",gap:10}}>
                <StatCard label="Avg Score" value={yearStats.avgScore} unit="/100" color={scoreColor(yearStats.avgScore)}/>
                <StatCard label="Workout Days" value={yearStats.workoutDays} unit="sessions" color={C.coral}/>
                <StatCard label="Avg Sleep" value={`${yearStats.avgSleep}h`} unit="per night" color={C.blue}/>
                <StatCard label="Total Steps" value={yearStats.totalSteps?.toLocaleString()} unit="total" color={C.teal}/>
                <StatCard label="Perfect Days" value={yearStats.perfectDays} unit="score ≥ 80" color={C.purple}/>
                <StatCard label="Best Streak" value={yearStats.streakMax} unit="days" color={C.gold}/>
              </div>
              <CC title={`Monthly Avg Score — ${selYear}`} color={C.gold}>
                <ResponsiveContainer width="100%" height={H}><BarChart data={monthlyTrend} margin={{top:0,right:10,left:-14,bottom:0}}>{GRID}<XAxis dataKey="month" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} width={28}/><Tooltip content={<ChartTip unit="/100"/>}/><Bar dataKey="score" fill={C.gold} radius={[3,3,0,0]} maxBarSize={32}/></BarChart></ResponsiveContainer>
              </CC>
              <GlassCard style={{padding:14}}>
                <SectionTitle color={C.gold}>Month by Month</SectionTitle>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {monthlyTrend.map((m,i)=>{
                    const mStats=aggregateStats(getMonthKeys(selYear,i),data,settings);
                    if(!mStats)return<div key={m.month} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.faint}`}}><span style={{fontSize:12,color:C.muted,minWidth:32}}>{m.month}</span><span style={{fontSize:11,color:C.faint}}>No data</span></div>;
                    return (
                      <motion.div key={m.month} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*.03}} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.faint}`}}>
                        <span style={{fontSize:12,fontWeight:700,color:C.text,minWidth:32}}>{m.month}</span>
                        <div style={{flex:1,height:6,background:C.faint,borderRadius:3,overflow:"hidden"}}>
                          <motion.div initial={{width:0}} animate={{width:`${mStats.avgScore}%`}} transition={{duration:.8,delay:i*.05}} style={{height:6,background:scoreColor(mStats.avgScore),borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:11,color:scoreColor(mStats.avgScore),fontWeight:700,minWidth:28}}>{mStats.avgScore}</span>
                        <span style={{fontSize:10,color:C.muted,minWidth:50}}>{mStats.workoutDays}💪</span>
                        <span style={{fontSize:10,color:C.blue,minWidth:40}}>{mStats.avgSleep}h</span>
                      </motion.div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── COACH SCREEN — with image upload ────────────────────────
function CoachScreen({data,latestWeight,settings,bp}) {
  const [model,setModel]=useState("claude");
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [tab,setTab]=useState("chat");
  const [dietPlan,setDietPlan]=useState("");
  const [report,setReport]=useState("");
  // Image state
  const [pendingImage,setPendingImage]=useState(null); // {base64, mime, preview}
  const fileInputRef=useRef(null);
  const bottomRef=useRef(null);
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  const goalMode=settings.goalMode||"gain";
  const mode=GOAL_MODES[goalMode];
  const context=buildAIContext(data,latestWeight,settings);
  const scrollBot=()=>setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),80);
  const onVoiceResult=useCallback((t)=>setInput(t),[]);
  const {listening,supported:voiceOk,start:startVoice,stop:stopVoice}=useVoiceInput(onVoiceResult);

  const handleImageSelect=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const base64=await fileToBase64(file);
    const preview=URL.createObjectURL(file);
    setPendingImage({base64,mime:file.type,preview});
    e.target.value="";
  };

  const sendMessage=async(text=input.trim())=>{
    if((!text&&!pendingImage)||loading)return;
    const msgText=text||(pendingImage?"Analyze this food image.":"");
    const userMsg={role:"user",content:msgText,hasImage:!!pendingImage,imagePreview:pendingImage?.preview};
    const hist=[...messages,{role:"user",content:msgText}];
    setMessages(p=>[...p,userMsg]);
    setInput("");
    const imgB64=pendingImage?.base64;
    const imgMime=pendingImage?.mime;
    setPendingImage(null);
    setLoading(true);scrollBot();
    try {
      const systemToUse=pendingImage
        ?`${FOOD_ANALYSIS_PROMPT}\n\nUSER CONTEXT:\n${context}\nGoal mode: ${goalMode}`
        :`${SYSTEM_PROMPT}\n\nUSER DATA:\n${context}`;
      const reply=await callAI({model,system:systemToUse,history:hist,imageBase64:imgB64,imageMime:imgMime});
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    } catch {
      setMessages(p=>[...p,{role:"assistant",content:"⚠ Could not reach AI. Check your connection or start the backend server at localhost:3001."}]);
    }
    setLoading(false);scrollBot();
  };

  const generate=async(promptText,setter)=>{
    setLoading(true);setter("");
    try {
      const reply=await callAI({model,system:SYSTEM_PROMPT,history:[{role:"user",content:`${promptText}\n\nUser data:\n${context}`}]});
      setter(reply);
    } catch {setter("⚠ Could not generate. Check your connection.");}
    setLoading(false);
  };

  const DIET_PROMPT=goalMode==="lose"
    ?`Generate a detailed 7-day WEIGHT LOSS meal plan for ${latestWeight}kg targeting ${settings.goalWeight}kg. Target ${settings.dailyCal} kcal/day (deficit). High protein ${calcProtein(latestWeight,settings.proteinMultiplier)}g/day. Focus on whole foods, lean protein. List specific Indian foods and portions.`
    :`Generate a detailed 7-day WEIGHT GAIN meal plan for ${latestWeight}kg targeting ${settings.goalWeight}kg. Target ${settings.dailyCal}+ kcal/day. High protein ${calcProtein(latestWeight,settings.proteinMultiplier)}g/day. List specific Indian foods and portions.`;
  const REPORT_PROMPT=`Generate a weekly health report for ${mode.label} mode. Include: 1. Assessment 2. Top 3 wins 3. Top 3 improvements 4. 5 action items 5. Motivational close.`;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:14}}>
      <motion.div variants={fadeUp} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text}}>AI Coach</div>
          <div style={{fontSize:11,color:mode.color,marginTop:2}}>{mode.icon} {mode.label} mode</div>
        </div>
        <div style={{display:"flex",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",background:"rgba(28,33,40,0.8)",backdropFilter:"blur(12px)"}}>
          {["claude","gpt"].map(m=>(
            <motion.button key={m} onClick={()=>setModel(m)} animate={{background:model===m?C.gold:"transparent",color:model===m?C.bg0:C.muted}}
              style={{padding:"6px 14px",fontSize:11,fontWeight:700,border:"none",cursor:"pointer",fontFamily:FONT,letterSpacing:.5,textTransform:"uppercase"}}>{m==="claude"?"Claude":"GPT-4"}</motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} style={{display:"flex",gap:8}}>
        {[{id:"chat",label:"Chat"},{id:"diet",label:"Diet Plan"},{id:"report",label:"Report"}].map(t=>(
          <motion.button key={t.id} onClick={()=>setTab(t.id)} animate={{background:tab===t.id?C.goldBg:"transparent",borderColor:tab===t.id?C.gold+"66":C.border,color:tab===t.id?C.gold:C.muted}}
            style={{flex:1,padding:"8px 0",fontSize:11,fontWeight:700,border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer",letterSpacing:.5,textTransform:"uppercase",fontFamily:FONT}}>{t.label}</motion.button>
        ))}
      </motion.div>

      {tab==="chat"&&(
        <>
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:12}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Context · {mode.icon} {mode.label}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.6,fontFamily:"monospace",whiteSpace:"pre-wrap"}}>{context.split("\n").slice(0,6).join("\n")}…</div>
            </GlassCard>
          </motion.div>

          {/* Image upload hint */}
          <motion.div variants={fadeUp}>
            <GlassCard accent={C.purple} style={{padding:12}}>
              <div style={{fontSize:11,color:C.purple,fontWeight:600,marginBottom:4}}>📷 Food Image Analysis</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Upload a photo of your food — AI will analyze protein, carbs, fats, fiber, eating order, portion advice, and goal alignment.</div>
            </GlassCard>
          </motion.div>

          {messages.length===0&&(
            <motion.div variants={stagger} initial="hidden" animate="visible" style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {QUICK_PROMPTS.map(p=>(
                <motion.button key={p} variants={scaleIn} onClick={()=>sendMessage(p)} whileHover={{scale:1.03,borderColor:C.gold+"66",color:C.gold}} whileTap={{scale:.95}}
                  style={{padding:"7px 12px",fontSize:11,background:"rgba(28,33,40,0.8)",border:`1px solid ${C.border}`,borderRadius:20,color:C.muted,cursor:"pointer",fontFamily:FONT,backdropFilter:"blur(8px)"}}>{p}</motion.button>
              ))}
            </motion.div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:10,minHeight:60}}>
            <AnimatePresence>
              {messages.map((m,i)=>(
                <motion.div key={i} initial={{opacity:0,y:10,scale:.95}} animate={{opacity:1,y:0,scale:1}} transition={{type:"spring",stiffness:300,damping:25}}
                  style={{alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"85%"}}>
                  {m.hasImage&&m.imagePreview&&(
                    <div style={{marginBottom:6,borderRadius:10,overflow:"hidden",border:`1px solid ${C.gold}44`}}>
                      <img src={m.imagePreview} alt="food" style={{width:"100%",maxWidth:200,height:"auto",display:"block"}}/>
                    </div>
                  )}
                  <div style={{padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"rgba(200,169,126,0.15)":"rgba(28,33,40,0.9)",border:`1px solid ${m.role==="user"?C.gold+"33":C.border}`,fontSize:13,color:C.text,lineHeight:1.6,whiteSpace:"pre-wrap",backdropFilter:"blur(12px)"}}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading&&(
              <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}}
                style={{alignSelf:"flex-start",padding:"10px 14px",background:"rgba(28,33,40,0.9)",border:`1px solid ${C.border}`,borderRadius:"16px 16px 16px 4px",fontSize:13,color:C.muted,backdropFilter:"blur(12px)"}}>
                <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
                <span style={{animation:"pulse 1s infinite"}}>Thinking…</span>
              </motion.div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Pending image preview */}
          <AnimatePresence>
            {pendingImage&&(
              <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
                style={{position:"relative",display:"inline-block",alignSelf:"flex-end"}}>
                <img src={pendingImage.preview} alt="pending" style={{height:80,borderRadius:10,border:`1px solid ${C.gold}44`,objectFit:"cover"}}/>
                <motion.button onClick={()=>setPendingImage(null)} whileHover={{scale:1.1}} whileTap={{scale:.9}}
                  style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:C.red,border:"none",color:"white",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>×</motion.button>
                <div style={{fontSize:9,color:C.gold,textAlign:"center",marginTop:4}}>Ready to send</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div style={{position:"sticky",bottom:72,background:"rgba(13,17,23,0.95)",backdropFilter:"blur(20px)",paddingTop:8}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              {/* File upload button */}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{display:"none"}}/>
              <motion.button onClick={()=>fileInputRef.current?.click()} whileHover={{scale:1.1}} whileTap={{scale:.9}}
                style={{width:40,height:40,borderRadius:"50%",border:`1px solid ${pendingImage?C.purple:C.border}`,background:pendingImage?C.purpleBg:"rgba(28,33,40,0.9)",color:pendingImage?C.purple:C.muted,cursor:"pointer",fontSize:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                📷
              </motion.button>
              <motion.textarea value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
                placeholder={pendingImage?"Add a message or send image as-is…":"Ask your coach or upload food photo 📷"}
                rows={2} whileFocus={{borderColor:C.gold,boxShadow:`0 0 0 2px ${C.gold}22`}}
                style={{flex:1,background:"rgba(28,33,40,0.9)",border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px",color:C.text,fontSize:13,outline:"none",lineHeight:1.5,fontFamily:FONT,backdropFilter:"blur(12px)",resize:"none"}}/>
              {voiceOk&&(
                <motion.button onClick={listening?stopVoice:startVoice}
                  animate={{background:listening?C.coralBg:"rgba(28,33,40,0.9)",borderColor:listening?C.coral:C.border}}
                  whileHover={{scale:1.1}} whileTap={{scale:.9}}
                  style={{width:40,height:40,borderRadius:"50%",border:`1px solid ${C.border}`,color:listening?C.coral:C.muted,cursor:"pointer",fontSize:16,flexShrink:0}}>🎤</motion.button>
              )}
              <Btn onClick={()=>sendMessage()} variant="fill" disabled={(!input.trim()&&!pendingImage)||loading} style={{height:40,padding:"0 16px",flexShrink:0}}>Send</Btn>
            </div>
          </div>
        </>
      )}

      {tab==="diet"&&(
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{display:"flex",flexDirection:"column",gap:12}}>
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:14}}>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
                Personalized 7-day plan for <span style={{color:mode.color,fontWeight:600}}>{mode.label}</span>.
                Target: <span style={{color:C.gold,fontWeight:600}}>{settings.dailyCal} kcal</span> · Protein: <span style={{color:C.blue,fontWeight:600}}>{calcProtein(latestWeight,settings.proteinMultiplier)}g/day</span>
              </div>
              <Btn onClick={()=>generate(DIET_PROMPT,setDietPlan)} variant="fill" disabled={loading} full>{loading?"Generating…":"Generate Diet Plan"}</Btn>
            </GlassCard>
          </motion.div>
          {dietPlan&&(
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <GlassCard glow={C.gold} style={{padding:16}}>
                <SectionTitle color={C.gold}>Your 7-Day Plan</SectionTitle>
                <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{dietPlan}</div>
              </GlassCard>
            </motion.div>
          )}
        </motion.div>
      )}

      {tab==="report"&&(
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{display:"flex",flexDirection:"column",gap:12}}>
          <motion.div variants={fadeUp}>
            <GlassCard style={{padding:14}}>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:12}}>
                AI-generated weekly review for your <span style={{color:mode.color,fontWeight:600}}>{mode.label}</span> progress.
              </div>
              <Btn onClick={()=>generate(REPORT_PROMPT,setReport)} variant="fill" disabled={loading} full>{loading?"Generating…":"Generate Weekly Report"}</Btn>
            </GlassCard>
          </motion.div>
          {report&&(
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <GlassCard glow={C.purple} style={{padding:16}}>
                <SectionTitle color={C.purple}>Weekly Report</SectionTitle>
                <div style={{fontSize:13,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{report}</div>
              </GlassCard>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── HISTORY SCREEN — with edit/delete day logs ───────────────
function HistoryScreen({data,save,settings,bp}) {
  const today=todayKey();
  const allDays=Object.entries(data.days??{}).sort((a,b)=>b[0].localeCompare(a[0]));
  const avgScore=allDays.length?Math.round(allDays.reduce((s,[,d])=>s+dayScore(d,settings),0)/allDays.length):0;
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  const [editingDay,setEditingDay]=useState(null);
  const [confirmDelete,setConfirmDelete]=useState(null);

  const deleteDay=async(date)=>{
    const newDays={...data.days};delete newDays[date];
    await save({...data,days:newDays});
    setConfirmDelete(null);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:10}}>
      <motion.div variants={fadeUp} style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text,marginBottom:4}}>History</motion.div>
      <motion.div variants={fadeUp} style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[
          {label:"Total Days",val:allDays.length,color:C.gold},
          {label:"Workout Days",val:allDays.filter(([,d])=>d.workout).length,color:C.coral},
          {label:"Avg Score",val:avgScore,color:C.purple},
        ].map(s=>(
          <GlassCard key={s.label} glow={s.color} style={{padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:700,color:s.color,textShadow:`0 0 10px ${s.color}44`}}>{s.val}</div>
            <div style={{fontSize:9,color:C.muted,marginTop:2}}>{s.label}</div>
          </GlassCard>
        ))}
      </motion.div>
      {allDays.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"40px 0"}}>No history yet. Start logging!</div>}
      <AnimatePresence>
        {allDays.map(([date,day],i)=>{
          const meals=Object.values(day.meals??{}).filter(Boolean).length;
          const study=Object.values(day.study??{}).filter(Boolean).length;
          const skin=Object.values(day.skincare??{}).filter(Boolean).length;
          const score=dayScore(day,settings);
          const isExpanded=editingDay===date;
          return (
            <motion.div key={date} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-30,height:0}} transition={{delay:Math.min(i*.03,.3)}}>
              <GlassCard style={{padding:"12px 14px",marginBottom:8}}>
                {/* Header row */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:date===today?C.gold:C.text}}>{date===today?"Today · ":""}{fmtDate(date)}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>{fmtWeekday(date)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:20,fontWeight:700,color:scoreColor(score),lineHeight:1,textShadow:`0 0 10px ${scoreColor(score)}44`}}>{score}</div>
                      <div style={{fontSize:9,color:C.muted}}>/ 100</div>
                    </div>
                    {/* Edit / Delete buttons */}
                    <motion.button onClick={()=>setEditingDay(isExpanded?null:date)} whileHover={{scale:1.1}} whileTap={{scale:.9}}
                      style={{width:28,height:28,borderRadius:"50%",background:isExpanded?C.goldBg:"rgba(255,255,255,0.06)",border:`1px solid ${isExpanded?C.gold:C.border}`,color:isExpanded?C.gold:C.muted,cursor:"pointer",fontSize:13}}>✏</motion.button>
                    <motion.button onClick={()=>setConfirmDelete(date)} whileHover={{scale:1.1}} whileTap={{scale:.9}}
                      style={{width:28,height:28,borderRadius:"50%",background:"rgba(208,96,96,0.12)",border:`1px solid ${C.red}44`,color:C.red,cursor:"pointer",fontSize:14}}>🗑</motion.button>
                  </div>
                </div>

                {/* Badges */}
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:isExpanded?10:0}}>
                  {[
                    {l:`${meals}/${settings.meals.length} meals`,c:meals>=settings.meals.length-1?C.gold:C.muted},
                    {l:`${study}/${settings.study.length} study`,c:study>=settings.study.length-1?C.purple:C.muted},
                    {l:`${skin}/${settings.skincare.length} skin`,c:skin>=settings.skincare.length-1?C.teal:C.muted},
                    {l:`${day.sleep??0}h sleep`,c:(day.sleep??0)>=8?C.blue:C.coral},
                    {l:day.workout?"workout":"rest",c:day.workout?C.coral:C.faint},
                    {l:`${(day.steps||0).toLocaleString()} steps`,c:(day.steps||0)>=10000?C.teal:C.muted},
                  ].map((b,j)=>(
                    <motion.span key={j} whileHover={{scale:1.05}} style={{fontSize:10,color:b.c,background:b.c+"22",padding:"3px 8px",borderRadius:10,fontWeight:600}}>{b.l}</motion.span>
                  ))}
                </div>

                {/* Expanded edit panel */}
                <AnimatePresence>
                  {isExpanded&&(
                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.3}} style={{overflow:"hidden"}}>
                      <div style={{paddingTop:10,borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{fontSize:11,color:C.gold,fontWeight:600,letterSpacing:1}}>QUICK EDIT</div>
                        {/* Workout toggle */}
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:12,color:C.muted,minWidth:60}}>Workout</span>
                          <motion.button onClick={async()=>{const nd={...data.days,[date]:{...day,workout:!day.workout}};await save({...data,days:nd});}} whileHover={{scale:1.05}} whileTap={{scale:.95}}
                            style={{padding:"5px 14px",background:day.workout?C.coralBg:"transparent",border:`1px solid ${day.workout?C.coral:C.border}`,borderRadius:20,color:day.workout?C.coral:C.muted,cursor:"pointer",fontFamily:FONT,fontSize:11}}>
                            {day.workout?"✓ Done":"Not done"}
                          </motion.button>
                        </div>
                        {/* Sleep edit */}
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:12,color:C.muted,minWidth:60}}>Sleep</span>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <motion.button onClick={async()=>{const nd={...data.days,[date]:{...day,sleep:Math.max(0,(day.sleep||0)-.5)}};await save({...data,days:nd});}} whileHover={{scale:1.1}} style={{...stepBtnStyle,width:24,height:24,fontSize:14}}>−</motion.button>
                            <span style={{fontSize:13,fontWeight:700,color:C.blue,minWidth:32,textAlign:"center"}}>{day.sleep||0}h</span>
                            <motion.button onClick={async()=>{const nd={...data.days,[date]:{...day,sleep:Math.min(12,(day.sleep||0)+.5)}};await save({...data,days:nd});}} whileHover={{scale:1.1}} style={{...stepBtnStyle,width:24,height:24,fontSize:14}}>+</motion.button>
                          </div>
                        </div>
                        {/* Steps edit */}
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <span style={{fontSize:12,color:C.muted,minWidth:60}}>Steps</span>
                          <NumInput value={day.steps||""} onChange={async v=>{const nd={...data.days,[date]:{...day,steps:parseInt(v)||0}};await save({...data,days:nd});}} placeholder="0" style={{flex:1,padding:"5px 10px",fontSize:12}}/>
                        </div>
                        {/* Notes edit */}
                        <div>
                          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Notes</div>
                          <textarea value={day.notes||""} onChange={async e=>{const nd={...data.days,[date]:{...day,notes:e.target.value}};await save({...data,days:nd});}}
                            placeholder="Add notes…" style={{width:"100%",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontFamily:FONT,fontSize:12,padding:8,height:60,outline:"none",boxSizing:"border-box",resize:"none"}}/>
                        </div>
                        <Btn onClick={()=>setEditingDay(null)} color={C.gold} style={{alignSelf:"flex-start",padding:"6px 16px",fontSize:11}}>Done Editing</Btn>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {day.notes&&!isExpanded&&(
                  <div style={{fontSize:11,color:C.muted,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.faint}`,fontStyle:"italic"}}>"{day.notes.slice(0,100)}{day.notes.length>100?"...":""}"</div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}
            onClick={()=>setConfirmDelete(null)}>
            <motion.div initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.8,opacity:0}} transition={{type:"spring",stiffness:300,damping:25}}
              onClick={e=>e.stopPropagation()}>
              <GlassCard glow={C.red} style={{padding:28,width:290,textAlign:"center"}} animate={false}>
                <div style={{fontSize:32,marginBottom:12}}>🗑</div>
                <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:8}}>Delete this log?</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:20}}>{fmtDate(confirmDelete)} · {fmtWeekday(confirmDelete)}</div>
                <div style={{fontSize:11,color:C.red,marginBottom:20}}>This cannot be undone.</div>
                <div style={{display:"flex",gap:10}}>
                  <Btn onClick={()=>setConfirmDelete(null)} style={{flex:1,padding:12}} color={C.muted}>Cancel</Btn>
                  <Btn onClick={()=>deleteDay(confirmDelete)} variant="fill" color={C.red} style={{flex:1,padding:12}}>Delete</Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── SETTINGS SCREEN ─────────────────────────────────────────
function SettingsScreen({data,save,settings,bp}) {
  const [local,setLocal]=useState(()=>JSON.parse(JSON.stringify(settings)));
  const [saved,setSaved]=useState(false);
  const isTabletPlus=bp==="tablet"||bp==="desktop";
  useEffect(()=>{setLocal(JSON.parse(JSON.stringify(settings)));},[settings]);
  const saveAll=async()=>{await save({...data,settings:local});setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const switchMode=(newMode)=>{
    const mc=GOAL_MODES[newMode];
    setLocal(p=>({...p,goalMode:newMode,dailyCal:mc.dailyCal,proteinMultiplier:mc.proteinMultiplier,
      startWeight:mc.defaultStart,goalWeight:mc.defaultGoal,
      meals:newMode==="lose"?LOSE_MEALS:GAIN_MEALS,workout:{days:newMode==="lose"?LOSE_WORKOUT_DAYS:GAIN_WORKOUT_DAYS}}));
  };
  const upGoal=(k,v)=>setLocal(p=>({...p,[k]:v}));
  const upWidget=(k,v)=>setLocal(p=>({...p,homeWidgets:{...p.homeWidgets,[k]:v}}));
  const upMeal=(i,k,v)=>setLocal(p=>{const meals=[...p.meals];meals[i]={...meals[i],[k]:k==="cal"?parseInt(v)||0:v};return {...p,meals};});
  const addMeal=()=>setLocal(p=>({...p,meals:[...p.meals,{id:`m${genId()}`,label:"New Meal",time:"12:00 PM",cal:300,icon:"🍽️"}]}));
  const removeMeal=i=>setLocal(p=>({...p,meals:p.meals.filter((_,j)=>j!==i)}));
  const upStudy=(i,k,v)=>setLocal(p=>{const study=[...p.study];study[i]={...study[i],[k]:v};return {...p,study};});
  const addStudy=()=>setLocal(p=>({...p,study:[...p.study,{id:`s${genId()}`,label:`Session ${p.study.length+1}`,time:"9:00 AM",topic:"Study topic"}]}));
  const removeStudy=i=>setLocal(p=>({...p,study:p.study.filter((_,j)=>j!==i)}));
  const upSkin=(i,k,v)=>setLocal(p=>{const skincare=[...p.skincare];skincare[i]={...skincare[i],[k]:v};return {...p,skincare};});
  const addSkin=(phase)=>setLocal(p=>({...p,skincare:[...p.skincare,{id:`sk${genId()}`,label:"New Product",phase}]}));
  const removeSkin=i=>setLocal(p=>({...p,skincare:p.skincare.filter((_,j)=>j!==i)}));
  const upMed=(i,k,v)=>setLocal(p=>{const medicine=[...(p.medicine||[])];medicine[i]={...medicine[i],[k]:v};return {...p,medicine};});
  const addMed=()=>setLocal(p=>({...p,medicine:[...(p.medicine||[]),{id:`med${genId()}`,label:"New Medicine",time:"8:00 AM",dose:"1 tablet"}]}));
  const removeMed=i=>setLocal(p=>({...p,medicine:(p.medicine||[]).filter((_,j)=>j!==i)}));
  const iStyle={background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:FONT,outline:"none",width:"100%",boxSizing:"border-box"};
  const rmBtn={width:28,height:28,borderRadius:"50%",background:"rgba(208,96,96,0.15)",border:"none",color:C.red,cursor:"pointer",fontSize:16,flexShrink:0};
  const currentMode=local.goalMode||"gain";
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" style={{padding:isTabletPlus?"20px 32px 80px":"16px 16px 80px",display:"flex",flexDirection:"column",gap:10}}>
      <motion.div variants={fadeUp} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontSize:isTabletPlus?22:18,fontWeight:700,color:C.text}}>Settings</div>
        <Btn onClick={saveAll} variant="fill" color={saved?C.teal:C.gold}>{saved?"✓ Saved":"Save All"}</Btn>
      </motion.div>

      {/* Goal mode */}
      <motion.div variants={fadeUp}>
        <GlassCard style={{padding:16}}>
          <SectionTitle color={C.accent}>Goal Mode</SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {Object.entries(GOAL_MODES).map(([key,mode])=>{
              const active=currentMode===key;
              return (
                <motion.button key={key} onClick={()=>switchMode(key)} whileHover={{scale:1.02}} whileTap={{scale:.97}}
                  animate={{background:active?mode.color+"15":"transparent",borderColor:active?mode.color:C.border,boxShadow:active?`0 0 20px ${mode.color}22`:"none"}}
                  style={{padding:16,borderRadius:12,cursor:"pointer",fontFamily:FONT,border:`2px solid ${C.border}`,textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:6}}>{mode.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:active?mode.color:C.text}}>{mode.label}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:4}}>{mode.calLabel}</div>
                  <div style={{fontSize:10,color:C.muted}}>Default: {mode.defaultStart}→{mode.defaultGoal}kg</div>
                  {active&&<motion.div initial={{scale:0}} animate={{scale:1}} style={{fontSize:10,color:mode.color,marginTop:6,fontWeight:600}}>● Active</motion.div>}
                </motion.button>
              );
            })}
          </div>
          <div style={{marginTop:12,padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:8,fontSize:11,color:C.muted,lineHeight:1.5}}>
            Switching mode auto-updates meals, workout plan, calorie target, protein goals, and default weights.
          </div>
        </GlassCard>
      </motion.div>

      {/* Weight goals — using NumInput to fix sticky value bug */}
      <motion.div variants={fadeUp}>
        <GlassCard accent={C.gold} glow={C.gold} style={{padding:14}}>
          <SectionTitle color={C.gold}>Weight Goals</SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {[
              {label:"Start Weight (kg)",key:"startWeight",step:0.1},
              {label:"Goal Weight (kg)", key:"goalWeight", step:0.1},
              {label:"Daily Calories",   key:"dailyCal",   step:50},
              {label:"Height (m)",       key:"heightM",    step:0.01},
              {label:"Protein (g/kg)",   key:"proteinMultiplier",step:0.1},
            ].map(f=>(
              <div key={f.key}>
                <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{f.label}</div>
                <NumInput value={local[f.key]} onChange={v=>upGoal(f.key,v)} step={f.step}/>
              </div>
            ))}
          </div>
          <div style={{padding:"8px 12px",background:C.goldBg,borderRadius:8,marginBottom:8,fontSize:11,color:C.gold}}>
            Auto milestones: {calcMilestones(local.startWeight,local.goalWeight,local.goalMode).map(m=>m.w+"kg").join(" → ")}
          </div>
          <div style={{padding:"8px 12px",background:C.blueBg,borderRadius:8,fontSize:11,color:C.blue}}>
            Protein: {calcProtein(local.goalWeight,local.proteinMultiplier)}g/day · Cal: {local.dailyCal} kcal ({currentMode==="lose"?"deficit":"surplus"})
          </div>
        </GlassCard>
      </motion.div>

      {[
        {title:"Home Screen Widgets",color:C.gold,badge:`${Object.values(local.homeWidgets||{}).filter(Boolean).length} active`,content:(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {Object.entries(local.homeWidgets||{}).map(([k,v])=>(
              <Toggle key={k} checked={v} onChange={val=>upWidget(k,val)} label={k} color={C.gold}/>
            ))}
          </div>
        )},
        {title:"Meals",color:C.gold,badge:`${local.meals.length}`,content:(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {local.meals.map((m,i)=>(
              <div key={m.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:10}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={m.icon} onChange={e=>upMeal(i,"icon",e.target.value)} style={{...iStyle,width:48,textAlign:"center",fontSize:18,padding:"4px"}}/>
                  <input value={m.label} onChange={e=>upMeal(i,"label",e.target.value)} style={{...iStyle,flex:1}}/>
                  <button onClick={()=>removeMeal(i)} style={rmBtn}>×</button>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input value={m.time} onChange={e=>upMeal(i,"time",e.target.value)} style={{...iStyle,flex:1}} placeholder="Time"/>
                  <input type="number" value={m.cal} onChange={e=>upMeal(i,"cal",e.target.value)} style={{...iStyle,width:80}} placeholder="Cal"/>
                </div>
              </div>
            ))}
            <button onClick={addMeal} style={{width:"100%",padding:10,background:"transparent",border:`1px dashed ${C.gold}55`,borderRadius:10,color:C.gold,fontSize:12,cursor:"pointer",fontFamily:FONT}}>+ Add Meal</button>
          </div>
        )},
        {title:"Study Sessions",color:C.purple,badge:`${local.study.length}`,content:(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {local.study.map((s,i)=>(
              <div key={s.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:10}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={s.label} onChange={e=>upStudy(i,"label",e.target.value)} style={{...iStyle,flex:1}}/>
                  <button onClick={()=>removeStudy(i)} style={rmBtn}>×</button>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input value={s.time} onChange={e=>upStudy(i,"time",e.target.value)} style={{...iStyle,flex:1}}/>
                  <input value={s.topic} onChange={e=>upStudy(i,"topic",e.target.value)} style={{...iStyle,flex:2}}/>
                </div>
              </div>
            ))}
            <button onClick={addStudy} style={{width:"100%",padding:10,background:"transparent",border:`1px dashed ${C.purple}55`,borderRadius:10,color:C.purple,fontSize:12,cursor:"pointer",fontFamily:FONT}}>+ Add Session</button>
          </div>
        )},
        {title:"Skincare Routine",color:C.teal,badge:`${local.skincare.length}`,content:(
          ["am","pm"].map(phase=>(
            <div key={phase} style={{marginBottom:14}}>
              <div style={{marginBottom:8}}><Pill color={phase==="am"?C.gold:C.purple}>{phase==="am"?"☀️ Morning":"🌙 Night"}</Pill></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {local.skincare.filter(s=>s.phase===phase).map(s=>{const i=local.skincare.indexOf(s);return(
                  <div key={s.id} style={{display:"flex",gap:6}}>
                    <input value={s.label} onChange={e=>upSkin(i,"label",e.target.value)} style={{...iStyle,flex:1}}/>
                    <button onClick={()=>removeSkin(i)} style={rmBtn}>×</button>
                  </div>
                );})}
                <button onClick={()=>addSkin(phase)} style={{padding:8,background:"transparent",border:`1px dashed ${phase==="am"?C.gold:C.purple}55`,borderRadius:8,color:phase==="am"?C.gold:C.purple,fontSize:12,cursor:"pointer",fontFamily:FONT}}>+ Add {phase==="am"?"Morning":"Night"} Product</button>
              </div>
            </div>
          ))
        )},
        {title:"Medicine Routine",color:C.blue,badge:`${(local.medicine||[]).length}`,content:(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {(local.medicine||[]).map((m,i)=>(
              <div key={m.id} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:10}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={m.label} onChange={e=>upMed(i,"label",e.target.value)} style={{...iStyle,flex:1}}/>
                  <button onClick={()=>removeMed(i)} style={rmBtn}>×</button>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <input value={m.time} onChange={e=>upMed(i,"time",e.target.value)} style={{...iStyle,flex:1}}/>
                  <input value={m.dose} onChange={e=>upMed(i,"dose",e.target.value)} style={{...iStyle,flex:1}}/>
                </div>
              </div>
            ))}
            <button onClick={addMed} style={{width:"100%",padding:10,background:"transparent",border:`1px dashed ${C.blue}55`,borderRadius:10,color:C.blue,fontSize:12,cursor:"pointer",fontFamily:FONT}}>+ Add Medicine</button>
          </div>
        )},
      ].map(section=>(
        <motion.div key={section.title} variants={fadeUp}>
          <Collapsible title={section.title} color={section.color} badge={section.badge}>{section.content}</Collapsible>
        </motion.div>
      ))}

      <motion.div variants={fadeUp}>
        <GlassCard style={{padding:14}}>
          <SectionTitle color={C.red}>Account</SectionTitle>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Signed in as: {auth.currentUser?.email}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn onClick={()=>signOut(auth)} color={C.red}>Sign Out</Btn>
            <Btn onClick={()=>setLocal(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)))} color={C.muted}>Reset Defaults</Btn>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const {user,loading:authLoading}=useAuth();
  const {data,save,ready}=useFirestore(user?.uid);
  const [screen,setScreen]=useState("home");
  const bp=useBreakpoint();
  const settings=data?.settings??DEFAULT_SETTINGS;
  const today=todayKey();
  const todayData=data?.days?.[today]??defaultDay();
  const latestW=(data?.weightLog??[]).at(-1)?.w??settings.startWeight;
  const streak=useMemo(()=>{
    if(!data?.days)return 0;
    let s=0;const d=new Date();
    while(true){const k=dayKey(d),day=data.days[k];if(!day)break;const ok=Object.values(day.meals??{}).filter(Boolean).length>=Math.ceil(settings.meals.length/2)||day.workout;if(!ok)break;s++;d.setDate(d.getDate()-1);}
    return s;
  },[data,settings]);
  const updateToday=useCallback((updates)=>{const nd={...(data?.days??{}),[today]:{...todayData,...updates}};save({...data,days:nd});},[data,today,todayData,save]);

  if(authLoading)return<LoadingScreen/>;
  if(!user)return<AuthScreen/>;
  if(!ready||!data)return<LoadingScreen/>;

  const props={data,save,todayData,updateToday,latestWeight:latestW,streak,settings,bp};
  const isDesktop=bp==="desktop";

  const screens={
    home:      <HomeScreen      {...props}/>,
    today:     <TodayScreen     {...props}/>,
    workout:   <WorkoutScreen   {...props}/>,
    weight:    <WeightScreen    {...props}/>,
    analytics: <AnalyticsScreen {...props}/>,
    coach:     <CoachScreen     {...props}/>,
    history:   <HistoryScreen   {...props}/>,
    settings:  <SettingsScreen  {...props}/>,
  };

  return (
    <div style={{background:C.bg0,minHeight:"100vh",color:C.text,fontFamily:FONT,marginLeft:isDesktop?190:0,position:"relative"}}>
      <AnimatedBackground/>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        textarea,input,button,select{font-family:${FONT}}
        input::placeholder{color:#444}
        textarea::placeholder{color:#444}
        button{-webkit-appearance:none}
        select{-webkit-appearance:none}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{opacity:1}
      `}</style>
      <div style={{maxWidth:isDesktop?"none":bp==="tablet"?768:520,margin:"0 auto",overflowY:"auto",height:"100vh",paddingBottom:isDesktop?20:64,position:"relative",zIndex:1}}>
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.25,ease:[.16,1,.3,1]}}>
            {screens[screen]}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav current={screen} onNav={setScreen} bp={bp}/>
    </div>
  );
}