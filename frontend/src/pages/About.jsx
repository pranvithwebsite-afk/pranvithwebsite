import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Award, Users, Clock, Globe } from 'lucide-react';
import { usePageData } from '../hooks/usePageData';

const About = () => {
  const { page } = usePageData('about');

  const defaultStats = [
    { icon: Users, label: 'Students Trained', value: '5,000+' },
    { icon: Award, label: 'Courses Created', value: '12+' },
    { icon: Clock, label: 'Hours of Content', value: '300+' },
    { icon: Globe, label: 'Countries Reached', value: '20+' },
  ];

  const intro = page?.sections?.intro || {};
  const stats = page?.sections?.stats || defaultStats;

  return (
    <main className="bg-[#070314] text-white">
      <Header />
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            {page?.title || 'About'}{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-300">PranvithDOP</span>
          </h1>
          <p className="mt-7 text-white/70 text-lg leading-relaxed max-w-3xl mx-auto">
            {intro.headline ? `${intro.headline} ${intro.description || ''}` :
              `PranvithDOP is the home for aspiring video editors, content creators, and freelancers who want to learn
            professional editing techniques from real-world projects. We combine industry-standard tools with
            AI-powered workflows to help you create stunning videos faster than ever.`}
          </p>
        </div>

        <div className="max-w-6xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((s) => (
            <div key={s.label} className="p-6 rounded-2xl border border-violet-500/15 bg-[#100830]/60 text-center">
              {s.icon ? (
                <s.icon size={28} className="mx-auto text-violet-400 mb-3" />
              ) : (
                <div className="w-7 h-7 mx-auto mb-3 bg-violet-500/30 rounded" />
              )}
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs text-white/60 tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-20 text-white/75 leading-relaxed space-y-5 text-base">
          {(page?.sections?.content || [
            `Founded by Pranavith from Hyderabad, India, PranvithDOP started as a YouTube channel sharing free video editing
            tutorials. Today it has grown into a full-fledged education platform with structured courses,
            real-world projects, mentorship, and a thriving community of creators.`,
            `Our mission is simple: make professional video editing accessible to everyone — whether you
            are a beginner taking your first steps, a YouTuber leveling up your content, or a freelancer
            building a career out of your craft.`,
          ]).map((text, idx) => (
            <p key={idx}>{text}</p>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default About;
