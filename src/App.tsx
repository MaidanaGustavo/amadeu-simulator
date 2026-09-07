import { HashRouter, Routes, Route } from 'react-router-dom';
import Laboratorio from './pages/Laboratorio';
import Instrucoes from './pages/Instrucoes';

/** HashRouter para funcionar servido de qualquer pasta estática (IIS, nginx, file://). */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Laboratorio />} />
        <Route path="/instrucoes" element={<Instrucoes />} />
      </Routes>
    </HashRouter>
  );
}
