import * as THREE from 'three';

// ── Internal state ────────────────────────────────────────────────────────────
let wallSegments = [];
let drawingChain = [];        // nodes in current in-progress chain
let selectedSegId = null;
let selectedOpeningId = null;
let snapGrid = 0.5;
let snapEnabled = true;
let undoStack = [];
let redoStack = [];
let currentFloorColor = '#dcd5c8';
let currentWallColor  = '#f2ede8';
let currentWallHeight = 3.0;
let currentWallType   = 'plain'; // plain | door | window | glass

// Three.js references
let _scene = null;
let wallGroup = null;
let floorGroup = null;

// 2D canvas references
let canvas2d = null;
let ctx = null;
let isActive = false;
let drawMode = true;
let previewPoint = null;
let dragNodeRef = null;
let dragStartPos = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let previewMesh = null; // ghost wall shown in 3D while drawing

// Canvas transform
let camX = 0, camY = 0, camScale = 40; // 40px per metre

// ── Utilities ─────────────────────────────────────────────────────────────────
function generateId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function computeSegmentLength(seg) {
    const dx = seg.end.x - seg.start.x;
    const dz = seg.end.z - seg.start.z;
    return Math.sqrt(dx * dx + dz * dz);
}

export function snapPoint(rawX, rawZ, existingNodes, segments, gridSize, enabled) {
    if (!enabled) return { x: rawX, z: rawZ };

    const PROX = 0.3;

    // Node proximity
    for (const n of existingNodes) {
        const d = Math.sqrt((n.x - rawX) ** 2 + (n.z - rawZ) ** 2);
        if (d < PROX) return { x: n.x, z: n.z };
    }

    // Midpoint proximity
    for (const seg of segments) {
        const mx = (seg.start.x + seg.end.x) / 2;
        const mz = (seg.start.z + seg.end.z) / 2;
        const d = Math.sqrt((mx - rawX) ** 2 + (mz - rawZ) ** 2);
        if (d < PROX) return { x: mx, z: mz };
    }

    // Grid snap
    return {
        x: Math.round(rawX / gridSize) * gridSize,
        z: Math.round(rawZ / gridSize) * gridSize
    };
}

export function clampOpening(opening, segmentLength) {
    const half = opening.width / 2;
    let pos = opening.position;
    if (pos - half < 0) pos = half;
    if (pos + half > segmentLength) pos = segmentLength - half;
    return { ...opening, position: pos };
}

export function applyNodeMove(segments, nodeRef, newPos) {
    return segments.map(seg => {
        const s = { ...seg };
        if (Math.abs(s.start.x - nodeRef.x) < 0.001 && Math.abs(s.start.z - nodeRef.z) < 0.001) {
            s.start = { ...newPos };
        }
        if (Math.abs(s.end.x - nodeRef.x) < 0.001 && Math.abs(s.end.z - nodeRef.z) < 0.001) {
            s.end = { ...newPos };
        }
        return s;
    });
}

export function deleteOpening(segment, openingId) {
    return { ...segment, openings: segment.openings.filter(o => o.id !== openingId) };
}

export function createSegment(start, end, height, thickness, color, wallType) {
    return {
        id: generateId(),
        start: { x: start.x, z: start.z },
        end:   { x: end.x,   z: end.z   },
        height:    height    ?? currentWallHeight,
        thickness: thickness ?? 0.2,
        color:     color     ?? currentWallColor,
        wallType:  wallType  ?? currentWallType,
        openings: []
    };
}

// ── Undo / Redo ───────────────────────────────────────────────────────────────
function snapshot() {
    return JSON.stringify(wallSegments);
}

export function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 20) undoStack.shift();
    redoStack = [];
}

export function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    wallSegments = JSON.parse(undoStack.pop());
    rebuildScene();
    render2D();
}

export function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    wallSegments = JSON.parse(redoStack.pop());
    rebuildScene();
    render2D();
}

export function getUndoStack() {
    return { canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 };
}

// ── Serialisation ─────────────────────────────────────────────────────────────
export function serializeFloorPlan() {
    return JSON.stringify({ version: 1, segments: wallSegments });
}

export function deserializeFloorPlan(json) {
    try {
        if (!json) { wallSegments = []; return; }
        const data = typeof json === 'string' ? JSON.parse(json) : json;
        wallSegments = Array.isArray(data.segments) ? data.segments : [];
    } catch (e) {
        console.warn('wallEditor: failed to parse floor plan JSON', e);
        wallSegments = [];
    }
}

function saveToLocalStorage() {
    // Walls are NOT persisted to localStorage — they are only saved when
    // the user explicitly saves a design (server-side). This keeps the
    // floor planner clean on every new session.
}

// ── Legacy wall generator ─────────────────────────────────────────────────────
export function generateLegacyWalls(width, length, height, color) {
    const hw = width / 2, hl = length / 2;
    const c = color || currentWallColor;
    const h = height || currentWallHeight;
    wallSegments = [
        createSegment({ x: -hw, z: -hl }, { x:  hw, z: -hl }, h, 0.2, c), // back
        createSegment({ x: -hw, z:  hl }, { x:  hw, z:  hl }, h, 0.2, c), // front
        createSegment({ x: -hw, z: -hl }, { x: -hw, z:  hl }, h, 0.2, c), // left
        createSegment({ x:  hw, z: -hl }, { x:  hw, z:  hl }, h, 0.2, c), // right
    ];
    rebuildScene();
    render2D();
}

