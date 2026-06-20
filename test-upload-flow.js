/**
 * Script de teste end-to-end: Registro Deliver + Upload 7 documentos
 *
 * Como usar:
 *   cd test-reanimated
 *   node test-upload-flow.js
 *
 * Pré-requisitos:
 *   - Backend a correr em http://localhost:3000
 *   - Node.js 18+ (usa fetch nativo)
 *   - npm install mysql2 (só para buscar OTP do BD)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
const TEST_EMAIL = `deliver_test_${Date.now()}@baza.ao`;
const TEST_PLACA = `LD-${Math.floor(10 + Math.random() * 90)}-${Math.floor(10 + Math.random() * 90)}-AO`;

let AUTH_TOKEN = null;
let TEST_USER_ID = null;

// ── Helpers ──────────────────────────────────────────────

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }

function httpRequest(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + urlPath);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { ...headers },
    };
    if (AUTH_TOKEN) opts.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) {
      if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

function uploadFile(tipo, fileBuffer, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const boundary = `----BazaTest${Date.now()}`;
    const parts = [];
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const url = new URL(`${BASE_URL}/uploads/${tipo}`);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Criar JPEG mínimo 1x1 pixel válido
function createTestJPEG() {
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

function createTestPDF() {
  return Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Baza Test) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000360 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref 438
%%EOF`, 'utf-8');
}

// ── Testes ───────────────────────────────────────────────

async function step1_backend() {
  log('PASSO 1: Backend a funcionar?');
  try {
    const r = await httpRequest('GET', '/');
    if (r.status === 404 || r.status === 200) { ok('Backend a correr'); return true; }
    fail(`Backend status ${r.status}`); return false;
  } catch(e) { fail(`Backend DOWN: ${e.message}`); return false; }
}

async function step2_send_otp() {
  log('PASSO 2: Enviar OTP para ' + TEST_PHONE);
  try {
    const r = await httpRequest('POST', '/auth/telefone/enviar-otp', { telefone: TEST_PHONE });
    if (r.status === 200 || r.status === 201) { ok('OTP enviado'); return true; }
    fail(`Status ${r.status}: ${JSON.stringify(r.data || r.raw)}`); return false;
  } catch(e) { fail(e.message); return false; }
}

async function step3_get_otp_code() {
  log('PASSO 3: Buscar OTP na BD');
  try {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host:'localhost', port:3306, user:'root', password:'mario123', database:'bazza_db'
    });

    // Procurar em várias tabelas possíveis
    const tables = ['otp', 'otp_codes', 'verification_codes', 'codigo_verificacao'];
    for (const t of tables) {
      try {
        const [rows] = await conn.execute(`SHOW TABLES LIKE '${t}'`);
        if (rows.length > 0) {
          const [codes] = await conn.execute(`SELECT * FROM ${t} ORDER BY 1 DESC LIMIT 1`);
          if (codes.length > 0) {
            const code = codes[0].codigo || codes[0].code || codes[0].otp || codes[0].codigo_verificacao;
            await conn.end();
            ok(`OTP: ${code}`);
            return code;
          }
        }
      } catch {}
    }

    // Listar todas as tabelas
    const [allTables] = await conn.execute('SHOW TABLES');
    const names = allTables.map(r => Object.values(r)[0]);
    log(`Tabelas: ${names.join(', ')}`);

    // Procurar nas tabelas que parecem ter OTP
    for (const t of names) {
      try {
        const [cols] = await conn.execute(`DESCRIBE ${t}`);
        const colNames = cols.map(c => c.Field);
        if (colNames.includes('codigo') || colNames.includes('code') || colNames.includes('otp')) {
          const [rows] = await conn.execute(`SELECT * FROM ${t} ORDER BY 1 DESC LIMIT 1`);
          if (rows.length > 0) {
            const code = rows[0].codigo || rows[0].code || rows[0].otp;
            await conn.end();
            ok(`OTP da tabela ${t}: ${code}`);
            return code;
          }
        }
      } catch {}
    }
    await conn.end();
    fail('OTP não encontrado na BD');
    return null;
  } catch(e) { fail(`BD: ${e.message}`); return null; }
}

async function step4_verify_otp(code) {
  log('PASSO 4: Verificar OTP');
  try {
    const r = await httpRequest('POST', '/auth/telefone/verificar-otp', {
      telefone: TEST_PHONE, codigo: code
    });
    if (r.status === 200 && r.data?.user?.id) {
      TEST_USER_ID = r.data.user.id;
      AUTH_TOKEN = r.data.firebaseCustomToken || null;
      ok(`User ID: ${TEST_USER_ID}`);
      if (AUTH_TOKEN) ok(`Firebase custom token obtido`);
      return true;
    }
    fail(`Status ${r.status}: ${JSON.stringify(r.data || r.raw)}`); return false;
  } catch(e) { fail(e.message); return false; }
}

async function step5_ensure_auth() {
  log('PASSO 5: Garantir token de autenticação');
  if (AUTH_TOKEN) { ok('Token já disponível'); return true; }

  // Tentar admin login
  try {
    const r = await httpRequest('POST', '/auth/admin-login', { telefone:'923456789', pin:'1234' });
    if (r.status === 200 && r.data?.token) {
      AUTH_TOKEN = r.data.token;
      ok('Admin token obtido');
      return true;
    }
  } catch {}

  // Fallback: admin_token_ legado
  try {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host:'localhost', port:3306, user:'root', password:'mario123', database:'bazza_db'
    });
    const [admins] = await conn.execute("SELECT id FROM users WHERE role='admin' LIMIT 1");
    await conn.end();
    if (admins.length > 0) {
      AUTH_TOKEN = `admin_token_${admins[0].id}`;
      ok('Admin legado token');
      return true;
    }
  } catch {}

  fail('Sem token de autenticação'); return false;
}

async function step6_upload_7_docs() {
  log('PASSO 6: Upload 7 documentos obrigatórios');
  if (!AUTH_TOKEN) { fail('Sem token'); return 0; }

  const jpeg = createTestJPEG();
  const pdf = createTestPDF();

  const uploads = [
    ['foto-perfil', jpeg, 'perfil.jpg', 'image/jpeg', 'Foto Perfil'],
    ['documento-cartafrente', jpeg, 'carta_frente.jpg', 'image/jpeg', 'Carta Condução Frente'],
    ['documento-cartaverso', jpeg, 'carta_verso.jpg', 'image/jpeg', 'Carta Condução Verso'],
    ['documento-bi-frente', jpeg, 'bi_frente.jpg', 'image/jpeg', 'BI Frente'],
    ['documento-bi-verso', jpeg, 'bi_verso.jpg', 'image/jpeg', 'BI Verso'],
    ['foto-veiculo', jpeg, 'veiculo.jpg', 'image/jpeg', 'Foto Veículo'],
    ['foto-placa', jpeg, 'placa.jpg', 'image/jpeg', 'Foto Placa'],
  ];

  // Tentar com os nomes corretos do backend
  let success = 0;
  for (const [tipo, buf, name, mime, label] of uploads) {
    try {
      const r = await uploadFile(tipo, buf, name, mime);
      if (r.status >= 200 && r.status < 300) {
        ok(`${label} (${tipo}): ${r.data?.message || r.status}`);
        success++;
      } else {
        warn(`${label} (${tipo}): ${r.status} — ${JSON.stringify(r.data || r.raw || '').substring(0,120)}`);
      }
    } catch(e) {
      warn(`${label}: ${e.message}`);
    }
  }

  log(`  Resultado: ${success}/7 uploads OK`);
  return success;
}

async function step7_completar_perfil() {
  log('PASSO 7: Completar perfil deliver');
  try {
    const r = await httpRequest('POST', '/motoqueiros/completar-perfil', {
      nome: 'Teste',
      sobrenome: 'Deliver',
      email: TEST_EMAIL,
      dataNascimento: '15/03/1995',
      numeroBI: '001234567LA045',
      numeroCarta: 'C123456789',
      morada: 'Luanda, Angola',
      marca: 'Toyota',
      modelo: 'Corolla',
      placa: TEST_PLACA,
      corPrincipal: 'Preto',
      ano: new Date().getFullYear(),
    });
    if (r.status === 200 || r.status === 201) {
      ok(`Perfil registado: ${JSON.stringify(r.data)}`);
      return true;
    }
    fail(`Status ${r.status}: ${JSON.stringify(r.data || r.raw)}`);
    return false;
  } catch(e) { fail(e.message); return false; }
}

async function step8_verificar_status() {
  log('PASSO 8: Verificar status');
  try {
    const r = await httpRequest('GET', '/motoqueiros/meu-perfil');
    if (r.status === 200) {
      log(`  Status: ${JSON.stringify(r.data).substring(0, 200)}`);
      ok('Perfil verificado');
    } else {
      warn(`Status ${r.status}: ${JSON.stringify(r.data || r.raw || '').substring(0, 150)}`);
    }
  } catch(e) { warn(e.message); }
}

async function step9_verificar_admin() {
  log('PASSO 9: Verificar no admin (pendentes)');
  try {
    // Temporarily use admin token for this check
    const savedToken = AUTH_TOKEN;
    try {
      const mysql = require('mysql2/promise');
      const conn = await mysql.createConnection({
        host:'localhost', port:3306, user:'root', password:'mario123', database:'bazza_db'
      });
      const [admins] = await conn.execute("SELECT id FROM users WHERE role='admin' LIMIT 1");
      await conn.end();
      if (admins.length > 0) {
        AUTH_TOKEN = `admin_token_${admins[0].id}`;
      }
    } catch {}

    const r = await httpRequest('GET', '/admin/motoqueiros/pendentes');
    AUTH_TOKEN = savedToken;

    if (r.status === 200) {
      const data = r.data;
      if (Array.isArray(data)) {
        const found = data.find(p => p.userId === TEST_USER_ID || p.user?.id === TEST_USER_ID);
        if (found) {
          ok(`Encontrado na lista de pendentes!`);
          log(`  ID: ${found.id}`);
          log(`  Status: ${found.status}`);
          log(`  Nome: ${found.user?.nome || 'N/A'}`);
          log(`  Todos docs: ${found.temTodosDocumentos}`);
        } else {
          warn(`User não encontrado. Total pendentes: ${data.length}`);
        }
      } else {
        log(`  Resposta: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } else {
      warn(`Admin endpoint: ${r.status} — ${JSON.stringify(r.data || r.raw || '').substring(0, 150)}`);
    }
  } catch(e) { warn(e.message); }
}

async function step10_verificar_docs() {
  log('PASSO 10: Verificar documentos no BD');
  try {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host:'localhost', port:3306, user:'root', password:'mario123', database:'bazza_db'
    });

    if (!TEST_USER_ID) {
      // Buscar o user pelo telefone
      const [users] = await conn.execute("SELECT id FROM users WHERE telefone=?", [TEST_PHONE]);
      if (users.length > 0) TEST_USER_ID = users[0].id;
    }

    if (TEST_USER_ID) {
      const [uploads] = await conn.execute("SELECT tipo, nomeOriginal, tamanho, mimeType FROM uploads WHERE userId=?", [TEST_USER_ID]);
      log(`  Documentos encontrados: ${uploads.length}/7`);
      for (const u of uploads) {
        log(`    ${u.tipo}: ${u.nomeOriginal} (${u.tamanho} bytes, ${u.mimeType})`);
      }

      const [user] = await conn.execute("SELECT role, status, nome, sobrenome, email FROM users WHERE id=?", [TEST_USER_ID]);
      if (user.length > 0) {
        log(`  User role: ${user[0].role}, status: ${user[0].status}`);
        log(`  Nome: ${user[0].nome} ${user[0].sobrenome}, email: ${user[0].email}`);
      }

      const [motoq] = await conn.execute("SELECT id, status FROM motoqueiros WHERE userId=?", [TEST_USER_ID]);
      if (motoq.length > 0) {
        log(`  Motoqueiro status: ${motoq[0].status}`);
      } else {
        warn('Registro motoqueiro não encontrado!');
      }
    }

    await conn.end();
    ok('Verificação BD completa');
  } catch(e) { warn(`BD: ${e.message}`); }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  TESTE END-TO-END: Registro Deliver + Upload');
  console.log(`  Telefone: ${TEST_PHONE}`);
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log(`  Placa: ${TEST_PLACA}`);
  console.log('='.repeat(60));

  const r1 = await step1_backend();
  if (!r1) { console.log('\n❌ Backend não está a correr. Inicia com: cd Bazza && npm run start:dev'); return; }

  const r2 = await step2_send_otp();
  if (!r2) return;

  const code = await step3_get_otp_code();
  if (!code) return;

  const r4 = await step4_verify_otp(code);
  if (!r4) return;

  await step5_ensure_auth();
  const uploaded = await step6_upload_7_docs();
  await step7_completar_perfil();
  await step8_verificar_status();
  await step9_verificar_admin();
  await step10_verificar_docs();

  console.log('\n' + '='.repeat(60));
  console.log('  RESUMO');
  console.log('='.repeat(60));
  console.log(`  Telefone: ${TEST_PHONE}`);
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log(`  User ID: ${TEST_USER_ID || 'N/A'}`);
  console.log(`  Uploads: ${uploaded}/7`);
  console.log(`  Perfil: ver passo 7 acima`);
  console.log(`  Pendente no admin: ver passo 9 acima`);
  console.log('='.repeat(60));
  console.log('\nSe tudo OK, o utilizador deve aparecer como PENDENTE no painel admin.');
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
