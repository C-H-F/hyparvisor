import autoprefixer from 'autoprefixer';
import postcssNested from 'postcss-nested';
import tailwindcss from 'tailwindcss';
import tailwindcssNesting from 'tailwindcss/nesting';

/** @type {import('postcss-load-config').Config} */
export default {
  plugins: [autoprefixer, tailwindcssNesting(postcssNested), tailwindcss],
};