// ── 3D Geometry ───────────────────────────────────────────────────────────────
function buildWallStyleMaterial(style, plainColor) {
    // Parse hex color to rgb (0-255)
    function hexToRgb(hex) {
        const h = hex.replace('#','');
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }
    const [cr, cg, cb] = hexToRgb(plainColor || '#f2ede8');

    // Helper: make a canvas texture
    function makeTexture(drawFn, w=512, h=512) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        drawFn(ctx, w, h);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        return tex;
    }

    if (style === 'brick') {
        const map = makeTexture((ctx, W, H) => {
            // Mortar — tinted with chosen color
            ctx.fillStyle = `rgb(${Math.min(255,cr*0.7|0)},${Math.min(255,cg*0.7|0)},${Math.min(255,cb*0.7|0)})`;
            ctx.fillRect(0, 0, W, H);
            const bW=120, bH=40, gap=8, rowH=bH+gap;
            for (let r=0; r<Math.ceil(H/rowH)+1; r++) {
                const offset=(r%2)*(bW/2), y=r*rowH;
                for (let c2=-1; c2<Math.ceil((W+bW)/(bW+gap))+1; c2++) {
                    const v=Math.random()*20-10;
                    // Brick colour = chosen color blended with brick red
                    const br=Math.min(255,((cr+175)/2+v)|0);
                    const bg=Math.min(255,((cg+80)/2+v)|0);
                    const bb=Math.min(255,((cb+55)/2+v)|0);
                    ctx.fillStyle=`rgb(${br},${bg},${bb})`;
                    ctx.fillRect(c2*(bW+gap)-offset+gap/2, y+gap/2, bW, bH);
                    ctx.fillStyle='rgba(255,200,160,0.18)';
                    ctx.fillRect(c2*(bW+gap)-offset+gap/2, y+gap/2, bW, 4);
                    ctx.fillStyle='rgba(0,0,0,0.18)';
                    ctx.fillRect(c2*(bW+gap)-offset+gap/2, y+gap/2+bH-4, bW, 4);
                }
            }
        });
        const roughMap = makeTexture((ctx,W,H)=>{
            ctx.fillStyle='#aaaaaa'; ctx.fillRect(0,0,W,H);
            const bW=120,bH=40,gap=8,rowH=bH+gap;
            for(let r=0;r<Math.ceil(H/rowH)+1;r++){
                const off=(r%2)*(bW/2),y=r*rowH;
                for(let c2=-1;c2<Math.ceil((W+bW)/(bW+gap))+1;c2++){
                    ctx.fillStyle='#555555';
                    ctx.fillRect(c2*(bW+gap)-off+gap/2,y+gap/2,bW,bH);
                }
            }
        });
        return new THREE.MeshStandardMaterial({ map, roughnessMap: roughMap, roughness:1.0, metalness:0.0, side:THREE.DoubleSide });
    }

    if (style === 'woodpanel' || style === 'wood') {
        const map = makeTexture((ctx, W, H) => {
            // Base = chosen color blended with wood brown
            const wr=((cr+139)/2)|0, wg=((cg+94)/2)|0, wb=((cb+60)/2)|0;
            ctx.fillStyle=`rgb(${wr},${wg},${wb})`;
            ctx.fillRect(0,0,W,H);
            const plankH=64;
            for(let y=0;y<H;y+=plankH){
                ctx.fillStyle=`rgb(${(wr*0.4)|0},${(wg*0.4)|0},${(wb*0.4)|0})`;
                ctx.fillRect(0,y,W,3);
                for(let g=0;g<18;g++){
                    const gy=y+4+g*3.2+Math.random()*2;
                    const alpha=0.04+Math.random()*0.08;
                    ctx.strokeStyle=`rgba(${Math.random()>0.5?'60,30,10':'200,140,80'},${alpha})`;
                    ctx.lineWidth=0.8+Math.random();
                    ctx.beginPath(); ctx.moveTo(0,gy);
                    for(let x=0;x<W;x+=40) ctx.lineTo(x+40,gy+(Math.random()-0.5)*4);
                    ctx.stroke();
                }
                if(Math.random()>0.6){
                    const kx=Math.random()*W, ky=y+plankH/2;
                    const grad=ctx.createRadialGradient(kx,ky,2,kx,ky,14);
                    grad.addColorStop(0,'rgba(40,20,5,0.5)'); grad.addColorStop(1,'rgba(40,20,5,0)');
                    ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(kx,ky,14,8,0,0,Math.PI*2); ctx.fill();
                }
            }
        });
        return new THREE.MeshStandardMaterial({ map, roughness:0.72, metalness:0.0, side:THREE.DoubleSide });
    }

    if (style === 'tile') {
        const map = makeTexture((ctx, W, H) => {
            const tS=80, gap=5;
            // Grout = darker version of chosen color
            ctx.fillStyle=`rgb(${(cr*0.6)|0},${(cg*0.6)|0},${(cb*0.6)|0})`;
            ctx.fillRect(0,0,W,H);
            for(let y=0;y<H;y+=tS+gap){
                for(let x=0;x<W;x+=tS+gap){
                    const v=Math.random()*8-4;
                    // Tile = chosen color with slight variation
                    ctx.fillStyle=`rgb(${Math.min(255,(cr+v)|0)},${Math.min(255,(cg+v)|0)},${Math.min(255,(cb+v)|0)})`;
                    ctx.fillRect(x+gap/2,y+gap/2,tS,tS);
                    const grad=ctx.createLinearGradient(x,y,x+tS,y+tS);
                    grad.addColorStop(0,'rgba(255,255,255,0.18)');
                    grad.addColorStop(0.5,'rgba(255,255,255,0.04)');
                    grad.addColorStop(1,'rgba(0,0,0,0.06)');
                    ctx.fillStyle=grad; ctx.fillRect(x+gap/2,y+gap/2,tS,tS);
                }
            }
        });
        return new THREE.MeshStandardMaterial({ map, roughness:0.18, metalness:0.05, side:THREE.DoubleSide });
    }

    if (style === 'concrete') {
        const map = makeTexture((ctx, W, H) => {
            // Base = chosen color blended with concrete grey
            const gr=((cr+138)/2)|0, gg=((cg+138)/2)|0, gb=((cb+138)/2)|0;
            ctx.fillStyle=`rgb(${gr},${gg},${gb})`;
            ctx.fillRect(0,0,W,H);
            for(let i=0;i<18000;i++){
                const x=Math.random()*W, y=Math.random()*H;
                const v=Math.random()>0.5?'255,255,255':'0,0,0';
                ctx.fillStyle=`rgba(${v},${0.03+Math.random()*0.06})`;
                ctx.fillRect(x,y,2,2);
            }
            for(let y=0;y<H;y+=128){
                ctx.strokeStyle='rgba(0,0,0,0.12)'; ctx.lineWidth=1.5;
                ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
            }
            for(let x=64;x<W;x+=128) for(let y=64;y<H;y+=128){
                ctx.fillStyle='rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
            }
        });
        return new THREE.MeshStandardMaterial({ map, roughness:0.95, metalness:0.0, side:THREE.DoubleSide });
    }

    // plain / painted — chosen color with paint texture noise
    const map = makeTexture((ctx, W, H) => {
        ctx.fillStyle = plainColor || '#f2ede8';
        ctx.fillRect(0,0,W,H);
        for(let i=0;i<8000;i++){
            const x=Math.random()*W, y=Math.random()*H;
            ctx.fillStyle=`rgba(${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},${Math.random()>0.5?255:0},0.025)`;
            ctx.fillRect(x,y,3,3);
        }
    });
    return new THREE.MeshStandardMaterial({ map, roughness:0.88, metalness:0.0, side:THREE.DoubleSide });
}

