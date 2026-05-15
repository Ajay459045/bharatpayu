module.exports = {
  apps: [
    {
      name: "bharatpayu-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: 2,
      exec_mode: "cluster",
      env: { NODE_ENV: "production" }
    },
    {
      name: "bharatpayu-web",
      cwd: "./apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 2,
      exec_mode: "cluster",
      env: { NODE_ENV: "production" }
    }
  ]
};
