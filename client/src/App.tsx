import { RouterProvider } from 'react-router-dom'
import { ParallaxProvider } from 'react-scroll-parallax'
import { router } from './router'
import AppBar from './components/layout/AppBar'

function App() {

  return (
    <ParallaxProvider>
      <AppBar />
      <RouterProvider router={router} />
    </ParallaxProvider>
  )
}

export default App
