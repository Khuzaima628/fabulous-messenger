import react from 'react'
import Join from './page/Join'
import Chat from './page/Chat'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import CloudinaryUploadTest from './utils/cloudinaryUpload'

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Join />} />
          <Route path="/chat/:user_name" element={<Chat />} />
          {/* <Route path="/" element={<CloudinaryUploadTest />} /> */}
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
