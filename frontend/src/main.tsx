import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { store } from './app/store';
import LoginPage from './pages/auth/LoginPage';
<<<<<<< HEAD
import SignupPage from './pages/auth/SignupPage';
=======
>>>>>>> 3ab6cd57c8f22b843ae6c3cc5f44f70f95f48954
import ContactPage from './pages/ContactPage';
import './assets/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
<<<<<<< HEAD
          <Route path="/signup" element={<SignupPage />} />
=======
>>>>>>> 3ab6cd57c8f22b843ae6c3cc5f44f70f95f48954
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
