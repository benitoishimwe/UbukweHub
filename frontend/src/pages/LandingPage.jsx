import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Calendar, Package, Users, Store, BarChart3, Heart,
  Image, CheckCircle, ArrowRight, Star, Globe, Shield, Zap,
  QrCode, FileText, Bell, ChevronDown, ChevronUp, Menu, X
} from 'lucide-react';

const FEATURES = [
  { icon: Calendar,  title: 'Event Management',      desc: 'Create and manage events end-to-end — tasks, timelines, checklists, budgets, and seating plans.' },
  { icon: Sparkles,  title: 'AI Planning Assistant', desc: 'Claude AI generates checklists, budgets, timelines, and vendor suggestions tailored to your event.' },
  { icon: Users,     title: 'Staff Scheduling',       desc: 'Assign shifts, track availability, and manage your team effortlessly across all events.' },
  { icon: Package,   title: 'Inventory & QR Codes',  desc: 'Track equipment with QR codes, manage rentals, returns, and maintenance in real time.' },
  { icon: Store,     title: 'Vendor Marketplace',     desc: 'Discover and book event vendors, read reviews, and send inquiries — all in one place.' },
  { icon: Heart,     title: 'Wedding Planner',        desc: 'Dedicated wedding module: guest list, RSVP, budget, seating, menu, and venue planning.' },
  { icon: Image,     title: 'Save the Date Cards',   desc: 'AI-generated save-the-date card designs via DALL-E 3 — beautiful, personalised, instant.' },
  { icon: QrCode,    title: 'Guest Photo Albums',     desc: 'Guests upload photos via QR code — no app download needed. Download as a ZIP archive.' },
  { icon: BarChart3, title: 'Reports & Analytics',   desc: 'Comprehensive reports, event PDFs, inventory analytics, and staff performance data.' },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'Perfect for exploring Prani.',
    features: ['1 active event', '3 team members', 'Basic inventory', 'Guest photo album', 'Email support'],
    cta: 'Get started free',
    popular: false,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    desc: 'For growing event businesses.',
    features: ['Unlimited events', '20 team members', 'AI planning assistant', 'Save the Date (20/mo)', 'Vendor marketplace', 'Advanced reports', 'Priority support'],
    cta: 'Start 14-day trial',
    popular: true,
    highlight: true,
  },
  {
    name: 'Max',
    price: '$79',
    period: '/month',
    desc: 'For large agencies & enterprises.',
    features: ['Everything in Pro', 'Unlimited team members', 'White-label reports', 'API access', 'Subdomain support', 'Dedicated account manager', 'Custom integrations'],
    cta: 'Start 14-day trial',
    popular: false,
    highlight: false,
  },
  {
    name: 'Wedding',
    price: '$49',
    period: 'one-time',
    desc: 'For a single unforgettable day.',
    features: ['1 wedding event', 'All Pro features', 'Full wedding planner', 'Unlimited guests', 'Valid until wedding date + 30 days'],
    cta: 'Plan my wedding',
    popular: false,
    highlight: false,
  },
];

const FAQS = [
  { q: 'Is Prani available worldwide?', a: 'Yes. Prani is built for event planners everywhere — supporting multiple currencies, languages, and local payment methods. Whether you\'re in Kigali, London, Lagos, or New York, Prani adapts to your market.' },
  { q: 'Can I try Prani before paying?', a: 'Yes. The Free plan is available forever with no credit card required. Pro and Max plans include a 14-day free trial so you can test every feature.' },
  { q: 'How does the AI assistant work?', a: 'Prani uses advanced AI to generate event checklists, budget breakdowns, timelines, seating plans, and vendor suggestions — all customised for your specific event type, location, and guest count.' },
  { q: 'Can multiple team members use one account?', a: 'Yes. Each subscription includes team members who can be invited via email. Each person gets their own role (admin, event manager, staff, client, vendor) with appropriate permissions.' },
  { q: 'How does Stripe / Paystack payment work?', a: 'Prani supports Stripe (credit/debit cards worldwide) and Paystack (mobile money, M-Pesa, Airtel Money, and local bank cards). You choose at checkout.' },
  { q: 'Is my data secure and isolated?', a: 'Yes. Prani is a multi-tenant SaaS — your data is fully isolated from other businesses. All data is stored in Supabase PostgreSQL with encryption at rest and in transit.' },
];

const TESTIMONIALS = [
  { name: 'Sarah Mitchell', role: 'Wedding Planner, London', text: 'Prani transformed how we run weddings. The AI checklist alone saves us 3 hours per event.', rating: 5 },
  { name: 'Marc Dubois', role: 'Corporate Events Manager, Paris', text: 'The inventory QR system is a game-changer. We finally know where all our equipment is!', rating: 5 },
  { name: 'Amara Osei', role: 'Events Director, Toronto', text: 'The vendor marketplace helped us discover 12 new partners in our first month. Incredible.', rating: 5 },
];

