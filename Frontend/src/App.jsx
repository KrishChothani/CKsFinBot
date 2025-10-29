// /** @format */

// // src/App.jsx
// /** @format */

// import { useState, useEffect, useRef, useCallback } from "react";
// import { Download, Share2, Bot, Menu, PanelLeftOpen } from "lucide-react";
// import { AnimatePresence, motion } from "framer-motion";

// // API Client
// import {
//   getAllConversations,
//   getConversationById,
//   createConversation,
//   deleteConversation,
//   createChatMessage,
//   uploadDocuments,
// } from "./services/apiClient";

// // Component Imports
// import Message from "./JSX/Components/Message";
// import ChatInput from "./JSX/Components/ChatInput";
// import FeatureSelector from "./JSX/Components/FeatureSelector";
// import ParticleBackground from "./JSX/Components/ParticleBackground";
// import Sidebar from "./JSX/Components/Sidebar";

// function App() {
//   // State
//   const [conversations, setConversations] = useState([]);
//   const [currentConversationId, setCurrentConversationId] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [feature, setFeature] = useState("Smart_Chat");
//   const [isLoading, setIsLoading] = useState(true); // Manages loading for API calls
//   const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
//   const messagesEndRef = useRef(null);

//   // --- Data Fetching Effects ---

//   // Initial fetch for all conversations
//   useEffect(() => {
//     const fetchInitialConversations = async () => {
//       setIsLoading(true);
//       try {
//         const response = await getAllConversations();
//         const convos = response.data.data;
//         setConversations(convos);
//         if (convos.length > 0) {
//           setCurrentConversationId(convos[0]._id);
//         } else {
//           // If the user has no conversations, create the first one
//           await handleNewChat(false); // Pass false to not switch view, as it's the first
//         }
//       } catch (error) {
//         console.error("Failed to fetch conversations:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     fetchInitialConversations();
//   }, []); // Empty dependency array means this runs once on mount

//   // Fetch messages whenever the selected conversation changes
//   const fetchMessagesForConversation = useCallback(async () => {
//     if (!currentConversationId) return;
//     try {
//       setIsLoading(true);
//       const response = await getConversationById(currentConversationId);
//       setMessages(response.data.data.messages);
//     } catch (error) {
//       console.error("Failed to fetch messages:", error);
//       setMessages([
//         {
//           _id: "error",
//           role: "system",
//           content: "Failed to load messages for this conversation.",
//         },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentConversationId]);

//   useEffect(() => {
//     fetchMessagesForConversation();
//   }, [fetchMessagesForConversation]);

//   // --- UI Effects ---
//   useEffect(() => {
//     const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, isLoading]);

//   // --- Event Handlers ---

//   const handleNewChat = async (switchToNew = true) => {
//     try {
//       const response = await createConversation();
//       const newConvo = response.data.data;
//       setConversations((prev) => [newConvo, ...prev]);
//       if (switchToNew) {
//         setCurrentConversationId(newConvo._id);
//       }
//       return newConvo;
//     } catch (error) {
//       console.error("Failed to create new chat:", error);
//     }
//   };

//   const handleSelectChat = (conversationId) => {
//     setCurrentConversationId(conversationId);
//   };

//   const handleDeleteChat = async (conversationId) => {
//     if (
//       !window.confirm(
//         "Are you sure you want to delete this conversation and all its data?"
//       )
//     )
//       return;
//     try {
//       await deleteConversation(conversationId);
//       const updatedConversations = conversations.filter(
//         (c) => c._id !== conversationId
//       );
//       setConversations(updatedConversations);
//       if (currentConversationId === conversationId) {
//         setCurrentConversationId(
//           updatedConversations.length > 0 ? updatedConversations[0]._id : null
//         );
//         if (updatedConversations.length === 0) {
//           await handleNewChat();
//         }
//       }
//     } catch (error) {
//       console.error("Failed to delete conversation:", error);
//     }
//   };

