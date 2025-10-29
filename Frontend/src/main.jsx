import { StrictMode } from 'react'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ReactDom from "react-dom/client";
import LandingPage from './JSX/Pages/LandingPage.jsx';
import LoginPage from './JSX/Pages/LoginPage.jsx';
import SignupPage from './JSX/Pages/SignupPage.jsx';
import EmailVerification from './JSX/Components/EmailVerification.jsx';
import AuthContextProvider from './JSX/Contexts/AuthContextProvider.jsx';
import ProtectedRoute from './JSX/Components/Protection/ProtectedRoute.jsx';




const router = createBrowserRouter([
  {
    path: "/app",
    element: (
    <ProtectedRoute>
    <App />
    </ProtectedRoute>),
    children: [],
  },
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/verify-email",
    element: <EmailVerification />,
  },
]);

ReactDom.createRoot(document.getElementById("root")).render(
  <AuthContextProvider>
    <RouterProvider router={router} />
  </AuthContextProvider>
);