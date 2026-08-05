const R = '/home/claude/credit-planner';
const { evaluate, mergeModules, validateRuleset, tagTable } = await import(`${R}/engine/index.js`);
const tplMajor = (await import(`${R}/rulesets/_TEMPLATE.major.js`)).default;
const tplMinor = (await import(`${R}/rulesets/_TEMPLATE.minor.js`)).default;
const dongji = (await import(`${R}/rulesets/major.dongji-114.js`)).default;

let pass = true;
const ck = (l,c,x='') => { console.log(`  ${c?'✓':'✗'} ${l}${x?' — '+x:''}`); if(!c) pass=false; };

console.log('【主修範本】');
const m = mergeModules([tplMajor]);
const issues = validateRuleset(m);
ck('健檢沒有 error', issues.filter(i=>i.level==='error').length===0,
   issues.map(i=>i.level+':'+i.message).join(' | ') || '無');
ck('健檢沒有 warn（學分加總正確）', issues.length===0, issues.map(i=>i.message).join(' | ') || '無');
ck('畢業總學分 128', m.totalCredits===128);
ck('7 個標籤都有歸屬', tagTable({}, m).every(t=>t.bucketId), tagTable({},m).filter(t=>!t.bucketId).map(t=>t.label).join(',')||'全部有');

let n=0; const c=(name,credit,tag)=>({id:'c'+ ++n,name,credit,tag,semester:'y1s1'});
let r = evaluate({ courses:[c('大學中文',2,'tag.chinese'), c('微積分一',3,'tag.dept')] }, m);
ck('學分進到正確大類',
  r.credit.categories.find(x=>x.id==='cat.school').earned===2 &&
  r.credit.categories.find(x=>x.id==='cat.dept').earned===3);
ck('科目判定有打勾',
  r.subject.groups.find(g=>g.id==='grp.dept').items.find(i=>i.name==='微積分一').checked===true);

console.log('\n【範本裡的 when 條件（分組）】');
ck('沒選組別時甲乙組都不出現',
  evaluate({courses:[]}, m).subject.groups.filter(g=>g.id.startsWith('grp.group')).length===0);
ck('選甲組只出現甲組',
  evaluate({options:{group:'a'},courses:[]}, m).subject.groups.filter(g=>g.id.startsWith('grp.group'))
    .map(g=>g.id).join()==='grp.group-a');
const bGroups = evaluate({options:{group:'b'},courses:[]}, m).subject.groups.find(g=>g.id==='grp.group-b');
ck('乙組是巢狀群組', bGroups.groups.length===2);

console.log('\n【課名別稱比對】');
n=0;
r = evaluate({ courses:[c('程式設計(一)',3,'tag.dept')] }, m);
ck('aliases 可以比對到',
  r.subject.groups.find(g=>g.id==='grp.dept').items.find(i=>i.name==='程式設計一').checked===true);

console.log('\n【額外身分範本，疊加到動機系上】');
const both = mergeModules([dongji, tplMinor]);
ck('畢業學分 129 + 20 = 149', both.totalCredits===149, String(both.totalCredits));
ck('健檢沒有 error', validateRuleset(both).filter(i=>i.level==='error').length===0);
ck('多了一個標籤', tagTable({}, both).length===9, String(tagTable({},both).length));
n=0;
r = evaluate({ courses:[c('指定科目一',3,'tag.minor-template')] }, both);
ck('輔系學分計入', r.credit.categories.find(x=>x.id==='cat.identity').earned===3);
ck('輔系科目有打勾',
  r.subject.groups.find(g=>g.id==='grp.minor.template').items[0].checked===true);

console.log('\n【故意把學分加總算錯，看健檢會不會抓到】');
const broken = JSON.parse(JSON.stringify(tplMajor));
broken.totalCredits = 130; // 各大類其實只有 128
const w = validateRuleset(mergeModules([broken])).filter(i=>i.level==='warn');
ck('健檢抓到學分不符', w.length>0 && w[0].message.includes('128'), w.map(i=>i.message).join(' | ')||'沒抓到');

console.log(pass ? '\n全部通過\n' : '\n有項目失敗\n');
process.exitCode = pass?0:1;
