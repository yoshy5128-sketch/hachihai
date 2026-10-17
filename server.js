import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { isWin, waitsFor, roles, winGroups, tiles, shuffle } from './shared.js';
const dir=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const ALLOW_ORIGINS=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
const rooms=new Map();
const MAX_ROOM=100;
const app=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
 const files={'/':'multiplayer.html','/multiplayer.html':'multiplayer.html','/shared.js':'shared.js','/manifest.webmanifest':'manifest.webmanifest','/index.html':'index.html','/sw.js':'sw.js','/icons/icon-192.png':'icons/icon-192.png','/icons/icon-512.png':'icons/icon-512.png'};
 const file=files[pathname]; if(!file){res.writeHead(404);res.end('Not found');return;}
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'};
 fs.readFile(path.join(dir,file),(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});res.end(data);});
});
const wss=new WebSocketServer({server:app,maxPayload:4096,verifyClient({origin,req}){if(!ALLOW_ORIGINS.length)return true;return !origin||ALLOW_ORIGINS.includes(origin);}});
const send=(ws,msg)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));};
const id=()=>crypto.randomBytes(24).toString('hex');
const code=()=>{let c;do{c=(crypto.randomInt(100000,1000000)).toString();}while(rooms.has(c));return c;};
const say=(room,msg)=>room.players.forEach(p=>send(p.ws,{type:'notice',message:msg}));
const furitenFor=(room,i)=>{if(room.stage!=='playing'||room.hands?.[i]?.length!==7)return false;const waits=waitsFor(room.hands[i]);return waits.length>0&&waits.some(t=>room.rivers[i].includes(t));};
const broadcast=(room)=>room.players.forEach((p,i)=>{send(p.ws,{type:'state',room:room.code,seat:i,stage:room.stage,round:room.round,points:room.points,hand:room.hands?.[i]||[],opponentCount:room.hands?.[1-i]?.length||0,rivers:room.rivers||[[],[]],riichi:room.riichi||[false,false],riichiMarks:room.riichiMarks||[null,null],deckRemaining:room.deck?.length||0,turn:room.turn,phase:room.phase,drawn:room.drawn,discard:room.discard||null,finish:room.finish||null,waiting:room.players.length<2,furiten:furitenFor(room,i),names:room.players.map(x=>x.name)});});
function newRound(room){room.stage='playing';room.deck=shuffle(tiles());room.hands=[[],[]];room.rivers=[[],[]];room.riichi=[false,false];room.double=[false,false];room.ippatsu=[false,false];room.riichiMarks=[null,null];room.riichiTurns=[null,null];room.lastDraw=[null,null];room.discard=null;room.finish=null;for(let i=0;i<7;i++)for(let p=0;p<2;p++)room.hands[p].push(room.deck.pop());room.hands.forEach(h=>h.sort());room.turn=(room.round-1)%2;room.phase='draw';room.drawn=false;broadcast(room);}
function endRound(room,winner,kind,winTile){const full=room.hands[winner].slice();if(kind==='ロン')full.push(winTile);const bonuses=roles(full,kind,winTile);const base=kind==='ロン'?3:2;const riichi=room.riichi[winner]?2:0;const ippatsu=riichi&&room.ippatsu[winner]?1:0;const double=riichi&&room.double[winner]?1:0;const opponentRiichiBonus=room.riichi[1-winner]?1:0;const earned=base+bonuses.reduce((a,b)=>a+b.pt,0)+riichi+ippatsu+double+opponentRiichiBonus;room.points[winner]+=earned;room.stage='ended';room.phase='ended';room.finish={winner,kind,hand:full,groups:winGroups(full),winTile,base,bonuses,riichi,ippatsu,double,opponentRiichiBonus,earned,matchOver:room.points[winner]>=20};broadcast(room);}
function drawRound(room){room.stage='ended';room.phase='ended';room.finish={winner:null,kind:'流局',hand:[],bonuses:[],earned:0,matchOver:false};broadcast(room);}
function tryRon(room,discarder,t){const p=1-discarder;if(!isWin([...room.hands[p],t]))return false;const waits=waitsFor(room.hands[p]);if(waits.some(x=>room.rivers[p].includes(x)))return false;room.turn=p;room.phase='ron';room.discard={tile:t,by:discarder};broadcast(room);return true;}
function advance(room,discarder,t){if(tryRon(room,discarder,t))return;room.discard={tile:t,by:discarder};if(room.deck.length===0){drawRound(room);return;}room.turn=1-discarder;room.phase='draw';room.drawn=false;broadcast(room);}
function act(room,seat,msg){if(room.stage!=='playing')return '対局中ではありません';const hand=room.hands[seat];if(msg.action==='draw'){
 if(room.turn!==seat||room.phase!=='draw')return '今は引けません';if(!room.deck.length){drawRound(room);return;}
 const t=room.deck.pop();hand.push(t);room.lastDraw[seat]=t;room.drawn=true;room.phase='discard';if(isWin(hand)){endRound(room,seat,'ツモ',t);return;}broadcast(room);return;
 }
 if(msg.action==='riichi'){
 if(room.turn!==seat||room.riichi[seat])return '今はリーチできません';
 if(room.phase==='draw'){
  if(!waitsFor(hand).length)return 'テンパイしていません';room.riichi[seat]=true;room.double[seat]=room.rivers[seat].length===0;room.ippatsu[seat]=true;room.points[seat]--;broadcast(room);return;
 }
 if(room.phase!=='discard'||!Number.isInteger(msg.index)||msg.index<0||msg.index>=hand.length)return '捨てる牌を選んでください';
 const rest=hand.filter((_,i)=>i!==msg.index);if(!waitsFor(rest).length)return 'この牌ではテンパイしません';
 room.riichi[seat]=true;room.double[seat]=room.rivers[seat].length===0;room.ippatsu[seat]=true;room.points[seat]--;
 return discard(room,seat,msg.index,true);
 }
 if(msg.action==='discard')return discard(room,seat,msg.index);
 if(msg.action==='ron'){
 if(room.phase!=='ron'||room.turn!==seat||!room.discard)return 'ロンできません';endRound(room,seat,'ロン',room.discard.tile);return;
 }
 if(msg.action==='pass'){
 if(room.phase!=='ron'||room.turn!==seat)return '見送りできません';const d=room.discard;room.discard=null;room.ippatsu[seat]=false;if(room.deck.length===0){drawRound(room);return;}room.turn=seat;room.phase='draw';room.drawn=false;broadcast(room);return;
 }
 return '不明な操作です';
}
function discard(room,seat,index,declaring=false){const hand=room.hands[seat];if(room.turn!==seat||room.phase!=='discard'||!Number.isInteger(index)||index<0||index>=hand.length)return '捨てられません';if(room.riichi[seat]&&!declaring&&index!==hand.length-1)return 'リーチ後はツモ切りのみ';const t=hand.splice(index,1)[0];room.rivers[seat].push(t);if(room.riichi[seat]&&room.riichiMarks[seat]===null)room.riichiMarks[seat]=room.rivers[seat].length-1;
 if(room.riichi[seat]&&room.riichiMarks[seat]!==room.rivers[seat].length-1)room.ippatsu[seat]=false;
 hand.sort();room.drawn=false;room.lastDraw[seat]=null;advance(room,seat,t);
}
function join(ws,room,name,token){if(room.players.length>=2)return send(ws,{type:'error',message:'満室です'});const seat=room.players.length;const p={ws,name:String(name||`プレイヤー${seat+1}`).slice(0,16),token:token||id()};room.players.push(p);ws.room=room.code;ws.seat=seat;send(ws,{type:'joined',room:room.code,seat,token:p.token});if(room.players.length===2)newRound(room);else broadcast(room);}
wss.on('connection',(ws)=>{ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw)}catch{return;}if(!msg||typeof msg!=='object')return;
 if(msg.type==='create'){if(ws.room)return; if(rooms.size>=MAX_ROOM)return send(ws,{type:'error',message:'部屋数の上限です'});const c=code();const room={code:c,players:[],stage:'waiting',round:1,points:[0,0],created:Date.now(),turn:0,phase:'waiting'};rooms.set(c,room);join(ws,room,msg.name);return;}
 if(msg.type==='join'){if(ws.room)return;const room=rooms.get(String(msg.room||''));if(!room)return send(ws,{type:'error',message:'部屋が見つかりません'});if(room.stage!=='waiting')return send(ws,{type:'error',message:'対局中の部屋です'});join(ws,room,msg.name);return;}
 if(!ws.room)return send(ws,{type:'error',message:'部屋へ参加してください'});const room=rooms.get(ws.room);if(!room||room.players[ws.seat]?.ws!==ws)return;
 if(msg.type==='action'){const err=act(room,ws.seat,msg);if(err)send(ws,{type:'error',message:err});}
 if(msg.type==='next'){if(room.stage!=='ended'||room.finish?.matchOver)return;room.ready??=[false,false];room.ready[ws.seat]=true;send(ws,{type:'notice',message:'相手を待っています'});if(room.ready.every(Boolean)){room.ready=[false,false];room.round++;newRound(room);}}
 if(msg.type==='rematch'){if(room.stage!=='ended'||!room.finish?.matchOver)return;room.ready??=[false,false];room.ready[ws.seat]=true;if(room.ready.every(Boolean)){room.ready=[false,false];room.points=[0,0];room.round=1;newRound(room);}}
 });ws.on('close',()=>{const room=rooms.get(ws.room);if(room){rooms.delete(room.code);room.players.forEach(p=>{if(p.ws!==ws){send(p.ws,{type:'error',message:'相手が退出したため部屋を終了しました'});p.ws.room=null;p.ws.seat=null;}});}});});
setInterval(()=>{for(const [c,r] of rooms)if(r.stage==='waiting'&&Date.now()-r.created>3600000){r.players.forEach(p=>send(p.ws,{type:'error',message:'部屋の有効期限が切れました'}));rooms.delete(c);}},60000).unref();
app.listen(PORT,process.env.HOST||'0.0.0.0',()=>console.log(`HACHIHAI server :${PORT}`));
