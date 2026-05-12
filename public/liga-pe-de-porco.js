// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
var S = {
  teams: [],
  players: [],
  matches: [],  // [{home,away,homeGoals,awayGoals,played,round,group}]
  config: { format:'single', season:'2025' }
};

var LEAGUE_GROUP = 'Único';
var MAX_TEAMS = 5;
var COLORS = ['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13','c14','c15'];
var SUPABASE_TABLE = 'league_state';
var SUPABASE_ROW_ID = 'main';
var supabaseClient = null;
var saveTimer = null;
var ADMIN_TOKEN_STORAGE_KEY = 'liga-pe-admin-token';
var adminAccessChecked = false;
var adminAccessGranted = false;

function load(){
  var d=localStorage.getItem('ppliga');
  if(d){try{S=JSON.parse(d);}catch(e){}}
  normalizeLeague();
  initAdminAccess();
  connectSupabase();
}

function save(){
  normalizeLeague();
  localStorage.setItem('ppliga',JSON.stringify(S));
  queueRemoteSave();
}

function getSupabaseConfig(){
  var env = window.LIGA_PE_ENV || {};
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '',
    key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ''
  };
}

async function connectSupabase(){
  var cfg = getSupabaseConfig();
  if(!cfg.url || !cfg.key || !window.supabase || !window.supabase.createClient) return;
  try{
    supabaseClient = window.supabase.createClient(cfg.url, cfg.key);
    var res = await supabaseClient
      .from(SUPABASE_TABLE)
      .select('data')
      .eq('id', SUPABASE_ROW_ID)
      .maybeSingle();

    if(res.error) throw res.error;
    if(res.data && res.data.data){
      S = res.data.data;
      normalizeLeague();
      localStorage.setItem('ppliga',JSON.stringify(S));
      renderHome();
      renderAdmin();
      renderPage(getActivePageName());
    } else {
      queueRemoteSave();
    }
  } catch(err){
    console.error('Supabase sync failed:', err);
    showToast('⚠ Supabase indisponível. Usando dados locais.');
  }
}

function queueRemoteSave(){
  if(!adminAccessGranted) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveRemoteState, 350);
}

async function saveRemoteState(){
  if(!adminAccessGranted) return;
  try{
    var res = await fetch('/.netlify/functions/save-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': getAdminToken()
      },
      body: JSON.stringify({ data: S })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
  } catch(err){
    console.error('Supabase save failed:', err);
    showToast('⚠ Não foi possível salvar no Supabase.');
  }
}

function normalizeLeague(){
  S.config = S.config || {};
  S.config.format = 'single';
  S.config.season = S.config.season || '2025';
  S.teams = (S.teams || []).slice(0, MAX_TEAMS).map(function(t){
    t.group = LEAGUE_GROUP;
    t.logo = t.logo || '';
    return t;
  });
  S.players = S.players || [];
  S.matches = (S.matches || []).map(function(m){
    m.group = LEAGUE_GROUP;
    return m;
  });
}

// ══════════════════════════════════════════════
//  ADMIN ACCESS
// ══════════════════════════════════════════════
function getAdminTokenFromUrl(){
  var params = new URLSearchParams(window.location.search);
  var token = params.get('admin') || params.get('admin_token');
  if(!token) return '';
  params.delete('admin');
  params.delete('admin_token');
  var cleanUrl = window.location.pathname + (params.toString() ? '?'+params.toString() : '') + window.location.hash;
  window.history.replaceState({}, document.title, cleanUrl);
  return token;
}

function getAdminToken(){
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
}

function updateAdminVisibility(){
  document.body.classList.toggle('admin-unlocked', adminAccessGranted);
}

function isLocalDev(){
  return ['localhost','127.0.0.1',''].indexOf(window.location.hostname) >= 0;
}

