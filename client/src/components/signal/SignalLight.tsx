import styled from "styled-components"

const Led = styled('div')`
  width: 10px;
  height: 10px;
  background-color: red;
  border-radius: 100%;
  animation-name: Led;
  animation-duration: 1s;
  animation-iteration-count: infinite;
  @keyframes Led {
    0%   {
      outline: 2px solid red;
      outline-offset: 1px;
    }
    20%   {
      outline: 2px solid red;
      outline-offset: 2px;
    }
    40%  {
      outline: 2px solid red;
      outline-offset: 3px;
    }
    60%  {
      outline: 2px solid red;
      outline-offset: 4px;
    }
    100% {
      outline: 2px solid red;
      outline-offset: 5px;
    }
  }
`
const SignalLight = () => {
  return (
    <div className="fixed top-20 right-6 rounded-full border border-slate-600 p-1">
      <Led></Led>
    </div>
  )
}

export default SignalLight