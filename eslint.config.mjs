import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/lib/database/generated/**",
      "prisma/migrations/**",
    ],
  },
];

export default eslintConfig;
