// Geometry uses the cat's centre. Obstacle rectangles must already include its radius.
const EPSILON = 1e-8;
const CORNER_GAP = 2;

const finitePoint = (point) => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function geometry(bounds, obstacles = []) {
  if (!bounds || ![bounds.left, bounds.top, bounds.right, bounds.bottom].every(Number.isFinite)
    || bounds.left > bounds.right || bounds.top > bounds.bottom) return null;
  const rects = obstacles.filter((rect) => rect
    && [rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite)
    && rect.left <= rect.right && rect.top <= rect.bottom
    && rect.right >= bounds.left && rect.left <= bounds.right
    && rect.bottom >= bounds.top && rect.top <= bounds.bottom);
  return { bounds, rects };
}

function free(point, bounds, rects) {
  if (!finitePoint(point) || point.x < bounds.left || point.x > bounds.right
    || point.y < bounds.top || point.y > bounds.bottom) return false;
  return !rects.some((rect) => point.x >= rect.left - EPSILON
    && point.x <= rect.right + EPSILON && point.y >= rect.top - EPSILON
    && point.y <= rect.bottom + EPSILON);
}

function hitsRectangle(a, b, rect) {
  let enter = 0;
  let leave = 1;
  for (const [origin, delta, low, high] of [
    [a.x, b.x - a.x, rect.left, rect.right],
    [a.y, b.y - a.y, rect.top, rect.bottom],
  ]) {
    if (Math.abs(delta) < EPSILON) {
      if (origin < low - EPSILON || origin > high + EPSILON) return false;
      continue;
    }
    let near = (low - origin) / delta;
    let far = (high - origin) / delta;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    leave = Math.min(leave, far);
    if (enter > leave + EPSILON) return false;
  }
  return enter <= leave + EPSILON && leave >= -EPSILON && enter <= 1 + EPSILON;
}

function clear(a, b, bounds, rects) {
  // A rectangle is convex, so free endpoints also keep the whole segment in bounds.
  return free(a, bounds, rects) && free(b, bounds, rects)
    && !rects.some((rect) => hitsRectangle(a, b, rect));
}

export function pointFree(point, bounds, obstacles = []) {
  const space = geometry(bounds, obstacles);
  return Boolean(space && free(point, space.bounds, space.rects));
}

export function segmentClear(a, b, bounds, obstacles = []) {
  const space = geometry(bounds, obstacles);
  return Boolean(space && clear(a, b, space.bounds, space.rects));
}

function edgeDistance(point, bounds) {
  return Math.max(0, Math.min(point.x - bounds.left, bounds.right - point.x,
    point.y - bounds.top, bounds.bottom - point.y));
}

function axisValues(values, min, max) {
  return [...new Set(values.filter(Number.isFinite)
    .map((value) => clamp(value, min, max)))].sort((a, b) => a - b);
}

export function nearestFree(point, bounds, obstacles = [], preferEdges = false) {
  const space = geometry(bounds, obstacles);
  if (!space || !finitePoint(point)) return null;
  const { rects } = space;
  const requested = {
    x: clamp(point.x, bounds.left, bounds.right),
    y: clamp(point.y, bounds.top, bounds.bottom),
  };
  if (free(requested, bounds, rects)) return requested;

  const xs = [requested.x, bounds.left, bounds.right];
  const ys = [requested.y, bounds.top, bounds.bottom];
  const rawX = [bounds.left, bounds.right];
  const rawY = [bounds.top, bounds.bottom];
  for (const rect of rects) {
    xs.push(rect.left - CORNER_GAP, rect.right + CORNER_GAP);
    ys.push(rect.top - CORNER_GAP, rect.bottom + CORNER_GAP);
    rawX.push(rect.left, rect.right);
    rawY.push(rect.top, rect.bottom);
  }
  let best = null;
  let bestScore = Infinity;
  let bestDistance = Infinity;
  const inspect = (xValues, yValues) => {
    for (const x of xValues) {
      for (const y of yValues) {
        const candidate = { x, y };
        if (!free(candidate, bounds, rects)) continue;
        const travel = distance(point, candidate);
        const score = travel + (preferEdges ? edgeDistance(candidate, bounds) * 0.18 : 0);
        if (score < bestScore - EPSILON || (Math.abs(score - bestScore) <= EPSILON
          && travel < bestDistance)) {
          best = candidate;
          bestScore = score;
          bestDistance = travel;
        }
      }
    }
  };
  inspect(axisValues(xs, bounds.left, bounds.right), axisValues(ys, bounds.top, bounds.bottom));
  if (best) return best;

  // A sub-four-pixel corridor can be free even when a full 2px corner gap cannot fit.
  // Cell centres cover those remaining spaces without permitting boundary contact.
  const cellCentres = (values, min, max) => {
    const ordered = axisValues(values, min, max);
    return ordered.flatMap((value, index) => index
      ? [value, (ordered[index - 1] + value) / 2] : [value]);
  };
  inspect(cellCentres(rawX, bounds.left, bounds.right), cellCentres(rawY, bounds.top, bounds.bottom));
  return best;
}