function buildWall3D(seg) {
    const dx = seg.end.x - seg.start.x;
    const dz = seg.end.z - seg.start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return null;

    const h = seg.height;
    const t = seg.thickness || 0.2;
    const type = seg.wallType || 'plain';

    let mat;
    if (type === 'glass') {
        mat = new THREE.MeshStandardMaterial({
            color: 0x90c8e0, roughness: 0.05, metalness: 0.1,
            transparent: true, opacity: 0.35, side: THREE.DoubleSide
        });
    } else {
        const style = seg.wallStyle || 'plain';
        const color = seg.color || currentWallColor;
        // Use the same getWallMat from main.js if available, else fallback
        if (typeof window.getWallMat === 'function') {
            mat = window.getWallMat(color, style);
        } else {
            mat = buildWallStyleMaterial(style, color);
        }
    }

    const group = new THREE.Group();
    const angle = Math.atan2(dz, dx);
    const mx = (seg.start.x + seg.end.x) / 2;
    const mz = (seg.start.z + seg.end.z) / 2;

    if (type === 'plain' || type === 'glass') {
        const geo = new THREE.BoxGeometry(len, h, t);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.y = -angle;
        mesh.position.set(mx, h / 2, mz);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.userData.segId = seg.id;
        return mesh;
    }

    // Door or window — build wall with opening
    // Scale opening to wall height for realistic proportions
    const doorH = h * 0.75;  // door = 75% of wall height
    const doorW = Math.min(1.2, len * 0.4); // door width, max 40% of wall
    const winH  = h * 0.45;
    const winW  = Math.min(1.5, len * 0.5);
    const winSill = h * 0.25;

    // Left section
    const openW = type === 'door' ? doorW : winW;
    const leftW = (len - openW) / 2;

    if (leftW > 0.01) {
        const leftGeo = new THREE.BoxGeometry(leftW, h, t);
        const leftMesh = new THREE.Mesh(leftGeo, mat);
        leftMesh.receiveShadow = true; leftMesh.castShadow = true;
        group.add(leftMesh);
        leftMesh.position.set(-len / 2 + leftW / 2, h / 2, 0);
    }
    if (leftW > 0.01) {
        const rightGeo = new THREE.BoxGeometry(leftW, h, t);
        const rightMesh = new THREE.Mesh(rightGeo, mat);
        rightMesh.receiveShadow = true; rightMesh.castShadow = true;
        group.add(rightMesh);
        rightMesh.position.set(len / 2 - leftW / 2, h / 2, 0);
    }

    if (type === 'door') {
        // Top section above door
        const topH = h - doorH;
        if (topH > 0.01) {
            const topGeo = new THREE.BoxGeometry(openW, topH, t);
            const topMesh = new THREE.Mesh(topGeo, mat);
            topMesh.receiveShadow = true;
            group.add(topMesh);
            topMesh.position.set(0, doorH + topH / 2, 0);
        }
    } else {
        // Window: bottom sill section
        const sillGeo = new THREE.BoxGeometry(openW, winSill, t);
        const sillMesh = new THREE.Mesh(sillGeo, mat);
        sillMesh.receiveShadow = true;
        group.add(sillMesh);
        sillMesh.position.set(0, winSill / 2, 0);
        // Top section above window
        const topH = h - winSill - winH;
        if (topH > 0.01) {
            const topGeo = new THREE.BoxGeometry(openW, topH, t);
            const topMesh = new THREE.Mesh(topGeo, mat);
            topMesh.receiveShadow = true;
            group.add(topMesh);
            topMesh.position.set(0, winSill + winH + topH / 2, 0);
        }
        // Glass pane in window
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x90c8e0, roughness: 0.05, metalness: 0.1,
            transparent: true, opacity: 0.4, side: THREE.DoubleSide
        });
        const glassGeo = new THREE.BoxGeometry(openW, winH, 0.02);
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        group.add(glassMesh);
        glassMesh.position.set(0, winSill + winH / 2, 0);
    }

    group.rotation.y = -angle;
    group.position.set(mx, 0, mz);
    group.userData.segId = seg.id;
    return group;
}

function buildFloorMesh(nodes) {
    if (nodes.length < 3) return null;
    const shape = new THREE.Shape();
    shape.moveTo(nodes[0].x, nodes[0].z);
    for (let i = 1; i < nodes.length; i++) shape.lineTo(nodes[i].x, nodes[i].z);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshStandardMaterial({
        color: currentFloorColor,
        roughness: 0.82,
        metalness: 0.02,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
}

function detectClosedPolygons() {
    // Simple approach: find chains where end of one segment = start of another
    const polygons = [];
    const used = new Set();

    for (let i = 0; i < wallSegments.length; i++) {
        if (used.has(i)) continue;
        const chain = [i];
        used.add(i);
        let current = wallSegments[i];
        let closed = false;

        for (let iter = 0; iter < wallSegments.length; iter++) {
            let found = false;
            for (let j = 0; j < wallSegments.length; j++) {
                if (used.has(j)) continue;
                const s = wallSegments[j];
                const ex = current.end.x, ez = current.end.z;
                if (Math.abs(s.start.x - ex) < 0.05 && Math.abs(s.start.z - ez) < 0.05) {
                    chain.push(j);
                    used.add(j);
                    current = s;
                    found = true;
                    // Check if we closed back to start
                    const sx = wallSegments[i].start.x, sz = wallSegments[i].start.z;
                    if (Math.abs(current.end.x - sx) < 0.05 && Math.abs(current.end.z - sz) < 0.05) {
                        closed = true;
                    }
                    break;
                }
            }
            if (!found || closed) break;
        }

        if (closed && chain.length >= 3) {
            polygons.push(chain.map(idx => wallSegments[idx].start));
        }
    }
    return polygons;
}

function updatePreviewMesh(fromPt, toPt) {
    // Remove old preview
    if (previewMesh) { if (_scene) _scene.remove(previewMesh); previewMesh = null; }
    if (!_scene || !fromPt || !toPt) return;

    const dx = toPt.x - fromPt.x;
    const dz = toPt.z - fromPt.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.05) return;

    const h = currentWallHeight;
    const geo = new THREE.BoxGeometry(len, h, 0.15);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xc9a96e, transparent: true, opacity: 0.4,
        roughness: 0.8, metalness: 0, side: THREE.DoubleSide
    });
    previewMesh = new THREE.Mesh(geo, mat);
    previewMesh.rotation.y = -Math.atan2(dz, dx);
    previewMesh.position.set(
        (fromPt.x + toPt.x) / 2,
        h / 2,
        (fromPt.z + toPt.z) / 2
    );
    _scene.add(previewMesh);
}

function clearPreviewMesh() {
    if (previewMesh) { if (_scene) _scene.remove(previewMesh); previewMesh = null; }
}

function rebuildScene() {
    if (!_scene) return;

    // Dispose old meshes
    if (wallGroup)  { wallGroup.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); wallGroup.clear(); }
    if (floorGroup) { floorGroup.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); floorGroup.clear(); }

    // Create groups if needed and ensure they're in scene
    if (!wallGroup)  { wallGroup  = new THREE.Group(); _scene.add(wallGroup); }
    if (!floorGroup) { floorGroup = new THREE.Group(); _scene.add(floorGroup); }
    if (!wallGroup.parent)  _scene.add(wallGroup);
    if (!floorGroup.parent) _scene.add(floorGroup);

    for (const seg of wallSegments) {
        const mesh = buildWall3D(seg);
        if (mesh) wallGroup.add(mesh);
    }

    const polygons = detectClosedPolygons();
    for (const poly of polygons) {
        const mesh = buildFloorMesh(poly);
        if (mesh) floorGroup.add(mesh);
    }

    saveToLocalStorage();

    // Update roof to fit over drawn walls
    if (typeof window.updateRoofToFitWalls === 'function') {
        window.updateRoofToFitWalls(wallSegments);
    }
}

// ── Coordinate transforms ─────────────────────────────────────────────────────
function worldToCanvas(wx, wz) {
    return {
        x: (wx - camX) * camScale + (canvas2d ? canvas2d.width / 2 : 0),
        y: (wz - camY) * camScale + (canvas2d ? canvas2d.height / 2 : 0)
    };
}

function canvasToWorld(cx, cy) {
    return {
        x: (cx - (canvas2d ? canvas2d.width / 2 : 0)) / camScale + camX,
        z: (cy - (canvas2d ? canvas2d.height / 2 : 0)) / camScale + camY
    };
}

// ── 2D Renderer ───────────────────────────────────────────────────────────────
function render2D() {
    if (!ctx || !canvas2d) return;
    const W = canvas2d.width, H = canvas2d.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#1a1714';
    ctx.fillRect(0, 0, W, H);

    // Grid
    const gridStep = snapGrid * camScale;
    const startX = (((-camX * camScale + W / 2) % gridStep) + gridStep) % gridStep;
    const startY = (((-camY * camScale + H / 2) % gridStep) + gridStep) % gridStep;
    ctx.strokeStyle = 'rgba(201,169,110,0.12)';
    ctx.lineWidth = 0.5;
    for (let x = startX; x < W; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = startY; y < H; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // ── Room boundary — shows the 3D grid edges ──────────────────
    const roomW = parseFloat(document.getElementById('roomWidth')?.value  || 20);
    const roomL = parseFloat(document.getElementById('roomLength')?.value || 20);
    const hw = roomW / 2, hl = roomL / 2;
    const tl = worldToCanvas(-hw, -hl);
    const tr = worldToCanvas( hw, -hl);
    const br = worldToCanvas( hw,  hl);
    const bl = worldToCanvas(-hw,  hl);
    // Filled semi-transparent room area
    ctx.fillStyle = 'rgba(201,169,110,0.04)';
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
    ctx.closePath(); ctx.fill();
    // Dashed boundary border
    ctx.strokeStyle = 'rgba(201,169,110,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
    ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    // Corner labels
    ctx.fillStyle = 'rgba(201,169,110,0.6)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${roomW}m × ${roomL}m`, tl.x + 4, tl.y + 12);

    // Wall segments
    for (const seg of wallSegments) {
        const s = worldToCanvas(seg.start.x, seg.start.z);
        const e = worldToCanvas(seg.end.x, seg.end.z);
        const isSelected = seg.id === selectedSegId;

        ctx.strokeStyle = isSelected ? '#c9a96e' : '#f0ece4';
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();

        // Opening markers
        for (const op of seg.openings) {
            const len = computeSegmentLength(seg);
            const t = op.position / len;
            const ox = seg.start.x + (seg.end.x - seg.start.x) * t;
            const oz = seg.start.z + (seg.end.z - seg.start.z) * t;
            const oc = worldToCanvas(ox, oz);
            const hw = (op.width / len) * Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2) / 2;
            const ang = Math.atan2(e.y - s.y, e.x - s.x);
            ctx.strokeStyle = op.type === 'door' ? '#4a9eff' : '#4aff9e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(oc.x - Math.cos(ang) * hw, oc.y - Math.sin(ang) * hw);
            ctx.lineTo(oc.x + Math.cos(ang) * hw, oc.y + Math.sin(ang) * hw);
            ctx.stroke();
        }

        // Length label
        const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
        const len = computeSegmentLength(seg);
        ctx.fillStyle = 'rgba(201,169,110,0.85)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(len.toFixed(2) + 'm', mx, my - 6);

        // Node handles
        for (const pt of [seg.start, seg.end]) {
            const c = worldToCanvas(pt.x, pt.z);
            ctx.fillStyle = isSelected ? '#c9a96e' : '#9a9080';
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // In-progress drawing chain
    if (drawMode && drawingChain.length > 0) {
        ctx.strokeStyle = 'rgba(201,169,110,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        for (let i = 0; i < drawingChain.length - 1; i++) {
            const a = worldToCanvas(drawingChain[i].x, drawingChain[i].z);
            const b = worldToCanvas(drawingChain[i + 1].x, drawingChain[i + 1].z);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        // Preview line to cursor
        if (previewPoint) {
            const last = worldToCanvas(drawingChain[drawingChain.length - 1].x, drawingChain[drawingChain.length - 1].z);
            const prev = worldToCanvas(previewPoint.x, previewPoint.z);
            ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(prev.x, prev.y); ctx.stroke();
        }
        ctx.setLineDash([]);

        // Chain nodes
        for (const pt of drawingChain) {
            const c = worldToCanvas(pt.x, pt.z);
            ctx.fillStyle = '#c9a96e';
            ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Snap indicator
    if (previewPoint) {
        const c = worldToCanvas(previewPoint.x, previewPoint.z);
        ctx.strokeStyle = '#c9a96e';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.stroke();
    }

    // Scale ruler (bottom-left)
    const rulerM = 2; // show 2m ruler
    const rulerPx = rulerM * camScale;
    ctx.strokeStyle = '#c9a96e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, H - 16); ctx.lineTo(16 + rulerPx, H - 16);
    ctx.moveTo(16, H - 12); ctx.lineTo(16, H - 20);
    ctx.moveTo(16 + rulerPx, H - 12); ctx.lineTo(16 + rulerPx, H - 20);
    ctx.stroke();
    ctx.fillStyle = '#c9a96e';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rulerM + 'm', 16 + rulerPx / 2, H - 22);

    // Mode label
    ctx.fillStyle = drawMode ? '#c9a96e' : '#9a9080';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(drawMode ? '✦ DRAW MODE' : '↖ SELECT MODE', 16, 20);
}

// ── All existing nodes (for snap) ─────────────────────────────────────────────
function getAllNodes() {
    const nodes = [];
    for (const seg of wallSegments) {
        nodes.push(seg.start, seg.end);
    }
    for (const pt of drawingChain) nodes.push(pt);
    return nodes;
}

// ── Hit testing ───────────────────────────────────────────────────────────────
function hitTestSegment(wx, wz) {
    const THRESH = 0.3;
    for (const seg of wallSegments) {
        const dx = seg.end.x - seg.start.x;
        const dz = seg.end.z - seg.start.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) continue;
        const t = ((wx - seg.start.x) * dx + (wz - seg.start.z) * dz) / (len * len);
        const tc = Math.max(0, Math.min(1, t));
        const px = seg.start.x + tc * dx;
        const pz = seg.start.z + tc * dz;
        const d = Math.sqrt((wx - px) ** 2 + (wz - pz) ** 2);
        if (d < THRESH) return seg.id;
    }
    return null;
}

function hitTestNode(wx, wz) {
    const THRESH = 0.4;
    for (const seg of wallSegments) {
        for (const pt of [seg.start, seg.end]) {
            const d = Math.sqrt((wx - pt.x) ** 2 + (wz - pt.z) ** 2);
            if (d < THRESH) return { segId: seg.id, pt };
        }
    }
    return null;
}

// ── Mouse event handlers ──────────────────────────────────────────────────────
function onMouseDown(e) {
    if (!canvas2d) return;
    const rect = canvas2d.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Right-click = pan
    if (e.button === 2) {
        isPanning = true;
        panStart = { x: cx, y: cy };
        return;
    }

    const raw = canvasToWorld(cx, cy);
    const snapped = snapPoint(raw.x, raw.z, getAllNodes(), wallSegments, snapGrid, snapEnabled);

    if (drawMode) {
        // Check if clicking on first node of chain (close polygon)
        if (drawingChain.length >= 2) {
            const first = drawingChain[0];
            const d = Math.sqrt((snapped.x - first.x) ** 2 + (snapped.z - first.z) ** 2);
            if (d < 0.4) {
                pushUndo();
                const prev = drawingChain[drawingChain.length - 1];
                wallSegments.push(createSegment(prev, first, currentWallHeight, 0.2, currentWallColor));
                drawingChain = [];
                clearPreviewMesh();
                rebuildScene();
                render2D();
                return;
            }
        }

        if (drawingChain.length > 0) {
            pushUndo();
            const prev = drawingChain[drawingChain.length - 1];
            wallSegments.push(createSegment(prev, snapped, currentWallHeight, 0.2, currentWallColor));
            clearPreviewMesh();
            rebuildScene();
        }
        drawingChain.push(snapped);
        render2D();
    } else {
        // Select mode — check node first, then segment
        const nodeHit = hitTestNode(raw.x, raw.z);
        if (nodeHit) {
            dragNodeRef = nodeHit.pt;
            dragStartPos = { ...nodeHit.pt };
            selectedSegId = nodeHit.segId;
            selectedOpeningId = null;
            updatePropsPanel();
            render2D();
            return;
        }
        const segHit = hitTestSegment(raw.x, raw.z);
        selectedSegId = segHit;
        selectedOpeningId = null;
        dragNodeRef = null;
        updatePropsPanel();
        render2D();
    }
}

function onMouseMove(e) {
    if (!canvas2d) return;
    const rect = canvas2d.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (isPanning) {
        camX -= (cx - panStart.x) / camScale;
        camY -= (cy - panStart.y) / camScale;
        panStart = { x: cx, y: cy };
        render2D();
        return;
    }

    const raw = canvasToWorld(cx, cy);
    previewPoint = snapPoint(raw.x, raw.z, getAllNodes(), wallSegments, snapGrid, snapEnabled);

    if (dragNodeRef && !drawMode) {
        const snapped = snapPoint(raw.x, raw.z, getAllNodes(), wallSegments, snapGrid, snapEnabled);
        wallSegments = applyNodeMove(wallSegments, dragNodeRef, snapped);
        dragNodeRef = snapped;
        rebuildScene();
    }

    // Update 3D ghost wall preview
    if (drawMode && drawingChain.length > 0) {
        updatePreviewMesh(drawingChain[drawingChain.length - 1], previewPoint);
    } else {
        clearPreviewMesh();
    }

    render2D();
}

function onMouseUp(e) {
    if (dragNodeRef) {
        pushUndo();
        dragNodeRef = null;
    }
    isPanning = false;
}

function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.85 : 1.18;
    camScale = Math.max(10, Math.min(200, camScale * factor));
    render2D();
}

function onContextMenu(e) { e.preventDefault(); }

function onKeyDown(e) {
    if (!isActive) return;
    if (e.key === 'Escape') {
        drawingChain = [];
        clearPreviewMesh();
        render2D();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !drawMode) {
        if (selectedOpeningId && selectedSegId) {
            pushUndo();
            wallSegments = wallSegments.map(s =>
                s.id === selectedSegId ? deleteOpening(s, selectedOpeningId) : s
            );
            selectedOpeningId = null;
            rebuildScene(); render2D(); updatePropsPanel();
        } else if (selectedSegId) {
            pushUndo();
            wallSegments = wallSegments.filter(s => s.id !== selectedSegId);
            selectedSegId = null;
            rebuildScene(); render2D(); updatePropsPanel();
        }
    }
}

// ── Properties panel ──────────────────────────────────────────────────────────
function updatePropsPanel() {
    const panel = document.getElementById('wePropsPanel');
    if (!panel) return;

    // Draw mode — only delete button
    if (drawMode) {
        panel.innerHTML = `
            <button class="modern-btn btn-danger" style="width:100%;font-size:10px;"
                onclick="window.weDeleteSelected()">🗑 Delete Selected Wall</button>
        `;
        return;
    }

    // Select mode — full properties
    const seg = wallSegments.find(s => s.id === selectedSegId);
    if (!seg) {
        panel.innerHTML = '<div style="font-size:11px;color:#5a5248;padding:8px 0;">Click a wall to select it</div>';
        return;
    }
    const len = computeSegmentLength(seg).toFixed(2);
    panel.innerHTML = `
        <div style="font-size:9px;color:#5a5248;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Wall Properties</div>
        <div class="room-size-label">Wall Style</div>
        <select style="margin-bottom:8px;" onchange="window.weUpdateSegProp('${seg.id}','wallStyle',this.value)">
            <option value="plain"    ${(seg.wallStyle||'plain')==='plain'    ?'selected':''}>🟫 Plain / Painted</option>
            <option value="brick"    ${(seg.wallStyle||'plain')==='brick'    ?'selected':''}>🧱 Brick</option>
            <option value="woodpanel"${(seg.wallStyle||'plain')==='woodpanel'?'selected':''}>🪵 Wood Panel</option>
            <option value="tile"     ${(seg.wallStyle||'plain')==='tile'     ?'selected':''}>⬜ Tile</option>
            <option value="concrete" ${(seg.wallStyle||'plain')==='concrete' ?'selected':''}>🔲 Concrete</option>
        </select>
        <div class="room-size-label">Wall Length (m)</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <button class="modern-btn" style="width:34px;height:34px;flex-shrink:0;font-size:16px;font-weight:700;"
                onclick="window.weResizeWall('${seg.id}',-0.5)">−</button>
            <div style="flex:1;text-align:center;font-size:13px;color:#f0ece4;font-weight:600;">${len}m</div>
            <button class="modern-btn" style="width:34px;height:34px;flex-shrink:0;font-size:16px;font-weight:700;"
                onclick="window.weResizeWall('${seg.id}',0.5)">+</button>
        </div>
        <div class="room-size-label">Wall Width (m)</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            <button class="modern-btn" style="width:34px;height:34px;flex-shrink:0;font-size:16px;font-weight:700;"
                onclick="window.weUpdateSegProp('${seg.id}','thickness',Math.max(0.05,+(${seg.thickness}-0.05).toFixed(2)))">−</button>
            <div style="flex:1;text-align:center;font-size:13px;color:#f0ece4;font-weight:600;">${seg.thickness}m</div>
            <button class="modern-btn" style="width:34px;height:34px;flex-shrink:0;font-size:16px;font-weight:700;"
                onclick="window.weUpdateSegProp('${seg.id}','thickness',Math.min(2,+(${seg.thickness}+0.05).toFixed(2)))">+</button>
        </div>
        <div class="room-size-label">Wall Height (m)</div>
        <input type="number" value="${seg.height}" min="1" max="10" step="0.1" style="margin-bottom:8px;"
            onchange="window.weUpdateSegProp('${seg.id}','height',parseFloat(this.value))">
        <div class="room-size-label">Color</div>
        <input type="color" value="${seg.color}" style="margin-bottom:8px;"
            onchange="window.weUpdateSegProp('${seg.id}','color',this.value)">
        <button class="modern-btn btn-danger" style="width:100%;margin-top:4px;font-size:10px;"
            onclick="window.weDeleteSelected()">🗑 Delete This Wall</button>
    `;
}

// ── Global helpers called from HTML ──────────────────────────────────────────
window.weUpdateSegProp = function(segId, prop, value) {
    pushUndo();
    wallSegments = wallSegments.map(s => s.id === segId ? { ...s, [prop]: value } : s);
    rebuildScene(); render2D(); updatePropsPanel();
};

window.weAddOpening = function(segId, type) {
    pushUndo();
    const seg = wallSegments.find(s => s.id === segId);
    if (!seg) return;
    const len = computeSegmentLength(seg);
    const op = {
        id: generateId(),
        type,
        position: len / 2,
        width:  type === 'door' ? 0.9 : 1.2,
        height: type === 'door' ? 2.1 : 1.2,
        sillHeight: type === 'door' ? 0 : 0.9
    };
    wallSegments = wallSegments.map(s => s.id === segId ? { ...s, openings: [...s.openings, op] } : s);
    rebuildScene(); render2D(); updatePropsPanel();
};

window.weDeleteOpening = function(segId, opId) {
    pushUndo();
    wallSegments = wallSegments.map(s => s.id === segId ? deleteOpening(s, opId) : s);
    rebuildScene(); render2D(); updatePropsPanel();
};

window.weUpdateOpening = function(segId, opId, prop, value) {
    pushUndo();
    wallSegments = wallSegments.map(s => {
        if (s.id !== segId) return s;
        const openings = s.openings.map(op => {
            if (op.id !== opId) return op;
            const updated = { ...op, [prop]: value };
            return clampOpening(updated, computeSegmentLength(s));
        });
        return { ...s, openings };
    });
    rebuildScene(); render2D(); updatePropsPanel();
};

// ── Activate / Deactivate ─────────────────────────────────────────────────────
// Called once on startup to register the scene
function initScene(scene) {
    _scene = scene;
    wallGroup  = new THREE.Group();
    floorGroup = new THREE.Group();
    scene.add(wallGroup);
    scene.add(floorGroup);
}

function activate(scene, camera, renderer) {
    if (isActive) return;
    isActive = true;
    _scene = scene;

    // Use current room height from sidebar
    const heightInput = document.getElementById('roomHeight');
    if (heightInput) currentWallHeight = parseFloat(heightInput.value) || 3;

    // Ensure groups are in scene
    if (!wallGroup)  { wallGroup  = new THREE.Group(); scene.add(wallGroup); }
    if (!floorGroup) { floorGroup = new THREE.Group(); scene.add(floorGroup); }
    if (!wallGroup.parent)  scene.add(wallGroup);
    if (!floorGroup.parent) scene.add(floorGroup);

    // Walls start fresh every session — only restored when a saved design is loaded
    localStorage.removeItem('wallEditorState'); // clear any old auto-saved state
    drawingChain = [];

    // Create 2D canvas
    canvas2d = document.createElement('canvas');
    canvas2d.id = 'canvas2d';
    const SIDEBAR = 280, TOOLBAR = 48, PROPS = 220;
    const availW = window.innerWidth - SIDEBAR - PROPS;
    const availH = window.innerHeight - TOOLBAR;
    const halfW = Math.floor(availW / 2);

    canvas2d.width  = halfW;
    canvas2d.height = availH;
    canvas2d.style.cssText = `
        position:fixed;
        left:${SIDEBAR}px;
        top:${TOOLBAR}px;
        width:${halfW}px;
        height:${availH}px;
        z-index:8;
        cursor:crosshair;
        background:#1a1714;
        border-right:1px solid #2e2a25;
    `;
    document.body.appendChild(canvas2d);
    ctx = canvas2d.getContext('2d');

    // Shrink Three.js canvas to right half
    const threeCanvas = renderer.domElement;
    threeCanvas.style.left  = (SIDEBAR + halfW) + 'px';
    threeCanvas.style.width = halfW + 'px';
    renderer.setSize(halfW, availH, false);
    camera.aspect = halfW / availH;
    camera.updateProjectionMatrix();

    // Inject wall editor UI into sidebar
    injectSidebarUI();

    // Bind events
    canvas2d.addEventListener('mousedown',   onMouseDown);
    canvas2d.addEventListener('mousemove',   onMouseMove);
    canvas2d.addEventListener('mouseup',     onMouseUp);
    canvas2d.addEventListener('wheel',       onWheel, { passive: false });
    canvas2d.addEventListener('contextmenu', onContextMenu);
    canvas2d.addEventListener('mouseleave',  () => { clearPreviewMesh(); previewPoint = null; render2D(); });
    document.addEventListener('keydown',     onKeyDown);

    render2D();
}

function deactivate(renderer, camera) {
    if (!isActive) return;
    isActive = false;
    drawingChain = [];
    clearPreviewMesh();

    // Remove 2D canvas
    if (canvas2d) {
        canvas2d.removeEventListener('mousedown',   onMouseDown);
        canvas2d.removeEventListener('mousemove',   onMouseMove);
        canvas2d.removeEventListener('mouseup',     onMouseUp);
        canvas2d.removeEventListener('wheel',       onWheel);
        canvas2d.removeEventListener('contextmenu', onContextMenu);
        canvas2d.remove();
        canvas2d = null;
        ctx = null;
    }
    document.removeEventListener('keydown', onKeyDown);

    // Restore Three.js canvas
    const SIDEBAR = 280, TOOLBAR = 48, PROPS = 220;
    const fullW = window.innerWidth - SIDEBAR - PROPS;
    const fullH = window.innerHeight - TOOLBAR;
    const threeCanvas = renderer.domElement;
    threeCanvas.style.left  = SIDEBAR + 'px';
    threeCanvas.style.width = fullW + 'px';
    renderer.setSize(fullW, fullH, false);
    camera.aspect = fullW / fullH;
    camera.updateProjectionMatrix();

    // Remove sidebar UI
    const weUI = document.getElementById('weUI');
    if (weUI) weUI.remove();

    // Keep wallGroup and floorGroup in scene — walls stay visible after closing
}

function injectSidebarUI() {
    const existing = document.getElementById('weUI');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'weUI';
    div.style.cssText = 'padding:0 0 12px 0;border-bottom:1px solid #2e2a25;margin-bottom:12px;';
    div.innerHTML = `
        <div style="font-size:9px;color:#5a5248;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;padding-top:4px;">Floor Plan Editor</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
            <button id="weDrawBtn" class="modern-btn" style="flex:1;background:rgba(201,169,110,0.15);border-color:rgba(201,169,110,0.4);color:#c9a96e;"
                onclick="window.weSetMode(true)">✦ Draw</button>
            <button id="weSelectBtn" class="modern-btn" style="flex:1;"
                onclick="window.weSetMode(false)">↖ Select</button>
        </div>
        <div id="wePropsPanel" style="margin-top:4px;"></div>
    `;

    // Insert at top of sidebar panel (after the logo link)
    const sidebar = document.querySelector('.glass-panel');
    if (sidebar) {
        const logo = sidebar.querySelector('a');
        if (logo && logo.nextSibling) {
            sidebar.insertBefore(div, logo.nextSibling);
        } else {
            sidebar.prepend(div);
        }
    }
}

// Global helpers for sidebar buttons
window.weSetMode = function(draw) {
    drawMode = draw;
    drawingChain = [];
    const drawBtn   = document.getElementById('weDrawBtn');
    const selectBtn = document.getElementById('weSelectBtn');
    if (drawBtn)   { drawBtn.style.background   = draw ? 'rgba(201,169,110,0.15)' : ''; drawBtn.style.borderColor   = draw ? 'rgba(201,169,110,0.4)' : ''; drawBtn.style.color   = draw ? '#c9a96e' : ''; }
    if (selectBtn) { selectBtn.style.background = draw ? '' : 'rgba(201,169,110,0.15)'; selectBtn.style.borderColor = draw ? '' : 'rgba(201,169,110,0.4)'; selectBtn.style.color = draw ? '' : '#c9a96e'; }
    updatePropsPanel();
    render2D();
};

window.weSetSnap = function(val) { snapGrid = val; render2D(); };
window.weToggleSnap = function(val) { snapEnabled = val; render2D(); };
window.weSetWallType = function(val) { currentWallType = val; };
window.weSetWallHeight = function(val) { if (val > 0) currentWallHeight = val; };
window.weResizeWall = function(segId, delta) {
    pushUndo();
    wallSegments = wallSegments.map(s => {
        if (s.id !== segId) return s;
        const dx = s.end.x - s.start.x;
        const dz = s.end.z - s.start.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) return s;
        const newLen = Math.max(0.5, len + delta);
        const ratio = newLen / len;
        return {
            ...s,
            end: {
                x: s.start.x + dx * ratio,
                z: s.start.z + dz * ratio
            }
        };
    });
    rebuildScene(); render2D(); updatePropsPanel();
};

window.weDeleteSelected = function() {
    if (!selectedSegId) { alert('Select a wall first'); return; }
    pushUndo();
    wallSegments = wallSegments.filter(s => s.id !== selectedSegId);
    selectedSegId = null;
    rebuildScene(); render2D(); updatePropsPanel();
};

window.weClearAll = function() {
    if (!confirm('Clear all walls?')) return;
    pushUndo();
    wallSegments = [];
    selectedSegId = null;
    rebuildScene(); render2D(); updatePropsPanel();
};

// ── Public API ────────────────────────────────────────────────────────────────
const wallEditor = {
    activate,
    deactivate,
    initScene,
    serialize() { return serializeFloorPlan(); },
    deserialize(json) { deserializeFloorPlan(json); rebuildScene(); render2D(); },
    applyWallColor(hex) {
        currentWallColor = hex;
        // Update all existing plain wall segments
        wallSegments = wallSegments.map(s =>
            s.wallType === 'plain' || !s.wallType ? { ...s, color: hex } : s
        );
        rebuildScene(); render2D();
    },
    applyFloorColor(hex) {
        currentFloorColor = hex;
        if (floorGroup) {
            floorGroup.traverse(obj => { if (obj.isMesh) obj.material.color.setStyle(hex); });
        }
    },
    setWallHeight(h) { currentWallHeight = h; },
    getUndoStack,
    undo,
    redo,
    isActive() { return isActive; },
    getSegments() { return wallSegments; },
};

export default wallEditor;
