/* Shared procedural topology for the static poster and enhanced Canvas scene. */
(function (root) {
  function frame(angle = 0) {
    const points = [];
    const lines = [];
    const rows = 22, columns = 42;
    function project(x, y, z, tilt = .3) {
      const nx = x * Math.cos(angle) + z * Math.sin(angle);
      const nz = -x * Math.sin(angle) + z * Math.cos(angle);
      const ny = y * Math.cos(tilt) - nz * Math.sin(tilt);
      const depth = y * Math.sin(tilt) + nz * Math.cos(tilt);
      const perspective = 1 + depth * .0003;
      return { x:500 + nx * perspective, y:500 + ny * perspective, z:depth };
    }
    for (let row = 0; row <= rows; row++) {
      const phi = Math.PI * row / rows;
      for (let col = 0; col < columns; col++) {
        const theta = 2 * Math.PI * (col + (row % 2) * .5) / columns;
        points.push(project(365 * Math.sin(phi) * Math.cos(theta), 365 * Math.cos(phi), 365 * Math.sin(phi) * Math.sin(theta)));
      }
    }
    for (let row = 1; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        // Deliberate open bands: an artificial shell, not a geographic globe.
        if ((row > 5 && row < 9 && col > 7 && col < 18) || (row > 13 && row < 16 && col > 26 && col < 39)) continue;
        const a = points[row * columns + col];
        const neighbors = [points[row * columns + (col + 1) % columns], points[(row + 1) * columns + col], points[(row + 1) * columns + (col + 1) % columns]];
        neighbors.forEach(b => lines.push({a,b,alpha:Math.max(.08, .3 + (a.z + b.z) / 2100), ring:false}));
      }
    }
    for (let ring = 0; ring < 3; ring++) {
      let last;
      for (let i = 0; i <= 160; i++) {
        const t = i / 160 * Math.PI * 2;
        const tilt = [.45, 1.1, -.8][ring];
        const r = 406 + ring * 13;
        const p = project(r * Math.cos(t), r * Math.sin(t) * Math.sin(tilt), r * Math.sin(t) * Math.cos(tilt), .3);
        if (last) lines.push({a:last,b:p,alpha: .25 + (p.z + r) / (r * 8),ring:true});
        last = p;
      }
    }
    return {lines,points};
  }
  if (typeof module !== 'undefined') module.exports = { frame };
  else root.VaultSphereGeometry = { frame };
})(typeof window === 'undefined' ? globalThis : window);
