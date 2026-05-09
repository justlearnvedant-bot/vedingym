function useBreakpoint() {
  const [bp,setBp]=useState(()=>{
    const w=window.innerWidth;
    if(w>=1024) return "desktop";
    if(w>=640)  return "tablet";
    return "mobile";
  });
  useEffect(()=>{
    const fn=()=>{
      const w=window.innerWidth;
      if(w>=1024) setBp("desktop");
      else if(w>=640) setBp("tablet");
      else setBp("mobile");
    };
    window.addEventListener("resize",fn);
    return ()=>window.removeEventListener("resize",fn);
  },[]);
  return bp;
}