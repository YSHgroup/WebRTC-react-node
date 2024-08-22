import clsx from 'clsx'

const Message = ({
  message,
  user,
  direction,
}: {
  message: string
  user: string
  direction: 'right' | 'left'
}) => {
  return (
    <div
      className={clsx(direction == 'right' ? 'ms-auto' : 'me-auto', 'w-max gap-2')}
    >
      <div
        className={clsx(
          direction == 'right' ? 'float-right' : 'float-left',
          'rounded-full w-[38px] h-[38px] border border-slate-300 text-center text-sky-700 bg-white leading-9'
        )}
      >
        {user}
      </div>
      <div className={clsx('bg-white rounded-lg border border-gray-300 p-3 m-2', direction == 'right' ? 'float-left' : 'float-right')}>
        <p className='text-gray-800'>{message}</p>
      </div>
      <div className='after:table after:clear-both'></div>
    </div>
  )
}

export default Message
