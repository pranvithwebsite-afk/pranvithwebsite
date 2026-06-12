// craco.config.js
const path = require("path");
const webpack = require("webpack");

let webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
        ],
      };

      webpackConfig.plugins = [
        ...(webpackConfig.plugins || []),
        new webpack.DefinePlugin({
          "process.env.VITE_RAZORPAY_KEY_ID": JSON.stringify(process.env.VITE_RAZORPAY_KEY_ID || ""),
        }),
      ];

      return webpackConfig;
    },
  },
};

module.exports = webpackConfig;
