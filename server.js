import fs from 'fs';
import path from 'path';
import https from 'https';
import express from 'express';
import selfsigned from 'selfsigned';
import { createRequire } from 'module';

const PORT = process.env.PORT || 8443;
const app = express();
const root = process.cwd();
const certDir = path.join(root, 'certs');
const keyPath = path.join(certDir, 'server.key');
const certPath = path.join(certDir, 'server.crt');
const mimeOverrides = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.binarypb': 'application/octet-stream',
  '.tflite': 'application/octet-stream',
};

function getSelfSignedGenerator() {
  const require = createRequire(import.meta.url);
  const cjs = (() => {
    try {
      return require('selfsigned');
    } catch (e) {
      return null;
    }
  })();

  const candidate =
    selfsigned?.generate ||
    selfsigned?.default?.generate ||
    cjs?.generate ||
    cjs?.default?.generate;

  if (typeof candidate !== 'function') {
    throw new Error('selfsigned.generate 未找到，请确认依赖版本兼容');
  }
  return candidate;
}

async function generateSelfSigned() {
  const generate = getSelfSignedGenerator();
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const altNames = [
    { type: 2, value: 'localhost' }, // DNS
    { type: 7, ip: '127.0.0.1' }, // IPv4
    { type: 7, ip: '::1' }, // IPv6
  ];

  const tryGenerate = async (opts, label) => {
    try {
      return await generate(attrs, opts);
    } catch (err) {
      console.warn(`selfsigned 生成失败（${label}）:`, err?.message || err);
      return null;
    }
  };

  const baseOpts = {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: true },
      { name: 'subjectAltName', altNames },
    ],
  };

  const fallbackOpts = { days: 365, keySize: 2048 };
  const minimalOpts = {}; // 最简配置兜底

  const pems =
    (await tryGenerate(baseOpts, '带 SAN')) ||
    (await tryGenerate(fallbackOpts, '无扩展')) ||
    (await tryGenerate(minimalOpts, '最简'));

  if (!pems?.private || !pems?.cert) {
    throw new Error('自签名证书生成失败，pems 返回为空，请尝试删除 certs 目录后重试');
  }
  return pems;
}

async function ensureCert() {
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  const needNew = !fs.existsSync(keyPath) || !fs.existsSync(certPath);
  if (needNew) {
    const pems = await generateSelfSigned();
    fs.writeFileSync(keyPath, pems.private, 'utf8');
    fs.writeFileSync(certPath, pems.cert, 'utf8');
    console.log('已生成自签名证书，路径 certs/server.crt & server.key');
  }
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

// 确保关键静态文件的 Content-Type 正确，避免被当作 text/html
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (mimeOverrides[ext]) {
    res.type(mimeOverrides[ext]);
  }
  next();
});

app.use(express.static(path.join(root, 'public')));
// Express 5 通配符推荐用中间件兜底，避免 path-to-regexp 通配符解析报错
app.use((_req, res) => {
  res.sendFile(path.join(root, 'public', 'index.html'));
});

const credentials = await ensureCert();
const server = https.createServer(credentials, app);
server.listen(PORT, () => {
  console.log(`本地 HTTPS 已启动：https://localhost:${PORT}`);
});

