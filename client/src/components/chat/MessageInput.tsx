
const MessageInput = () => {
  return (
    <div className="flex">
      <label className="text-start flex w-full">
        <span className="text-gray-600 leading-7">Message: </span>
        <input type="text" className="w-full rounded border border-sky-400 p-1 focus:outline-none mx-2 focus:shadow" placeholder="Type a message..." />
      </label>
      <button className="text-sky-700 hover:drop-shadow hover:underline">Send</button>
    </div>
  )
}

export default MessageInput