import { RouterProvider } from 'react-router-dom'
import { ParallaxProvider } from 'react-scroll-parallax'
import { ToastContainer } from 'react-toastify'
import { router } from './router'
import 'react-toastify/dist/ReactToastify.css'
import AuthProvider from './context/AuthProvider'
function App() {

  return (
    <ParallaxProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </AuthProvider>
    </ParallaxProvider>
  )
}

export default App
