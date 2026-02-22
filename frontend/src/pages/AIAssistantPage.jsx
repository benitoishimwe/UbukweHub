import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { aiAPI, eventsAPI } from '../services/api';
import { Sparkles, TrendingUp, ClipboardList, DollarSign, Store, MessageCircle, Loader, Send, ChevronDown, ChevronUp } from 'lucide-react';

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#4A7C59' : score >= 60 ? '#C9A84C' : '#D9534F';
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center" style={{width:180, height:180}}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#EBE5DB" strokeWidth="12" />
        <circle cx="90" cy="90" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{transition:'stroke-dasharray 1s ease'}} />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-bold" style={{color, fontFamily:'Playfair Display,serif'}}>{Math.round(score)}</p>
        <p className="text-xs text-[#5C5C5C] font-medium">/ 100</p>
      </div>
    </div>
  );
}

function MetricRow({ name, data, expanded, onToggle }) {
  const color = data.score >= 80 ? '#4A7C59' : data.score >= 60 ? '#C9A84C' : '#D9534F';
  const displayName = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return (
    <div className="border border-[#EBE5DB] rounded-xl overflow-hidden mb-2">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 hover:bg-[#F5F0E8] transition-colors">
        <div className="flex-1 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: color + '20'}}>
            <span className="text-xs font-bold" style={{color}}>{Math.round(data.score)}</span>
          </div>
          <span className="text-sm font-medium text-[#2D2D2D]">{displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-[#EBE5DB] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{width: `${data.score}%`, background: color, transition: 'width 1s ease'}} />
          </div>
          {expanded ? <ChevronUp size={14} className="text-[#5C5C5C]" /> : <ChevronDown size={14} className="text-[#5C5C5C]" />}
        </div>
      </button>
      {expanded && data.note && (
        <div className="px-4 pb-3 text-xs text-[#5C5C5C]">{data.note}</div>
      )}
    </div>
  );
}

function ChatInterface() {
  const { t } = useLang();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m your UbukweHub AI assistant. I can help you with wedding planning, inventory, staff coordination, and more. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const { data } = await aiAPI.chat({ message: userMsg });
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0" style={{maxHeight:'350px'}}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-[#C9A84C] text-white rounded-br-sm' : 'bg-white border border-[#EBE5DB] text-[#2D2D2D] rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#EBE5DB] px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-[#C9A84C] animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-[#EBE5DB]">
        <div className="flex gap-2">
          <input
            className="input-wedding flex-1 h-10 text-sm"
            placeholder={t('ai.ask_placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            data-testid="chat-input"
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn-gold w-10 h-10 flex items-center justify-center rounded-full" data-testid="chat-send-btn">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { t } = useLang();
  const [tab, setTab] = useState('greatness');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [greatnessResult, setGreatnesResult] = useState(null);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [loading, setLoading] = useState(false);

  // Checklist
  const [checklistForm, setChecklistForm] = useState({ event_name: '', event_date: '', venue: '', guest_count: 200, budget: 10000000, preferences: '' });
  const [checklistResult, setChecklistResult] = useState(null);

  // Budget
  const [budgetForm, setBudgetForm] = useState({ event_name: 'Wedding', guest_count: 200, venue: 'Kigali Hotel' });
  const [budgetResult, setBudgetResult] = useState(null);

  useEffect(() => {
    eventsAPI.list({ limit: 50 }).then(({ data }) => {
      setEvents(data.events || []);
      if (data.events?.length > 0) setSelectedEvent(data.events[0].event_id);
    });
  }, []);

  const calcGreatness = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const { data } = await aiAPI.greatness({ event_id: selectedEvent });
      setGreatnesResult(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const genChecklist = async () => {
    setLoading(true);
    try {
      const { data } = await aiAPI.checklist(checklistForm);
      setChecklistResult(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const forecastBudget = async () => {
    setLoading(true);
    try {
      const { data } = await aiAPI.budget(budgetForm);
      setBudgetResult(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const tabs = [
    { k: 'greatness', l: 'Wedding Greatness', icon: TrendingUp },
    { k: 'checklist', l: 'Checklist', icon: ClipboardList },
    { k: 'budget', l: 'Budget Forecast', icon: DollarSign },
    { k: 'chat', l: 'AI Chat', icon: MessageCircle },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#E8A4B8] flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('ai.title')}</h1>
        </div>
        <p className="text-[#5C5C5C] text-sm">Powered by GPT-4o · Tailored for Rwanda wedding operations</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(({k, l, icon: Icon}) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === k ? 'bg-[#C9A84C] text-white shadow-md' : 'bg-white border border-[#EBE5DB] text-[#5C5C5C] hover:border-[#C9A84C]'}`} data-testid={`ai-tab-${k}`}>
            <Icon size={16} />{l}
          </button>
        ))}
      </div>

      {/* Wedding Greatness */}
      {tab === 'greatness' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-wedding p-6">
            <h2 className="text-xl font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>{t('ai.wedding_greatness')}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Select Event</label>
              <select className="input-wedding" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} data-testid="greatness-event-select">
                {events.map(e => <option key={e.event_id} value={e.event_id}>{e.name}</option>)}
              </select>
            </div>
            <button onClick={calcGreatness} disabled={loading || !selectedEvent} className="btn-gold w-full h-12 flex items-center justify-center gap-2" data-testid="calc-greatness-btn">
              {loading ? <Loader size={18} className="animate-spin" /> : <TrendingUp size={18} />}
              {loading ? t('ai.calculating') : t('events.calculate_score')}
            </button>
          </div>

          {greatnessResult ? (
            <div className="card-wedding p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>Score Breakdown</h3>
                <span className="text-xs text-[#5C5C5C]">Confidence: {Math.round((greatnessResult.confidence || 0.85) * 100)}%</span>
              </div>
              <div className="flex justify-center mb-4">
                <ScoreGauge score={greatnessResult.score || 0} />
              </div>
              <p className="text-sm text-[#5C5C5C] text-center mb-4">{greatnessResult.summary}</p>
              {greatnessResult.metrics && Object.entries(greatnessResult.metrics).map(([key, val]) => (
                <MetricRow key={key} name={key} data={val} expanded={expandedMetric === key} onToggle={() => setExpandedMetric(expandedMetric === key ? null : key)} />
              ))}
              {greatnessResult.priority_actions?.length > 0 && (
                <div className="mt-4 p-4 bg-[#FCEAF0] rounded-xl">
                  <p className="text-sm font-bold text-[#2D2D2D] mb-2">Priority Actions</p>
                  <ul className="space-y-1.5">
                    {greatnessResult.priority_actions.map((a, i) => (
                      <li key={i} className="text-xs text-[#5C5C5C] flex gap-2"><span className="text-[#C9A84C] font-bold">{i+1}.</span>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="card-wedding p-6 flex items-center justify-center">
              <div className="text-center text-[#5C5C5C]">
                <TrendingUp size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select an event and calculate its greatness score</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      {tab === 'checklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-wedding p-6">
            <h2 className="text-xl font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>{t('ai.checklist')}</h2>
            <div className="space-y-3">
              {[['event_name','Event Name','Uwase Wedding'],['event_date','Date','15/03/2025'],['venue','Venue','Kigali Serena Hotel']].map(([k,l,p]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{l}</label>
                  <input className="input-wedding" placeholder={p} value={checklistForm[k]} onChange={(e) => setChecklistForm({...checklistForm, [k]: e.target.value})} data-testid={`checklist-${k}`} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Guests</label>
                  <input className="input-wedding" type="number" value={checklistForm.guest_count} onChange={(e) => setChecklistForm({...checklistForm, guest_count: Number(e.target.value)})} data-testid="checklist-guests" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Budget (RWF)</label>
                  <input className="input-wedding" type="number" value={checklistForm.budget} onChange={(e) => setChecklistForm({...checklistForm, budget: Number(e.target.value)})} data-testid="checklist-budget" />
                </div>
              </div>
              <button onClick={genChecklist} disabled={loading} className="btn-gold w-full h-12 flex items-center justify-center gap-2" data-testid="gen-checklist-btn">
                {loading ? <Loader size={18} className="animate-spin" /> : <ClipboardList size={18} />}
                Generate Checklist
              </button>
            </div>
          </div>
          <div className="card-wedding p-6 overflow-y-auto" style={{maxHeight:'600px'}}>
            {checklistResult ? (
              <>
                <p className="text-sm font-bold text-[#2D2D2D] mb-3">{checklistResult.total_tasks} tasks · {checklistResult.timeline_summary}</p>
                {checklistResult.checklist?.map((cat, i) => (
                  <div key={i} className="mb-4">
                    <h4 className="font-bold text-[#C9A84C] text-sm mb-2">{cat.category}</h4>
                    <ul className="space-y-2">
                      {cat.tasks?.map((task, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs">
                          <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 flex items-center justify-center ${task.priority === 'high' ? 'bg-[#FBE9E7]' : task.priority === 'medium' ? 'bg-[#FFF3E0]' : 'bg-[#E8F5EE]'}`}>
                            <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-[#D9534F]' : task.priority === 'medium' ? 'bg-[#C9A84C]' : 'bg-[#4A7C59]'}`} />
                          </div>
                          <span className="text-[#2D2D2D]">{task.task} <span className="text-[#5C5C5C]">({task.timeline})</span></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-[#5C5C5C]">
                <div><ClipboardList size={40} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Your checklist will appear here</p></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget */}
      {tab === 'budget' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-wedding p-6">
            <h2 className="text-xl font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>{t('ai.budget')}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Event Type</label>
                <input className="input-wedding" value={budgetForm.event_name} onChange={(e) => setBudgetForm({...budgetForm, event_name: e.target.value})} data-testid="budget-event-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Guests</label>
                  <input className="input-wedding" type="number" value={budgetForm.guest_count} onChange={(e) => setBudgetForm({...budgetForm, guest_count: Number(e.target.value)})} data-testid="budget-guests" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Venue</label>
                  <input className="input-wedding" value={budgetForm.venue} onChange={(e) => setBudgetForm({...budgetForm, venue: e.target.value})} data-testid="budget-venue" />
                </div>
              </div>
              <button onClick={forecastBudget} disabled={loading} className="btn-gold w-full h-12 flex items-center justify-center gap-2" data-testid="forecast-btn">
                {loading ? <Loader size={18} className="animate-spin" /> : <DollarSign size={18} />}
                Forecast Budget
              </button>
            </div>
          </div>
          <div className="card-wedding p-6">
            {budgetResult ? (
              <>
                <div className="text-center mb-4 p-4 bg-[#C9A84C15] rounded-xl">
                  <p className="text-3xl font-bold text-[#C9A84C]" style={{fontFamily:'Playfair Display,serif'}}>{budgetResult.total_estimated?.toLocaleString()} RWF</p>
                  <p className="text-sm text-[#5C5C5C]">{budgetResult.per_guest_cost?.toLocaleString()} RWF per guest</p>
                </div>
                {budgetResult.breakdown?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#2D2D2D]">{item.category}</p>
                      <p className="text-xs text-[#5C5C5C]">{item.percentage?.toFixed(1)}%</p>
                    </div>
                    <p className="text-sm font-bold text-[#C9A84C]">{item.amount?.toLocaleString()} RWF</p>
                  </div>
                ))}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-[#5C5C5C]">
                <div><DollarSign size={40} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Budget forecast will appear here</p></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat */}
      {tab === 'chat' && (
        <div className="card-wedding overflow-hidden" style={{height:'500px'}}>
          <div className="p-4 border-b border-[#EBE5DB] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8A4B8] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2D2D2D]">UbukweHub AI</p>
              <p className="text-xs text-[#4A7C59]">● Online · GPT-4o</p>
            </div>
          </div>
          <ChatInterface />
        </div>
      )}
    </div>
  );
}
