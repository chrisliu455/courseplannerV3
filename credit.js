/**
 * engine/credit.js — 學分判定
 *
 * 流程：課程 →（標籤）→ 項目 bucket →（歸屬）→ 五大類 category → 畢業總學分
 *
 * 一門課只有一個標籤，所以歸屬沒有競合問題。真正需要處理的是「額滿」：
 * 項目可以設 cap（認列上限），超出的學分依 overflowTo 溢到別的項目，
 * 例如物理領域最多認 6 學分，多修的算進其他選修。
 */

import { isActive, isCounted, toNumber } from './ruleset.js';

const MAX_PASSES = 8; // 溢出鏈的保險絲，避免規則寫成循環時無限迴圈

export function evaluateCredits(plan, ruleset, index) {
  const options = plan.options || {};
  const courses = (plan.courses || []).filter(isCounted);

  /* ---------- 1. 把課投進項目的收件匣 ---------- */
  const inbox = new Map(index.bucketOrder.map((id) => [id, []]));
  const untagged = [];   // 沒有標籤的課
  const unmapped = [];   // 標籤沒有對應項目的課
  const inactive = [];   // 標籤對應的項目在目前身分下未啟用（例如沒輔系卻掛了輔系標籤）
  const allocationsOf = new Map(); // courseId -> [{bucketId, credit, viaOverflow, from}]

  courses.forEach((c) => {
    allocationsOf.set(c.id, []);
    const credit = toNumber(c.credit);
    if (!c.tag) return untagged.push(c);
    const bucketId = index.bucketOfTag.get(c.tag);
    if (!bucketId) return unmapped.push(c);
    const bucket = index.bucketById.get(bucketId);
    if (!bucket.active) return inactive.push(c);
    if (credit <= 0) return; // 0 學分課（體育、操行）只走科目判定
    inbox.get(bucketId).push({ course: c, credit, from: null });
  });

  /* ---------- 2. 依上限認列，溢出者轉投下一個項目 ---------- */
  const earned = new Map(index.bucketOrder.map((id) => [id, 0]));
  const takenBy = new Map(index.bucketOrder.map((id) => [id, []]));
  const dropped = []; // 額滿又沒有溢出目標，這些學分不計入任何項目

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let moved = false;

    for (const bucketId of index.bucketOrder) {
      const items = inbox.get(bucketId);
      if (!items.length) continue;
      inbox.set(bucketId, []);
      moved = true;

      const bucket = index.bucketById.get(bucketId);
      const cap = bucket.cap == null ? Infinity : toNumber(bucket.cap);

      for (const item of items) {
        const space = Math.max(0, cap - earned.get(bucketId));
        const take = Math.min(space, item.credit);

        if (take > 0) {
          earned.set(bucketId, earned.get(bucketId) + take);
          takenBy.get(bucketId).push({
            courseId: item.course.id,
            name: item.course.name,
            credit: item.credit,
            counted: take,
            tag: item.course.tag,
            semester: item.course.semester,
            viaOverflow: Boolean(item.from),
            from: item.from,
          });
          allocationsOf.get(item.course.id).push({
            bucketId,
            credit: take,
            viaOverflow: Boolean(item.from),
            from: item.from,
          });
        }

        const left = item.credit - take;
        if (left > 0) {
          if (bucket.overflowTo && inbox.has(bucket.overflowTo)) {
            inbox.get(bucket.overflowTo).push({ course: item.course, credit: left, from: bucketId });
          } else {
            dropped.push({ courseId: item.course.id, name: item.course.name, credit: left, bucketId });
          }
        }
      }
    }

    if (!moved) break;
  }

  /* ---------- 3. 組出五大類的成績單 ---------- */
  const categories = ruleset.categories.map((cat) => {
    const catActive = isActive(cat, options);

    const buckets = cat.buckets.map((b) => {
      const meta = index.bucketById.get(b.id);
      const got = earned.get(b.id) || 0;
      const target = b.minCredits == null ? null : toNumber(b.minCredits);
      const rows = takenBy.get(b.id) || [];
      const checks = runBucketChecks(b, rows, courses);

      return {
        id: b.id,
        label: b.label,
        note: b.note || '',
        tags: b.tags || [],
        active: meta.active,
        earned: round2(got),
        target,
        cap: b.cap == null ? null : toNumber(b.cap),
        overflowTo: b.overflowTo || null,
        remaining: target == null ? 0 : round2(Math.max(0, target - got)),
        met: !meta.active || (target == null ? true : got >= target) && checks.every((k) => k.ok),
        checks,
        courses: rows,
      };
    });

    const active = buckets.filter((b) => b.active);
    const got = active.reduce((s, b) => s + b.earned, 0);
    const target =
      cat.minCredits != null
        ? toNumber(cat.minCredits)
        : active.reduce((s, b) => s + (b.target || 0), 0);

    return {
      id: cat.id,
      label: cat.label,
      color: cat.color || '#6B6558',
      note: cat.note || '',
      active: catActive,
      countsTowardTotal: cat.countsTowardTotal !== false,
      earned: round2(got),
      target,
      remaining: round2(Math.max(0, target - got)),
      met: !catActive || (got >= target && active.every((b) => b.met)),
      buckets,
    };
  });

  /* ---------- 4. 總計 ---------- */
  const countedCategories = categories.filter((c) => c.active && c.countsTowardTotal);
  const totalEarned = round2(countedCategories.reduce((s, c) => s + c.earned, 0));
  const totalTarget = toNumber(ruleset.totalCredits);
  const actualCredits = round2(courses.reduce((s, c) => s + toNumber(c.credit), 0));

  return {
    categories,
    total: {
      earned: totalEarned,          // 認列學分（受上限限制）
      target: totalTarget,          // 畢業總學分
      remaining: round2(Math.max(0, totalTarget - totalEarned)),
      met: totalEarned >= totalTarget && countedCategories.every((c) => c.met),
      actualCredits,                // 實修學分（不受上限限制）
      overCounted: round2(Math.max(0, actualCredits - totalEarned)),
    },
    exceptions: {
      untagged: untagged.map(brief),
      unmapped: unmapped.map(brief),
      inactive: inactive.map(brief),
      dropped,
    },
    allocations: Object.fromEntries(allocationsOf),
  };
}

/** 項目層級的附加檢核，例如「核心通識至少 4 門」「四向度各至少一門」。 */
function runBucketChecks(bucket, rows, allCourses) {
  return (bucket.checks || []).map((rule) => {
    if (rule.type === 'minCourses') {
      const have = rows.length;
      return { label: rule.label, ok: have >= rule.min, have, need: rule.min, unit: '門' };
    }
    if (rule.type === 'minCoursesOfTag') {
      const have = rows.filter((r) => r.tag === rule.tag).length;
      return { label: rule.label, ok: have >= rule.min, have, need: rule.min, unit: '門' };
    }
    if (rule.type === 'minCreditsOfTag') {
      const have = round2(rows.filter((r) => r.tag === rule.tag).reduce((s, r) => s + r.counted, 0));
      return { label: rule.label, ok: have >= rule.min, have, need: rule.min, unit: '學分' };
    }
    return { label: rule.label || '未知規則', ok: true, have: 0, need: 0, unit: '' };
  });
}

function brief(c) {
  return { id: c.id, name: c.name, credit: toNumber(c.credit), tag: c.tag || null, semester: c.semester };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