export function planRoute(start, goal, bounds, obstacles = [], { preferEdges = true } = {}) {
  const space = geometry(bounds, obstacles);
  if (!space || !free(start, bounds, space.rects) || !free(goal, bounds, space.rects)) return null;
  const { rects } = space;
  if (distance(start, goal) < EPSILON) return [];
  if (clear(start, goal, bounds, rects)) return [{ x: goal.x, y: goal.y }];

  const nodes = [];
  const keys = new Set();
  const add = (x, y) => {
    const point = { x, y };
    if (!free(point, bounds, rects)) return;
    const key = `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
    if (keys.has(key)) return;
    keys.add(key);
    nodes.push(point);
  };
  add(start.x, start.y);
  add(goal.x, goal.y);
  const addBoundaryProjections = (point) => {
    const x = clamp(point.x, bounds.left, bounds.right);
    const y = clamp(point.y, bounds.top, bounds.bottom);
    add(bounds.left, y);
    add(bounds.right, y);
    add(x, bounds.top);
    add(x, bounds.bottom);
  };
  add(bounds.left, bounds.top);
  add(bounds.right, bounds.top);
  add(bounds.right, bounds.bottom);
  add(bounds.left, bounds.bottom);
  addBoundaryProjections(start);
  addBoundaryProjections(goal);

  const rawXs = axisValues(rects.flatMap((rect) => [rect.left, rect.right]), bounds.left, bounds.right);
  const rawYs = axisValues(rects.flatMap((rect) => [rect.top, rect.bottom]), bounds.top, bounds.bottom);
  const localGap = (value, direction, values, min, max) => {
    let available = direction < 0 ? value - min : max - value;
    for (const coordinate of values) {
      const gap = (coordinate - value) * direction;
      if (gap > EPSILON) available = Math.min(available, gap);
    }
    return Math.min(CORNER_GAP, Math.max(0, available / 2));
  };
  for (const rect of rects) {
    for (const [x, xDirection] of [[rect.left, -1], [rect.right, 1]]) {
      for (const [y, yDirection] of [[rect.top, -1], [rect.bottom, 1]]) {
        const corner = { x: x + xDirection * CORNER_GAP, y: y + yDirection * CORNER_GAP };
        add(corner.x, corner.y);
        addBoundaryProjections(corner);
        // Retain a valid route through narrow gaps between expanded rectangles.
        add(x + xDirection * localGap(x, xDirection, rawXs, bounds.left, bounds.right),
          y + yDirection * localGap(y, yDirection, rawYs, bounds.top, bounds.bottom));
      }
    }
  }

  const count = nodes.length;
  const costs = new Float64Array(count).fill(Infinity);
  const previous = new Int32Array(count).fill(-1);
  const visited = new Uint8Array(count);
  costs[0] = 0;
  const edgeScale = Math.max(1, Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) / 2);
  const segmentCost = (a, b) => {
    const length = distance(a, b);
    if (!preferEdges) return length;
    const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const interior = (edgeDistance(a, bounds) + edgeDistance(middle, bounds)
      + edgeDistance(b, bounds)) / (3 * edgeScale);
    return length * (1 + interior * 0.8);
  };

  for (let iteration = 0; iteration < count; iteration += 1) {
    let current = -1;
    let estimate = Infinity;
    for (let index = 0; index < count; index += 1) {
      if (visited[index] || !Number.isFinite(costs[index])) continue;
      const candidate = costs[index] + distance(nodes[index], goal);
      if (candidate < estimate) {
        current = index;
        estimate = candidate;
      }
    }
    if (current < 0) return null;
    if (current === 1) break;
    visited[current] = 1;
    for (let next = 1; next < count; next += 1) {
      if (visited[next] || next === current) continue;
      const cost = costs[current] + segmentCost(nodes[current], nodes[next]);
      if (cost >= costs[next] || !clear(nodes[current], nodes[next], bounds, rects)) continue;
      costs[next] = cost;
      previous[next] = current;
    }
  }
  if (!Number.isFinite(costs[1])) return null;
  const route = [];
  for (let index = 1; index !== 0; index = previous[index]) {
    if (index < 0) return null;
    route.push({ ...nodes[index] });
  }
  route.reverse();
  let from = start;
  for (const waypoint of route) {
    if (!clear(from, waypoint, bounds, rects)) return null;
    from = waypoint;
  }
  return route;
}