async function initAdminAccess(){
  var tokenFromUrl = getAdminTokenFromUrl();
  if(tokenFromUrl) sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, tokenFromUrl);

  if(isLocalDev() && !getAdminToken()){
    adminAccessChecked = true;
    adminAccessGranted = true;
    updateAdminVisibility();
    return;
  }

  var token = getAdminToken();
  if(!token){
    adminAccessChecked = true;
    adminAccessGranted = false;
    updateAdminVisibility();
    return;
  }

  try{
    var res = await fetch('/.netlify/functions/admin-gate', {
      headers: { 'X-Admin-Token': token }
    });
    var data = await res.json().catch(function(){ return {}; });
    adminAccessChecked = true;
    adminAccessGranted = !!(res.ok && data.ok);
    if(!adminAccessGranted){
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      if(data.error) showToast('⚠ Acesso admin bloqueado: '+data.error);
    }
  } catch(err){
    adminAccessChecked = true;
    adminAccessGranted = false;
    console.error('Admin gate failed:', err);
  }
  updateAdminVisibility();
  renderPage(getActivePageName());
}

function requireAdminAccess(){
  if(adminAccessGranted) return true;
  showToast(adminAccessChecked ? '⚠ Acesso restrito a admins autorizados.' : '⚠ Validando acesso admin...');
  return false;
}

// ══════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════
function showPage(name, btn){
  if(name==='gerenciar' && !requireAdminAccess()){
    name = 'home';
    btn = document.querySelector('.nav-link');
  }
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('.nav-link').forEach(function(l){l.classList.remove('active')});
  var p = document.getElementById('page-'+name);
  if(p) p.classList.add('active');
  if(btn) btn.classList.add('active');
  renderPage(name);
}

function renderPage(name){
  if(name==='home') renderHome();
  else if(name==='classificacao') renderFullStandings();
  else if(name==='jogos') renderMatches();
  else if(name==='jogadores') renderPlayers('goals');
  else if(name==='gerenciar') renderAdmin();
}

