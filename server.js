const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const CF_TOKEN = process.env.CF_API_TOKEN;
const CF_ACCOUNT = process.env.CF_ACCOUNT_ID;

async function callCF(messages, image) {
  const { default: fetch } = await import('node-fetch');
  
  const body = image 
    ? { messages, image: Array.from(Buffer.from(image, 'base64')) }
    : { messages };

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result?.response || '';
}

app.post('/api/scan', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 шаардлагатай' });
  if (!CF_TOKEN || !CF_ACCOUNT) return res.status(500).json({ error: 'Cloudflare тохиргоо дутуу' });

  try {
    const text = await callCF([{
      role: 'user',
      content: `Энэ зурагт байгаа бүх монгол бичиг болон текстийг уншиж, дараах форматаар хариул:\n\nКИРИЛЛ: [Зурагт байгаа текстийн кирилл орчуулга. Монгол бичиг байвал кириллд хөрвүүл]\nUNICODE: [Зурагт байгаа монгол бичгийг Unicode монгол бичгийн кодоор бич]\nТАЙЛБАР: [Зурагт байгаа агуулга, контекст, нэмэлт тайлбар]`
    }], imageBase64);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dict', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Үг шаардлагатай' });
  if (!CF_TOKEN || !CF_ACCOUNT) return res.status(500).json({ error: 'Cloudflare тохиргоо дутуу' });

  try {
    const text = await callCF([{
      role: 'user',
      content: `Монгол хэлний толь бичгийн туслагч. "${word}" гэдэг үгийг тайлбарла:\n1. Кирилл монгол дээр утгыг тайлбарла\n2. Уламжлалт монгол бичгийн Unicode бичиглэл\n3. Жишээ өгүүлбэр\n4. Ижил утгатай үгс\n\nТовч, тодорхой хариул.`
    }]);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ МонголLens: http://localhost:${PORT}`);
  console.log(CF_TOKEN ? '🟢 Cloudflare token олдлоо' : '🔴 CF_API_TOKEN байхгүй!');
});
