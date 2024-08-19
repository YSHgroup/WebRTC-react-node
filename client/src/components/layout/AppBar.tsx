// import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

const BtnGroup = styled('div')`
  height: 4rem;
  background-image: linear-gradient(-135deg, white 10%, transparent 70%);
`

export default function AppBar() {
  return (
    <header className='fixed z-50 w-full flex justify-between'>
      <div className='ml-3 flex items-center text-3xl font-bold font-mono italic text-sky-200'>
        WebRTC
      </div>

      <BtnGroup className='pr-3 flex items-center gap-3'>
        <Link
          to='/sign-in'
          className='bg-white text-center rounded p-2 shadow-lg shadow-slate-600 text-xl font-serif font-medium text-blue-400 hover:text-sky-700'
          style={{ width: '150px' }}
        >
          Sign In
        </Link>
        <Link
          to='/sign-up'
          className='bg-white text-center rounded p-2 shadow-lg shadow-slate-600 text-xl font-serif font-medium text-blue-400 hover:text-sky-700'
          style={{ width: '150px' }}
        >
          Sign Up
        </Link>
      </BtnGroup>
    </header>
  )
}
