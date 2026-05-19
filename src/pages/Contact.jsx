import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Phone, Mail, MapPin, MessageSquare, Trophy } from 'lucide-react';
import { DOJO_LIST } from '../data/dojos';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dojo: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedDojo = DOJO_LIST.find(d => d.name === formData.dojo);
      const dojoId = selectedDojo ? selectedDojo.id : 'unknown';

      await addDoc(collection(db, 'enquiries'), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dojoName: formData.dojo,
        dojoId: dojoId,
        message: formData.message,
        createdAt: serverTimestamp()
      });

      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', dojo: '', message: '' });
    } catch (err) {
      console.error("Enquiry submission failed:", err);
      alert("Failed to send message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 transition-colors duration-300 dark:bg-brand-dark bg-brand-light text-brand-dark dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-brand-red font-bold tracking-widest text-xs uppercase bg-brand-red/10 px-4 py-1.5 rounded-full border border-brand-red/20 inline-block mb-3">
              Get in Touch
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark">
              Contact <span className="text-brand-red">Us</span>
            </h1>
            <div className="h-1 w-24 bg-brand-red mx-auto mt-4" />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Info Column */}
          <div className="space-y-8 lg:col-span-1">
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md">
              <h3 className="dark:text-white text-brand-dark font-extrabold text-xl uppercase tracking-wide border-b border-brand-dark/10 dark:border-white/10 pb-4">
                Dojo Contacts
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Phone className="text-brand-red shrink-0 mt-1" size={18} />
                  <div>
                    <h4 className="dark:text-white text-brand-dark font-bold text-sm uppercase tracking-wide">Call Chief Instructor</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mt-0.5">+91 9947001779</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Mail className="text-brand-red shrink-0 mt-1" size={18} />
                  <div>
                    <h4 className="dark:text-white text-brand-dark font-bold text-sm uppercase tracking-wide">Write to Us</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">info@okinavankarateindia.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="text-brand-red shrink-0 mt-1" size={18} />
                  <div>
                    <h4 className="dark:text-white text-brand-dark font-bold text-sm uppercase tracking-wide">Headquarters</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">
                      Sunil Hall, Puthenvelikkara, Kerala, India
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Whatsapp Integration */}
            <div className="bg-gradient-to-br from-brand-red/10 to-transparent border border-brand-red/20 rounded-2xl p-6 sm:p-8 space-y-4">
              <h4 className="dark:text-white text-brand-dark font-extrabold uppercase tracking-wide text-lg">Instant Support</h4>
              <p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
                Need immediate answers? Start a direct chat with Kyoshi on WhatsApp.
              </p>
              <a
                href="https://wa.me/919446411305"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center space-x-2 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold uppercase tracking-wider text-sm rounded-xl transition-all shadow-lg cursor-pointer"
              >
                <MessageSquare size={18} />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-2">
            <div className="dark:bg-white/5 bg-white border border-brand-dark/10 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-md">
              <h3 className="dark:text-white text-brand-dark font-extrabold text-xl uppercase tracking-wide mb-6">
                Send an Enquiry
              </h3>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-brand-red/10 border border-brand-red/20 rounded-xl p-6 text-center"
                >
                  <Trophy className="text-brand-gold h-10 w-10 mx-auto mb-3" />
                  <h4 className="dark:text-white text-brand-dark font-bold text-lg uppercase tracking-wide mb-2">Message Dispatched!</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    Thank you for your inquiry. Our instructors will review and get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 px-6 py-2 bg-white dark:bg-brand-dark border border-brand-dark/20 text-brand-dark dark:text-white hover:bg-brand-red hover:text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Email Address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-400"
                        placeholder="+91 9876543210"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Select Branch</label>
                      <select
                        required
                        value={formData.dojo}
                        onChange={(e) => setFormData({ ...formData, dojo: e.target.value })}
                        className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-gray-300"
                      >
                        <option value="" disabled>Select nearest branch</option>
                        {DOJO_LIST.map((dojo) => (
                          <option key={dojo.id} value={dojo.name}>{dojo.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Your Message</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-brand-dark/5 dark:bg-brand-dark/50 border border-brand-dark/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-red/50 text-brand-dark dark:text-white placeholder-gray-500 leading-relaxed"
                      placeholder="Type details about batch availability, fees, or class schedules..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand-red hover:bg-red-700 disabled:bg-gray-700 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Contact;
