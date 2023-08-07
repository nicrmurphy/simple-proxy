const express = require('express')
const app = express()
const { createProxyMiddleware } = require('http-proxy-middleware')
require('dotenv').config()
const { PORT, PROXY_SERVER_PATH, PROXY_SERVER_AUTH, DESTINATION_API_URL, DESTINATION_API_AUTH } = process.env

const getReqIp = (req) => req.headers['x-forwarded-for'] ?? req.ip ?? 'Unknown IP'
const logReq = (prefix, req, suffix = '') => console.log(prefix, getReqIp(req), req.method, req.originalUrl, req.headers?.authorization?.includes('Basic ') ? Buffer.from(req.headers.authorization.replace('Basic ', ''), 'base64').toString('utf8') : 'No Auth', suffix)

app.use('/*', (req, res, next) => {
  logReq('REQ:', req)
  // parse & authenticate proxy auth
  if (!req.headers?.authorization?.includes('Basic ')) return res.sendStatus(401)
  const auth = Buffer.from(req.headers.authorization.replace('Basic ', ''), 'base64').toString('utf8')
  if (auth !== PROXY_SERVER_AUTH) return res.sendStatus(401)
  // encode destination API auth for next request
  req.headers.authorization = `Basic ${Buffer.from(DESTINATION_API_AUTH, 'utf8').toString('base64')}`
  next()
})

const proxyOptions = {
  target: DESTINATION_API_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => path.replace(PROXY_SERVER_PATH, ''),
  onProxyRes: (proxyRes, req, res) => {
    logReq('RES:', req, proxyRes.statusCode)
  },
  onError: console.error
  }
app.use(`${PROXY_SERVER_PATH}/*`, createProxyMiddleware(proxyOptions))

app.start = (port) => app.listen(port, () => {
  console.log(`Server running on port ${port}...`)
})

app.start(PORT || 45687)
