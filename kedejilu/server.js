require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('express').json;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const upload = multer();
const { db, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

app.use(cors());
app.use(bodyParser());
app.use(express.static(__dirname));

init();

function signToken(payload){ return jwt.sign(payload, JWT_SECRET, {expiresIn: '7d'}); }

function authMiddleware(req,res,next){
  const header = req.headers['authorization'];
  if(!header) return res.status(401).json({error:'Missing Authorization'});
  const parts = header.split(' ');
  if(parts.length!==2 || parts[0]!=='Bearer') return res.status(401).json({error:'Invalid Authorization'});
  jwt.verify(parts[1], JWT_SECRET, (err,decoded)=>{
    if(err) return res.status(401).json({error:'Invalid token'});
    req.user = decoded; next();
  });
}

//注册
app.post('/api/register', (req,res)=>{
  const {username, password} = req.body;
  if(!username||!password) return res.status(400).json({error:'用户名和密码必填'});
  const hash = bcrypt.hashSync(password, 8);
  db.run('INSERT INTO users (username,password_hash) VALUES (?,?)', [username, hash], function(err){
    if(err){
      if(err.message && err.message.includes('UNIQUE')) return res.status(400).json({error:'用户名已存在'});
      return res.status(500).json({error:'注册失败'});
    }
    const token = signToken({id:this.lastID, username});
    res.json({token, username});
  });
});

//登录
app.post('/api/login', (req,res)=>{
  const {username,password} = req.body;
  if(!username||!password) return res.status(400).json({error:'用户名和密码必填'});
  db.get('SELECT id,username,password_hash FROM users WHERE username = ?', [username], (err,row)=>{
    if(err) return res.status(500).json({error:'查询失败'});
    if(!row) return res.status(400).json({error:'账号或密码错误'});
    const ok = bcrypt.compareSync(password, row.password_hash);
    if(!ok) return res.status(400).json({error:'账号或密码错误'});
    const token = signToken({id:row.id, username:row.username});
    res.json({token, username: row.username});
  });
});

// 获取记录（按用户、类型，可按日期过滤）
app.get('/api/records', authMiddleware, (req,res)=>{
  const userId = req.user.id; const type = req.query.type||'compound'; const date = req.query.date;
  let sql = 'SELECT id, date, name, qty, note FROM records WHERE user_id = ? AND type = ?';
  const params = [userId, type];
  if(date){ sql += ' AND date = ?'; params.push(date); }
  sql += ' ORDER BY date DESC, id DESC';
  db.all(sql, params, (err,rows)=>{
    if(err) return res.status(500).json({error:'查询失败'});
    res.json(rows);
  });
});

// 添加记录
app.post('/api/records', authMiddleware, (req,res)=>{
  const userId = req.user.id; const {type,date,name,qty,note} = req.body;
  if(!type||!date||!name||!qty) return res.status(400).json({error:'缺少必要字段'});
  db.run('INSERT INTO records (user_id,type,date,name,qty,note) VALUES (?,?,?,?,?,?)', [userId,type,date,name,qty,note||''], function(err){
    if(err) return res.status(500).json({error:'添加失败'});
    res.json({id: this.lastID});
  });
});

// 更新记录
app.put('/api/records/:id', authMiddleware, (req,res)=>{
  const userId = req.user.id; const id = req.params.id; const {date,name,qty,note} = req.body;
  db.run('UPDATE records SET date=?,name=?,qty=?,note=? WHERE id=? AND user_id=?', [date,name,qty,note||'',id,userId], function(err){
    if(err) return res.status(500).json({error:'更新失败'});
    if(this.changes===0) return res.status(404).json({error:'记录未找到'});
    res.json({ok:true});
  });
});

// 删除
app.delete('/api/records/:id', authMiddleware, (req,res)=>{
  const userId = req.user.id; const id = req.params.id;
  db.run('DELETE FROM records WHERE id=? AND user_id=?', [id,userId], function(err){
    if(err) return res.status(500).json({error:'删除失败'});
    if(this.changes===0) return res.status(404).json({error:'记录未找到'});
    res.json({ok:true});
  });
});

// 导入 CSV（body: { csv: string, type: string })
app.post('/api/import', authMiddleware, (req,res)=>{
  const userId = req.user.id; const {csv, type} = req.body;
  if(!csv) return res.status(400).json({error:'未提供 CSV 文本'});
  const rows = csv.split(/\r?\n/).map(l=>l.trim()).filter(l=>l!=='');
  if(rows.length===0) return res.json({imported:0});
  // 简单解析
  const parsed = rows.map(line=>{
    const cols = [];
    let cur = ''; let inQuotes = false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch==='"'){
        if(inQuotes && line[i+1]==='"'){ cur += '"'; i++; } else { inQuotes = !inQuotes; }
      } else if(ch===',' && !inQuotes){ cols.push(cur); cur=''; } else { cur += ch; }
    }
    cols.push(cur);
    return cols.map(c=>c.trim());
  });
  // skip header if detected
  const first = parsed[0].map(c=>c.toLowerCase());
  const hasHeader = first.includes('日期') || first.includes('date') || first.includes('名称') || first.includes('name');
  const dataRows = hasHeader ? parsed.slice(1) : parsed;
  let imported = 0;
  const stmt = db.prepare('INSERT INTO records (user_id,type,date,name,qty,note) VALUES (?,?,?,?,?,?)');
  db.serialize(()=>{
    dataRows.forEach(cols=>{
      const date = cols[0]||''; const name = cols[1]||''; const qty = Number(cols[2]||0); const note = cols[3]||'';
      if(!date || !name || !qty) return; // skip
      stmt.run([userId, type||'compound', date, name, qty, note]); imported++;
    });
    stmt.finalize();
    res.json({imported});
  });
});

// 导出 CSV（可按 date 过滤）
app.get('/api/export', authMiddleware, (req,res)=>{
  const userId = req.user.id; const type = req.query.type||'compound'; const date = req.query.date;
  let sql = 'SELECT date,name,qty,note FROM records WHERE user_id = ? AND type = ?';
  const params = [userId, type]; if(date){ sql += ' AND date = ?'; params.push(date); }
  db.all(sql, params, (err,rows)=>{
    if(err) return res.status(500).json({error:'导出失败'});
    const header = ['日期','名称','数量','备注'];
    const lines = [header.join(',')];
    rows.forEach(r=>{
      const cells = [r.date, r.name, String(r.qty), r.note||''].map(cell=>{
        if((cell+'').includes(',')||(cell+'').includes('"')||(cell+'').includes('\n')){
          return '"'+(cell+'').replace(/"/g,'""')+'"';
        }
        return cell;
      });
      lines.push(cells.join(','));
    });
    const csv = lines.join('\n');
    res.setHeader('Content-Type','text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kedejilu_${type}.csv"`);
    res.send(csv);
  });
});

app.listen(PORT, ()=>{
  console.log(`Server running on http://localhost:${PORT}`);
});
