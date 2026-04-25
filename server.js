const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(messages) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

app.post('/api/scan', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 шаардлагатай' });
  if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY тохируулаагүй' });
  try {
    const text = await callOpenAI([{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        },
        {
          type: 'text',
          text: `Энэ зурагт байгаа бүх монгол бичиг болон текстийг уншиж, дараах форматаар хариул:\n\nКИРИЛЛ: [Зурагт байгаа текстийн кирилл орчуулга. Монгол бичиг байвал кириллд хөрвүүл]\nUNICODE: [Зурагт байгаа монгол бичгийг Unicode монгол бичгийн кодоор бич]\nТАЙЛБАР: [Зурагт байгаа агуулга, контекст, нэмэлт тайлбар]`
        }
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
  if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY тохируулаагүй' });
  try {
    const text = await callOpenAI([{
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
  console.log(OPENAI_KEY ? '🟢 OpenAI key олдлоо' : '🔴 OPENAI_API_KEY байхгүй!');
});