function getActivePageName(){
  var active = document.querySelector('.page.active');
  return active ? active.id.replace('page-','') : 'home';
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function teamColor(teamName){
  var idx = S.teams.findIndex(function(t){return t.name===teamName});
  return COLORS[idx % COLORS.length] || 'c0';
}

function teamInitials(name){
  return name.split(' ').map(function(w){return w[0]||''}).join('').slice(0,2).toUpperCase();
}

function getTeam(name){
  return S.teams.find(function(t){return t.name===name});
}

function teamBadgeHTML(teamName, className, style){
  var team = getTeam(teamName);
  var cl = teamColor(teamName);
  var content = team && team.logo
    ? '<img src="'+team.logo+'" alt="'+escapeHTML(teamName)+'">'
    : escapeHTML(teamInitials(teamName));
  return '<div class="'+className+' '+cl+'"'+(style?' style="'+style+'"':'')+'>'+content+'</div>';
}

function escapeHTML(value){
  return String(value == null ? '' : value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function getStandings(group){
  var grpTeams = S.teams.filter(function(t){return (t.group || LEAGUE_GROUP)===group});
  var table = {};
  grpTeams.forEach(function(t){
    table[t.name]={name:t.name,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0,form:[]};
  });
  S.matches.filter(function(m){return m.group===group&&m.played}).forEach(function(m){
    if(!table[m.home]||!table[m.away]) return;
    var h=table[m.home],a=table[m.away];
    h.p++;a.p++;
    h.gf+=m.homeGoals;h.ga+=m.awayGoals;
    a.gf+=m.awayGoals;a.ga+=m.homeGoals;
    h.gd=h.gf-h.ga;a.gd=a.gf-a.ga;
    if(m.homeGoals>m.awayGoals){h.w++;h.pts+=3;h.form.push('W');a.l++;a.form.push('L');}
    else if(m.homeGoals<m.awayGoals){a.w++;a.pts+=3;a.form.push('W');h.l++;h.form.push('L');}
    else{h.d++;h.pts+=1;h.form.push('D');a.d++;a.pts+=1;a.form.push('D');}
  });
  return Object.values(table).sort(function(a,b){
    if(b.pts!==a.pts) return b.pts-a.pts;
    if(b.gd!==a.gd) return b.gd-a.gd;
    return b.gf-a.gf;
  });
}

function allGroups(){
  return S.teams.length ? [LEAGUE_GROUP] : [];
}

function getTopScorer(stat){
  return S.players.slice().sort(function(a,b){return (b[stat]||0)-(a[stat]||0)});
}

function totalGoals(){
  return S.matches.filter(function(m){return m.played}).reduce(function(acc,m){return acc+(m.homeGoals||0)+(m.awayGoals||0)},0);
}

function playedMatches(){
  return S.matches.filter(function(m){return m.played}).length;
}

function getLeagueChampion(){
  if(!S.matches.length || S.matches.some(function(m){return !m.played})) return null;
  var standings = getStandings(LEAGUE_GROUP);
  return standings[0] || null;
}

function formDots(form){
  return form.slice(-5).map(function(f){
    return '<span class="form-dot '+(f==='W'?'fw':f==='D'?'fd':'fl')+'">'+(f==='W'?'V':f==='D'?'E':'D')+'</span>';
  }).join('');
}

function posClass(pos){
  if(pos===1) return 'pos-1';
  if(pos===2) return 'pos-2';
  if(pos===3) return 'pos-3';
  return 'pos-mid';
}

// ══════════════════════════════════════════════
//  HOME
// ══════════════════════════════════════════════
function renderHome(){
  document.getElementById('heroTeams').textContent = S.teams.length || '—';
  document.getElementById('heroGames').textContent = playedMatches() || (S.matches.length ? S.matches.length : '—');
  document.getElementById('heroGoals').textContent = totalGoals() || '—';
  var champion = getLeagueChampion();
  document.getElementById('heroSub').textContent = champion
    ? 'Campeão: '+champion.name+' • '+champion.pts+' pts • Pontos corridos'
    : S.teams.length
    ? 'Temporada '+S.config.season+' • Fase de liga • '+S.teams.length+'/'+MAX_TEAMS+' times'
    : 'Configure a liga na aba Gerenciar para começar';

  // Standings mini
  var tbody = document.getElementById('homeStandingsTbody');
  tbody.innerHTML = '';
  allGroups().forEach(function(g){
    var rows = getStandings(g);
    if(rows.length===0) return;
    tbody.innerHTML += '<tr><td colspan="6" style="padding:6px 10px;font-size:10px;font-weight:800;letter-spacing:2px;color:var(--gold);background:rgba(212,160,23,.05);text-transform:uppercase">Fase de Liga</td></tr>';
    rows.forEach(function(row,idx){
      var pc = posClass(idx+1);
      tbody.innerHTML += '<tr><td><span class="pos-num '+pc+'">'+(idx+1)+'</span></td>'
        +'<td><div class="team-cell">'+teamBadgeHTML(row.name,'team-badge')+'<span>'+escapeHTML(row.name)+'</span></div></td>'
        +'<td>'+row.p+'</td>'
        +'<td class="pts-bold">'+row.pts+'</td>'
        +'<td class="'+(row.gd>0?'sg-pos':row.gd<0?'sg-neg':'')+'">'+((row.gd>0?'+':'')+row.gd)+'</td>'
        +'<td><div class="form-wrap">'+formDots(row.form)+'</div></td></tr>';
    });
  });
  if(!tbody.innerHTML) tbody.innerHTML='<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--muted);font-size:13px">Nenhum time cadastrado</td></tr>';

  // Stats cards
  var sc = getTopScorer('goals');
  var sa = getTopScorer('assists');
  var sy = getTopScorer('yellowCards');

  function fillCard(nameId,teamId,valId,othersId,sorted,statKey,label){
    document.getElementById(nameId).textContent = sorted[0] ? sorted[0].name : '—';
    document.getElementById(teamId).textContent = sorted[0] ? (sorted[0].team||'—') : '—';
    document.getElementById(valId).textContent = sorted[0] ? (sorted[0][statKey]||0) : 0;
    var oth='';
    for(var i=1;i<Math.min(3,sorted.length);i++){
      oth+='<div class="stat-other-row"><span class="stat-other-name">'+escapeHTML(sorted[i].name)+'</span><span class="stat-other-val">'+(sorted[i][statKey]||0)+' '+label+'</span></div>';
    }
    document.getElementById(othersId).innerHTML=oth;
  }
  fillCard('sc1name','sc1team','sc1val','sc1others',sc,'goals','gols');
  fillCard('sc2name','sc2team','sc2val','sc2others',sa,'assists','ast.');
  fillCard('sc3name','sc3team','sc3val','sc3others',sy,'yellowCards','🟨');

  // MVP (top scorer)
  var mvp = sc[0];
  if(mvp && mvp.goals>0){
    document.getElementById('mvpSection').style.display='flex';
    document.getElementById('mvpName').textContent=mvp.name;
    document.getElementById('mvpTeam').textContent=mvp.team||'—';
    document.getElementById('mvpGoals').textContent=mvp.goals||0;
    document.getElementById('mvpAssists').textContent=mvp.assists||0;
    document.getElementById('mvpRating').textContent='';
    document.getElementById('mvpAvatar').textContent=teamInitials(mvp.name);
  } else {
    document.getElementById('mvpSection').style.display='none';
  }

  updateTicker();
}

// ══════════════════════════════════════════════
//  TICKER
// ══════════════════════════════════════════════
function updateTicker(){
  var played = S.matches.filter(function(m){return m.played});
  if(!played.length){ document.getElementById('tickerTrack').innerHTML='<span class="ticker-item">Aguardando resultados...</span>'; return; }
  var items = played.slice(-10).map(function(m){
    return '<span class="ticker-item"><strong>'+escapeHTML(m.home)+'</strong> <span class="ticker-score">'+m.homeGoals+' × '+m.awayGoals+'</span> <strong>'+escapeHTML(m.away)+'</strong></span>'
      +'<span class="ticker-dot"></span>';
  });
  var str = items.join('') + items.join('');
  document.getElementById('tickerTrack').innerHTML = str;
}

// ══════════════════════════════════════════════
//  FULL STANDINGS
// ══════════════════════════════════════════════
function renderFullStandings(){
  var html='';
  allGroups().forEach(function(g){
    var rows = getStandings(g);
    var champion = getLeagueChampion();
    html+='<div style="margin-bottom:28px"><div class="sec-head"><div class="sec-title">Fase de Liga — Pontos Corridos</div></div>';
    if(champion){
      html+='<div class="champion-card" style="margin-bottom:18px;max-width:260px"><div class="champion-trophy">🏆</div><div class="champion-label">Campeão</div><div class="champion-name">'+escapeHTML(champion.name)+'</div></div>';
    }
    html+='<table class="classif-table"><thead><tr>';
    html+='<th>#</th><th style="text-align:left">Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Pts</th><th>Forma</th>';
    html+='</tr></thead><tbody>';
    rows.forEach(function(row,idx){
      var pc = posClass(idx+1);
      html+='<tr>'
        +'<td><span class="pos-num '+pc+'">'+(idx+1)+'</span></td>'
        +'<td><div class="team-cell">'+teamBadgeHTML(row.name,'team-badge')+'<span style="font-size:14px;font-weight:600">'+escapeHTML(row.name)+'</span></div></td>'
        +'<td>'+row.p+'</td><td>'+row.w+'</td><td>'+row.d+'</td><td>'+row.l+'</td>'
        +'<td>'+row.gf+'</td><td>'+row.ga+'</td>'
        +'<td class="'+(row.gd>0?'sg-pos':row.gd<0?'sg-neg':'')+'">'+((row.gd>0?'+':'')+row.gd)+'</td>'
        +'<td class="pts-bold">'+row.pts+'</td>'
        +'<td><div class="form-wrap">'+formDots(row.form)+'</div></td>'
        +'</tr>';
    });
    if(!rows.length) html+='<tr><td colspan="11" style="padding:16px;text-align:center;color:var(--muted)">Nenhum time cadastrado</td></tr>';
    html+='</tbody></table></div>';
  });
  if(!html) html='<div style="text-align:center;padding:48px;color:var(--muted)">Nenhum time cadastrado</div>';
  document.getElementById('fullStandingsContainer').innerHTML=html;
}

// ══════════════════════════════════════════════
//  MATCHES
// ══════════════════════════════════════════════
var currentRound = 1;

function renderMatches(){
  var allRounds = [];
  S.matches.forEach(function(m){if(allRounds.indexOf(m.round)<0) allRounds.push(m.round);});
  allRounds.sort(function(a,b){return a-b});

  var nav = document.getElementById('roundsNav');
  nav.innerHTML = '';
  allRounds.forEach(function(r){
    var btn = document.createElement('button');
    btn.className='round-btn'+(r===currentRound?' active':'');
    btn.textContent='Rodada '+r;
    btn.onclick=(function(rr){return function(){currentRound=rr;renderMatches();}})(r);
    nav.appendChild(btn);
  });
  if(!allRounds.length){ nav.innerHTML='<span style="color:var(--muted);font-size:13px">Gere os confrontos no painel Gerenciar</span>'; }

  var container = document.getElementById('matchesContainer');
  container.innerHTML='';
  var roundMatches = S.matches.filter(function(m){return m.round===currentRound});

  if(!roundMatches.length){
    container.innerHTML='<div style="text-align:center;padding:48px;color:var(--muted)">Nenhum jogo para essa rodada</div>';
    return;
  }

  container.innerHTML+='<div style="font-size:11px;font-weight:800;letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin:16px 0 8px;padding-left:4px;border-left:3px solid var(--gold);padding-left:10px">Fase de Liga</div>';
  roundMatches.forEach(function(m,mi){
      var idx = S.matches.indexOf(m);
      var hWinner = m.played && m.homeGoals > m.awayGoals;
      var aWinner = m.played && m.awayGoals > m.homeGoals;

      var div = document.createElement('div');
      div.className='match-item';
      var centerHtml = '';
      if(m.played){
        centerHtml = '<div class="match-status">Encerrado</div>'
          +'<div class="match-score-display"><span class="score-num '+(hWinner?'sg-pos':m.played&&!hWinner&&!aWinner?'':'')+'"  >'+m.homeGoals+'</span><span class="score-sep">×</span><span class="score-num">'+m.awayGoals+'</span></div>'
          +(adminAccessGranted ? '<button class="btn-edit" onclick="editMatchResult('+idx+')">✎ Editar</button>' : '');
      } else if(adminAccessGranted){
        centerHtml = '<div class="match-status">Aguardando</div>'
          +'<div class="score-inputs"><input class="score-inp" id="hi'+idx+'" type="number" min="0" max="99" placeholder="0"><span class="score-sep">×</span><input class="score-inp" id="ai'+idx+'" type="number" min="0" max="99" placeholder="0"></div>'
          +'<button class="btn-save" onclick="saveMatchResult('+idx+')">✔ Salvar</button>';
      } else {
        centerHtml = '<div class="match-status">Aguardando</div><div class="match-score-display"><span class="score-num">-</span><span class="score-sep">×</span><span class="score-num">-</span></div>';
      }
      div.innerHTML=
        '<div class="match-team-side home'+(hWinner?' winner-side':m.played?' loser-side':'')+'">'+teamBadgeHTML(m.home,'match-team-badge')+'<span class="match-team-name" style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700">'+escapeHTML(m.home)+'</span></div>'
        +'<div class="match-center">'
        +centerHtml
        +'</div>'
        +'<div class="match-team-side away'+(aWinner?' winner-side':m.played?' loser-side':'')+'"><span class="match-team-name" style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700">'+escapeHTML(m.away)+'</span>'+teamBadgeHTML(m.away,'match-team-badge')+'</div>';
      container.appendChild(div);
  });
}

function saveMatchResult(idx){
  if(!requireAdminAccess()) return;
  var h=document.getElementById('hi'+idx), a=document.getElementById('ai'+idx);
  if(!h||!a||h.value===''||a.value===''){showToast('⚠ Insira os dois placares!');return;}
  var homeGoals=parseInt(h.value);
  var awayGoals=parseInt(a.value);
  if(homeGoals<0||awayGoals<0){showToast('⚠ Placar não pode ser negativo!');return;}
  S.matches[idx].homeGoals=homeGoals||0;
  S.matches[idx].awayGoals=awayGoals||0;
  S.matches[idx].played=true;
  save(); showToast('✔ Resultado salvo!');
  renderMatches(); updateTicker();
}

function editMatchResult(idx){
  if(!requireAdminAccess()) return;
  S.matches[idx].played=false;
  save(); renderMatches();
}

// ══════════════════════════════════════════════
//  PLAYERS
// ══════════════════════════════════════════════
var currentSort='goals';
function sortPlayers(stat, btn){
  currentSort=stat;
  document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('.players-table th').forEach(function(th){th.classList.remove('sorted')});
  if(btn){ btn.classList.add('active'); }
  renderPlayers(stat);
}

function renderPlayers(stat){
  stat=stat||currentSort||'goals';
  var sorted = S.players.slice().sort(function(a,b){return (b[stat]||0)-(a[stat]||0);});
  var tbody=document.getElementById('playersTableBody');
  tbody.innerHTML='';
  if(!sorted.length){
    tbody.innerHTML='<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--muted)">Nenhum jogador cadastrado</td></tr>';
    return;
  }
  sorted.forEach(function(p,i){
    var cl=teamColor(p.team||'');
    tbody.innerHTML+='<tr>'
      +'<td style="color:var(--muted);font-family:\'Barlow Condensed\',sans-serif;font-size:15px;font-weight:700">'+(i+1)+'</td>'
      +'<td><div class="player-row-name"><div class="team-badge '+cl+'" style="width:28px;height:28px;font-size:11px">'+escapeHTML(teamInitials(p.name))+'</div><div><span>'+escapeHTML(p.name)+'</span><br><span class="player-pos-badge">'+escapeHTML(p.pos)+'</span></div></div></td>'
      +'<td style="font-size:12px;color:var(--muted)">'+escapeHTML(p.team)+'</td>'
      +'<td style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;font-weight:900;color:'+(stat==='goals'?'var(--gold)':'#fff')+'">'+((p.goals||0))+'</td>'
      +'<td style="font-family:\'Barlow Condensed\',sans-serif;font-size:16px;font-weight:700;color:'+(stat==='assists'?'var(--gold)':'#fff')+'">'+((p.assists||0))+'</td>'
      +'<td>'+((p.yellowCards||0)?'<span style="background:#eab30830;color:#eab308;padding:2px 6px;font-size:11px;font-weight:800">'+p.yellowCards+'</span>':'<span style="color:var(--muted)">0</span>')+'</td>'
      +'<td>'+((p.redCards||0)?'<span style="background:#ef444430;color:#ef4444;padding:2px 6px;font-size:11px;font-weight:800">'+p.redCards+'</span>':'<span style="color:var(--muted)">0</span>')+'</td>'
      +'<td>'+(adminAccessGranted ? '<button class="btn-edit" onclick="openPlayerModal(\''+p.id+'\')">Editar</button>' : '<span style="color:var(--muted)">—</span>')+'</td>'
      +'</tr>';
  });
}

function openPlayerModal(id){
  if(!requireAdminAccess()) return;
  var p=S.players.find(function(x){return x.id===id});
  if(!p) return;
  document.getElementById('editPlayerId').value=id;
  document.getElementById('editGoals').value=p.goals||0;
  document.getElementById('editAssists').value=p.assists||0;
  document.getElementById('editYellow').value=p.yellowCards||0;
  document.getElementById('editRed').value=p.redCards||0;
  document.getElementById('playerModal').classList.add('open');
}

function savePlayerStats(){
  if(!requireAdminAccess()) return;
  var id=document.getElementById('editPlayerId').value;
  var p=S.players.find(function(x){return x.id===id});
  if(!p) return;
  var goals=parseInt(document.getElementById('editGoals').value)||0;
  var assists=parseInt(document.getElementById('editAssists').value)||0;
  var yellow=parseInt(document.getElementById('editYellow').value)||0;
  var red=parseInt(document.getElementById('editRed').value)||0;
  if(goals<0||assists<0||yellow<0||red<0){showToast('⚠ Estatísticas não podem ser negativas!');return;}
  p.goals=goals;
  p.assists=assists;
  p.yellowCards=yellow;
  p.redCards=red;
  save(); closeModal('playerModal');
  renderPlayers(currentSort); showToast('✔ Estatísticas atualizadas!');
}

function closeModal(id){ document.getElementById(id).classList.remove('open'); }

// ══════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════
function renderAdmin(){
  if(!adminAccessGranted){
    return;
  }
  normalizeLeague();
  document.getElementById('cfgSeason').value=S.config.season||'2025';

  // team select for player
  var sel=document.getElementById('newPlayerTeam');
  sel.innerHTML='<option value="">Selecione...</option>';
  S.teams.forEach(function(t){
    sel.innerHTML+='<option value="'+escapeHTML(t.name)+'">'+escapeHTML(t.name)+'</option>';
  });

  // team list
  var tl=document.getElementById('teamListAdmin');
  tl.innerHTML='';
  if(!S.teams.length){ tl.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px">Nenhum time ainda</div>'; return; }
  S.teams.forEach(function(t,i){
    tl.innerHTML+='<div class="team-list-item">'
      +teamBadgeHTML(t.name,'team-badge','width:28px;height:28px;font-size:11px')
      +'<span class="tli-name">'+escapeHTML(t.name)+'</span>'
      +'<span class="tli-group">Grupo único</span>'
      +'<button class="btn-danger" onclick="removeTeam('+i+')">✕</button>'
      +'</div>';
  });
}

function applyConfig(){
  if(!requireAdminAccess()) return;
  S.config.format='single';
  S.config.season=document.getElementById('cfgSeason').value||'2025';
  save(); showToast('✔ Configuração aplicada!'); renderAdmin();
}

function readLogoFile(file, done){
  if(!file){done('');return;}
  if(!file.type || file.type.indexOf('image/')!==0){
    showToast('⚠ Escolha um arquivo de imagem para a logo.');
    done(null);
    return;
  }
  var reader = new FileReader();
  reader.onload = function(){
    var img = new Image();
    img.onload = function(){
      var maxSize = 512;
      var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      done(canvas.toDataURL('image/png'));
    };
    img.onerror = function(){ showToast('⚠ Não foi possível carregar a logo.'); done(null); };
    img.src = reader.result;
  };
  reader.onerror = function(){ showToast('⚠ Não foi possível carregar a logo.'); done(null); };
  reader.readAsDataURL(file);
}

function parseTeamPlayers(raw, team){
  var validPositions=['ATA','MEI','ZAG','LAT','GOL'];
  return raw.split(/\n+/).map(function(line){
    var clean=line.trim();
    if(!clean) return null;
    var parts=clean.split(/\s*[-;|,]\s*/);
    var name=(parts[0]||'').trim();
    var pos=(parts[1]||'ATA').trim().toUpperCase();
    if(validPositions.indexOf(pos)<0) pos='ATA';
    if(!name) return null;
    if(S.players.find(function(p){return p.name.toLowerCase()===name.toLowerCase()&&p.team===team})) return null;
    return {id:'p'+Date.now()+Math.random().toString(16).slice(2),name:name,team:team,pos:pos,goals:0,assists:0,yellowCards:0,redCards:0};
  }).filter(Boolean);
}

function addTeam(){
  if(!requireAdminAccess()) return;
  var name=document.getElementById('newTeamName').value.trim();
  if(!name){showToast('⚠ Digite o nome do time!');return;}
  if(S.teams.length>=MAX_TEAMS){showToast('⚠ A liga permite exatamente 5 times.');return;}
  if(S.teams.find(function(t){return t.name===name})){showToast('⚠ Time já existe!');return;}
  var logoInput=document.getElementById('newTeamLogo');
  var playersInput=document.getElementById('newTeamPlayers');
  readLogoFile(logoInput.files[0], function(logo){
    if(logo===null) return;
    var newPlayers=parseTeamPlayers(playersInput.value||'', name);
    S.teams.push({name:name,group:LEAGUE_GROUP,logo:logo,id:'t'+Date.now()});
    S.players=S.players.concat(newPlayers);
    document.getElementById('newTeamName').value='';
    logoInput.value='';
    playersInput.value='';
    save(); renderAdmin(); showToast('✔ '+name+' adicionado com '+newPlayers.length+' jogadores!');
  });
}

function removeTeam(i){
  if(!requireAdminAccess()) return;
  var name=S.teams[i].name;
  S.teams.splice(i,1);
  S.players=S.players.filter(function(p){return p.team!==name});
  S.matches=S.matches.filter(function(m){return m.home!==name&&m.away!==name});
  save(); renderAdmin(); showToast('Time removido.');
}

function addPlayer(){
  if(!requireAdminAccess()) return;
  var name=document.getElementById('newPlayerName').value.trim();
  var team=document.getElementById('newPlayerTeam').value;
  var pos=document.getElementById('newPlayerPos').value;
  if(!name){showToast('⚠ Digite o nome!');return;}
  if(!team){showToast('⚠ Selecione o time!');return;}
  if(S.players.find(function(p){return p.name.toLowerCase()===name.toLowerCase()&&p.team===team})){
    showToast('⚠ Jogador já existe nesse time!');
    return;
  }
  S.players.push({id:'p'+Date.now(),name:name,team:team,pos:pos,goals:0,assists:0,yellowCards:0,redCards:0});
  document.getElementById('newPlayerName').value='';
  save(); showToast('✔ '+name+' adicionado!');
}

function generateMatches(){
  if(!requireAdminAccess()) return;
  if(!S.teams.length){showToast('⚠ Cadastre os times primeiro!');return;}
  if(S.teams.length!==MAX_TEAMS){showToast('⚠ Cadastre exatamente 5 times para gerar a liga.');return;}
  if(S.matches.length&&!confirm('Gerar novos confrontos apaga os resultados atuais. Continuar?')) return;
  S.matches=[];
  var gTeams=S.teams.map(function(t){return t.name});
  var list=gTeams.slice();
  list.push('BYE');
  var numRounds=list.length-1;
  var fixed=list[0];
  var rotating=list.slice(1);

  for(var r=0;r<numRounds;r++){
    var current=[fixed].concat(rotating);
    for(var i=0;i<current.length/2;i++){
      var home=current[i],away=current[current.length-1-i];
      if(home!=='BYE'&&away!=='BYE'){
        S.matches.push({home:home,away:away,homeGoals:null,awayGoals:null,played:false,round:r+1,group:LEAGUE_GROUP});
      }
    }
    rotating=[rotating[rotating.length-1]].concat(rotating.slice(0,rotating.length-1));
  }

  currentRound=1;
  save(); showToast('✔ '+S.matches.length+' jogos gerados!');
  renderAdmin();
}

function resetLeague(){
  if(!requireAdminAccess()) return;
  if(!confirm('Tem certeza? Isso apaga TUDO.')) return;
  S={teams:[],players:[],matches:[],config:{format:'single',season:'2025'}};
  save(); renderAdmin(); showToast('Liga resetada.');
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
var toastTimer;
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('show');},2500);
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
load();
renderHome();
renderAdmin();
