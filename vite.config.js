import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig(() => {
  return {
    root: "src",
    publicDir: "../public",
    base: "/grid-displacement/",
    build: {
      outDir: "../dist",
      emptyOutDir: true,
    },
    plugins: [glsl()],
  };
});
