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
 *     → custom loader pointing at our own façade (§10.2)
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,

  images: {
    // The façade already does transforms, and routing images through it is
    // what keeps storage swappable (R2 <-> Azure Blob <-> S3).
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },

  // Fail the build on type or lint errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
