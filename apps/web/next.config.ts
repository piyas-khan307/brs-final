import type { NextConfig } from "next";

/**
 * implementation_plan.md §10.1.
 *
 * `output: 'export'` is MANDATORY, not preferred. It is what preserves the
 * architecture's most valuable property: the public site is static, so
 * backend downtime is invisible to visitors (§6.2). For a student club with
 * annual turnover and no on-call rotation, a website that cannot be taken
 * down by backend failure is worth more than any feature.
 *
 * Accepted consequences — do not work around these:
 *   · no Route Handlers / Server Actions / middleware
 *     → forms POST to the façade Worker, which is better for decoupling
 *   · no ISR
 *     → Directus webhook triggers a rebuild; publish-to-live under 3 min
 *   · no built-in Image Optimization
 *     → derivatives are pre-generated into object storage and selected by
 *       srcset; the custom loader only resolves the base URL (§10.2)
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,

  images: {
    // The loader resolves references against NEXT_PUBLIC_STORAGE_BASE_URL
    // and does nothing else — content-addressed keys cannot be computed
    // from an id and a width, so sizing lives in ImageDTO's srcset rather
    // than in a URL rewrite. See the header of src/lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },

  // Fail the build on type or lint errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
