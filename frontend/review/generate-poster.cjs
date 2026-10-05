const {frame} = require('../landing_page/sphere-geometry.js');
const {lines,points} = frame();
const paths = lines.map(l => `<path d="M${l.a.x.toFixed(1)} ${l.a.y.toFixed(1)}L${l.b.x.toFixed(1)} ${l.b.y.toFixed(1)}" stroke="${l.ring?'#a7c4f3':'#4d85d7'}" stroke-opacity="${l.alpha.toFixed(2)}" stroke-width="${l.ring?1.2:.8}"/>`).join('');
const nodes = points.filter((p,i)=>i%29===0 && p.z>0).map(p=>`<rect x="${p.x}" y="${p.y}" width="2.6" height="2.6" fill="#a7c9ff"/>`).join('');
process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g fill="none">${paths}</g>${nodes}</svg>`);
