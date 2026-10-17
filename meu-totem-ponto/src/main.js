import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js'; // Alterado de .jsx para .js
import './assets/css/global.css'; // Importa o CSS da sua aplicação

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
