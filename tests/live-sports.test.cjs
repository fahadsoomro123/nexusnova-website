const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('sports-live.html','utf8');
const js=fs.readFileSync('assets/js/live-sports.js','utf8');
const sitemap=fs.readFileSync('sitemap-live.xml','utf8');

test('sports page exposes four supported sports with cricket first',()=>{
  assert.match(html,/data-sport="cricket"/);
  assert.match(html,/data-sport="football"/);
  assert.match(html,/data-sport="basketball"/);
  assert.match(html,/data-sport="tennis"/);
  assert.ok(html.indexOf('data-sport="cricket"')<html.indexOf('data-sport="football"'));
});

test('sports client uses documented SportScore endpoint and no secret',()=>{
  assert.match(js,/https:\/\/sportscore\.com\/api\/widget\/matches\//);
  assert.match(js,/limit','50'/);
  assert.doesNotMatch(js,/api[_-]?key|authorization|bearer/i);
});

test('live label is status-driven and fail-closed',()=>{
  assert.match(js,/const isLive=/);
  assert.match(js,/Finished|finished/);
  assert.match(js,/will not invent replacement scores/);
});

test('Pakistan cricket relevance is explicitly prioritised',()=>{
  assert.match(js,/pakistan super league/);
  assert.match(js,/karachi/);
  assert.match(js,/lahore/);
  assert.match(js,/sport==='cricket'/);
});

test('SportScore attribution stays visible and dofollow',()=>{
  const links=[...html.matchAll(/<a href="https:\/\/sportscore\.com\/" rel="dofollow">SportScore<\/a>/g)];
  assert.ok(links.length>=2);
  assert.match(html,/Powered by/);
});

test('sports page is discoverable in live sitemap',()=>{
  assert.match(sitemap,/https:\/\/nexusnovatools\.com\/sports-live\.html/);
});
