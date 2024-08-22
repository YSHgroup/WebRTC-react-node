// import React from 'react'
import { AuthContext } from '@/context/AuthProvider'
import { useContext } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

const BtnGroup = styled('div')`
  height: 4rem;
  background-image: linear-gradient(-135deg, white 10%, transparent 70%);
`
const RightEffect = styled('div')`
  padding-left: 1rem;
`

export default function AppBar() {
  const { currentUser } = useContext(AuthContext)
  currentUser?.getIdToken()
  return (
    <header className='fixed z-50 w-full flex justify-between' style={currentUser? {backgroundColor: 'dodgerblue'}: {}}>
      <div className='ml-3 flex items-center text-3xl font-bold font-mono italic text-sky-200'>
        Chatting
      </div>

      {!currentUser ? (
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
      ) : (
        <RightEffect>
          {' '}
          {currentUser?.displayName ? (
            <div
              className='mr-3 my-3 rounded-full text-2xl cursor-pointer w-[40px] h-[40px] text-blue-700 bg-white border border-blue-900 text-center
          font-bold'
            >
              {currentUser?.displayName?.charAt(0)}
            </div>
          ) : (
            <div className='mr-3 my-3 p-2 text-center bg-white text-slate-700'>
              {currentUser.email}
            </div>
          )}{' '}
        </RightEffect>
      )}
    </header>
  )
}
