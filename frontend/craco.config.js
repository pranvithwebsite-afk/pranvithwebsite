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
          "process.env.VITE_BACKEND_URL": JSON.stringify(process.env.VITE_BACKEND_URL || ""),
        }),
      ];

      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'vendor-react',
              priority: 40,
              enforce: true,
            },
            router: {
              test: /[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run)[\\/]/,
              name: 'vendor-router',
              priority: 35,
              enforce: true,
            },
            icons: {
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              name: 'vendor-icons',
              priority: 30,
              enforce: true,
            },
            admin: {
              test: /[\\/]src[\\/]admin[\\/]/,
              name: 'admin',
              priority: 25,
              enforce: true,
            },
            // React Three Fiber is only requested by the lazy Camera AI widget.
            // Keep its renderer and helpers out of the public app entry bundle.
            cameraAi3d: {
              test: /[\\/]node_modules[\\/](three|@react-three|three-stdlib|three-mesh-bvh|camera-controls|meshline|stats-gl)[\\/]/,
              name: 'camera-ai-3d',
              priority: 22,
              enforce: true,
            },
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 10,
            },
          },
        },
      };

      return webpackConfig;
    },
  },
};

module.exports = webpackConfig;
