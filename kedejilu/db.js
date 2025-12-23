const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbFile);

function init(){
  db.serialize(()=>{
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      note TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // create default admin if not exists
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err,row)=>{
      if(err) return console.error(err);
      if(!row){
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync('123456', 8);
        db.run('INSERT INTO users (username,password_hash) VALUES (?,?)', ['admin', hash]);
        console.log('Created default admin/123456');
      }
    });
  });
}

module.exports = { db, init };
