import React, { useState } from 'react';

const AgentChat = () => {
  const [messages, setMessages] = useState([{ sender: 'ai', text: 'Hello! I am the FoodBridge AI assistant. How can I help you coordinate food redistribution today?' }]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages([...messages, { sender: 'user', text: userMsg }]);
    setInput('');

    try {
      const res = await fetch('http://localhost:5000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply || data.error }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to the AI agent.' }]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="text-emerald-500 mr-2">🤖</span> FoodBridge AI Assistant
      </h2>
      
      <div className="h-96 overflow-y-auto mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
          placeholder="Ask about nearby NGOs or food needs..."
        />
        <button 
          onClick={handleSend}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default AgentChat;