//   const handleSend = async () => {
//     if (input.trim() === "" || isLoading || !currentConversationId) return;
//     const tempUserMessage = {
//       role: "user",
//       content: input,
//       _id: `temp-${Date.now()}`,
//     };
//     setMessages((prev) => [...prev, tempUserMessage]);
//     const messageToSend = input;
//     setInput("");
//     setIsLoading(true);
//     try {
//       await createChatMessage(currentConversationId, messageToSend);
//       // Refetch messages to get the real user message and the AI response
//       await fetchMessagesForConversation();
//     } catch (error) {
//       console.error("Failed to send message:", error);
//       setMessages((prev) => [
//         ...prev.filter((m) => m._id !== tempUserMessage._id),
//         {
//           role: "system",
//           content: "Error: Could not get a response.",
//           _id: "error-response",
//         },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleFileUpload = async (files) => {
//     if (!currentConversationId || files.length === 0) return;
//     const fileNames = files.map((f) => f.name).join(", ");
//     const systemMessage = {
//       role: "system",
//       content: `Uploading ${fileNames}...`,
//       _id: `upload-${Date.now()}`,
//     };
//     setMessages((prev) => [...prev, systemMessage]);
//     setIsLoading(true);
//     try {
//       await uploadDocuments(currentConversationId, files);
//       setMessages((prev) =>
//         prev.map((m) =>
//           m._id === systemMessage._id
//             ? {
//                 ...m,
//                 content: `${fileNames} uploaded successfully. The AI is now processing them.`,
//               }
//             : m
//         )
//       );
//     } catch (error) {
//       console.error("File upload failed:", error);
//       setMessages((prev) =>
//         prev.map((m) =>
//           m._id === systemMessage._id
//             ? {
//                 ...m,
//                 content: `Error uploading ${fileNames}. Please try again.`,
//               }
//             : m
//         )
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Re-added: Share and Export Handlers
//   const handleExport = () => {
//     if (!currentConversationId) return;
//     const dataStr =
//       "data:text/json;charset=utf-8," +
//       encodeURIComponent(JSON.stringify(messages, null, 2));
//     const downloadAnchorNode = document.createElement("a");
//     downloadAnchorNode.setAttribute("href", dataStr);
//     downloadAnchorNode.setAttribute(
//       "download",
//       `chat-history-${currentConversationId}.json`
//     );
//     document.body.appendChild(downloadAnchorNode);
//     downloadAnchorNode.click();
//     downloadAnchorNode.remove();
//   };

//   const handleShare = () => {
//     if (!currentConversationId) return;
//     const conversationText = messages
//       .filter((m) => m.role === "user" || m.role === "assistant") // Only share user/assistant messages
//       .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
//       .join("\n\n");
//     navigator.clipboard
//       .writeText(conversationText)
//       .then(() => alert("Conversation copied to clipboard!"))
//       .catch((err) => console.error("Failed to copy conversation:", err));
//   };

//   // --- Render Logic ---
//   return (
//     <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
//       <ParticleBackground />
//       <div className="absolute inset-0 bg-black/60 z-0"></div>

//       {/* Re-added: Mobile overlay for sidebar */}
//       <AnimatePresence>
//         {isSidebarOpen && window.innerWidth < 768 && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             onClick={() => setIsSidebarOpen(false)}
//             className="fixed inset-0 bg-black/60 z-20"
//           />
//         )}
//       </AnimatePresence>

//       <Sidebar
//         conversations={conversations}
//         currentConversationId={currentConversationId}
//         onNewChat={handleNewChat}
//         onSelectChat={handleSelectChat}
//         onDeleteChat={handleDeleteChat}
//         isOpen={isSidebarOpen}
//         setIsOpen={setIsSidebarOpen}
//       />

