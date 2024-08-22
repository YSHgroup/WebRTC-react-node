import { Link } from "react-router-dom"

const FloatingNav = () => {
  const floatingItemStyle = 'rounded cursor-pointer py-1 px-2 border border-sky-600 bg-sky-600 w-fit'
  return (
    <nav className="floating-nav">
      <span className="placeholder">Navigation bar</span>
      <ul className=" gap-2 text-white">
        <li className={floatingItemStyle}>
          <Link to='/chatting/individual'>Personal Chatting</Link>
        </li>
        <li className={floatingItemStyle}>
          <Link to='/chatting/group'>Group Chatting</Link>
        </li>
      </ul>
    </nav>
  )
}

export default FloatingNav