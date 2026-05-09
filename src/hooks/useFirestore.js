function useFirestore(uid) {
  const [data,setData]=useState(null);
  const [ready,setReady]=useState(false);
  const EMPTY={days:{},weightLog:[],settings:DEFAULT_SETTINGS};
  useEffect(()=>{
    if(!uid){setData(null);setReady(false);return;}
    const ref=doc(db,"users",uid);
    const unsub=onSnapshot(ref,snap=>{
      if(snap.exists()){
        const d=snap.data();
        setData({
          ...EMPTY,...d,
          settings:{
            ...DEFAULT_SETTINGS,...d.settings,
            homeWidgets:{...DEFAULT_SETTINGS.homeWidgets,...(d.settings?.homeWidgets||{})},
            workout:{days:d.settings?.workout?.days||DEFAULT_SETTINGS.workout.days},
            medicine:d.settings?.medicine||DEFAULT_SETTINGS.medicine,
          },
        });
      } else { setData(EMPTY); setDoc(ref,EMPTY); }
      setReady(true);
    },()=>{setData(EMPTY);setReady(true);});
    return unsub;
  },[uid]);
  const save=useCallback(async(nd)=>{
    setData(nd);
    if(!uid) return;
    try{await setDoc(doc(db,"users",uid),nd,{merge:true});}catch(e){console.error(e);}
  },[uid]);
  return {data,save,ready};
}