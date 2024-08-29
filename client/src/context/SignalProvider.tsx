import { createContext, ReactNode, useEffect, useState } from 'react'

interface SignalContextType {
  signal: boolean | null
  setSignal: ((arg: boolean) => void)
}

export const SignalContext = createContext<SignalContextType>({
  signal: null,
  setSignal: () => {},
})

const SignalProvider = ({ children }: { children: ReactNode }) => {
  const [signal, setSignal] = useState(false)

  useEffect(() => {
    let timout: NodeJS.Timeout | string | number | undefined;

    if (signal) {
      timout = setTimeout(() => {
        setSignal(false)
      }, 1000)
    }

    return () => clearTimeout(timout)
  }, [signal])

  return (
    <SignalContext.Provider
      value={{
        signal,
        setSignal,
      }}
    >
      {children}
    </SignalContext.Provider>
  )
}

export default SignalProvider
