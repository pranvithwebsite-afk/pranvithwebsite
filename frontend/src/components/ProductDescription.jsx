import React from 'react';
import { parseProductDescription } from '../lib/utils';

const ProductDescription = ({
  value,
  className = '',
  paragraphClassName = '',
  headingClassName = '',
  listClassName = '',
  itemClassName = '',
}) => {
  const blocks = parseProductDescription(value);
  if (!blocks.length) return null;

  return (
    <div className={className}>
      {blocks.map((block, index) => (
        block.type === 'list' ? (
          <ul
            key={`list-${index}`}
            className={`ml-5 list-disc space-y-2 text-sm leading-7 text-white/72 sm:text-base ${listClassName}`.trim()}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`item-${index}-${itemIndex}`} className={itemClassName}>{item}</li>
            ))}
          </ul>
        ) : (
          <p
            key={`paragraph-${index}`}
            className={`text-sm leading-7 text-white/72 sm:text-base ${block.heading ? `font-semibold text-white ${headingClassName}` : paragraphClassName}`.trim()}
          >
            {block.text}
          </p>
        )
      ))}
    </div>
  );
};

export default ProductDescription;
