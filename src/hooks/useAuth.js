function useAuth() {
  const [user,setUser]=useState(undefined);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>{setUser(u);setLoading(false);});
    return unsub;
  },[]);
  return {user,loading};
}