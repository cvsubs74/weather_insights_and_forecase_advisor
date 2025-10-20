const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Proxy all requests to ADK web server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] ${req.method} ${req.url} -> http://localhost:8000${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
  },
}));

const PORT = 8001;
app.listen(PORT, () => {
  console.log(`🔄 CORS Proxy running on http://localhost:${PORT}`);
  console.log(`   Forwarding to ADK Web: http://localhost:8000`);
  console.log(`   React app should use: http://localhost:${PORT}`);
});
