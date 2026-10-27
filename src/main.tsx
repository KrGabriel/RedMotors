import {createRoot} from 'react-dom/client';import {BrowserRouter,Route,Routes} from 'react-router-dom';import App from './App';import Admin from './Admin';import './styles.css';
createRoot(document.getElementById('root')!).render(<BrowserRouter><Routes><Route path="/admin" element={<Admin/>}/><Route path="*" element={<App/>}/></Routes></BrowserRouter>);
