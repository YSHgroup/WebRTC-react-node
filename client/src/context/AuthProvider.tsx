import { auth } from "@/config/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { createContext, ReactNode, useEffect, useState } from "react";

export const AuthContext = createContext<User | null>(null)

const AuthProvider = ({children}: {children: ReactNode}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if(user) {
        setUser(user);
      } else {
        setUser(null)
      }
    })
  }, [])

  return (
    <AuthContext.Provider value={user}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider