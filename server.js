const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const API_KEY = process.env.OPENROUTER_API_KEY;

async function callAI(messages) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://mngllens.onrender.com',
    },
    body: JSON.stringify({
      model: 'google/gemini-flash-1.5',
      messages: messages
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

app.post('/api/scan', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType)
    return res.status(400).json({ error: 'imageBase64 болон mimeType шаардлагатай' });
  if (!API_KEY)
    return res.status(500).json({ error: 'OPENROUTER_API_KEY тохируулаагүй' });

  try {
    const text = await callAI([{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        { type: 'text', text: `Энэ зурагт байгаа бүх монгол бичиг болон текстийг уншиж, дараах форматаар хариул:\n\nКИРИЛЛ: [Зурагт байгаа текстийн кирилл орчуулга]\nUNICODE: [Монгол бичгийн Unicode]\nТАЙЛБАР: [Агуулга, контекст]` }
      ]
    }]);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dict', async (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Үг шаардлагатай' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY тохируулаагүй' });

  try {
    const text = await callAI([{
      role: 'user',
      content: `Монгол хэлний толь бичгийн туслагч. "${word}" гэдэг үгийг тайлбарла:\n1. Кирилл монгол дээр утгыг тайлбарла\n2. Уламжлалт монгол бичгийн Unicode\n3. Жишээ өгүүлбэр\n4. Ижил утгатай үгс`
    }]);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ МонголLens: http://localhost:${PORT}`));
