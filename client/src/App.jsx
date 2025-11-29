import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import VideoChat from './VideoChat'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <div style={{ padding: 20 }}>
      <h1>SkillSync — Video Chat + Messaging</h1>
      <VideoChat />
    </div>
    </>
  )
}

export default App
