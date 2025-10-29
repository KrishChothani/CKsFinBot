/** @format */

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  BarChart3,
  Sparkles,
  Upload,
  Menu,
  X,
  ChevronRight,
  Zap,
  Database,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let particles = [];
    const particleCount = 80;
    const connectionDistance = 150;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.radius = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.8)";
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${
              1 - distance / connectionDistance
            })`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      drawConnections();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const navigateTo = (page) => {
    alert(`Navigation to ${page} page (placeholder)`);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: "#000000" }}
      />
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      <div className="relative z-10">
        <nav className="container mx-auto px-4 sm:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* --- LOGO CHANGE (HEADER) --- */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50 overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="CKsFinBot Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                CKsFinBot
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-300 hover:text-blue-400 transition-colors duration-300 font-medium"
              >
                Features
              </a>
              <a
                href="#demo"
                className="text-gray-300 hover:text-blue-400 transition-colors duration-300 font-medium"
              >
                Demo
              </a>
              <button
                onClick={() => navigateTo("About")}
                className="text-gray-300 hover:text-blue-400 transition-colors duration-300 font-medium"
              >
                About
              </button>
              <button
                onClick={() => navigate("/app")}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105"
              >
                Get Started
              </button>
            </div>

            <button
              className="md:hidden text-gray-300 hover:text-blue-400 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-6 space-y-4 bg-gray-900/90 backdrop-blur-xl rounded-xl p-6 border border-gray-800 shadow-2xl">
              <a
                href="#features"
                className="block text-gray-300 hover:text-blue-400 transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#demo"
                className="block text-gray-300 hover:text-blue-400 transition-colors font-medium"
              >
                Demo
              </a>
              <button
                onClick={() => navigateTo("About")}
                className="block w-full text-left text-gray-300 hover:text-blue-400 transition-colors font-medium"
              >
                About
              </button>
              <button
                onClick={() => navigateTo("Product")}
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3 rounded-lg font-semibold text-center hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Get Started
              </button>
            </div>
          )}
        </nav>

        <section className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-5 py-2 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-sm text-blue-400 font-semibold">
                AI-Powered Financial Intelligence
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Ask Questions.
              <span className="block mt-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Understand Financial Reports
              </span>
              <span className="block mt-2">Instantly.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Upload quarterly or yearly financial documents and get insights,
              summaries, and answers powered by AI. Transform complex financial
              data into actionable intelligence in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate("/app")}
                className="group relative bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/60 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
              >
                <span className="flex items-center justify-center space-x-2">
                  {/* <Upload className="w-5 h-5 group-hover:rotate-12 transition-transform" /> */}
                  <span>Get Started</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button
                onClick={() => navigateTo("Demo")}
                className="bg-gray-800/70 backdrop-blur-sm border-2 border-gray-700 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-700/70 hover:border-blue-500/50 transition-all duration-300 w-full sm:w-auto"
              >
                Watch Demo
              </button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  99.9%
                </div>
                <div className="text-sm text-gray-400 mt-1">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  &lt;30s
                </div>
                <div className="text-sm text-gray-400 mt-1">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  24/7
                </div>
                <div className="text-sm text-gray-400 mt-1">Available</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Powerful{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Features
              </span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Everything you need to analyze financial documents with AI
              precision
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              {
                icon: <Database className="w-8 h-8" />,
                title: "Auto Extract Metrics",
                desc: "Automatically identify and extract key financial metrics from any document format with high precision.",
                color: "from-blue-500 to-cyan-600",
              },
              {
                icon: <FileText className="w-8 h-8" />,
                title: "Smart Summaries",
                desc: "Generate comprehensive summaries of quarterly and yearly reports in seconds using advanced NLP.",
                color: "from-cyan-500 to-blue-600",
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Compare & Analyze",
                desc: "Compare performance across quarters and benchmark against industry peers with detailed insights.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "AI Predictions",
                desc: "Leverage machine learning for trend analysis, forecasting, and forward-looking financial insights.",
                color: "from-cyan-500 to-blue-500",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 hover:bg-gray-900/80 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${feature.color} bg-opacity-20 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                >
                  <div className="text-white">{feature.icon}</div>
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="container mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                See It In{" "}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Action
                </span>
              </h2>
              <p className="text-gray-300 text-lg">
                Experience the power of AI-driven financial analysis
              </p>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="space-y-6">
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-2xl rounded-br-sm max-w-md shadow-lg">
                    <p className="text-sm">
                      What was the revenue growth in Q4 2024?
                    </p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 text-white px-6 py-4 rounded-2xl rounded-bl-sm max-w-md shadow-lg">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm leading-relaxed">
                          Based on the Q4 2024 financial report, revenue grew by{" "}
                          <span className="font-bold text-cyan-400">23.5%</span>{" "}
                          year-over-year, reaching{" "}
                          <span className="font-bold text-blue-400">$542M</span>
                          . This represents the strongest quarter in company
                          history.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center space-x-3 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-xl px-4 py-3">
                    <input
                      type="text"
                      placeholder="Ask a question about your financial data..."
                      className="flex-1 bg-transparent text-gray-300 placeholder-gray-500 outline-none"
                      disabled
                    />
                    <button
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                      disabled
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Preview only - Upload a document to start asking questions
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-10">
              <button
                onClick={() => navigateTo("Product")}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/60 transition-all duration-300 transform hover:scale-105"
              >
                Try CKsFinBot Now
              </button>
            </div>
          </div>
        </section>

        <footer className="container mx-auto px-4 sm:px-6 py-12 border-t border-gray-800 mt-20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex items-center space-x-3">
              {/* --- LOGO CHANGE (FOOTER) --- */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="CKsFinBot Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                CKsFinBot
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <button
                onClick={() => navigateTo("About")}
                className="hover:text-blue-400 transition-colors duration-300"
              >
                About
              </button>
              <button
                onClick={() => navigateTo("Contact")}
                className="hover:text-blue-400 transition-colors duration-300"
              >
                Contact
              </button>
              <button
                onClick={() => navigateTo("Privacy Policy")}
                className="hover:text-blue-400 transition-colors duration-300"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => navigateTo("Terms")}
                className="hover:text-blue-400 transition-colors duration-300"
              >
                Terms of Service
              </button>
            </div>

            <p className="text-sm text-gray-500">
              © 2025 CKsFinBot. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