//       <div className="relative z-10 flex flex-col flex-1 h-full">
//         <header className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gray-950/70 backdrop-blur-xl flex-shrink-0">
//           <div className="flex items-center gap-2">
//             {/* Re-added: Desktop sidebar toggle button */}
//             {!isSidebarOpen && (
//               <button
//                 onClick={() => setIsSidebarOpen(true)}
//                 className="p-2 hidden md:block text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md"
//                 title="Open sidebar"
//               >
//                 <PanelLeftOpen className="w-5 h-5" />
//               </button>
//             )}
//             <button
//               onClick={() => setIsSidebarOpen(true)}
//               className="md:hidden p-2 text-gray-300 hover:text-white"
//             >
//               <Menu className="w-6 h-6" />
//             </button>
//             <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
//               CKsFinBot
//             </h1>
//           </div>

//           <div className="flex items-center gap-2 sm:gap-4">
//             <FeatureSelector feature={feature} setFeature={setFeature} />
//             {/* Re-added: Share and Export buttons */}
//             <button
//               onClick={handleShare}
//               className="p-2 hover:bg-gray-800/50 rounded-md"
//               title="Share Chat"
//             >
//               <Share2 className="w-5 h-5" />
//             </button>
//             <button
//               onClick={handleExport}
//               className="p-2 hover:bg-gray-800/50 rounded-md"
//               title="Export Chat"
//             >
//               <Download className="w-5 h-5" />
//             </button>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto p-4 md:p-6">
//           <div className="max-w-4xl mx-auto">
//             {isLoading && messages.length === 0 && (
//               <div className="text-center text-gray-400">
//                 Loading history...
//               </div>
//             )}
//             {messages.map((msg) => (
//               <Message key={msg._id} message={msg} />
//             ))}
//             {isLoading && messages.length > 0 && (
//               <div className="flex items-start gap-4 my-4">
//                 <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
//                   <Bot className="w-6 h-6 text-blue-400" />
//                 </div>
//                 <div className="px-4 py-3 rounded-2xl bg-gray-800">
//                   <div className="flex items-center gap-2">
//                     <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
//                     <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
//                     <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-300"></span>
//                   </div>
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
//         </main>

//         <footer className="p-4 md:p-6 border-t border-gray-800/50 bg-gray-950/70 backdrop-blur-xl flex-shrink-0">
//           <div className="max-w-4xl mx-auto">
//             <ChatInput
//               input={input}
//               setInput={setInput}
//               handleSend={handleSend}
//               isLoading={isLoading}
//               handleFileUpload={handleFileUpload}
//             />
//           </div>
//         </footer>
//       </div>
//     </div>
//   );
// }

// export default App;


// /** @format */

// // src/App.jsx
// /** @format */

// import { useState, useEffect, useRef, useCallback } from "react";
// import { Download, Share2, Bot, Menu, PanelLeftOpen } from "lucide-react";
// import { AnimatePresence, motion } from "framer-motion";

// // API Client
// import {
//   getAllConversations,
//   getConversationById,
//   createConversation,
//   deleteConversation,
//   createChatMessage,
//   uploadDocuments,
// } from "./services/apiClient";

// // Component Imports
// import Message from "./JSX/Components/Message";
// import ChatInput from "./JSX/Components/ChatInput";
// import FeatureSelector from "./JSX/Components/FeatureSelector";
// import ParticleBackground from "./JSX/Components/ParticleBackground";
// import Sidebar from "./JSX/Components/Sidebar";

// function App() {
//   // State
//   const [conversations, setConversations] = useState([]);
//   const [currentConversationId, setCurrentConversationId] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [feature, setFeature] = useState("Smart_Chat");
//   const [isLoading, setIsLoading] = useState(true); // Manages loading for API calls
//   const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
//   const messagesEndRef = useRef(null);

//   // --- Data Fetching Effects ---

