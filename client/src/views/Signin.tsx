import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '@/config/firebase'
import { auth, googleProvider, signInWithPopup } from '@/config/firebase'
import { GoogleAuthProvider } from 'firebase/auth'

const SignIn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const signIn = (e: FormEvent) => {
    e.preventDefault()
    console.log('input: ')
  }

  const googleSignIn = () => {
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result)
        const token = credential?.accessToken
        // The signed-in user info.
        const user = result.user

        console.log('user: ', user, token)
        // IdP data available using getAdditionalUserInfo(result)
        // ...
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code
        const errorMessage = error.message
        // The email of the user's account used.
        const email = error.customData.email
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error)
        
        console.log('error: ', errorCode, errorMessage, email, credential)
      })
  }

  return (
    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 card w-1/4 min-w-[480px]'>
      <h1 className='text-center text-2xl font-bold text-gray-700'>Sign In</h1>
      <hr />
      <form className='flex flex-col gap-4 p-4'>
        <label>
          Email:
          <input
            type='email'
            className='border my-1 p-1 w-full rounded hover:border-blue-400 focus:outline-blue-400'
            value={email}
            placeholder='Email address'
            onChange={(v) => setEmail(v.target.value)}
          />
        </label>
        <label>
          Password:
          <input
            type='password'
            className='border my-1 p-1 w-full rounded hover:border-blue-400 focus:outline-blue-400'
            value={password}
            onChange={(v) => setPassword(v.target.value)}
          />
        </label>
        <div className='flex gap-2 ms-auto'>
          <button
            className='p-2 bg-sky-300 shadow-slate-600 hover:shadow-md rounded w-[100px]'
            type='submit'
            onClick={signIn}
          >
            Submit
          </button>
          <button
            className='p-2 bg-red-300 shadow-slate-600 hover:shadow-md rounded w-[100px]'
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </form>
      <div className='flex flex-col gap-2 px-4 text-center'>
        <button
          className='bg-white block border rounded-md p-2 text-slate-600 shadow-md'
          onClick={googleSignIn}
        >
          Sign In with Google
        </button>
      </div>
    </div>
  )
}

export default SignIn
