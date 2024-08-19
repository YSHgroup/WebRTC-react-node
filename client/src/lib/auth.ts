import '@/config/firebase'
import { auth, googleProvider, signInWithPopup } from '@/config/firebase'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth'
// import { redirect } from 'react-router-dom'
import { z } from 'zod'

const emailSchema = z
  .string()
  .email({ message: 'Please make sure to enter a valid email' })
const pwdSchema = z
  .string()
  .min(6, { message: 'Please enter at leat 6 characters' })

  
interface ErrorsType {
  email: string | null,
  password: string | null
}

export interface ErrorState {
  errors: ErrorsType | null
  message: string | null
}

export const signUp = async ({email, password}: {email: string, password: string}) => {
  const validateEmail = emailSchema.safeParse(email)
  const validatePwd = pwdSchema.safeParse(password)

  if (validateEmail.error || validatePwd.error) {
    return {errors: {
        email: validateEmail.error?.format()._errors[0] ?? null,
        password: validatePwd.error?.issues[0].message ?? null
      },
      message: 'Failed to sign up.'
    }
  }

  createUserWithEmailAndPassword(auth, validateEmail.data, validatePwd.data)
    .then(userCredential => {
      const user = userCredential.user;
      console.log(user, userCredential)
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorCode, errorMessage)
      return {
        errors: null,
        message: `Failed to sign up: ${errorCode}`
      }
    });
}

export const signInWithEmail = async ({email, password}: {email: string, password: string}) => {
  const validateEmail = emailSchema.safeParse(email)
  const validatePwd = pwdSchema.safeParse(password)

  if (validateEmail.error || validatePwd.error) {
    return {errors: {
        email: validateEmail.error?.format()._errors[0] ?? null,
        password: validatePwd.error?.issues[0].message ?? null
      },
      message: 'Failed to sign in.'
    }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, validateEmail.data, validatePwd.data)
        const user = userCredential.user;
        console.log(user, userCredential)
        // redirect('/sing-in')

  } catch (error) {
    if(error instanceof Error && 'code' in error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorCode, '\nerror message: ', errorMessage)

      return {
        errors: null,
        message: `Failed to sign in: ${errorCode}`
      }
    }
  }
}

export const signinWithGoogle = async () => [
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
]