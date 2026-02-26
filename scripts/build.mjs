import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["bin/s3pull.mjs", "bin/s3pull-all.mjs"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outdir: "dist",
  external: ["node:*"],
  outExtension: { ".js": ".cjs" },
});

console.log("Built dist/s3pull.cjs and dist/s3pull-all.cjs");
