import { Link } from 'react-router-dom'

const SideBar = () => {
  const navList = [
    {
      path: '/chatting/individual',
      name: 'Personal Chatting',
    },
    {
      path: '/chatting/group',
      name: 'Group Chatting',
    },
  ]

  return (
    <>
      <ul className=' gap-2 text-sky-600'>
        <li aria-roledescription='nav header' className='flex py-3'>
          <span className='mx-auto text-2xl font-semibold text-sky-500'>Chatting House</span>
        </li>
        {navList.map((item) => (
          <li className='bg-white my-2 rounded-e-full hover:border-b border-sky-400'>
            <Link
              className='block p-2'
              to={item.path}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export default SideBar
