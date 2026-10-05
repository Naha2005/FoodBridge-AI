import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, LineChart, ChevronRight, Globe, ShoppingBag, ArrowRight, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { foodApi } from '../services/api';

const LandingPage = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    foodApi.stats().then(setStats).catch(() => null);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-600 selection:text-white overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-100/50 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-emerald-100/40 blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center sticky top-0 bg-white/70 backdrop-blur-xl z-50 border-b border-white/20 shadow-sm">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-brand-600 to-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-brand-600/20 group-hover:scale-105 transition-transform">
            <Leaf size={24} />
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight">FoodBridge</span>
        </Link>
        <div className="hidden md:flex gap-8 text-slate-600 font-semibold text-sm">
          <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <Link to="/impact" className="hover:text-brand-600 transition-colors">Impact</Link>
          <Link to="/map" className="hover:text-brand-600 transition-colors">Live Map</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-slate-700 font-bold hover:text-brand-600 transition-colors text-sm">Sign In</Link>
          <Link to="/register" className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-brand-600 transition-all shadow-md hover:shadow-xl text-sm transform hover:-translate-y-0.5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="container mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-40 flex flex-col md:flex-row items-center gap-16 relative">
        <motion.div 
          className="flex-1 space-y-8 z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold shadow-sm uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            UN SDG 2 — Zero Hunger
          </motion.div>
          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
            Good food deserves a <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-emerald-400">second chance.</span>
          </motion.h1>
          <motion.p variants={fadeIn} className="text-xl text-slate-600 max-w-xl leading-relaxed font-medium">
            The AI-powered redistribution platform connecting surplus food from restaurants and events directly to communities in need.
          </motion.p>
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link to="/register" className="bg-brand-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/30 hover:shadow-xl flex items-center justify-center gap-2 group transform hover:-translate-y-1">
              Start Donating <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/map" className="bg-white border-2 border-slate-200 text-slate-800 px-8 py-4 rounded-full font-bold text-lg hover:border-brand-600 hover:text-brand-600 transition-colors inline-flex justify-center items-center">
              View Live Map
            </Link>
          </motion.div>

          {/* Stats */}
          {stats && (
            <motion.div variants={fadeIn} className="flex flex-wrap gap-8 pt-8 border-t border-slate-200 mt-8">
              {[
                { val: stats.total_donations || 0, label: 'Donations' },
                { val: stats.delivered || 0, label: 'Meals Delivered' },
                { val: stats.ngo_count || 0, label: 'Active NGOs' },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-3xl font-black text-slate-900">{val.toLocaleString()}+</span>
                  <span className="text-sm text-slate-500 font-bold uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>

        <motion.div 
          className="flex-1 w-full max-w-lg relative z-10"
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <div className="relative rounded-[2.5rem] p-3 bg-white/50 backdrop-blur-xl border border-white/60 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800"
              alt="Fresh food ready for redistribution"
              className="rounded-[2rem] shadow-inner object-cover aspect-square w-full"
            />
            {/* Floating badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-8 top-12 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="bg-brand-100 p-2 rounded-full text-brand-600"><Leaf size={18}/></div>
                <div>
                  <p className="text-slate-800 font-bold text-sm">Smart Rescue</p>
                  <p className="text-slate-500 text-xs font-medium">AI Match Found</p>
                </div>
              </div>
            </motion.div>
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute -left-6 bottom-16 bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-2 rounded-full text-white animate-pulse"><LineChart size={18}/></div>
                <div>
                  <p className="text-white font-bold text-sm">Urgent Match</p>
                  <p className="text-slate-400 text-xs font-medium">Expiring in 2 hrs</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </header>

      {/* Features */}
      <section className="bg-white py-24 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-4">An Autonomous Lifecycle</h2>
            <p className="text-lg text-slate-500 font-medium">
              We leverage machine learning and LLM agents to ensure perishable food is routed with maximum efficiency.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: ShoppingBag,
                color: 'from-brand-400 to-brand-600',
                shadow: 'shadow-brand-500/20',
                title: '1. Seamless Listing',
                desc: 'Donors easily post surplus food with essential details. Our system instantly evaluates the data.',
              },
              {
                icon: Globe,
                color: 'from-blue-400 to-blue-600',
                shadow: 'shadow-blue-500/20',
                title: '2. AI Smart Matching',
                desc: 'Our models predict spoilage risk while the LLM ranks and assigns NGOs based on exact urgency and capacity.',
              },
              {
                icon: LineChart,
                color: 'from-orange-400 to-orange-600',
                shadow: 'shadow-orange-500/20',
                title: '3. Transparent Delivery',
                desc: 'Volunteers pick up and deliver the matched items. Real-time metrics track every meal saved.',
              },
              {
                icon: Heart,
                color: 'from-rose-400 to-rose-600',
                shadow: 'shadow-rose-500/20',
                title: '4. Direct Relief',
                desc: 'Businesses and NGOs collaborate to route food directly to begging hotspots and community fridges.',
              },
            ].map(({ icon: Icon, color, shadow, title, desc }, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                key={title} 
                className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} ${shadow} shadow-lg flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles & News Section */}
      <section className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Stories of Impact</h2>
            <p className="text-lg text-slate-500 font-medium">
              Read how NGOs and businesses are transforming surplus food into hope and fighting hunger every day.
            </p>
          </div>
          
          <div className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory hide-scrollbar">
            {[
              {
                img: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80",
                tag: "Feeding India",
                title: "Zomato Feeding India rescues 50,000 meals in Delhi NCR",
                desc: "By utilizing smart routing and donor networks, Feeding India successfully redistributed tons of surplus food from major hotel chains to underserved communities."
              },
              {
                img: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80",
                tag: "Robin Hood Army",
                title: "The Zero-Funds Organization Feeding Millions",
                desc: "With a completely volunteer-based approach, the Robin Hood Army collects surplus from restaurants across India and delivers it directly to street hotspots."
              },
              {
                img: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=600&q=80",
                tag: "Akshaya Patra",
                title: "World's Largest NGO-Run Mid-Day Meal Programme",
                desc: "The Akshaya Patra Foundation serves wholesome school lunches to over 2 million children daily in India, preventing classroom hunger and promoting education."
              }
            ].map((article, i) => (
              <div key={i} className="min-w-[320px] max-w-[400px] flex-shrink-0 snap-center bg-white rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow border border-slate-100 overflow-hidden group cursor-pointer">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-brand-700 shadow-sm">
                    {article.tag}
                  </div>
                  <img src={article.img} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight group-hover:text-brand-600 transition-colors">{article.title}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                    {article.desc}
                  </p>
                  <span className="text-brand-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                    Read Story <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="inline-block bg-brand-600/20 p-4 rounded-3xl mb-6">
              <Leaf size={48} className="text-brand-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Join the Zero Hunger Mission</h2>
            <p className="text-xl text-slate-300 font-medium mb-10">
              Whether you're a restaurant with surplus food, an NGO needing supplies, or a volunteer ready to drive — you are needed.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-brand-500 transition-all shadow-xl shadow-brand-600/20 transform hover:-translate-y-1"
            >
              Create Free Account <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                <Leaf size={20} />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">FoodBridge</span>
            </div>
            <div className="text-slate-400 font-medium text-sm text-center md:text-left">
              Built for SDG 2: Zero Hunger. Let's solve food waste together.
            </div>
            <div className="flex gap-6 text-sm font-bold text-slate-300">
              <Link to="/login" className="hover:text-brand-400 transition-colors">Log In</Link>
              <Link to="/register" className="hover:text-brand-400 transition-colors">Sign Up</Link>
              <Link to="/impact" className="hover:text-brand-400 transition-colors">View Impact</Link>
            </div>
          </div>
          
          {/* DEMO ACCOUNTS INFO FOR JUDGES / AUDIENCE */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
             <div className="text-slate-400">
               <span className="font-bold text-slate-200 block mb-1">DEMO ACCESS (Password: password123)</span>
               To review the sample data for the presentation, use these accounts.
             </div>
             <div className="flex flex-wrap justify-center gap-4 mt-2 md:mt-0">
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-bold mr-2">Donor 1:</span>
                  <span className="text-brand-400 font-mono">hotel@demo.com</span>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-bold mr-2">Donor 2:</span>
                  <span className="text-brand-400 font-mono">bakery@demo.com</span>
                </div>
                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-bold mr-2">NGO:</span>
                  <span className="text-brand-400 font-mono">ngo1@demo.com</span>
                </div>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

