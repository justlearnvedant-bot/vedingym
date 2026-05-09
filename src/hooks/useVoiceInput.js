function useVoiceInput(onResult) {
  const [listening,setListening]=useState(false);
  const supported="webkitSpeechRecognition" in window||"SpeechRecognition" in window;
  const recRef=useRef(null);
  const start=useCallback(()=>{
    if(!supported) return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const rec=new SR();
    rec.lang="en-IN"; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onstart=()=>setListening(true);
    rec.onend=()=>setListening(false);
    rec.onerror=()=>setListening(false);
    rec.onresult=(e)=>{const t=e.results[0]?.[0]?.transcript??"";if(t)onResult(t);};
    recRef.current=rec; rec.start();
  },[supported,onResult]);
  const stop=useCallback(()=>{recRef.current?.stop();setListening(false);},[]);
  return {listening,supported,start,stop};
}