//   // Initial fetch for all conversations
//   useEffect(() => {
//     const fetchInitialConversations = async () => {
//       setIsLoading(true);
//       try {
//         const response = await getAllConversations();
//         const convos = response.data.data;
//         setConversations(convos);
//         if (convos.length > 0) {
//           setCurrentConversationId(convos[0]._id);
//         } else {
//           // If the user has no conversations, create the first one
//           await handleNewChat(false); // Pass false to not switch view, as it's the first
//         }
//       } catch (error) {
//         console.error("Failed to fetch conversations:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     fetchInitialConversations();
//   }, []); // Empty dependency array means this runs once on mount

//   // Fetch messages whenever the selected conversation changes
//   const fetchMessagesForConversation = useCallback(async () => {
//     if (!currentConversationId) return;
//     try {
//       setIsLoading(true);
//       const response = await getConversationById(currentConversationId);
//       setMessages(response.data.data.messages);
//     } catch (error) {
//       console.error("Failed to fetch messages:", error);
//       setMessages([
//         {
//           _id: "error",
//           role: "system",
//           content: "Failed to load messages for this conversation.",
//         },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentConversationId]);

//   useEffect(() => {
//     fetchMessagesForConversation();
//   }, [fetchMessagesForConversation]);

//   // --- UI Effects ---
//   useEffect(() => {
//     const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, isLoading]);

//   // --- Event Handlers ---

//   const handleNewChat = async (switchToNew = true) => {
//     try {
//       const response = await createConversation();
//       const newConvo = response.data.data;
//       setConversations((prev) => [newConvo, ...prev]);
//       if (switchToNew) {
//         setCurrentConversationId(newConvo._id);
//       }
//       return newConvo;
//     } catch (error) {
//       console.error("Failed to create new chat:", error);
//     }
//   };

//   const handleSelectChat = (conversationId) => {
//     setCurrentConversationId(conversationId);
//   };

//   const handleDeleteChat = async (conversationId) => {
//     if (
//       !window.confirm(
//         "Are you sure you want to delete this conversation and all its data?"
//       )
//     )
//       return;
//     try {
//       await deleteConversation(conversationId);
//       const updatedConversations = conversations.filter(
//         (c) => c._id !== conversationId
//       );
//       setConversations(updatedConversations);
//       if (currentConversationId === conversationId) {
//         setCurrentConversationId(
//           updatedConversations.length > 0 ? updatedConversations[0]._id : null
//         );
//         if (updatedConversations.length === 0) {
//           await handleNewChat();
//         }
//       }
//     } catch (error) {
//       console.error("Failed to delete conversation:", error);
//     }
//   };

//   const handleSend = async () => {
//     if (input.trim() === "" || isLoading || !currentConversationId) return;
//     const tempUserMessage = {
//       role: "user",
//       content: input,
//       _id: `temp-${Date.now()}`,
//     };
//     setMessages((prev) => [...prev, tempUserMessage]);
//     const messageToSend = input;
//     setInput("");
//     setIsLoading(true);
//     try {
//       await createChatMessage(currentConversationId, messageToSend);
//       // Refetch messages to get the real user message and the AI response
//       await fetchMessagesForConversation();
//     } catch (error) {
//       console.error("Failed to send message:", error);
//       setMessages((prev) => [
//         ...prev.filter((m) => m._id !== tempUserMessage._id),
//         {
//           role: "system",
//           content: "Error: Could not get a response.",
//           _id: "error-response",
//         },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleFileUpload = async (files) => {
//     if (!currentConversationId || files.length === 0) return;
//     const fileNames = files.map((f) => f.name).join(", ");
//     const systemMessage = {
//       role: "system",
//       content: `Uploading ${fileNames}...`,
//       _id: `upload-${Date.now()}`,
//     };
//     setMessages((prev) => [...prev, systemMessage]);
//     setIsLoading(true);
//     try {
//       await uploadDocuments(currentConversationId, files);
//       setMessages((prev) =>
//         prev.map((m) =>
//           m._id === systemMessage._id
//             ? {
//                 ...m,
//                 content: `${fileNames} uploaded successfully. The AI is now processing them.`,
//               }
//             : m
//         )
//       );
//     } catch (error) {
//       console.error("File upload failed:", error);
//       setMessages((prev) =>
//         prev.map((m) =>
//           m._id === systemMessage._id
//             ? {
//                 ...m,
//                 content: `Error uploading ${fileNames}. Please try again.`,
//               }
//             : m
//         )
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Re-added: Share and Export Handlers
//   const handleExport = () => {
//     if (!currentConversationId) return;
//     const dataStr =
//       "data:text/json;charset=utf-8," +
//       encodeURIComponent(JSON.stringify(messages, null, 2));
//     const downloadAnchorNode = document.createElement("a");
//     downloadAnchorNode.setAttribute("href", dataStr);
//     downloadAnchorNode.setAttribute(
//       "download",
//       `chat-history-${currentConversationId}.json`
//     );
//     document.body.appendChild(downloadAnchorNode);
//     downloadAnchorNode.click();
//     downloadAnchorNode.remove();
//   };

