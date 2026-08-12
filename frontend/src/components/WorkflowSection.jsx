import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const WorkflowSection = () => {
  return (
    <section className="section-block site-section--base relative py-28 px-6 overflow-hidden">
      {/* Dual Bottom Ambient Lighting (Left Burnt Amber, Right Electric Blue) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -bottom-20 left-0 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(234,88,12,0.45)_0%,rgba(234,88,12,0.12)_45%,transparent_70%)] filter blur-3xl" />
        <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.45)_0%,rgba(59,130,246,0.12)_45%,transparent_70%)] filter blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/12 text-white/80 text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur">
          <Sparkles size={14} className="text-[#ea580c]" />
          <span>WORKFLOW TODAY</span>
        </div>

        {/* Title */}
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
          Upgrade Your Editing <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-[#93c5fd] to-[#60a5fa]">
            Workflow Today
          </span>
        </h2>

        <p className="text-white/65 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Sign up for PranvithDOP and bring your creative workflow into one powerful, stream-lined editing studio.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/assets"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white px-8 py-4 rounded-full text-sm font-semibold shadow-[0_10px_35px_rgba(59,130,246,0.42)] transition-all duration-300 hover:scale-105"
          >
            <span>Get Started</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/courses"
            className="inline-flex items-center gap-3 bg-[#162032] hover:bg-[#1e2c45] border border-[#3b82f6]/40 text-white px-8 py-4 rounded-full text-sm font-semibold transition-all duration-200"
          >
            <span>View Courses</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
