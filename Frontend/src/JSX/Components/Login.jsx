/** @format */

import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import axios from "axios";
import AuthContext from "../Contexts/AuthContext";
import BACKEND_URL from "../../Config/index.js";
import ParticleBackground from "../Components/ParticleBackground.jsx";

const Login = () => {
  const [email, setEmail] = useState("developer123@gmail.com");
  const [password, setPassword] = useState("developer@123");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    try {
      console.log("try  to login ", email, password);
       const res = await axios.post(
         `${BACKEND_URL}/api/v1/users/login`,
         { email, password }, // send credentials in request body
         { withCredentials: true } // correct key is withCredentials (not withcredential)
       );
       login(res.data);
       console.log("Login successful", res.data);
       navigate("/app");
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      alert("Login failed. Please check your credentials or try again later.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white relative overflow-hidden">
      <ParticleBackground />
      <div className="absolute inset-0 bg-black/40 z-10" />

      <div className="relative z-20 flex flex-col items-center w-full">
        <div className="mb-8">
          {/* KEY CHANGE: Updated logo alt text */}
          <img src="/logo.png" alt="CKsFinBot Logo" className="h-20 w-auto" />
        </div>

        <div className="w-full max-w-md p-8 space-y-8 bg-black/30 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-500/30 shadow-blue-500/10">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            {/* KEY CHANGE: Updated tagline for CKsFinBot */}
            <p className="mt-2 text-sm text-slate-400">
              Sign in to access your financial AI assistant.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors duration-300 peer-focus:text-cyan-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all duration-300"
                placeholder="Email address"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors duration-300 peer-focus:text-cyan-400" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-all duration-300"
                placeholder="Password"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-slate-400">
            Don’t have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-cyan-400 hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
