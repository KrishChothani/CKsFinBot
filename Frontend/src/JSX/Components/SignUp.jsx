/** @format */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock } from "lucide-react";
import axios from "axios";
import BACKEND_URL from "../../Config/index.js";
import ParticleBackground from "./ParticleBackground.jsx";

const SignUp = () => {
  const [userName, setUserName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (!fullName || !email || !password || !userName) {
      alert("Please fill in all fields.");
      return;
    }
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/users/register`,
        { userName, fullName, email, password },
        { withCredentials: true }
      );
      console.log("Sign up successful:", res.data);
      alert("Account created successfully! Please sign in.");
      navigate("/");
    } catch (err) {
      console.error("Signup failed:", err.response?.data || err.message);
      alert(
        "Signup failed: " +
          (err.response?.data?.message || "Please try again later.")
      );
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
              Create an Account
            </h2>
            {/* KEY CHANGE: Updated tagline for CKsFinBot */}
            <p className="mt-2 text-sm text-slate-400">
              Create an account to unlock powerful financial insights.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 peer-focus:text-cyan-400" />
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Full Name"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 peer-focus:text-cyan-400" />
              <input
                id="userName"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="User Name"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 peer-focus:text-cyan-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Email address"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 peer-focus:text-cyan-400" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Password"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 peer-focus:text-cyan-400" />
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="peer w-full bg-transparent border-b-2 border-slate-600 pl-10 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                placeholder="Confirm Password"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105"
              >
                Sign Up
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-cyan-400 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
