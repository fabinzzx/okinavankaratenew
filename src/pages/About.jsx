import React from 'react';
import { motion } from 'framer-motion';
import { Award, Compass, Heart, Users } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: <Award className="text-brand-red h-8 w-8" />,
      title: "Honor",
      desc: "Preserving traditional martial values and treating peers and instructors with ultimate respect."
    },
    {
      icon: <Compass className="text-brand-red h-8 w-8" />,
      title: "Discipline",
      desc: "Instilling focus, resilience, and personal mastery that extends far beyond the dojo floor."
    },
    {
      icon: <Users className="text-brand-red h-8 w-8" />,
      title: "Community",
      desc: "A tight-knit family welcoming trainees of all ages, skill levels, and fitness backgrounds."
    }
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-brand-dark bg-brand-light text-brand-dark dark:text-white">
      
      {/* Hero Header */}
      <section className="relative py-20 dark:bg-white/5 bg-brand-dark/5 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-brand-red font-bold tracking-widest text-xs uppercase bg-brand-red/10 px-4 py-1.5 rounded-full border border-brand-red/20 inline-block mb-3">
              Who We Are
            </span>
            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight dark:text-white text-brand-dark">
              About Our <span className="text-brand-red">Dojo</span>
            </h1>
            <div className="h-1 w-24 bg-brand-red mx-auto mt-4" />
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            
            {/* Story Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 text-gray-600 dark:text-gray-300 leading-relaxed text-sm sm:text-base"
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold dark:text-white text-brand-dark uppercase">
                Traditional Roots, Modern Standards
              </h2>
              <p>
                <strong>Okinavan Shito Ryu Karate Academy</strong> was founded by <strong>Kyoshi Thomas Kathanatt</strong>, a passionate martial artist dedicated to preserving and promoting the traditional roots of Okinawan karate.
              </p>
              <p>
                We are a community-based dojo with a mission to teach authentic Shito Ryu Karate to students of all ages. Our structured training programs focus on developing discipline, confidence, physical fitness, and self-defense skills in a safe and respectful environment.
              </p>
              <p>
                Our founder, Kyoshi Thomas Kathanatt, brings decades of experience, having trained countless students and black belts across India. His vision is to not only build strong martial artists but to also shape individuals with strong character and leadership qualities.
              </p>
              <p>
                The dojo emphasizes traditional kihons (basics), katas (forms), kumite (sparring), and modern-day applications of karate. We also host regular belt tests, seminars, tournaments, and national-level black belt gradings.
              </p>
            </motion.div>

            {/* Showcase Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative aspect-video md:aspect-square overflow-hidden rounded-2xl border border-brand-dark/10 dark:border-white/10"
            >
              <img 
                src="/images/img0055.jpg" 
                alt="Karate session group" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/images/LOGO.png";
                }}
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 dark:bg-white/5 bg-brand-dark/5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold uppercase dark:text-white text-brand-dark">Our Core Principles</h2>
            <div className="h-1 w-16 bg-brand-red mx-auto mt-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, idx) => (
              <motion.div
                key={idx}
                className="dark:bg-brand-dark bg-white p-8 rounded-2xl border border-brand-dark/10 dark:border-white/10 text-center space-y-4 hover:border-brand-red/30 transition-all shadow-md"
              >
                <div className="mx-auto w-16 h-16 bg-brand-red/10 flex items-center justify-center rounded-2xl border border-brand-red/20">
                  {v.icon}
                </div>
                <h3 className="dark:text-white text-brand-dark font-extrabold text-lg uppercase tracking-wide">{v.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default About;
