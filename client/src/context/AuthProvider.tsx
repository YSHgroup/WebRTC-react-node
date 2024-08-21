import { auth } from "@/config/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, ReactNode, useEffect, useState } from "react";

export const AuthContext = createContext<{ currentUser: User | null }>({ currentUser: null })

const AuthProvider = ({children}: {children: ReactNode}) => {
  const [user, setUser] = useState<{ currentUser: User | null }>({ currentUser: null });
  const [loading, setLoading] = useState<boolean>(true)
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (resUser) => {
      if(resUser && resUser.emailVerified) {
        setUser({currentUser: resUser});
      } else {
        setUser({ currentUser: null })
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])
  
  if(loading) {
    return <p className="mt-12 text-center text-2xl">Loading... </p>
  }

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider