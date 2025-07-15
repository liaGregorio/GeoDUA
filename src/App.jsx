import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Inicio from './pages/Inicio';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="inicio" element={<Inicio />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
