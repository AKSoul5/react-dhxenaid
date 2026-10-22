/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The desktop app (desktop/electron) ships a self-contained server.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
};

export default nextConfig;
