import React from 'react'
import { useParallax } from 'react-scroll-parallax'
import back from '/image/back-person.jpg'
import styled from 'styled-components'

  const UnderSection = styled('div')`
    position: absolute;
    top: 100vh
  `

const Home: React.FC = () => {
  const { ref: firstParallax } = useParallax<HTMLDivElement>({ speed: -100, scale: [2, 1] })

  return (
    <main className='home-container w-full'>
        <div className='absolute z-10 top-5' ref={firstParallax}>
          <h1 className='text-5xl font-bold text-white font-serif'>Chatting House</h1>
        </div>

        <UnderSection className='w-full'>
          <img src={back} alt="" className='w-full max-w-full h-screen object-contain' />
        </UnderSection>
    </main>
  )
}

export default Home