//   const handleShare = () => {
//     if (!currentConversationId) return;
//     const conversationText = messages
//       .filter((m) => m.role === "user" || m.role === "assistant") // Only share user/assistant messages
//       .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
//       .join("\n\n");
//     navigator.clipboard
//       .writeText(conversationText)
//       .then(() => alert("Conversation copied to clipboard!"))
//       .catch((err) => console.error("Failed to copy conversation:", err));
//   };

//   // --- Render Logic ---
//   return (
//     <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
//       <ParticleBackground />
//       <div className="absolute inset-0 bg-black/60 z-0"></div>

//       {/* Re-added: Mobile overlay for sidebar */}
//       <AnimatePresence>
//         {isSidebarOpen && window.innerWidth < 768 && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             onClick={() => setIsSidebarOpen(false)}
//             className="fixed inset-0 bg-black/60 z-20"
//           />
//         )}
//       </AnimatePresence>

//       <Sidebar
//         conversations={conversations}
//         currentConversationId={currentConversationId}
//         onNewChat={handleNewChat}
//         onSelectChat={handleSelectChat}
//         onDeleteChat={handleDeleteChat}
//         isOpen={isSidebarOpen}
//         setIsOpen={setIsSidebarOpen}
//       />

//       <div className="relative z-10 flex flex-col flex-1 h-full">
//         <header className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gray-950/70 backdrop-blur-xl flex-shrink-0">
//           <div className="flex items-center gap-2">
//             {/* Re-added: Desktop sidebar toggle button */}
//             {!isSidebarOpen && (
//               <button
//                 onClick={() => setIsSidebarOpen(true)}
//                 className="p-2 hidden md:block text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md"
//                 title="Open sidebar"
//               >
//                 <PanelLeftOpen className="w-5 h-5" />
//               </button>
//             )}
//             <button
//               onClick={() => setIsSidebarOpen(true)}
//               className="md:hidden p-2 text-gray-300 hover:text-white"
//             >
//               <Menu className="w-6 h-6" />
//             </button>
//             <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
//               CKsFinBot
//             </h1>
//           </div>

//           <div className="flex items-center gap-2 sm:gap-4">
//             <FeatureSelector feature={feature} setFeature={setFeature} />
//             {/* Re-added: Share and Export buttons */}
//             <button
//               onClick={handleShare}
//               className="p-2 hover:bg-gray-800/50 rounded-md"
//               title="Share Chat"
//             >
//               <Share2 className="w-5 h-5" />
//             </button>
//             <button
//               onClick={handleExport}
//               className="p-2 hover:bg-gray-800/50 rounded-md"
//               title="Export Chat"
//             >
//               <Download className="w-5 h-5" />
//             </button>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto p-4 md:p-6">
//           <div className="max-w-4xl mx-auto">
//             {isLoading && messages.length === 0 && (
//               <div className="text-center text-gray-400">
//                 Loading history...
//               </div>
//             )}
//             {messages.map((msg) => (
//               <Message key={msg._id} message={msg} />
//             ))}
//             {isLoading && messages.length > 0 && (
//               <div className="flex items-start gap-4 my-4">
//                 <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
//                   <Bot className="w-6 h-6 text-blue-400" />
//                 </div>
//                 <div className="px-4 py-3 rounded-2xl bg-gray-800">
//                   <div className="flex items-center gap-2">
//                     <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
//                     <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
//                     <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-300"></span>
//                   </div>
//                 </div>
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>
//         </main>

