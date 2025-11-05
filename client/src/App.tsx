import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Requests from './pages/Requests';
import { Protected } from './components/Protected';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>}/>
        <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
        <Route path="/requests" element={<Protected><Requests /></Protected>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
