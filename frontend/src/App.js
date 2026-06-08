import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Assets from './pages/Assets';
import Hire from './pages/Hire';
import Works from './pages/Works';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div className="App bg-[#070314] min-h-screen text-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/about" element={<About />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/works" element={<Works />} />
          <Route path="/hire" element={<Hire />} />
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