//         <footer className="p-4 md:p-6 border-t border-gray-800/50 bg-gray-950/70 backdrop-blur-xl flex-shrink-0">
//           <div className="max-w-4xl mx-auto">
//             <ChatInput
//               input={input}
//               setInput={setInput}
//               handleSend={handleSend}
//               isLoading={isLoading}
//               handleFileUpload={handleFileUpload}
//             />
//           </div>
//         </footer>
//       </div>
//     </div>
//   );
// }

// export default App;

/** @format */

import { useState, useEffect, useRef, useCallback } from "react";
import { Download, Share2, Bot, Menu, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// API Client
import {
  getAllConversations,
  getConversationById,
  createConversation,
  deleteConversation,
  createChatMessage,
  uploadDocuments,
  updateConversationFeature,
} from "./services/apiClient";

// Component Imports
import Message from "./JSX/Components/Message";
import ChatInput from "./JSX/Components/ChatInput";
import FeatureSelector from "./JSX/Components/FeatureSelector";
import ParticleBackground from "./JSX/Components/ParticleBackground";
import Sidebar from "./JSX/Components/Sidebar";
import WelcomeScreen from "./JSX/Components/WelcomeScreen";

function App() {
  // State
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentConversationDocs, setCurrentConversationDocs] = useState([]); // State for documents
  const [input, setInput] = useState("");
  const [feature, setFeature] = useState("Smart_Chat");
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const messagesEndRef = useRef(null);

  // --- Data Fetching Effects ---

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const response = await getAllConversations();
        const convos = response.data.data;
        setConversations(convos);
        if (convos.length > 0) {
          setCurrentConversationId(convos[0]._id);
        } else {
          await handleNewChat(false);
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchConversationDetails = useCallback(async (showLoading = true) => {
    if (!currentConversationId) return;
    if (showLoading) setIsLoading(true);
    try {
      const response = await getConversationById(currentConversationId);
      const data = response.data.data;
      setMessages(data.messages || []);
      setCurrentConversationDocs(data.documents || []);
      setCurrentConversation(data.conversation);
      
      // Sync the feature state with the conversation's feature
      if (data.conversation && data.conversation.featureUsed) {
        setFeature(data.conversation.featureUsed);
      }
      
      // Debug log to track document status updates
      if (data.documents && data.documents.length > 0) {
        console.log("Document statuses:", data.documents.map(doc => ({
          fileName: doc.fileName,
          status: doc.status
        })));
      }
    } catch (error) {
      console.error("Failed to fetch conversation details:", error);
      setMessages([
        { _id: "error", role: "system", content: "Failed to load conversation." },
      ]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [currentConversationId]);

  useEffect(() => {
    fetchConversationDetails();
  }, [fetchConversationDetails]);

  // Polling effect to check for document processing updates
  useEffect(() => {
    if (!currentConversationId || !currentConversationDocs.length) return;

    const hasProcessingDocs = currentConversationDocs.some(
      doc => doc.status === "processing"
    );

    if (!hasProcessingDocs) return;

    const pollInterval = setInterval(() => {
      fetchConversationDetails(false); // Don't show loading spinner for polling
    }, 5000); // Poll every 5 seconds to be less aggressive

    return () => clearInterval(pollInterval);
  }, [currentConversationId, currentConversationDocs, fetchConversationDetails]);

  // --- UI Effects ---

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- Event Handlers ---

  const handleNewChat = async (switchToNew = true) => {
    try {
      const response = await createConversation("New Chat", feature);
      const newConvo = response.data.data;
      setConversations((prev) => [newConvo, ...prev]);
      if (switchToNew) {
        setCurrentConversationId(newConvo._id);
        setMessages([]);
        setCurrentConversationDocs([]);
        setCurrentConversation(newConvo);
      }
      return newConvo;
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleSelectChat = (conversationId) => {
    setCurrentConversationId(conversationId);
  };

  const refreshConversationsList = async () => {
    try {
      const response = await getAllConversations();
      const convos = response.data.data;
      setConversations(convos);
    } catch (error) {
      console.error("Failed to refresh conversations list:", error);
    }
  };

  const handleExampleClick = (exampleText) => {
    setInput(exampleText);
    // Focus on the input after setting the text
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  };

  const handleWelcomeFeatureSelect = (newFeature) => {
    handleFeatureChange(newFeature);
  };

  const handleFeatureChange = async (newFeature) => {
    setFeature(newFeature);
    
    // If there's a current conversation, update its feature
    if (currentConversationId) {
      try {
        await updateConversationFeature(currentConversationId, newFeature);
        
        // Update the current conversation state
        if (currentConversation) {
          setCurrentConversation(prev => ({
            ...prev,
            featureUsed: newFeature
          }));
        }
      } catch (error) {
        console.error("Failed to update conversation feature:", error);
      }
    }
  };

    const handleDeleteChat = async (conversationId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this conversation and all its data?"
      )
    )
      return;
    try {
      await deleteConversation(conversationId);
      const updatedConversations = conversations.filter(
        (c) => c._id !== conversationId
      );
      setConversations(updatedConversations);
      if (currentConversationId === conversationId) {
        setCurrentConversationId(
          updatedConversations.length > 0 ? updatedConversations[0]._id : null
        );
        if (updatedConversations.length === 0) {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleSend = async (text, files) => {
    if ((!text.trim() && files.length === 0) || !currentConversationId) return;

    setIsLoading(true);
    try {
      // Handle file uploads using the enhanced upload system
      if (files.length > 0) {
        await handleEnhancedFileUpload(files);
      }

      // Handle text message
      if (text.trim() !== "") {
        const tempUserMessage = {
          role: "user",
          content: text,
          _id: `temp-${Date.now()}`,
        };
        setMessages((prev) => [...prev, tempUserMessage]);
        
        // Check if this is the first user message (to update conversation title)
        const isFirstMessage = messages.filter(m => m.role === "user").length === 0;
        
        await createChatMessage(currentConversationId, text);
        await fetchConversationDetails();
        
        // Always refresh the conversations list to ensure titles are up to date
        await refreshConversationsList();
      }
    } catch (error) {
      console.error("Send/Upload Error:", error);
      // Add error message to chat
      setMessages((prev) => [...prev, {
        role: "system",
        content: "Error: Failed to send message or upload files. Please try again.",
        _id: `error-${Date.now()}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced file upload handler that automatically chooses the best upload method
  const handleEnhancedFileUpload = async (files) => {
    const MAX_REGULAR_SIZE = 10 * 1024 * 1024; // 10MB
    const largeFiles = files.filter(file => file.size > MAX_REGULAR_SIZE);
    const smallFiles = files.filter(file => file.size <= MAX_REGULAR_SIZE);

    const results = [];
    const isFirstInteraction = messages.length === 0;

    // Handle small files with regular upload (faster for small files)
    if (smallFiles.length > 0) {
      try {
        const response = await uploadDocuments(currentConversationId, smallFiles);
        results.push(...response.data.data);
      } catch (error) {
        console.error("Regular upload failed, trying S3:", error);
        // If regular upload fails, add to large files for S3 upload
        largeFiles.push(...smallFiles);
      }
    }

    // Handle large files with S3 presigned URLs
    if (largeFiles.length > 0) {
      const s3Results = await handleS3Upload(largeFiles);
      results.push(...s3Results);
    }

    // Update UI with uploaded files
    if (results.length > 0) {
      const newMessages = results.map((r) => r.message);
      const newDocs = results.map((r) => r.document);
      setMessages((prev) => [...prev, ...newMessages]);
      setCurrentConversationDocs((prev) => [...prev, ...newDocs]);
      
      // Refresh conversations list if this was the first interaction
      if (isFirstInteraction) {
        await refreshConversationsList();
      }
    }

    return results;
  };

  // S3 upload handler for large files
  const handleS3Upload = async (files) => {
    const { generatePresignedUrl, uploadToS3, registerS3Documents } = await import("./services/apiClient");
    const results = [];
    
    for (const file of files) {
      try {
        // Step 1: Generate presigned URL
        const urlResponse = await generatePresignedUrl(file.name, file.type);
        console.log(urlResponse);

        const { uploadUrl, fileUrl } = urlResponse.data.data;

        // Step 2: Upload to S3
        const uploadResponse = await uploadToS3(uploadUrl, file);
        
        if (!uploadResponse.ok) {
          throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
        }

        // Step 3: Register with backend
        const registerResponse = await registerS3Documents(currentConversationId, [{
          fileName: file.name,
          fileUrl: fileUrl,
          fileType: file.type
        }]);

        results.push(...registerResponse.data.data);

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Add error message for this specific file
        setMessages((prev) => [...prev, {
          role: "system",
          content: `Failed to upload ${file.name}: ${error.message}`,
          _id: `upload-error-${Date.now()}`,
        }]);
      }
    }

    return results;
  };
//   // Re-added: Share and Export Handlers
  const handleExport = () => {
    if (!currentConversationId) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `chat-history-${currentConversationId}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleShare = () => {
    if (!currentConversationId) return;
    const conversationText = messages
      .filter((m) => m.role === "user" || m.role === "assistant") // Only share user/assistant messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard
      .writeText(conversationText)
      .then(() => alert("Conversation copied to clipboard!"))
      .catch((err) => console.error("Failed to copy conversation:", err));
  };
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <ParticleBackground />
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 768 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-20"
          />
        )}
      </AnimatePresence>
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="relative z-10 flex flex-col flex-1 h-full">
        <header className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gray-950/70 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hidden md:block text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md"
                title="Open sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-gray-300 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
              CKsFinBot
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <FeatureSelector feature={feature} setFeature={handleFeatureChange} />
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-800/50 rounded-md"
              title="Share Chat"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 hover:bg-gray-800/50 rounded-md"
              title="Export Chat"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* Show WelcomeScreen when no messages, otherwise show chat */}
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen 
              feature={feature}
              onExampleClick={handleExampleClick}
              onFeatureSelect={handleWelcomeFeatureSelect}
            />
          ) : (
            <div className="p-4 md:p-6">
              <div className="max-w-4xl mx-auto">
                {isLoading && messages.length === 0 && (
                  <div className="text-center text-gray-400">Loading...</div>
                )}
                {messages.map((msg) => (
                  <Message
                    key={msg._id}
                    message={msg}
                    documents={currentConversationDocs}
                  />
                ))}
                {isLoading && messages.length > 0 && (
                  <div className="flex items-start gap-4 my-4">
                     <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-75"></span>
                        <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-150"></span>
                        <span className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-300"></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </main>

        <footer className={`p-4 md:p-6 border-t border-gray-800/50 bg-gray-950/70 backdrop-blur-xl flex-shrink-0 ${
          messages.length === 0 ? 'border-t-0' : ''
        }`}>
          <div className="max-w-4xl mx-auto">
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;