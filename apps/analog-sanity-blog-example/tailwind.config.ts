import type { Config } from 'tailwindcss';
import { join } from 'node:path';
import { fontFamily } from 'tailwindcss/defaultTheme';

import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './index.html',
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [typography],
};

export default config;
