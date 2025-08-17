const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const getPythonCommand = require('./public/js/paths');

const app = express();
const PORT = 3000;
const CRYPTO_DATA = path.join(__dirname, 'public', 'data', 'user-keys.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/index.html'));
});

app.post('/crypto', (req, res) => {
  const { mode, password, ciphertext, plaintext, message: rawMessage } = req.body;
  const message = rawMessage || plaintext;

  if (!mode || !password ||
      (mode === 'simple-encrypt' && !message) ||
      (mode === 'simple-decrypt' && !ciphertext)) {
    return res.status(400).send('Missing required fields');
  }

  const args = mode === 'simple-encrypt'
    ? { password, message }
    : { password, ciphertext };

  const pythonPath = getPythonCommand();
  const scriptPath = path.join(__dirname, 'server', 'scripts', 'crypto.py');

  if (!pythonPath || !fs.existsSync(pythonPath)) {
    console.error('Python executable not found:', pythonPath);
    return res.status(500).send('Python executable not found');
  }

  const env = {
    ...process.env,
    PYTHONHOME: path.join(__dirname, '.python'),
    PYTHONPATH: path.join(__dirname, '.python', 'Lib')
  };

  const python = spawn(pythonPath, [scriptPath, mode, JSON.stringify(args)], { env });

  let result = '';
  python.stdout.on('data', data => result += data.toString());
  python.stderr.on('data', err => console.error('Python error:', err.toString()));

  python.on('close', () => {
    res.send(result.trim());
  });
});

app.post('/run-script', (req, res) => {
  const { text, selected } = req.body;

  const python = spawn('python3', ['script.py', text, selected]);

  let result = '';
  python.stdout.on('data', data => result += data.toString());
  python.stderr.on('data', err => console.error('Python error:', err.toString()));

  python.on('close', () => {
    res.json({ output: result.trim() });
  });
});

app.post('/save', (req, res) => {
  const { label, cipher } = req.body;

  if (!label || !cipher) {
    return res.status(400).send('Missing label or cipher.');
  }

  try {
    let data = [];
    if (fs.existsSync(CRYPTO_DATA)) {
      const raw = fs.readFileSync(CRYPTO_DATA, 'utf-8');
      data = JSON.parse(raw);
    }

    const exists = data.some(entry => entry.label === label);
    if (exists) {
      return res.status(409).send('Label already exists.');
    }

    data.push({ label, cipher });
    fs.writeFileSync(CRYPTO_DATA, JSON.stringify(data, null, 2), 'utf-8');

    res.status(200).send('Saved successfully.');
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).send('Server error.');
  }
});

app.post('/delete', (req, res) => {
  const { label } = req.body;

  if (!label || typeof label !== 'string') {
    return res.status(400).send('Missing or invalid label.');
  }

  try {
    if (!fs.existsSync(CRYPTO_DATA)) {
      return res.status(404).send('Data file not found.');
    }

    const raw = fs.readFileSync(CRYPTO_DATA, 'utf-8');
    const data = JSON.parse(raw);

    const filtered = data.filter(entry => entry.label !== label);

    if (filtered.length === data.length) {
      return res.status(404).send('Label not found.');
    }

    fs.writeFileSync(CRYPTO_DATA, JSON.stringify(filtered, null, 2), 'utf-8');
    res.status(200).send('Deleted successfully.');
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).send('Server error.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});