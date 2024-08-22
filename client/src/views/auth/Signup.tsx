import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState, signUpWithEmail } from '@/services/auth'

const Signup = () => {
  const initialErrorState: ErrorState = {
    errors: {
      email: null,
      password: null,
    },
    message: null,
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorState, setErrorState] = useState<ErrorState>(initialErrorState)
  const navigate = useNavigate()

  const signup = async (e: FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setErrorState({
        errors: {
          email: 'Email required',
          password: 'Password required',
        },
        message: null,
      })
      return
    }

    signUpWithEmail({email, password, name})
      .then(errorObject => {
        if(errorObject) {
          setErrorState(errorObject)
        }
      })
      .catch(error => {
        console.log('error: ', error)
        setErrorState({
          errors: null,
          message: 'Faild to Sign In.'
        })
      })
  }

  return (
    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 card w-1/4 min-w-[480px]'>
      <header className='bg-sky-600 p-3'>
        <h1 className='text-center text-2xl font-bold text-white'>Sign Up</h1>
      </header>
      <hr />
      <section className='p-4 pt-0 pb-5'>
        <form className='flex flex-col gap-4 p-4'>
          <div>
          <div>
            <label>
              User Name:
              <input
                type='text'
                className='bg-sky-100 shadow-inner my-1 p-2 w-full rounded hover:border-blue-400 focus:outline-blue-400'
                value={name}
                placeholder='Display Name'
                onChange={(v) => setName(v.target.value)}
              />
            </label>
            {errorState.errors?.email && (
              <p className='mt-1 ml-2 text-sm text-red-500'>
                {errorState.errors.email}
              </p>
            )}
          </div>

          <div>
            <label>
              Email:
              <input
                type='email'
                className='bg-sky-100 shadow-inner my-1 p-2 w-full rounded hover:border-blue-400 focus:outline-blue-400'
                value={email}
                placeholder='Email address'
                onChange={(v) => setEmail(v.target.value)}
              />
            </label>
            {errorState.errors?.email && (
              <p className='mt-1 ml-2 text-sm text-red-500'>
                {errorState.errors.email}
              </p>
            )}
          </div>
          <div>
            <label>
              Password:
              <input
                type='password'
                className='bg-sky-100 shadow-inner my-1 p-2 w-full rounded hover:border-blue-400 focus:outline-blue-400'
                value={password}
                placeholder='Password'
                onChange={(v) => setPassword(v.target.value)}
              />
            </label>
            {errorState.errors?.password && (
              <p className='mt-1 ml-2 text-sm text-red-500'>
                {errorState.errors.password}
              </p>
            )}
          </div>
          {errorState.message && (
              <p className='mt-2 text-sm text-red-500'>
                {errorState.message}
              </p>
            )}
          </div>
          <div className='flex gap-2 ms-auto'>
            <button
              className='p-2 bg-sky-400 text-white hover:shadow-md rounded w-[100px]'
              type='submit'
              onClick={signup}
            >
              Submit
            </button>
            <button
              className='p-2 bg-red-400 text-white hover:shadow-md rounded w-[100px]'
              onClick={(e) => {
                e.preventDefault()
                navigate(-1)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
        <hr />
        <div className='flex flex-col gap-2 px-4 mt-3 text-center'>
          <Link
            to='/sign-in'
            className='text-sm text-slate-600 hover:text-red-500 hover:underline'
          >
            Do you have account now?
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Signup
