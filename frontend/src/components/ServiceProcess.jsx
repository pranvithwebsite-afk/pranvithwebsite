import React from 'react';

const ServiceProcess = ({ steps = [] }) => {
  if (!steps.length) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.38em] text-accent-purple">Our Process</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {steps.map((step, index) => (
            <article key={`${step.title}-${index}`} className="relative rounded-[22px] border border-[var(--border-soft)] bg-panel-soft p-6">
              <span className="text-4xl font-black text-white/10">{String(step.step || index + 1).padStart(2, '0')}</span>
              <h3 className="mt-8 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/62">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceProcess;
