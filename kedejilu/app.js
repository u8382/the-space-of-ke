// 简单前端存储的生产安排记录应用（localStorage）
(function(){
  const DEFAULT_USER_KEY = 'kdj_users_v1';
  const SESSION_KEY = 'kdj_session_v1';

  // DOM
  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app-screen');
  const loginBtn = document.getElementById('btn-login');
  const regBtn = document.getElementById('btn-register');
  const logoutBtn = document.getElementById('btn-logout');
  const currentUserSpan = document.getElementById('current-user');
  const msgBox = document.getElementById('login-msg');

  const sidebar = document.querySelectorAll('.sidebar li');
  const recordArea = document.getElementById('record-area');
  const btnAdd = document.getElementById('btn-add');
  const filterDate = document.getElementById('filter-date');
  const btnClearFilter = document.getElementById('btn-clear-filter');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');
  const btnPrint = document.getElementById('btn-print');

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const recDate = document.getElementById('rec-date');
  const recName = document.getElementById('rec-name');
  const recQty = document.getElementById('rec-qty');
  const recNote = document.getElementById('rec-note');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');

  let currentType = 'compound';
  let editingId = null;

  // init default user if none
  function loadUsers(){
    const raw = localStorage.getItem(DEFAULT_USER_KEY);
    if(!raw){
      const defaultUsers = [{username:'admin',password:'123456'}];
      localStorage.setItem(DEFAULT_USER_KEY, JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    try{return JSON.parse(raw)||[];}catch(e){return []}
  // 前端现在使用后端 API (Node + SQLite)
  (function(){
    const API_ROOT = '';// same origin
    const tokenKey = 'kdj_token_v1';

    // DOM
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const loginBtn = document.getElementById('btn-login');
    const regBtn = document.getElementById('btn-register');
    const logoutBtn = document.getElementById('btn-logout');
    const currentUserSpan = document.getElementById('current-user');
    const msgBox = document.getElementById('login-msg');

    const sidebar = document.querySelectorAll('.sidebar li');
    const recordArea = document.getElementById('record-area');
    const btnAdd = document.getElementById('btn-add');
    const filterDate = document.getElementById('filter-date');
    const btnClearFilter = document.getElementById('btn-clear-filter');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');
    const btnPrint = document.getElementById('btn-print');

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const recDate = document.getElementById('rec-date');
    const recName = document.getElementById('rec-name');
    const recQty = document.getElementById('rec-qty');
    const recNote = document.getElementById('rec-note');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');

    let currentType = 'compound';
    let editingId = null;

    function setToken(t){ if(t) localStorage.setItem(tokenKey,t); else localStorage.removeItem(tokenKey); }
    function getToken(){ return localStorage.getItem(tokenKey); }

    function authFetch(url, opts={}){
      opts.headers = opts.headers || {};
      const token = getToken();
      if(token) opts.headers['Authorization'] = 'Bearer '+token;
      return fetch(API_ROOT+url, opts).then(r=>r.json());
    }

    function showLogin(){loginScreen.classList.remove('hidden');appScreen.classList.add('hidden');}
    function showApp(){loginScreen.classList.add('hidden');appScreen.classList.remove('hidden');}
    function showMsg(text){msgBox.textContent = text; setTimeout(()=>msgBox.textContent='',4000)}
    function renderSidebar(){sidebar.forEach(li=>{ li.classList.toggle('active', li.dataset.type===currentType); })}

    async function renderRecords(){
      const token = getToken(); if(!token) return;
      const date = filterDate.value ? `&date=${encodeURIComponent(filterDate.value)}` : '';
      const res = await authFetch(`/api/records?type=${encodeURIComponent(currentType)}${date}`);
      if(res.error){ showMsg(res.error); return; }
      const rows = res;
      let html = '<table class="table"><thead><tr><th>日期</th><th>名称</th><th>数量</th><th>备注</th><th>操作</th></tr></thead><tbody>';
      if(!rows || rows.length===0){ html += '<tr><td colspan="5">暂无记录</td></tr>'; }
      else{
        rows.forEach(r=>{
          html += `<tr data-id="${r.id}"><td>${r.date}</td><td>${r.name}</td><td>${r.qty}</td><td>${r.note||''}</td><td>`+
                  `<button class="btn-small btn-edit" data-act="edit" data-id="${r.id}">编辑</button> `+
                  `<button class="btn-small btn-del" data-act="del" data-id="${r.id}">删除</button>`+
                  `</td></tr>`;
        });
      }
      html += '</tbody></table>';
      recordArea.innerHTML = html;
    }

    function openModal(isEdit){ modal.classList.remove('hidden'); modalTitle.textContent = isEdit ? '编辑记录' : '添加记录'; }
    function closeModal(){ modal.classList.add('hidden'); editingId=null; recDate.value='';recName.value='';recQty.value='';recNote.value=''; }

    // 登录 / 注册
    loginBtn.addEventListener('click', async ()=>{
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      if(!u||!p){ showMsg('请输入账号密码'); return; }
      const res = await fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p})}).then(r=>r.json());
      if(res.error) return showMsg(res.error);
      setToken(res.token); currentUserSpan.textContent = res.username; showApp(); renderRecords();
    });

    regBtn.addEventListener('click', async ()=>{
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      if(!u||!p){ showMsg('请输入账号密码用于注册'); return; }
      const res = await fetch('/api/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u,password:p})}).then(r=>r.json());
      if(res.error) return showMsg(res.error);
      setToken(res.token); currentUserSpan.textContent = res.username; showApp(); renderRecords();
    });

    logoutBtn.addEventListener('click', ()=>{ setToken(null); showLogin(); });

    sidebar.forEach(li=>li.addEventListener('click', ()=>{ currentType = li.dataset.type; renderSidebar(); renderRecords(); }));

    btnAdd.addEventListener('click', ()=>{ editingId=null; recDate.value = new Date().toISOString().slice(0,10); openModal(false); });
    btnCancel.addEventListener('click', ()=>closeModal());

    btnSave.addEventListener('click', async ()=>{
      const token = getToken(); if(!token) return showLogin();
      const d = recDate.value; const n = recName.value.trim(); const q = Number(recQty.value); const note = recNote.value.trim();
      if(!d||!n||!q){ alert('请填写 日期、名称、数量'); return; }
      if(editingId){
        const res = await authFetch(`/api/records/${editingId}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({date:d,name:n,qty:q,note})});
        if(res.error) return alert(res.error);
      } else {
        const res = await authFetch('/api/records', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({type:currentType,date:d,name:n,qty:q,note})});
        if(res.error) return alert(res.error);
      }
      closeModal(); renderRecords();
    });

    recordArea.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const act = btn.dataset.act; const id = btn.dataset.id;
      if(act==='del'){
        if(!confirm('确认删除该记录？')) return;
        const res = await authFetch(`/api/records/${id}`, {method:'DELETE'});
        if(res.error) return alert(res.error);
        renderRecords();
      } else if(act==='edit'){
        const rows = await authFetch(`/api/records?type=${encodeURIComponent(currentType)}`);
        const item = rows.find(r=>String(r.id)===String(id)); if(!item) return;
        editingId = id; recDate.value=item.date; recName.value=item.name; recQty.value=item.qty; recNote.value=item.note||''; openModal(true);
      }
    });

    filterDate.addEventListener('change', ()=>renderRecords());
    btnClearFilter.addEventListener('click', ()=>{ filterDate.value=''; renderRecords(); });

    // CSV 导出 via backend
    btnExport.addEventListener('click', ()=>{
      const date = filterDate.value ? `&date=${encodeURIComponent(filterDate.value)}` : '';
      window.location = `/api/export?type=${encodeURIComponent(currentType)}${date}`;
    });

    // CSV 导入: 读取文件并发送文本到 /api/import
    btnImport.addEventListener('click', ()=>importFile.click());
    importFile.addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = async function(ev){
        const text = ev.target.result;
        const res = await authFetch('/api/import', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({csv: text, type: currentType})});
        if(res.error) alert(res.error); else alert('已导入 '+(res.imported||0)+' 条记录');
        importFile.value=''; renderRecords();
      };
      reader.readAsText(f,'utf-8');
    });

    // 打印视图
    btnPrint.addEventListener('click', ()=>{
      document.querySelectorAll('.topbar, .controls, .btn-small, #btn-add, #btn-export, #btn-import, #btn-print').forEach(el=>el && el.classList.add('no-print'));
      setTimeout(()=>{ window.print(); setTimeout(()=>{ document.querySelectorAll('.no-print').forEach(el=>el.classList.remove('no-print')); }, 200); }, 100);
    });

    // boot
    (async function boot(){
      const token = getToken();
      if(token){
        // try to get records to validate token
        try{ await renderRecords(); currentUserSpan.textContent = '已登录'; showApp(); }catch(e){ setToken(null); showLogin(); }
      } else showLogin();
      renderSidebar();
    })();

  })();