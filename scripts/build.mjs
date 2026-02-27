import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["bin/s3pull.mjs"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outdir: "dist",
  external: ["node:*"],
  outExtension: { ".js": ".cjs" },
});

console.log("Built dist/s3pull.cjs");
