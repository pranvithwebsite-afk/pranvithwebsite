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
            className={`shrink-0 whitespace-nowrap rounded-full border px-[18px] py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a13] ${
              isSelected
                ? 'border-transparent bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]'
                : 'border-white/10 bg-white/[0.03] text-white/70 hover:-translate-y-0.5 hover:border-[#3b82f6]/60 hover:text-white'
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
