const http = require('http');
const mysql = require('mysql2/promise');

const BASE = 'http://localhost:3000';
const ADMIN_TOKEN = 'admin_token_1e1b4848-949f-44cc-805b-294bf6711fbf';

function log(m) { console.log('  ' + m); }
function ok(m) { console.log('  ✅ ' + m); }
function fail(m) { console.log('  ❌ ' + m); }

function jpeg() {
  return Buffer.from([
    0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
    0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
    0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
    0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,
    0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,
    0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
    0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,0x01,0x05,0x01,0x01,
    0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
    0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0xFF,0xC4,0x00,0xB5,0x10,0x00,0x02,0x01,0x03,
    0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7D,0x01,0x02,0x03,0x00,
    0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,
    0x81,0x91,0xA1,0x08,0x23,0x42,0xB1,0xC1,0x15,0x52,0xD1,0xF0,0x24,0x33,0x62,0x72,
    0x82,0x09,0x0A,0x16,0x17,0x18,0x19,0x1A,0x25,0x26,0x27,0x28,0x29,0x2A,0x34,0x35,
    0x36,0x37,0x38,0x39,0x3A,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x53,0x54,0x55,
    0x56,0x57,0x58,0x59,0x5A,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x73,0x74,0x75,
    0x76,0x77,0x78,0x79,0x7A,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8A,0x92,0x93,0x94,
    0x95,0x96,0x97,0x98,0x99,0x9A,0xA2,0xA3,0xA4,0xA5,0xA6,0xA7,0xA8,0xA9,0xAA,0xB2,
    0xB3,0xB4,0xB5,0xB6,0xB7,0xB8,0xB9,0xBA,0xC2,0xC3,0xC4,0xC5,0xC6,0xC7,0xC8,0xC9,
    0xCA,0xD2,0xD3,0xD4,0xD5,0xD6,0xD7,0xD8,0xD9,0xDA,0xE1,0xE2,0xE3,0xE4,0xE5,0xE6,
    0xE7,0xE8,0xE9,0xEA,0xF1,0xF2,0xF3,0xF4,0xF5,0xF6,0xF7,0xF8,0xF9,0xFA,0xFF,0xDA,
    0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0x7B,0x94,0x11,0x00,0x00,0x00,0x00,0x00,
    0xFF,0xD9,
  ]);
}

function uploadFile(tipo, buf, name, mime) {
  return new Promise((resolve, reject) => {
    const b = '----Baza' + Date.now();
    const parts = [];
    parts.push(Buffer.from('--' + b + '\r\nContent-Disposition: form-data; name="file"; filename="' + name + '"\r\nContent-Type: ' + mime + '\r\n\r\n'));
    parts.push(buf);
    parts.push(Buffer.from('\r\n--' + b + '--\r\n'));
    const body = Buffer.concat(parts);
    const url = new URL(BASE + '/uploads/' + tipo);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + ADMIN_TOKEN,
        'Content-Type': 'multipart/form-data; boundary=' + b,
        'Content-Length': body.length,
      },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = JSON.stringify(body);
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
      headers: { Authorization: 'Bearer ' + ADMIN_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const userId = 'test_deliver_' + Date.now();
  console.log('='.repeat(60));
  console.log('  TESTE UPLOAD 7 DOCUMENTOS');
  console.log('  User ID: ' + userId);
  console.log('='.repeat(60));

  // Criar utilizador
  const conn = await mysql.createConnection({
    host:'localhost', port:3306, user:'root', password:'mario123', database:'bazza_db'
  });
  const phone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  await conn.execute(
    'INSERT INTO users (id, nome, sobrenome, email, telefone, role, status, firebaseUid) VALUES (?,?,?,?,?,?,?,?)',
    [userId, 'Teste', 'Deliver', `teste_${userId}@baza.ao`, phone, 'deliver', 'pending', userId]
  );
  log('Utilizador criado: ' + userId);
  await conn.end();

  // Upload 7 documentos
  const buf = jpeg();
  const uploads = [
    ['foto-perfil', 'perfil.jpg', 'Foto Perfil'],
    ['documento-carta-frente', 'carta_frente.jpg', 'Carta Frente'],
    ['documento-carta-verso', 'carta_verso.jpg', 'Carta Verso'],
    ['documento-bi-frente', 'bi_frente.jpg', 'BI Frente'],
    ['documento-bi-verso', 'bi_verso.jpg', 'BI Verso'],
    ['foto-veiculo', 'veiculo.jpg', 'Foto Veiculo'],
    ['foto-placa', 'placa.jpg', 'Foto Placa'],
  ];

  let okCount = 0;
  for (const [tipo, fname, label] of uploads) {
    try {
      const r = await uploadFile(tipo, buf, fname, 'image/jpeg');
      if (r.status >= 200 && r.status < 300) {
        ok(label + ': ' + (r.data && r.data.message || r.status));
        okCount++;
      } else {
        fail(label + ': ' + r.status + ' — ' + JSON.stringify(r.data || r.raw || '').substring(0, 200));
      }
    } catch(e) { fail(label + ': ' + e.message); }
  }
  console.log('\n  Uploads: ' + okCount + '/7');

  // Completar perfil
  console.log('\n  --- Completar Perfil ---');
  const r = await apiPost('/motoqueiros/completar-perfil', {
    nome: 'Teste', sobrenome: 'Deliver', email: 'teste@baza.ao',
    dataNascimento: '15/03/1995', numeroBI: '001234567LA045',
    numeroCarta: 'C123456789', morada: 'Luanda, Angola',
    marca: 'Toyota', modelo: 'Corolla', placa: 'LD-22-93-AO',
    corPrincipal: 'Preto', ano: new Date().getFullYear(),
  });
  if (r.status === 200 || r.status === 201) {
    ok('Perfil registado: ' + JSON.stringify(r.data));
  } else {
    fail('Status ' + r.status + ': ' + JSON.stringify(r.data || r.raw || '').substring(0, 300));
  }

  // Verificar na BD
  console.log('\n  --- Verificar na BD ---');
  const conn2 = await mysql.createConnection({
    host:'localhost', port:3306, user:'root', password:'mario123', database:'bazza_db'
  });
  const [uploadsDb] = await conn2.execute('SELECT tipo, nomeOriginal, tamanho FROM uploads WHERE userId=?', [userId]);
  log('Documentos na BD: ' + uploadsDb.length + '/7');
  for (const u of uploadsDb) {
    log('  ' + u.tipo + ': ' + u.nomeOriginal + ' (' + u.tamanho + ' bytes)');
  }

  const [user] = await conn2.execute('SELECT role, status FROM users WHERE id=?', [userId]);
  if (user.length > 0) log('User role: ' + user[0].role + ', status: ' + user[0].status);

  const [motoq] = await conn2.execute('SELECT id, status FROM motoqueiros WHERE userId=?', [userId]);
  if (motoq.length > 0) log('Motoqueiro status: ' + motoq[0].status);
  else fail('Motoqueiro nao encontrado!');

  await conn2.end();

  console.log('\n' + '='.repeat(60));
  console.log('  FIM DO TESTE');
  console.log('  Uploads OK: ' + okCount + '/7');
  console.log('  User: ' + userId);
  console.log('  Telefone: ' + phone);
  console.log('='.repeat(60));
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
