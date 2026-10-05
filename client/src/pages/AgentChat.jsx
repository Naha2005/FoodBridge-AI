import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, RefreshCw, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { agentApi, foodApi, getUser } from '../services/api';

const SUGGESTED_PROMPTS = [
  'What food is available for donation today?',
  'How does the Smart Rescue matching work?',
  'What food categories are most needed by NGOs?',
  'How do I reduce food waste as a restaurant?',
];

const formatText = (text) =>
  text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
      <br />
    </React.Fragment>
  ));

const AgentChat = () => {
  const location  = useLocation();
  const user      = getUser();
  const chatRef   = useRef(null);

  // Chat tab
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [chatLoad,  setChatLoad]  = useState(false);

  // Rescue agent tab
  const [activeTab,   setActiveTab]   = useState('chat');
  const [rescueRes,   setRescueRes]   = useState(null);
  const [rescueLoad,  setRescueLoad]  = useState(false);
  const [rescueError, setRescueError] = useState('');
  const [donations,   setDonations]   = useState([]);
  const [selectedId,  setSelected]    = useState('');
  const [toast,       setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, chatLoad]);

  // Check if we were navigated from MyDonations with a rescue result
  useEffect(() => {
    if (location.state?.rescueResult) {
      setActiveTab('rescue');
      setRescueRes(location.state.rescueResult);
    }
  }, [location.state]);

  // Load available donations for rescue tab
  useEffect(() => {
    const load = async () => {
      try {
        const res = await foodApi.myDonations({ status: 'available', limit: 20 });
        const avail = (res.donations || []).filter((d) => d.status === 'available');
        setDonations(avail);
        if (avail.length > 0) setSelected(avail[0].id);
      } catch {}
    };
    load();
  }, []);

  // ─────────────────── Chat ───────────────────────────────────────────────────

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || chatLoad) return;
    setInput('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const history = messages.map((m) => ({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.text }));

    setMessages((prev) => [...prev, { sender: 'user', text: msg, time: timeStr }]);
    setChatLoad(true);

    try {
      const res = await agentApi.chat({ message: msg, messages: history });
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [...prev, { sender: 'ai', text: res.reply, time: aiTime, model: res.model }]);
    } catch (err) {
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [...prev, {
        sender: 'ai',
        text: err.message.includes('503') || err.message.includes('configured')
          ? '⚠️ AI chat is not configured. Set GROQ_API_KEY in backend/.env to enable it.'
          : `⚠️ ${err.message}`,
        time: aiTime,
        isError: true,
      }]);
    } finally {
      setChatLoad(false);
    }
  };

  // ─────────────────── Smart Rescue ────────────────────────────────────────────

  const runRescue = async () => {
    if (!selectedId) return;
    setRescueLoad(true);
    setRescueError('');
    setRescueRes(null);
    try {
      const res = await agentApi.rescue({ donation_id: selectedId });
      setRescueRes(res);
      if (!res.safe) setRescueError(res.urgency_note);
    } catch (err) {
      setRescueError(err.message || 'Smart Rescue failed. Is the backend running?');
    } finally {
      setRescueLoad(false);
    }
  };

  const handleApprove = async (ngoId, ngoName) => {
    if (!rescueRes?.recommendation_id) return;
    if (!window.confirm(`Approve match with ${ngoName}?`)) return;
    try {
      const res = await agentApi.approveRescue({
        recommendation_id: rescueRes.recommendation_id,
        ngo_id: ngoId,
      });
      showToast(`✓ ${res.message}`);
      setRescueRes(null);
      const dr = await foodApi.myDonations({ status: 'available', limit: 20 });
      const avail = (dr.donations || []).filter((d) => d.status === 'available');
      setDonations(avail);
      setSelected(avail[0]?.id || '');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const handleReject = async () => {
    if (!rescueRes?.recommendation_id) return;
    try {
      await agentApi.rejectRescue({ recommendation_id: rescueRes.recommendation_id, reason: 'User rejected' });
      showToast('Rejected. Donation remains available.');
      setRescueRes(null);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  const urgencyColor = (label) => ({
    Critical: 'text-red-700 bg-red-50 border-red-200',
    High:     'text-orange-700 bg-orange-50 border-orange-200',
    Medium:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    Low:      'text-green-700 bg-green-50 border-green-200',
    Expired:  'text-gray-700 bg-gray-100 border-gray-200',
  }[label] || 'text-gray-700 bg-gray-50 border-gray-200');

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-brand-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'chat',   label: '💬 AI Chat Assistant' },
          { id: 'rescue', label: '🤖 Smart Rescue Agent' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-navy hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Chat Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[78vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-900 rounded-full flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-navy">FoodBridge AI Assistant</div>
              <div className="text-xs text-muted">Ask anything about food redistribution</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot size={28} className="text-brand-600" />
                </div>
                <p className="text-navy font-semibold mb-2">Hello{user ? `, ${user.name.split(' ')[0]}` : ''}!</p>
                <p className="text-muted text-sm mb-6">I&apos;m your FoodBridge AI assistant. Ask me anything about food redistribution, donations, or NGO coordination.</p>
                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-xs text-left bg-gray-50 border border-gray-200 p-2.5 rounded-xl hover:bg-brand-50 hover:border-brand-200 transition-colors text-navy leading-snug"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-end gap-2 max-w-[85%]">
                  {msg.sender === 'ai' && (
                    <div className="w-8 h-8 shrink-0 bg-brand-900 rounded-full flex items-center justify-center mb-1">
                      <Bot size={16} className="text-white" />
                    </div>
                  )}
                  <div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : msg.isError
                          ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                          : 'bg-gray-50 text-navy border border-gray-100 rounded-bl-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{formatText(msg.text)}</div>
                    </div>
                    <div className={`text-xs text-muted mt-1 ${msg.sender === 'user' ? 'text-right' : 'ml-1'}`}>
                      {msg.time}
                      {msg.model && <span className="ml-2 opacity-60">· {msg.model}</span>}
                    </div>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 shrink-0 bg-brand-100 rounded-full flex items-center justify-center mb-1">
                      <User size={16} className="text-brand-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoad && (
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 bg-brand-900 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-1.5 py-1.5 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="flex-1 bg-transparent outline-none text-navy text-sm placeholder-gray-400"
                placeholder="Ask me anything about food redistribution…"
                disabled={chatLoad}
              />
              <button
                onClick={() => sendMessage()}
                disabled={chatLoad || !input.trim()}
                className="w-9 h-9 bg-brand-900 text-white rounded-xl flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-40"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Smart Rescue Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'rescue' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-brand-900 to-slate-800 text-white p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2">
              <Bot size={22} className="text-brand-400" />
              <h3 className="text-lg font-bold">Smart Rescue Agent</h3>
            </div>
            <p className="text-brand-100/80 text-sm leading-relaxed">
              Select one of your available donations below and click &quot;Analyse&quot;. The agent will check expiry,
              run the ML spoilage model, score eligible NGOs (using rule-based scoring when ML model is
              available), and generate a recommended action. <strong>You approve before anything is assigned.</strong>
            </p>
          </div>

          {/* Donation selector */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-navy mb-2">Your Available Donations</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-brand-600 bg-white text-sm"
                >
                  {donations.length === 0
                    ? <option value="">No available donations</option>
                    : donations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.quantity} {d.unit}
                        {d.expiry_time ? ` · exp: ${new Date(d.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </option>
                    ))
                  }
                </select>
              </div>
              <button
                onClick={runRescue}
                disabled={rescueLoad || !selectedId}
                className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-900 transition-colors disabled:opacity-50 text-sm"
              >
                {rescueLoad ? <RefreshCw size={15} className="animate-spin" /> : '🔍'}
                {rescueLoad ? 'Analysing…' : 'Analyse & Match'}
              </button>
            </div>
          </div>

          {rescueError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {rescueError}
            </div>
          )}

          {/* Rescue result */}
          {rescueRes && (
            <>
              {/* Summary card */}
              <div className={`p-5 rounded-2xl border ${urgencyColor(rescueRes.urgency)}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-base">
                    Urgency: {rescueRes.urgency}
                    {rescueRes.spoilage && (
                      <span className="ml-3 text-xs font-normal opacity-80">
                        · Spoilage: {rescueRes.spoilage.risk_level} risk ({(rescueRes.spoilage.spoilage_probability * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                  {rescueRes.recommendation_id && (
                    <button
                      onClick={handleReject}
                      className="text-xs px-3 py-1 border border-current rounded-lg hover:opacity-70 transition-opacity"
                    >
                      ✕ Reject
                    </button>
                  )}
                </div>
                <p className="text-sm leading-relaxed mb-1">{rescueRes.recommendation}</p>
                <p className="text-xs opacity-60 mt-2">{rescueRes.disclaimer}</p>
              </div>

              {/* Match list */}
              {rescueRes.matches && rescueRes.matches.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-navy px-1">Top NGO Matches</h4>
                  {rescueRes.matches.map((m, i) => (
                    <div key={m.ngo_id || i} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                      <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-navy">{m.ngo_name}</div>
                            {m.ngo_org && <div className="text-xs text-muted">{m.ngo_org}</div>}
                            <div className="text-xs text-muted mt-0.5">{m.distance_km} km · needs {m.portions_needed} portions</div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-2xl font-bold text-brand-600">{m.score.toFixed(0)}</div>
                            <div className="text-xs text-muted">/ 100</div>
                          </div>
                        </div>
                        <ul className="mt-2 text-xs text-muted space-y-0.5">
                          {m.reasons.slice(0, 3).map((r, j) => (
                            <li key={j} className="flex items-start gap-1">
                              <span className="text-brand-500 mt-0.5">•</span> {r}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex gap-2">
                          {rescueRes.recommendation_id && (
                            <button
                              onClick={() => handleApprove(m.ngo_id, m.ngo_name)}
                              className="text-xs bg-brand-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-brand-900 transition-colors"
                            >
                              ✓ Approve Match
                            </button>
                          )}
                          <span className="text-xs text-muted self-center">{m.score_source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rescueRes.matches?.length === 0 && (
                <div className="text-center py-8 text-muted bg-white rounded-2xl border">
                  No eligible NGOs found. Register NGO accounts on the platform to see matches.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentChat;
