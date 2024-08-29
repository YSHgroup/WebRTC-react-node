import { RouterProvider } from 'react-router-dom'
import { ParallaxProvider } from 'react-scroll-parallax'
import { ToastContainer } from 'react-toastify'
import { router } from './router'
import 'react-toastify/dist/ReactToastify.css'
import AuthProvider from './context/AuthProvider'
import SignalProvider from './context/SignalProvider'
function App() {

  return (
    <ParallaxProvider>
      <AuthProvider>
        <SignalProvider>
          <RouterProvider router={router} />
          <ToastContainer />
        </SignalProvider>
      </AuthProvider>
    </ParallaxProvider>
  )
}

export default App
