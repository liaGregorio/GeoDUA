import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="inicio" element={<Inicio />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
