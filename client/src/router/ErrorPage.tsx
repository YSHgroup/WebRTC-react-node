import { useRouteError } from 'react-router-dom'

interface ErrorType {
  statusText: string
  message: string
}

const ErrorPage = () => {
  const error = useRouteError() as ErrorType

  return (
    <div>
      <h1 className='text-3xl font-sans font-bold text-blue-400'>Something went wrong.</h1>
      <p className='my-6 text-xl'>{error.statusText || error.message}</p>
    </div>
  )
}

export default ErrorPage