import type { NextConfig } from "next";

// Imported for its side effect: a production build without NEXT_PUBLIC_API_URL fails here, up front.
import "./src/shared/lib/env";

const nextConfig: NextConfig = {};

export default nextConfig;
