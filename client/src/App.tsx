import { RouterProvider } from 'react-router-dom'
import { ParallaxProvider } from 'react-scroll-parallax'
import { ToastContainer } from 'react-toastify'
import { router } from './router'
import "react-toastify/dist/ReactToastify.css";
function App() {

  return (
    <ParallaxProvider>
      <RouterProvider router={router} />
      <ToastContainer />
    </ParallaxProvider>
  )
}

export default App