function NavBar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0F4C5C] flex items-center justify-center">
            <span className="text-white font-bold text-sm" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
          </div>
          <span className="text-lg font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>Prani</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {['Features','Pricing','FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="text-sm font-medium text-[#6B7280] hover:text-[#0F4C5C] transition-colors">{l}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-[#6B7280] hover:text-[#0F4C5C] px-4 py-2 rounded-lg hover:bg-[#E8F4F8] transition-all">Sign in</Link>
          <Link to="/login" className="btn-primary px-5 py-2 text-sm">Get started free</Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={22} className="text-[#111827]" /> : <Menu size={22} className="text-[#111827]" />}
        </button>
      </div>
      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-[#E5E7EB] px-6 py-4 space-y-3 animate-fade-in">
          {['Features','Pricing','FAQ'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)} className="block text-sm font-medium text-[#6B7280] py-1">{l}</a>
          ))}
          <Link to="/login" className="block btn-primary text-center py-2.5 text-sm mt-2">Get started free</Link>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="hero-section pt-16">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-36 text-white">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium mb-8">
            <Sparkles size={14} className="text-[#E67E22]" />
            AI-powered event planning platform
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6" style={{fontFamily:'Poppins,sans-serif'}}>
            Plan with<br />
            <span className="text-[#E67E22]">confidence</span>,<br />
            your way.
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-xl leading-relaxed">
            Prani is the all-in-one platform for event planning businesses — from intimate weddings to large-scale corporate conferences, anywhere in the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/login" className="btn-amber px-8 py-4 text-base flex items-center justify-center gap-2 shadow-lg">
              Start free trial
              <ArrowRight size={18} />
            </Link>
            <a href="#features" className="px-8 py-4 text-base font-semibold rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              See all features
            </a>
          </div>
          <p className="text-sm text-white/50 mt-4">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative z-10 bg-white/10 backdrop-blur border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
          {[
            { n: '500+', l: 'Events Planned' },
            { n: '1,200+', l: 'Happy Clients' },
            { n: '98%', l: 'AI Accuracy' },
            { n: '20+', l: 'Countries' },
          ].map(({ n, l }) => (
            <div key={l}>
              <p className="text-3xl font-bold text-[#E67E22]" style={{fontFamily:'Poppins,sans-serif'}}>{n}</p>
              <p className="text-sm text-white/60 mt-1">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="feature-pill mb-4">Everything you need</div>
          <h2 className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
            One platform, every event
          </h2>
          <p className="text-[#6B7280] mt-4 max-w-xl mx-auto text-lg">
            From a small birthday party to a 500-person corporate conference — Prani handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-prani p-6 group">
              <div className="w-12 h-12 rounded-xl bg-[#E8F4F8] flex items-center justify-center mb-4 group-hover:bg-[#0F4C5C] transition-colors">
                <Icon size={22} className="text-[#0F4C5C] group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-[#111827] mb-2" style={{fontFamily:'Poppins,sans-serif'}}>{title}</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiHighlight() {
  return (
    <section className="py-24 bg-[#F9F9FB]">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="feature-pill mb-4">
            <Sparkles size={12} />
            AI-powered
          </div>
          <h2 className="text-4xl font-bold text-[#111827] mb-6" style={{fontFamily:'Poppins,sans-serif'}}>
            Your AI event planning co-pilot
          </h2>
          <p className="text-[#6B7280] text-lg mb-8 leading-relaxed">
            Prani uses Anthropic Claude — the most capable AI model available — to automate the complex thinking behind every event.
          </p>
          <div className="space-y-4">
            {[
              'Generate a full event checklist in seconds',
              'Multi-currency budget breakdowns',
              'Event-day timeline, minute by minute',
              'AI seating arrangement for any guest count',
              'Vendor category suggestions for your event type',
              '0–100 event readiness score',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle size={18} className="text-[#2E7D32] flex-shrink-0" />
                <span className="text-[#374151] text-sm">{f}</span>
              </div>
            ))}
          </div>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-3 mt-8 text-sm">
            Try AI assistant free
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="bg-[#0F4C5C] rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#E67E22]/20 rounded-full translate-y-12 -translate-x-12" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles size={16} className="text-[#E67E22]" />
              </div>
              <span className="font-semibold" style={{fontFamily:'Poppins,sans-serif'}}>Prani AI</span>
              <span className="tag tag-amber ml-auto text-xs">Live</span>
            </div>
            {/* Simulated AI chat */}
            <div className="space-y-3">
              <div className="bg-white/10 rounded-xl p-3 text-sm">
                <p className="text-white/60 text-xs mb-1">You</p>
                <p>Generate a checklist for a 200-person Rwandan wedding in Kigali</p>
              </div>
              <div className="bg-[#E67E22]/20 rounded-xl p-3 text-sm border border-[#E67E22]/30">
                <p className="text-[#E67E22] text-xs mb-2 font-semibold">Prani AI</p>
                <p className="text-white/90 leading-relaxed">
                  Here's a comprehensive 47-item checklist for your Kigali wedding:
                </p>
                <div className="mt-3 space-y-1.5">
                  {['✓ Book Laico Hotel venue (6 months prior)', '✓ Confirm traditional Ubukwe ceremony details', '✓ Arrange Isange catering (vegetarian + halal)', '✓ Hire 12-piece Rwandan drumming ensemble', '✓ Coordinate transport from Remera → venue'].map(i => (
                    <div key={i} className="text-xs text-white/70 flex items-center gap-2">
                      <span>{i}</span>
                    </div>
                  ))}
                  <p className="text-xs text-white/40 mt-2">+ 42 more items...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="feature-pill mb-4">Simple pricing</div>
          <h2 className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
            Plans that grow with you
          </h2>
          <p className="text-[#6B7280] mt-4 max-w-xl mx-auto">
            Start free. Upgrade when you're ready. Downgrade or cancel any time.
          </p>
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium ${!yearly ? 'text-[#111827]' : 'text-[#6B7280]'}`}>Monthly</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-[#0F4C5C]' : 'bg-[#E5E7EB]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${yearly ? 'translate-x-6' : ''}`} />
            </button>
            <span className={`text-sm font-medium ${yearly ? 'text-[#111827]' : 'text-[#6B7280]'}`}>Yearly</span>
            <span className="tag tag-teal text-xs">Save 17%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const price = yearly && plan.name === 'Pro' ? '$24' : yearly && plan.name === 'Max' ? '$66' : plan.price;
            return (
              <div key={plan.name} className={`plan-card ${plan.popular ? 'popular' : ''} flex flex-col`}>
                {plan.popular && (
                  <div className="tag tag-amber text-xs self-start mb-3">Most popular</div>
                )}
                <h3 className="text-xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>{plan.name}</h3>
                <div className="mt-2 mb-3 flex items-end gap-1">
                  <span className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>{price}</span>
                  {plan.period && <span className="text-[#6B7280] text-sm pb-1">{plan.period}</span>}
                </div>
                <p className="text-sm text-[#6B7280] mb-5">{plan.desc}</p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#374151]">
                      <CheckCircle size={15} className="text-[#2E7D32] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'btn-amber py-3'
                      : 'border-2 border-[#0F4C5C] text-[#0F4C5C] hover:bg-[#E8F4F8]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-8">
          All plans support <strong>Stripe</strong> and <strong>Paystack</strong> (mobile money, M-Pesa, Airtel Money).
        </p>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#F9F9FB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
            Trusted by event planners
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ name, role, text, rating }) => (
            <div key={name} className="card-prani p-6">
              <div className="flex gap-1 mb-4">
                {Array(rating).fill(0).map((_, i) => (
                  <Star key={i} size={16} className="text-[#E67E22] fill-[#E67E22]" />
                ))}
              </div>
              <p className="text-[#374151] text-sm leading-relaxed mb-4">"{text}"</p>
              <div>
                <p className="font-semibold text-[#111827] text-sm">{name}</p>
                <p className="text-xs text-[#6B7280]">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="border border-[#E5E7EB] rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#F9F9FB] transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-[#111827] text-sm">{q}</span>
                {open === i ? <ChevronUp size={18} className="text-[#6B7280] flex-shrink-0" /> : <ChevronDown size={18} className="text-[#6B7280] flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-sm text-[#6B7280] leading-relaxed animate-fade-in">
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 bg-[#0F4C5C] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
        <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-[#E67E22]" />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center text-white">
        <h2 className="text-4xl font-bold mb-4" style={{fontFamily:'Poppins,sans-serif'}}>
          Ready to plan your next event?
        </h2>
        <p className="text-white/70 text-lg mb-8">
          Join thousands of event planners worldwide already using Prani. Start free — no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login" className="btn-amber px-8 py-4 text-base flex items-center justify-center gap-2 shadow-lg">
            Start free trial
            <ArrowRight size={18} />
          </Link>
          <a href="#features" className="px-8 py-4 text-base font-semibold rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-all flex items-center justify-center">
            Learn more
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#111827] text-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0F4C5C] flex items-center justify-center">
                <span className="text-white font-bold text-sm" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
              </div>
              <span className="text-lg font-bold" style={{fontFamily:'Poppins,sans-serif'}}>Prani</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              Plan with confidence, your way. Built for event planners worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{fontFamily:'Poppins,sans-serif'}}>Product</h4>
            <ul className="space-y-2 text-sm text-white/50">
              {['Features', 'Pricing', 'AI Assistant', 'Vendor Marketplace'].map(l => (
                <li key={l}><a href="#features" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{fontFamily:'Poppins,sans-serif'}}>Company</h4>
            <ul className="space-y-2 text-sm text-white/50">
              {['About', 'Blog', 'Contact', 'Careers'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{fontFamily:'Poppins,sans-serif'}}>Legal</h4>
            <ul className="space-y-2 text-sm text-white/50">
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
                <li key={l}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">© 2026 Prani. All rights reserved.</p>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <Globe size={14} />
            Available in English & Kinyarwanda
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="font-sans">
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <AiHighlight />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
