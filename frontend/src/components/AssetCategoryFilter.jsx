import React from 'react';

const AssetCategoryFilter = ({ categories, selectedCategory, onCategoryChange }) => (
  <nav aria-label="Asset categories" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="flex w-max min-w-full flex-nowrap gap-2.5 py-1">
      {categories.map((category) => {
        const isSelected = selectedCategory === category;

        return (
          <button
            key={category}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onCategoryChange(category)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-[18px] py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0518] ${
              isSelected
                ? 'border-transparent bg-gradient-to-r from-violet-700 to-purple-500 text-white shadow-[0_8px_24px_rgba(124,58,237,0.25)]'
                : 'border-white/10 bg-white/[0.03] text-white/70 hover:-translate-y-0.5 hover:border-purple-500/60 hover:text-white'
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  </nav>
);

export default AssetCategoryFilter;
