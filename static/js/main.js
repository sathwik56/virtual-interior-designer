import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, orbitControls;
let furnitureList = [], selectedObjects = new Set(), walls = null, floor = null, grid = null, roof = null;
let draggedObject = null, dragOffset = new THREE.Vector3();

// First-person mode variables
let isWalkMode = false;
let moveSpeed = 0.1;
let lookSpeed = 0.002;
let keys = { w: false, a: false, s: false, d: false };
let yaw = 0, pitch = 0;
let velocity = new THREE.Vector3();

init();
animate();

window.addFurniture = addFurniture;
window.addSelectedFurniture = addSelectedFurniture;
window.rotateSelected = rotateSelected;
window.moveSelectedY = moveSelectedY;
window.scaleSelected = scaleSelected;
window.applyScaleFromSlider = applyScaleFromSlider;
window.changeWallColor = changeWallColor;
window.changeFloorColor = changeFloorColor;
window.changeRoofColor = changeRoofColor;
window.changeWallStyle = changeWallStyle;
window.toggleWalls = toggleWalls;
window.toggleGrid = toggleGrid;
window.toggleRoof = toggleRoof;
window.toggleWalkMode = toggleWalkMode;
window.saveDesign = saveDesign;
window.loadDesign = loadDesign;
window.deleteSelected = deleteSelected;
window.updateRoomSize = updateRoomSize;
window.manageDesigns = manageDesigns;
window.closeDesignsModal = closeDesignsModal;
window.loadDesignById = loadDesignById;
window.deleteDesignById = deleteDesignById;
window.undoAction = undoAction;
window.redoAction = redoAction;
window.resetCamera = resetCamera;
window.topView = topView;
window.captureScreenshot = captureScreenshot;
window.createFurniture = createFurniture;

function makeGrid(width, length) {
    const points = [];
    const hw = width / 2, hl = length / 2;
    const cols = Math.round(width);
    const rows = Math.round(length);

    // Vertical lines (along Z, spaced 1m apart on X)
    for (let i = 0; i <= cols; i++) {
        const x = -hw + i;
        points.push(x, 0, -hl,  x, 0, hl);
    }
    // Horizontal lines (along X, spaced 1m apart on Z)
    for (let j = 0; j <= rows; j++) {
        const z = -hl + j;
        points.push(-hw, 0, z,  hw, 0, z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.35 });
    const g = new THREE.LineSegments(geo, mat);
    g.position.y = 0.006;
    return g;
}

function makeFloorTexture(color) {
    // Subtle wood floor — soft grain only, no hard plank edges that clash with grid
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const hr = parseInt(color.slice(1,3)||'dc',16);
    const hg = parseInt(color.slice(3,5)||'d5',16);
    const hb = parseInt(color.slice(5,7)||'c8',16);

    // Base fill
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Very soft grain lines — no hard plank borders
    for (let g = 0; g < size; g += 6) {
        const alpha = 0.02 + Math.random() * 0.025;
        const wave = Math.sin(g * 0.03) * 4;
        ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(wave, g);
        ctx.lineTo(size + wave, g + 3);
        ctx.stroke();
    }

    // Subtle noise variation
    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 8;
        imgData.data[i]   = Math.min(255, Math.max(0, imgData.data[i]   + n));
        imgData.data[i+1] = Math.min(255, Math.max(0, imgData.data[i+1] + n));
        imgData.data[i+2] = Math.min(255, Math.max(0, imgData.data[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8c4cc); // slightly darker, richer viewport grey
    scene.fog = new THREE.FogExp2(0xb8c4cc, 0.018); // exponential fog = more natural depth

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 10, 12);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas"), antialias: true });
    const SIDEBAR_W = 280, TOOLBAR_H = 44, PROPS_W = 220;
    const vw = window.innerWidth - SIDEBAR_W - PROPS_W;
    const vh = window.innerHeight - TOOLBAR_H;
    renderer.setSize(vw, vh);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.left = SIDEBAR_W + 'px';
    renderer.domElement.style.top = TOOLBAR_H + 'px';
    camera.aspect = vw / vh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;  // slightly brighter, punchier
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
    orbitControls.screenSpacePanning = true;
    orbitControls.minDistance = 1;
    orbitControls.maxDistance = 60;

    // === BLENDER-STYLE LIGHTING ===

    // Sky/ground hemisphere — cool sky, warm ground bounce
    const hemiLight = new THREE.HemisphereLight(0xd6e8f5, 0xc4a87a, 0.9);
    scene.add(hemiLight);

    // Main sun — warm, angled like Blender default sun
    const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.5);
    sunLight.position.set(10, 16, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width  = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.left   = -30;
    sunLight.shadow.camera.right  =  30;
    sunLight.shadow.camera.top    =  30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.camera.near   = 0.5;
    sunLight.shadow.camera.far    = 80;
    sunLight.shadow.bias          = -0.0002;
    sunLight.shadow.normalBias    = 0.015;
    scene.add(sunLight);

    // Cool fill from opposite side — reduces harsh shadows, adds depth
    const fillLight = new THREE.DirectionalLight(0xb8d0f0, 0.7);
    fillLight.position.set(-8, 10, -10);
    scene.add(fillLight);

    // Warm bounce from below — simulates light bouncing off floor
    const bounceLight = new THREE.DirectionalLight(0xffd8a0, 0.3);
    bounceLight.position.set(0, -4, 0);
    scene.add(bounceLight);

    // Interior point light — warm ceiling glow like a real room
    const roomLight = new THREE.PointLight(0xfff0d0, 0.8, 40, 1.5);
    roomLight.position.set(0, 6, 0);
    scene.add(roomLight);

    // === FLOOR ===
    floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({
            color: 0xdcd5c8,
            map: makeFloorTexture('#dcd5c8'),
            roughness: 0.82,
            metalness: 0.02,
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid — 1m per cell, exact rectangle, no scaling artifacts
    grid = makeGrid(20, 20);
    scene.add(grid);

    // === WALLS ===
    walls = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0xf2ede8,
        roughness: 0.88,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
    backWall.position.set(0, 4, -10);
    backWall.receiveShadow = true;
    walls.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
    leftWall.position.set(-10, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    walls.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
    rightWall.position.set(10, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    walls.add(rightWall);

    scene.add(walls);

    // Create ceiling — soft white with subtle emissive to simulate ceiling light bounce
    roof = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ 
            color: 0xf8f6f2,
            roughness: 0.95,
            metalness: 0.0,
            emissive: 0xfff8f0,
            emissiveIntensity: 0.06,
            transparent: true,
            opacity: 0.82,
            side: THREE.DoubleSide 
        })
    );
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 8;
    roof.receiveShadow = true;
    roof.castShadow = false; // Glass doesn't cast hard shadows
    scene.add(roof);

    window.addEventListener("resize", () => {
        const vw = window.innerWidth - 280 - 220;
        const vh = window.innerHeight - 44;
        camera.aspect = vw / vh;
        camera.updateProjectionMatrix();
        renderer.setSize(vw, vh);
    });
}

function animate() {
    requestAnimationFrame(animate);
    updateWalkMode();
    orbitControls.update();
    renderer.render(scene, camera);
}

function createFurniture(type) {
    const group = new THREE.Group();

    // ── shared material helpers ──────────────────────────────────────
    const M = (color, rough=0.7, metal=0, opts={}) =>
        new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...opts });
    const box  = (w,h,d,mat) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    const cyl  = (rt,rb,h,mat,seg=16) => new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), mat);
    const sph  = (r,mat,seg=12) => new THREE.Mesh(new THREE.SphereGeometry(r,seg,seg), mat);
    const add  = (mesh,x,y,z) => { mesh.position.set(x,y,z); group.add(mesh); };

    if (type === 'bed') {
        // Realistic double bed
        const frameMat = M(0x4a2e1a, 0.6);
        const mattMat  = M(0xf5f0e8, 0.95);
        const pillowMat= M(0xffffff, 0.9);
        const sheetMat = M(0xe8e0d0, 0.95);
        // Frame
        add(box(2.2,0.12,2.0,frameMat), 0,0.06,0);
        // Legs
        [[0.95,0.85],[0.95,-0.85],[-0.95,0.85],[-0.95,-0.85]].forEach(([x,z])=>add(box(0.1,0.22,0.1,frameMat),x,0.11,z));
        // Side rails
        add(box(0.08,0.35,2.0,frameMat), 1.05,0.35,0);
        add(box(0.08,0.35,2.0,frameMat),-1.05,0.35,0);
        // Headboard - slatted
        add(box(2.2,0.06,0.08,frameMat), 0,0.55,-0.97);
        for(let i=-0.9;i<=0.9;i+=0.22) add(box(0.06,0.9,0.06,frameMat),i,0.95,-0.97);
        add(box(2.2,0.06,0.08,frameMat), 0,1.42,-0.97);
        // Footboard
        add(box(2.2,0.06,0.08,frameMat), 0,0.42,0.97);
        for(let i=-0.9;i<=0.9;i+=0.44) add(box(0.06,0.35,0.06,frameMat),i,0.6,0.97);
        add(box(2.2,0.06,0.08,frameMat), 0,0.78,0.97);
        // Mattress
        add(box(2.0,0.28,1.88,mattMat), 0,0.42,0);
        // Sheet
        add(box(2.0,0.04,1.2,sheetMat), 0,0.57,-0.3);
        // Pillows
        add(box(0.7,0.12,0.45,pillowMat),-0.5,0.62,-0.68);
        add(box(0.7,0.12,0.45,pillowMat), 0.5,0.62,-0.68);
    }
    else if (type === 'sofa') {
        const fab = M(0x7a6a5a,0.95); const wood = M(0x3a2010,0.6);
        // Legs
        [[1.1,0.35],[1.1,-0.35],[-1.1,0.35],[-1.1,-0.35]].forEach(([x,z])=>add(box(0.08,0.18,0.08,wood),x,0.09,z));
        // Base platform
        add(box(2.4,0.12,0.9,wood),0,0.24,0);
        // Three seat cushions
        [-0.78,0,0.78].forEach(x=>add(box(0.72,0.2,0.82,fab),x,0.42,0.02));
        // Back cushions
        [-0.78,0,0.78].forEach(x=>add(box(0.72,0.38,0.16,fab),x,0.62,-0.37));
        // Back frame
        add(box(2.4,0.06,0.18,wood),0,0.84,-0.37);
        // Arms
        add(box(0.18,0.42,0.9,fab), 1.11,0.45,0);
        add(box(0.18,0.42,0.9,fab),-1.11,0.45,0);
        // Arm tops
        add(box(0.22,0.06,0.94,wood), 1.11,0.69,0);
        add(box(0.22,0.06,0.94,wood),-1.11,0.69,0);
    }
    else if (type === 'table') {
        const wm = M(0xc9a87c,0.4); const lm = M(0xb89968,0.5);
        // Thick tabletop with edge bevel
        add(box(1.8,0.08,1.0,wm),0,0.76,0);
        add(box(1.76,0.04,0.96,M(0xd4b48c,0.3)),0,0.82,0);
        // Apron
        add(box(1.6,0.06,0.04,lm),0,0.72,0.46); add(box(1.6,0.06,0.04,lm),0,0.72,-0.46);
        add(box(0.04,0.06,0.9,lm),0.86,0.72,0); add(box(0.04,0.06,0.9,lm),-0.86,0.72,0);
        // Tapered legs
        [[0.78,0.42],[0.78,-0.42],[-0.78,0.42],[-0.78,-0.42]].forEach(([x,z])=>{
            add(box(0.07,0.72,0.07,lm),x,0.36,z);
        });
    }
    else if (type === 'chair') {
        const bm = M(0x1a1a1a,0.8); const gm = M(0x222222,0.5,0.6);
        // Seat with cushion
        add(box(0.52,0.06,0.52,gm),0,0.46,0);
        add(box(0.46,0.06,0.46,bm),0,0.52,0);
        // Backrest with lumbar
        add(box(0.48,0.5,0.06,bm),0,0.78,-0.23);
        add(box(0.44,0.12,0.04,M(0x333333,0.7)),0,0.62,-0.24);
        // Armrests
        add(box(0.04,0.04,0.3,gm), 0.22,0.62,-0.08);
        add(box(0.04,0.04,0.3,gm),-0.22,0.62,-0.08);
        // 5-star base
        for(let a=0;a<5;a++){
            const ang=a/5*Math.PI*2;
            const spoke=box(0.38,0.03,0.05,gm);
            spoke.rotation.y=ang; spoke.position.set(0,0.06,0); group.add(spoke);
            add(cyl(0.04,0.05,0.06,gm,8),Math.cos(ang)*0.18,0.03,Math.sin(ang)*0.18);
        }
        // Central pole
        add(cyl(0.03,0.03,0.38,gm),0,0.25,0);
    }
    else if (type === 'cabinet') {
        const bm = M(0x8a6a4a,0.5); const dm = M(0x6b5030,0.55); const hm = M(0xb0b0b0,0.2,0.9);
        // Body with toe kick
        add(box(1.2,0.08,0.55,dm),0,0.04,0);
        add(box(1.16,1.9,0.52,bm),0,1.03,0);
        // Top panel
        add(box(1.22,0.04,0.57,dm),0,1.99,0);
        // Two doors with inset panels
        [0.31,-0.31].forEach(x=>{
            add(box(0.56,1.78,0.03,dm),x,1.03,0.27);
            add(box(0.44,1.6,0.01,M(0x7a5c3a,0.6)),x,1.03,0.285);
            add(cyl(0.018,0.018,0.1,hm),x+(x>0?-0.14:0.14),1.03,0.3);
        });
        // Shelf inside (visible through gap)
        add(box(1.1,0.02,0.48,bm),0,1.0,0);
    }
    else if (type === 'desk') {
        const wm = M(0xf0ede8,0.25); const gm = M(0xd0cdc8,0.2,0.3);
        // Desktop with slight overhang
        add(box(2.0,0.05,0.9,wm),0,0.75,0);
        add(box(2.02,0.02,0.92,gm),0,0.78,0);
        // Left pedestal (drawers)
        add(box(0.5,0.72,0.82,M(0xe8e5e0,0.3)),-0.72,0.36,0);
        [0.54,0.36,0.18].forEach(y=>{
            add(box(0.44,0.16,0.78,M(0xdddad5,0.3)),-0.72,y,0.01);
            add(cyl(0.015,0.015,0.06,M(0xaaaaaa,0.2,0.8)),-0.72,y,0.42);
        });
        // Right leg panel
        add(box(0.05,0.72,0.82,M(0xe8e5e0,0.3)),0.9,0.36,0);
        // Cable tray underneath
        add(box(1.2,0.04,0.1,M(0xcccccc,0.4,0.5)),0,0.5,0.38);
    }
    else if (type === 'bookshelf') {
        const wm = M(0xc9a87c,0.55); const dm = M(0xa07850,0.6);
        // Side panels
        add(box(0.04,2.4,0.32,dm),-0.73,1.2,0); add(box(0.04,2.4,0.32,dm),0.73,1.2,0);
        // Top & bottom
        add(box(1.5,0.04,0.32,dm),0,2.38,0); add(box(1.5,0.04,0.32,dm),0,0.02,0);
        // Back panel
        add(box(1.46,2.36,0.02,M(0xb89060,0.8)),0,1.2,-0.15);
        // 5 shelves
        [0.42,0.82,1.22,1.62,2.0].forEach(y=>add(box(1.42,0.03,0.3,wm),0,y,0));
        // Books on shelves (colorful spines)
        const bookColors=[0xc0392b,0x2980b9,0x27ae60,0xf39c12,0x8e44ad,0x16a085,0xe74c3c,0x3498db];
        [0.44,0.84,1.24,1.64].forEach(sy=>{
            let bx=-0.6;
            bookColors.forEach((c,i)=>{
                const w=0.05+Math.random()*0.04;
                add(box(w,0.32,0.22,M(c,0.7)),bx+w/2,sy+0.18,0.02);
                bx+=w+0.005;
            });
        });
    }
    else if (type === 'nightstand') {
        const wm = M(0x9a7a5a,0.5); const dm = M(0x7a5a3a,0.55); const hm = M(0xb8b8b8,0.2,0.8);
        // Legs
        [[0.22,0.2],[0.22,-0.2],[-0.22,0.2],[-0.22,-0.2]].forEach(([x,z])=>add(cyl(0.02,0.025,0.18,dm),x,0.09,z));
        // Body
        add(box(0.55,0.42,0.42,wm),0,0.39,0);
        // Top
        add(box(0.6,0.03,0.47,dm),0,0.615,0);
        // Two drawers
        [0.48,0.3].forEach(y=>{
            add(box(0.5,0.17,0.02,dm),0,y,0.22);
            add(cyl(0.015,0.015,0.08,hm),0,y,0.24);
        });
        // Small lamp on top
        add(cyl(0.08,0.1,0.02,M(0x888888,0.3,0.7)),0,0.64,0);
        add(cyl(0.01,0.01,0.3,M(0x888888,0.3,0.7)),0,0.79,0);
        add(cyl(0.1,0.14,0.18,M(0xfffde0,0.5,0,{emissive:0xffee88,emissiveIntensity:0.3})),0,0.97,0);
    }
    else if (type === 'wardrobe') {
        const wm = M(0xf5f2ee,0.3); const fm = M(0xe0ddd8,0.35); const hm = M(0xaaaaaa,0.2,0.8);
        // Carcass
        add(box(2.2,2.6,0.62,M(0xece9e4,0.4)),0,1.3,0);
        // Top cornice
        add(box(2.26,0.08,0.66,fm),0,2.64,0);
        // Plinth
        add(box(2.18,0.1,0.6,fm),0,0.05,0);
        // Three doors
        [-0.72,0,0.72].forEach(x=>{
            add(box(0.7,2.42,0.03,wm),x,1.32,0.32);
            add(box(0.64,2.3,0.01,M(0xfafaf8,0.25)),x,1.32,0.335);
            // Handle
            add(cyl(0.012,0.012,0.14,hm),x+(x===0?0.28:x>0?-0.28:0.28),1.32,0.35);
        });
        // Mirror on middle door
        add(box(0.5,1.4,0.005,M(0xc8dde8,0.05,0.9,{transparent:true,opacity:0.6})),0,1.5,0.345);
    }
    else if (type === 'coffeetable') {
        const gm = M(0x90c8e0,0.05,0.1,{transparent:true,opacity:0.55}); const mm = M(0xc0c0c0,0.15,0.85);
        // Glass top with thick edge
        add(box(1.1,0.02,0.65,gm),0,0.42,0);
        add(box(1.12,0.04,0.67,M(0xa8c8d8,0.1,0.2,{transparent:true,opacity:0.4})),0,0.44,0);
        // X-frame base
        const xm = M(0xb0b0b0,0.2,0.8);
        const xb1 = box(0.06,0.38,0.9,xm); xb1.rotation.z=Math.atan2(0.38,0.9); xb1.position.set(0,0.21,0); group.add(xb1);
        const xb2 = box(0.06,0.38,0.9,xm); xb2.rotation.z=-Math.atan2(0.38,0.9); xb2.position.set(0,0.21,0); group.add(xb2);
        // Feet
        [[0.48,0.38],[0.48,-0.38],[-0.48,0.38],[-0.48,-0.38]].forEach(([x,z])=>add(box(0.08,0.04,0.08,mm),x,0.02,z));
    }
    else if (type === 'tvstand') {
        const bm = M(0x1e1e1e,0.4); const dm = M(0x2a2a2a,0.5); const gm = M(0x90b8c8,0.05,0.1,{transparent:true,opacity:0.4});
        // Main body
        add(box(2.2,0.55,0.45,bm),0,0.3,0);
        // Legs
        [[1.0,0.18],[1.0,-0.18],[-1.0,0.18],[-1.0,-0.18]].forEach(([x,z])=>add(box(0.06,0.1,0.06,M(0x111111,0.3,0.6)),x,0.05,z));
        // Three compartments
        add(box(0.02,0.48,0.42,dm),-0.62,0.3,0); add(box(0.02,0.48,0.42,dm),0.62,0.3,0);
        // Glass doors on outer compartments
        add(box(0.58,0.44,0.01,gm), 0,0.3,0.23);   // centre open
        add(box(0.58,0.44,0.01,gm),-0.92,0.3,0.23);
        add(box(0.58,0.44,0.01,gm), 0.92,0.3,0.23);
        // Top surface
        add(box(2.22,0.03,0.47,M(0x111111,0.2,0.4)),0,0.575,0);
        // TV screen above
        add(box(1.8,1.0,0.06,M(0x0a0a0a,0.1,0.3)),0,1.32,0.18);
        add(box(1.72,0.92,0.01,M(0x111820,0.05,0.1)),0,1.32,0.22);
        add(box(0.12,0.18,0.06,M(0x111111,0.3)),0,0.62,0.18);    }
    else if (type === 'dresser') {
        const wm = M(0x7a5030,0.5); const dm = M(0x5a3820,0.55); const hm = M(0xd4a840,0.2,0.8);
        // Body
        add(box(1.5,1.1,0.55,wm),0,0.59,0);
        // Top
        add(box(1.54,0.04,0.58,dm),0,1.16,0);
        // Plinth
        add(box(1.46,0.08,0.5,dm),0,0.04,0);
        // 3 rows of 2 drawers
        [0.88,0.56,0.24].forEach(y=>{
            [-0.37,0.37].forEach(x=>{
                add(box(0.68,0.26,0.02,dm),x,y,0.285);
                add(box(0.56,0.18,0.01,M(0x6a4428,0.6)),x,y,0.292);
                add(cyl(0.018,0.018,0.1,hm),x,y,0.3);
            });
        });
        // Mirror on top
        add(box(1.0,0.8,0.03,M(0xc8dde8,0.05,0.8,{transparent:true,opacity:0.6})),0,1.76,0.1);
        add(box(1.06,0.86,0.02,dm),0,1.76,0.08);
    }
    else if (type === 'armchair') {
        const fm = M(0xc8a878,0.9); const wm = M(0x5a3a1a,0.6);
        // Legs
        [[0.38,0.32],[0.38,-0.32],[-0.38,0.32],[-0.38,-0.32]].forEach(([x,z])=>add(cyl(0.025,0.03,0.2,wm),x,0.1,z));
        // Seat platform
        add(box(0.9,0.08,0.82,wm),0,0.22,0);
        // Seat cushion
        add(box(0.84,0.18,0.76,fm),0,0.35,0.02);
        // Back frame
        add(box(0.9,0.06,0.08,wm),0,0.62,-0.37);
        add(box(0.9,0.06,0.08,wm),0,1.08,-0.37);
        add(box(0.06,0.52,0.08,wm),-0.42,0.85,-0.37);
        add(box(0.06,0.52,0.08,wm), 0.42,0.85,-0.37);
        // Back cushion
        add(box(0.78,0.44,0.14,fm),0,0.85,-0.3);
        // Arms
        add(box(0.12,0.28,0.82,fm),-0.45,0.44,0); add(box(0.12,0.28,0.82,fm),0.45,0.44,0);
        add(box(0.16,0.04,0.86,wm),-0.45,0.6,0); add(box(0.16,0.04,0.86,wm),0.45,0.6,0);
    }
    else if (type === 'diningchair') {
        const wm = M(0x7a5520,0.55); const sm = M(0x4a3010,0.6);
        // Legs - slightly angled
        [[0.2,0.2],[0.2,-0.2],[-0.2,0.2],[-0.2,-0.2]].forEach(([x,z])=>add(box(0.04,0.44,0.04,sm),x,0.22,z));
        // Seat
        add(box(0.48,0.04,0.46,wm),0,0.46,0);
        add(box(0.44,0.06,0.42,M(0x8a6530,0.7)),0,0.5,0);
        // Back uprights
        add(box(0.04,0.52,0.04,sm),-0.2,0.72,-0.2); add(box(0.04,0.52,0.04,sm),0.2,0.72,-0.2);
        // Back slats
        [0.62,0.76,0.9].forEach(y=>add(box(0.38,0.03,0.03,wm),0,y,-0.2));
        // Top rail
        add(box(0.44,0.05,0.05,wm),0,0.98,-0.2);
    }
    else if (type === 'lamp') {
        const bm = M(0x888888,0.2,0.8); const sm = M(0xfffde0,0.5,0,{emissive:0xffee88,emissiveIntensity:0.5});
        // Weighted base
        add(cyl(0.14,0.16,0.04,bm),0,0.02,0);
        add(cyl(0.06,0.1,0.06,bm),0,0.07,0);
        // Pole with slight taper
        add(cyl(0.015,0.02,1.1,bm),0,0.62,0);
        // Shade support
        add(cyl(0.04,0.04,0.02,bm),0,1.19,0);
        // Shade (cone)
        add(cyl(0.22,0.08,0.28,sm),0,1.33,0);
        // Bulb glow
        add(sph(0.04,M(0xffffcc,0.1,0,{emissive:0xffffaa,emissiveIntensity:1.0})),0,1.22,0);
    }
    else if (type === 'interiorwall') {
        const wm = M(0xf5f2ee,0.85); const bm = M(0xe8e4de,0.9);
        add(box(3.0,2.6,0.15,wm),0,1.3,0);
        // Baseboard
        add(box(3.0,0.1,0.17,bm),0,0.05,0);
        // Crown molding
        add(box(3.0,0.08,0.17,bm),0,2.56,0);
    }
    else if (type === 'doorwall') {
        const wm = M(0xf5f2ee,0.85); const dm = M(0x7a5030,0.5); const hm = M(0xd4a020,0.1,0.9);
        // Wall sections around door
        add(box(1.0,2.6,0.15,wm),-1.0,1.3,0); add(box(1.0,2.6,0.15,wm),1.0,1.3,0);
        add(box(3.0,0.42,0.15,wm),0,2.39,0);
        // Baseboards
        add(box(3.0,0.1,0.17,M(0xe8e4de,0.9)),0,0.05,0);
        // Door frame
        add(box(0.08,2.1,0.18,dm),-0.46,1.05,0); add(box(0.08,2.1,0.18,dm),0.46,1.05,0);
        add(box(1.0,0.08,0.18,dm),0,2.14,0);
        // Door panel
        add(box(0.86,2.06,0.04,M(0x8a6040,0.45)),0.02,1.03,0.02);
        // Door panels (recessed)
        add(box(0.7,0.88,0.01,M(0x7a5030,0.5)),0.02,1.52,0.05);
        add(box(0.7,0.88,0.01,M(0x7a5030,0.5)),0.02,0.54,0.05);
        // Handle
        add(sph(0.025,hm),0.32,1.05,0.06);
        add(cyl(0.008,0.008,0.12,hm),0.32,1.05,0.06);
    }
    else if (type === 'windowwall') {
        const wm = M(0xf5f2ee,0.85); const fm = M(0xffffff,0.3); const gm = M(0x90c8e0,0.05,0.1,{transparent:true,opacity:0.35});
        // Wall sections
        add(box(3.0,0.7,0.15,wm),0,0.35,0);
        add(box(3.0,0.8,0.15,wm),0,2.2,0);
        add(box(0.75,1.1,0.15,wm),-1.12,1.35,0); add(box(0.75,1.1,0.15,wm),1.12,1.35,0);
        // Baseboards
        add(box(3.0,0.1,0.17,M(0xe8e4de,0.9)),0,0.05,0);
        // Window frame (white PVC)
        add(box(1.56,0.06,0.18,fm),0,1.84,0); add(box(1.56,0.06,0.18,fm),0,0.86,0);
        add(box(0.06,1.0,0.18,fm),-0.75,1.35,0); add(box(0.06,1.0,0.18,fm),0.75,1.35,0);
        add(box(0.04,1.0,0.18,fm),0,1.35,0); // centre mullion
        // Glass panes
        add(box(0.68,0.9,0.01,gm),-0.37,1.35,0.01); add(box(0.68,0.9,0.01,gm),0.37,1.35,0.01);
        // Window sill
        add(box(1.6,0.06,0.22,M(0xf0ede8,0.4)),0,0.83,0.04);
    }
    else if (type === 'glasswall') {
        // Realistic glass wall: aluminium frame + 3 glass panels + floor track
        const fm = M(0x9a9a9a, 0.2, 0.85); // aluminium frame
        const gm = new THREE.MeshStandardMaterial({ color: 0xb8d8e8, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.15 });
        // Floor track
        add(box(3.0, 0.06, 0.1, fm), 0, 0.03, 0);
        // Top rail
        add(box(3.0, 0.08, 0.1, fm), 0, 2.62, 0);
        // Outer verticals
        add(box(0.07, 2.6, 0.1, fm), -1.46, 1.3, 0);
        add(box(0.07, 2.6, 0.1, fm),  1.46, 1.3, 0);
        // Two inner mullions dividing into 3 panels
        add(box(0.05, 2.6, 0.1, fm), -0.49, 1.3, 0);
        add(box(0.05, 2.6, 0.1, fm),  0.49, 1.3, 0);
        // Mid horizontal rail
        add(box(3.0, 0.05, 0.08, fm), 0, 1.3, 0);
        // 6 glass panes (3 columns × 2 rows)
        [-0.97, 0, 0.97].forEach(x => {
            add(new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.2, 0.01), gm), x, 1.96, 0);
            add(new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.2, 0.01), gm), x, 0.68, 0);
        });
        // Door handle on centre panel
        add(cyl(0.012, 0.012, 0.14, M(0xcccccc, 0.1, 0.9)), 0.38, 1.3, 0.06);
    }
    else if (type === 'straightstairs') {
        // Realistic straight staircase: 10 steps, treads + risers + stringers + balusters + handrail
        const SC = 10, SW = 1.2, SD = 0.28, SH = 0.175, TT = 0.04, RT = 0.02, RAILH = 0.9;
        const wm = M(0xa0673a, 0.45); const rm = M(0x8b5e3c, 0.55); const bm = M(0x888888, 0.3, 0.7);
        const railMat = M(0x5c3317, 0.35);
        const lPts = [], rPts = [];
        for (let i = 0; i < SC; i++) {
            const y = i * SH, z = i * SD;
            // Tread
            const tr = new THREE.Mesh(new THREE.BoxGeometry(SW, TT, SD + 0.02), wm);
            tr.position.set(0, y + TT/2, z + SD/2); group.add(tr);
            // Riser
            const ri = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, RT), rm);
            ri.position.set(0, y - SH/2 + TT, z); group.add(ri);
            // Balusters
            [[-SW/2+0.06], [SW/2-0.06]].forEach(([bx]) => {
                [0.25, 0.75].forEach(f => {
                    const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,RAILH-0.05,6), bm);
                    bal.position.set(bx, y+TT+(RAILH-0.05)/2, z+SD*f); group.add(bal);
                });
            });
            lPts.push(new THREE.Vector3(-SW/2+0.06, y+TT+RAILH, z));
            rPts.push(new THREE.Vector3( SW/2-0.06, y+TT+RAILH, z));
        }
        lPts.push(new THREE.Vector3(-SW/2+0.06, SC*SH+TT+RAILH, SC*SD));
        rPts.push(new THREE.Vector3( SW/2-0.06, SC*SH+TT+RAILH, SC*SD));
        [lPts, rPts].forEach(pts => {
            const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), SC*6, 0.028, 8, false), railMat);
            group.add(tube);
        });
        // Newel posts
        [[-SW/2+0.06,0,0],[SW/2-0.06,0,0],[-SW/2+0.06,SC*SH,SC*SD],[SW/2-0.06,SC*SH,SC*SD]].forEach(([nx,ny,nz])=>{
            const np = new THREE.Mesh(new THREE.BoxGeometry(0.07,SC*SH+RAILH+0.15,0.07), railMat);
            np.position.set(nx, ny+(SC*SH+RAILH+0.15)/2, nz); group.add(np);
        });
        // Stringers
        const sLen = Math.sqrt((SC*SD)**2+(SC*SH)**2), ang = Math.atan2(SC*SH,SC*SD);
        [-SW/2, SW/2].forEach(sx => {
            const st = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.22,sLen), rm);
            st.rotation.x = -ang; st.position.set(sx, SC*SH/2, SC*SD/2); group.add(st);
        });
    }
    else if (type === 'lshapedstairs') {
        // Realistic L-shaped staircase: 6 steps up, landing, 6 steps turning right
        const SC=6, SW=1.1, SD=0.28, SH=0.175, TT=0.04, RT=0.02, RAILH=0.9;
        const wm=M(0xa0673a,0.45), rm=M(0x8b5e3c,0.55), bm=M(0x888888,0.3,0.7), railMat=M(0x5c3317,0.35);
        const fRise=SC*SH, fRun=SC*SD;
        // Flight 1: along +Z
        const r1Pts=[];
        for(let i=0;i<SC;i++){
            const y=i*SH, z=i*SD;
            const tr=new THREE.Mesh(new THREE.BoxGeometry(SW,TT,SD+0.02),wm); tr.position.set(0,y+TT/2,z+SD/2); group.add(tr);
            const ri=new THREE.Mesh(new THREE.BoxGeometry(SW,SH,RT),rm); ri.position.set(0,y-SH/2+TT,z); group.add(ri);
            [0.25,0.75].forEach(f=>{
                const bal=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,RAILH-0.05,6),bm);
                bal.position.set(-SW/2+0.06,y+TT+(RAILH-0.05)/2,z+SD*f); group.add(bal);
            });
            r1Pts.push(new THREE.Vector3(-SW/2+0.06,y+TT+RAILH,z));
        }
        r1Pts.push(new THREE.Vector3(-SW/2+0.06,fRise+TT+RAILH,fRun));
        const tube1=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r1Pts),SC*6,0.028,8,false),railMat); group.add(tube1);
        // Landing
        const lD=SD*1.4, lY=fRise, lZ=fRun;
        const land=new THREE.Mesh(new THREE.BoxGeometry(SW,TT,lD),wm); land.position.set(0,lY+TT/2,lZ+lD/2); group.add(land);
        // Flight 2: along +X from landing
        const r2Pts=[];
        for(let i=0;i<SC;i++){
            const y=lY+i*SH, x=i*SD;
            const tr=new THREE.Mesh(new THREE.BoxGeometry(SD+0.02,TT,SW),wm); tr.position.set(x+SD/2,y+TT/2,lZ+lD/2); group.add(tr);
            const ri=new THREE.Mesh(new THREE.BoxGeometry(RT,SH,SW),rm); ri.position.set(x,y-SH/2+TT,lZ+lD/2); group.add(ri);
            [0.25,0.75].forEach(f=>{
                const bal=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,RAILH-0.05,6),bm);
                bal.position.set(x+SD*f,y+TT+(RAILH-0.05)/2,lZ+lD-SW/2+0.06); group.add(bal);
            });
            r2Pts.push(new THREE.Vector3(x,y+TT+RAILH,lZ+lD-SW/2+0.06));
        }
        r2Pts.push(new THREE.Vector3(SC*SD,lY+fRise+TT+RAILH,lZ+lD-SW/2+0.06));
        const tube2=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r2Pts),SC*6,0.028,8,false),railMat); group.add(tube2);
        // Stringers
        const sLen=Math.sqrt(fRun**2+fRise**2), ang=Math.atan2(fRise,fRun);
        const st1=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.22,sLen),rm); st1.rotation.x=-ang; st1.position.set(-SW/2,fRise/2,fRun/2); group.add(st1);
        const st2=new THREE.Mesh(new THREE.BoxGeometry(sLen,0.22,0.04),rm); st2.rotation.z=ang; st2.position.set(fRun/2,lY+fRise/2,lZ+lD/2); group.add(st2);
    }
    else if (type === 'ushapedstairs') {
        /*
         * Realistic U-Shaped Staircase
         * Layout (top view):
         *
         *   [Flight 2 going DOWN ←]   gap   [Flight 1 going UP →]
         *   ════════════════════════[LANDING]════════════════════
         *
         * Flight 1: starts at floor, goes UP along +Z (left side, x = -1.5 to -0.3)
         * Landing : wide platform at the top of flight 1 / bottom of flight 2
         * Flight 2: starts at landing height, goes UP along -Z (right side, x = 0.3 to 1.5)
         *
         * Each step has: tread (horizontal) + riser (vertical face)
         * Stringers (diagonal side boards) run under each flight
         * Balusters every step, continuous handrail tube on each side
         */

        const STEPS       = 8;          // steps per flight
        const SW          = 1.1;        // step width (X)
        const SD          = 0.28;       // step depth (Z, tread run)
        const SH          = 0.175;      // step height (riser)
        const RAIL_H      = 0.9;        // handrail height above tread nosing
        const GAP         = 0.35;       // gap between the two flights (centre void)
        const TREAD_T     = 0.04;       // tread thickness
        const RISER_T     = 0.02;       // riser thickness

        // Materials
        const woodMat   = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.55 });
        const treadMat  = new THREE.MeshStandardMaterial({ color: 0xa0673a, roughness: 0.45 });
        const railMat   = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.35, metalness: 0.05 });
        const metalMat  = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.7 });

        // X centres of each flight
        const x1 = -(GAP / 2 + SW / 2);   // flight 1 centre X  (left)
        const x2 =  (GAP / 2 + SW / 2);   // flight 2 centre X  (right)

        // Total rise of one flight
        const flightRise = STEPS * SH;
        // Total run of one flight
        const flightRun  = STEPS * SD;

        // Z origin: steps start at z = 0, go to z = flightRun
        const zStart = 0;

        // ── Helper: add a baluster at a given position ──────────────────
        function addBaluster(x, baseY, z) {
            const h = RAIL_H - 0.05;
            const bal = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, h, 6),
                metalMat
            );
            bal.position.set(x, baseY + h / 2, z);
            group.add(bal);
        }

        // ── Helper: add a continuous handrail tube along a set of points ─
        function addRail(pts) {
            const curve = new THREE.CatmullRomCurve3(pts);
            const tube  = new THREE.Mesh(
                new THREE.TubeGeometry(curve, pts.length * 6, 0.028, 8, false),
                railMat
            );
            group.add(tube);
        }

        // ════════════════════════════════════════════════════════════════
        // FLIGHT 1  — left side (x1), ascending along +Z
        // ════════════════════════════════════════════════════════════════
        const rail1OuterPts = [];
        const rail1InnerPts = [];

        for (let i = 0; i < STEPS; i++) {
            const stepY = i * SH;          // top of this tread
            const stepZ = zStart + i * SD; // front edge of tread

            // Tread (horizontal board)
            const tread = new THREE.Mesh(
                new THREE.BoxGeometry(SW, TREAD_T, SD + 0.02), // slight overhang (nosing)
                treadMat
            );
            tread.position.set(x1, stepY + TREAD_T / 2, stepZ + SD / 2);
            group.add(tread);

            // Riser (vertical face)
            const riser = new THREE.Mesh(
                new THREE.BoxGeometry(SW, SH, RISER_T),
                woodMat
            );
            riser.position.set(x1, stepY - SH / 2 + TREAD_T, stepZ);
            group.add(riser);

            // Balusters: outer (left) and inner (right) edges
            addBaluster(x1 - SW / 2 + 0.06, stepY + TREAD_T, stepZ + SD * 0.25);
            addBaluster(x1 - SW / 2 + 0.06, stepY + TREAD_T, stepZ + SD * 0.75);
            addBaluster(x1 + SW / 2 - 0.06, stepY + TREAD_T, stepZ + SD * 0.25);
            addBaluster(x1 + SW / 2 - 0.06, stepY + TREAD_T, stepZ + SD * 0.75);

            // Rail points at nosing of each step
            rail1OuterPts.push(new THREE.Vector3(x1 - SW / 2 + 0.06, stepY + TREAD_T + RAIL_H, stepZ));
            rail1InnerPts.push(new THREE.Vector3(x1 + SW / 2 - 0.06, stepY + TREAD_T + RAIL_H, stepZ));
        }
        // Final rail point at top of flight 1
        rail1OuterPts.push(new THREE.Vector3(x1 - SW / 2 + 0.06, flightRise + TREAD_T + RAIL_H, zStart + flightRun));
        rail1InnerPts.push(new THREE.Vector3(x1 + SW / 2 - 0.06, flightRise + TREAD_T + RAIL_H, zStart + flightRun));

        addRail(rail1OuterPts);
        addRail(rail1InnerPts);

        // Stringer (diagonal side board) for flight 1 — outer side
        {
            const sLen = Math.sqrt(flightRun * flightRun + flightRise * flightRise);
            const angle = Math.atan2(flightRise, flightRun);
            const stringer = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.22, sLen),
                woodMat
            );
            stringer.rotation.x = -angle;
            stringer.position.set(
                x1 - SW / 2,
                flightRise / 2,
                zStart + flightRun / 2
            );
            group.add(stringer);
        }

        // ════════════════════════════════════════════════════════════════
        // LANDING  — connects the two flights
        // ════════════════════════════════════════════════════════════════
        const landingW  = SW * 2 + GAP;          // full width (covers both flights + gap)
        const landingD  = SD * 1.5;              // landing depth (generous)
        const landingY  = flightRise;            // top surface Y
        const landingZ  = zStart + flightRun;    // front edge Z

        const landingTop = new THREE.Mesh(
            new THREE.BoxGeometry(landingW, TREAD_T, landingD),
            treadMat
        );
        landingTop.position.set(0, landingY + TREAD_T / 2, landingZ + landingD / 2);
        group.add(landingTop);

        // Landing fascia (front edge board)
        const landingFront = new THREE.Mesh(
            new THREE.BoxGeometry(landingW, SH * 1.5, RISER_T),
            woodMat
        );
        landingFront.position.set(0, landingY - SH * 0.75 + TREAD_T, landingZ);
        group.add(landingFront);

        // Landing handrail across the back (connecting the two flights)
        const landingRailZ = landingZ + landingD;
        addRail([
            new THREE.Vector3(x1 - SW / 2 + 0.06, landingY + TREAD_T + RAIL_H, landingRailZ),
            new THREE.Vector3(x2 + SW / 2 - 0.06, landingY + TREAD_T + RAIL_H, landingRailZ)
        ]);
        // Landing balusters at back
        for (let bx = x1 - SW / 2 + 0.06; bx <= x2 + SW / 2 - 0.06; bx += 0.35) {
            addBaluster(bx, landingY + TREAD_T, landingRailZ - 0.05);
        }

        // ════════════════════════════════════════════════════════════════
        // FLIGHT 2  — right side (x2), ascending along -Z (coming back)
        // ════════════════════════════════════════════════════════════════
        const rail2OuterPts = [];
        const rail2InnerPts = [];

        for (let i = 0; i < STEPS; i++) {
            const stepY = landingY + i * SH;
            // Flight 2 goes in -Z direction from landing back edge
            const stepZ = landingZ + landingD - i * SD;

            // Tread
            const tread = new THREE.Mesh(
                new THREE.BoxGeometry(SW, TREAD_T, SD + 0.02),
                treadMat
            );
            tread.position.set(x2, stepY + TREAD_T / 2, stepZ - SD / 2);
            group.add(tread);

            // Riser
            const riser = new THREE.Mesh(
                new THREE.BoxGeometry(SW, SH, RISER_T),
                woodMat
            );
            riser.position.set(x2, stepY - SH / 2 + TREAD_T, stepZ);
            group.add(riser);

            // Balusters
            addBaluster(x2 - SW / 2 + 0.06, stepY + TREAD_T, stepZ - SD * 0.25);
            addBaluster(x2 - SW / 2 + 0.06, stepY + TREAD_T, stepZ - SD * 0.75);
            addBaluster(x2 + SW / 2 - 0.06, stepY + TREAD_T, stepZ - SD * 0.25);
            addBaluster(x2 + SW / 2 - 0.06, stepY + TREAD_T, stepZ - SD * 0.75);

            // Rail points
            rail2InnerPts.push(new THREE.Vector3(x2 - SW / 2 + 0.06, stepY + TREAD_T + RAIL_H, stepZ));
            rail2OuterPts.push(new THREE.Vector3(x2 + SW / 2 - 0.06, stepY + TREAD_T + RAIL_H, stepZ));
        }
        // Final rail point at top of flight 2
        const topZ2 = landingZ + landingD - STEPS * SD;
        rail2InnerPts.push(new THREE.Vector3(x2 - SW / 2 + 0.06, landingY + flightRise + TREAD_T + RAIL_H, topZ2));
        rail2OuterPts.push(new THREE.Vector3(x2 + SW / 2 - 0.06, landingY + flightRise + TREAD_T + RAIL_H, topZ2));

        addRail(rail2OuterPts);
        addRail(rail2InnerPts);

        // Stringer for flight 2 — outer side
        {
            const sLen = Math.sqrt(flightRun * flightRun + flightRise * flightRise);
            const angle = Math.atan2(flightRise, flightRun);
            const stringer = new THREE.Mesh(
                new THREE.BoxGeometry(0.04, 0.22, sLen),
                woodMat
            );
            stringer.rotation.x = angle; // reversed direction
            stringer.position.set(
                x2 + SW / 2,
                landingY + flightRise / 2,
                landingZ + landingD - flightRun / 2
            );
            group.add(stringer);
        }

        // ════════════════════════════════════════════════════════════════
        // NEWEL POSTS  — thick corner posts at key transition points
        // ════════════════════════════════════════════════════════════════
        const newelH = flightRise + RAIL_H + 0.15;
        const newelPositions = [
            // Bottom of flight 1 (outer & inner)
            [x1 - SW / 2 + 0.06, 0, zStart],
            [x1 + SW / 2 - 0.06, 0, zStart],
            // Top of flight 1 / landing (outer & inner)
            [x1 - SW / 2 + 0.06, landingY, landingZ + landingD],
            [x1 + SW / 2 - 0.06, landingY, landingZ + landingD],
            // Bottom of flight 2 / landing (outer & inner)
            [x2 - SW / 2 + 0.06, landingY, landingZ + landingD],
            [x2 + SW / 2 - 0.06, landingY, landingZ + landingD],
            // Top of flight 2
            [x2 - SW / 2 + 0.06, landingY + flightRise, topZ2],
            [x2 + SW / 2 - 0.06, landingY + flightRise, topZ2],
        ];
        newelPositions.forEach(([nx, ny, nz]) => {
            const newel = new THREE.Mesh(
                new THREE.BoxGeometry(0.07, newelH, 0.07),
                railMat
            );
            newel.position.set(nx, ny + newelH / 2, nz);
            group.add(newel);
        });
    }
    // ── BATHROOM ────────────────────────────────────────────────────
    else if (type === 'bathtub') {
        const wm=M(0xfafafa,0.15); const cm=M(0xcccccc,0.2,0.7);
        // Outer shell
        add(box(1.7,0.55,0.8,wm),0,0.275,0);
        // Inner cavity (dark)
        add(box(1.5,0.35,0.6,M(0xe0e8ec,0.3)),0,0.42,0);
        // Rim
        add(box(1.72,0.04,0.82,M(0xf0f0f0,0.1)),0,0.56,0);
        // Feet
        [[-0.72,-0.34],[0.72,-0.34],[-0.72,0.34],[0.72,0.34]].forEach(([x,z])=>add(cyl(0.04,0.05,0.08,cm),x,0.04,z));
        // Tap
        add(cyl(0.02,0.02,0.18,cm),0.6,0.62,0.3);
        add(cyl(0.025,0.025,0.12,cm),0.6,0.72,0.3);
        add(box(0.18,0.02,0.02,cm),0.6,0.78,0.3);
    }
    else if (type === 'toilet') {
        const wm=M(0xfafafa,0.15); const cm=M(0xdddddd,0.2);
        // Base/pedestal
        add(box(0.42,0.38,0.55,wm),0,0.19,0);
        // Bowl
        add(box(0.4,0.12,0.5,wm),0,0.44,0.02);
        // Seat
        add(box(0.38,0.03,0.46,M(0xf0f0f0,0.2)),0,0.51,0.02);
        // Lid
        add(box(0.38,0.03,0.44,M(0xf8f8f8,0.15)),0,0.54,-0.02);
        // Tank
        add(box(0.38,0.32,0.18,wm),0,0.73,-0.2);
        add(box(0.4,0.04,0.2,cm),0,0.9,-0.2);
        // Flush button
        add(cyl(0.025,0.025,0.02,M(0xaaaaaa,0.2,0.6)),0,0.93,-0.2);
    }
    else if (type === 'sink') {
        const wm=M(0xfafafa,0.1); const cm=M(0xbbbbbb,0.15,0.8);
        // Pedestal
        add(cyl(0.1,0.14,0.62,wm),0,0.31,0);
        // Basin
        add(box(0.6,0.12,0.48,wm),0,0.68,0);
        // Inner bowl
        add(box(0.5,0.08,0.38,M(0xe8eef2,0.1)),0,0.72,0);
        // Rim
        add(box(0.62,0.03,0.5,M(0xf5f5f5,0.1)),0,0.75,0);
        // Tap
        add(cyl(0.015,0.015,0.12,cm),0,0.84,0.1);
        add(box(0.14,0.02,0.02,cm),0,0.9,0.1);
        add(cyl(0.02,0.02,0.06,cm),-0.06,0.9,0.1);
        add(cyl(0.02,0.02,0.06,cm), 0.06,0.9,0.1);
    }
    // ── KITCHEN ─────────────────────────────────────────────────────
    else if (type === 'kitchencounter') {
        const bm=M(0xf0ede8,0.3); const cm=M(0x2a2a2a,0.15,0.3); const dm=M(0xe0ddd8,0.35);
        // Cabinet body
        add(box(2.4,0.88,0.62,bm),0,0.44,0);
        // Countertop
        add(box(2.44,0.05,0.66,cm),0,0.9,0.02);
        // Toe kick
        add(box(2.36,0.1,0.58,M(0xd8d5d0,0.5)),0,0.05,0);
        // 4 cabinet doors
        [-0.9,-0.3,0.3,0.9].forEach(x=>{
            add(box(0.56,0.72,0.02,dm),x,0.48,0.32);
            add(box(0.44,0.58,0.01,M(0xd8d5d0,0.4)),x,0.48,0.33);
            add(cyl(0.012,0.012,0.1,M(0xaaaaaa,0.2,0.8)),x,0.48,0.34);
        });
        // Sink cutout area (visual)
        add(box(0.5,0.04,0.38,M(0xc8d8e0,0.1,0.2)),0,0.92,0);
        // Tap
        add(cyl(0.015,0.015,0.14,M(0xbbbbbb,0.1,0.9)),0,1.0,0);
        add(box(0.18,0.02,0.02,M(0xbbbbbb,0.1,0.9)),0,1.08,0);
    }
    else if (type === 'kitchenisland') {
        const bm=M(0xf5f2ee,0.3); const cm=M(0x1a1a1a,0.1,0.3); const dm=M(0xe8e5e0,0.35);
        // Body
        add(box(1.6,0.9,0.9,bm),0,0.45,0);
        // Countertop (dark marble look)
        add(box(1.64,0.05,0.94,cm),0,0.925,0);
        // Toe kick all sides
        add(box(1.52,0.1,0.86,M(0xd8d5d0,0.5)),0,0.05,0);
        // Doors on both sides
        [-0.5,0.5].forEach(x=>{
            add(box(0.56,0.72,0.02,dm),x,0.49,0.46);
            add(cyl(0.012,0.012,0.1,M(0xaaaaaa,0.2,0.8)),x,0.49,0.47);
        });
        // Bar stools suggestion (small cylinders)
        [-0.5,0.5].forEach(x=>{
            add(cyl(0.12,0.14,0.02,M(0x888888,0.3,0.5)),x,0.72,-0.62);
            add(cyl(0.02,0.02,0.28,M(0x888888,0.3,0.5)),x,0.58,-0.62);
        });
    }
    else if (type === 'fridge') {
        const bm=M(0xf0f0f0,0.15,0.3); const dm=M(0xe0e0e0,0.2,0.4); const hm=M(0xaaaaaa,0.1,0.9);
        // Body
        add(box(0.72,1.8,0.7,bm),0,0.9,0);
        // Freezer door (top 1/3)
        add(box(0.7,0.56,0.02,dm),0,1.52,0.36);
        add(box(0.62,0.48,0.01,M(0xe8e8e8,0.15,0.3)),0,1.52,0.37);
        add(cyl(0.012,0.012,0.3,hm),0.28,1.52,0.38);
        // Fridge door (bottom 2/3)
        add(box(0.7,1.16,0.02,dm),0,0.62,0.36);
        add(box(0.62,1.08,0.01,M(0xe8e8e8,0.15,0.3)),0,0.62,0.37);
        add(cyl(0.012,0.012,0.3,hm),0.28,0.62,0.38);
        // Dispenser panel
        add(box(0.18,0.22,0.02,M(0xcccccc,0.2,0.5)),-0.2,0.9,0.37);
        // Feet
        [[-0.3,-0.28],[0.3,-0.28],[-0.3,0.28],[0.3,0.28]].forEach(([x,z])=>add(cyl(0.03,0.04,0.06,M(0x888888,0.3,0.5)),x,0.03,z));
    }
    else if (type === 'stove') {
        const bm=M(0x1a1a1a,0.3,0.4); const sm=M(0x888888,0.2,0.6); const gm=M(0x333333,0.4,0.3);
        // Body
        add(box(0.7,0.88,0.65,bm),0,0.44,0);
        // Cooktop surface
        add(box(0.68,0.03,0.63,M(0x111111,0.1,0.5)),0,0.9,0);
        // 4 burners
        [[-0.2,-0.15],[-0.2,0.15],[0.2,-0.15],[0.2,0.15]].forEach(([x,z])=>{
            add(cyl(0.1,0.1,0.01,gm),x,0.92,z);
            add(cyl(0.04,0.04,0.01,M(0x555555,0.3,0.4)),x,0.93,z);
        });
        // Oven door
        add(box(0.62,0.44,0.02,M(0x222222,0.2,0.4)),0,0.28,0.34);
        add(box(0.54,0.36,0.01,M(0x444444,0.1,0.2,{transparent:true,opacity:0.7})),0,0.28,0.35);
        // Handle
        add(box(0.5,0.03,0.03,sm),0,0.52,0.36);
        // Control knobs
        [-0.24,-0.08,0.08,0.24].forEach(x=>add(cyl(0.025,0.025,0.04,sm),x,0.88,0.34));
        // Backsplash
        add(box(0.7,0.3,0.03,bm),0,1.05,-0.3);
    }
    // ── OFFICE ──────────────────────────────────────────────────────
    else if (type === 'officepartition') {
        const fm=M(0xd0ccc8,0.6); const gm=new THREE.MeshStandardMaterial({color:0xb8d0d8,transparent:true,opacity:0.4,roughness:0.05});
        // Frame
        add(box(0.05,1.6,0.05,M(0x888888,0.2,0.7)),-0.97,0.8,0);
        add(box(0.05,1.6,0.05,M(0x888888,0.2,0.7)), 0.97,0.8,0);
        add(box(2.0,0.05,0.05,M(0x888888,0.2,0.7)),0,1.62,0);
        add(box(2.0,0.05,0.05,M(0x888888,0.2,0.7)),0,0.02,0);
        // Fabric lower panel
        add(box(1.88,0.8,0.04,fm),0,0.44,0);
        // Glass upper panel
        add(new THREE.Mesh(new THREE.BoxGeometry(1.88,0.72,0.01),gm),0,1.24,0);
    }
    else if (type === 'whiteboard') {
        const fm=M(0x888888,0.3,0.5); const wm=M(0xfafafa,0.05);
        // Frame
        add(box(2.0,0.06,0.06,fm),0,1.22,0); add(box(2.0,0.06,0.06,fm),0,0.06,0);
        add(box(0.06,1.2,0.06,fm),-0.97,0.64,0); add(box(0.06,1.2,0.06,fm),0.97,0.64,0);
        // Board surface
        add(box(1.88,1.1,0.02,wm),0,0.64,0.02);
        // Tray
        add(box(1.88,0.04,0.08,M(0x777777,0.3,0.4)),0,0.1,0.04);
        // Marker
        add(box(0.12,0.02,0.02,M(0x222222,0.5)),-0.5,0.12,0.08);
    }
    else if (type === 'filingcabinet') {
        const bm=M(0x8a9aaa,0.4,0.3); const dm=M(0x7a8a9a,0.45,0.35); const hm=M(0xcccccc,0.1,0.9);
        // Body
        add(box(0.48,1.32,0.62,bm),0,0.66,0);
        // Top
        add(box(0.5,0.04,0.64,dm),0,1.36,0);
        // 3 drawers
        [1.08,0.72,0.36].forEach(y=>{
            add(box(0.44,0.3,0.02,dm),0,y,0.32);
            add(box(0.36,0.22,0.01,M(0x6a7a8a,0.5)),0,y,0.33);
            add(box(0.28,0.03,0.03,hm),0,y,0.34);
            add(cyl(0.015,0.015,0.06,hm),0,y,0.35);
        });
        // Wheels
        [[-0.18,-0.24],[0.18,-0.24],[-0.18,0.24],[0.18,0.24]].forEach(([x,z])=>add(cyl(0.04,0.04,0.04,M(0x444444,0.5)),x,0.02,z));
    }
    // ── COMMERCIAL ──────────────────────────────────────────────────
    else if (type === 'displayshelf') {
        const wm=M(0xf5f2ee,0.3); const gm=new THREE.MeshStandardMaterial({color:0xb8d8e8,transparent:true,opacity:0.35,roughness:0.05});
        // Frame uprights
        add(box(0.04,2.2,0.38,M(0xaaaaaa,0.2,0.7)),-0.73,1.1,0);
        add(box(0.04,2.2,0.38,M(0xaaaaaa,0.2,0.7)), 0.73,1.1,0);
        // 4 glass shelves
        [0.3,0.72,1.14,1.56,2.0].forEach(y=>add(new THREE.Mesh(new THREE.BoxGeometry(1.42,0.02,0.36),gm),0,y,0));
        // Back panel (mirror)
        add(box(1.46,2.16,0.01,M(0xc8dde8,0.05,0.8,{transparent:true,opacity:0.5})),0,1.1,-0.18);
        // Small items on shelves (decorative boxes)
        [[0.32,-0.3],[0.32,0.1],[0.74,-0.2],[1.16,0.15]].forEach(([sy,sx])=>{
            add(box(0.12,0.14,0.1,M(0xc0392b+Math.floor(Math.random()*0x404040),0.6)),sx,sy+0.1,0.05);
        });
    }
    else if (type === 'cashcounter') {
        const bm=M(0x2a2a2a,0.4); const wm=M(0xf0ede8,0.3); const gm=new THREE.MeshStandardMaterial({color:0x90c8e0,transparent:true,opacity:0.4,roughness:0.05});
        // Main counter body
        add(box(1.8,1.0,0.7,bm),0,0.5,0);
        // Counter top
        add(box(1.82,0.04,0.72,M(0x1a1a1a,0.1,0.3)),0,1.02,0);
        // Glass display front
        add(new THREE.Mesh(new THREE.BoxGeometry(1.76,0.6,0.02),gm),0,0.72,0.36);
        // Cash register
        add(box(0.32,0.22,0.28,M(0x111111,0.3,0.2)),0.5,1.14,0.1);
        add(box(0.28,0.04,0.24,M(0x222222,0.2,0.3)),0.5,1.26,0.1);
        // Screen
        add(box(0.22,0.18,0.02,M(0x1a2a3a,0.1,0.2)),0.5,1.2,-0.06);
        // Card reader
        add(box(0.08,0.12,0.06,M(0x333333,0.3,0.2)),-0.4,1.08,0.2);
    }
    // ── DECOR ────────────────────────────────────────────────────────
    else if (type === 'plantpot') {
        const pm=M(0xc87941,0.7); const sm=M(0x3a6b35,0.8); const dm=M(0x5a3a1a,0.9);
        // Pot
        add(cyl(0.2,0.16,0.28,pm),0,0.14,0);
        // Soil
        add(cyl(0.18,0.18,0.02,dm),0,0.29,0);
        // Stem
        add(cyl(0.015,0.015,0.5,sm),0,0.54,0);
        // Leaves (flat ellipses)
        for(let i=0;i<6;i++){
            const ang=i/6*Math.PI*2, r=0.18+Math.random()*0.1;
            const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,4),M(0x2d8a28+Math.floor(Math.random()*0x102010),0.8));
            leaf.scale.set(1,0.3,0.6);
            leaf.position.set(Math.cos(ang)*r,0.55+Math.random()*0.3,Math.sin(ang)*r);
            group.add(leaf);
        }
        // Saucer
        add(cyl(0.24,0.22,0.03,pm),0,0.015,0);
    }
    else if (type === 'rug') {
        const rm=M(0xc8503a,0.95); const bm=M(0x8a3020,0.95);
        // Main rug surface
        add(box(2.4,0.02,1.6,rm),0,0.01,0);
        // Border
        add(box(2.4,0.021,0.1,bm),0,0.011,0.75); add(box(2.4,0.021,0.1,bm),0,0.011,-0.75);
        add(box(0.1,0.021,1.6,bm),1.15,0.011,0); add(box(0.1,0.021,1.6,bm),-1.15,0.011,0);
        // Pattern (simple cross)
        add(box(1.6,0.022,0.08,bm),0,0.011,0); add(box(0.08,0.022,1.0,bm),0,0.011,0);
    }
    else if (type === 'curtain') {
        const cm=M(0x8b6a4a,0.9); const rm=M(0x6b4a2a,0.7,0.1);
        // Curtain rod
        add(cyl(0.02,0.02,2.2,M(0xaaaaaa,0.2,0.8)),0,2.5,0);
        // Rod finials
        add(sph(0.04,M(0xaaaaaa,0.2,0.8)),-1.1,2.5,0); add(sph(0.04,M(0xaaaaaa,0.2,0.8)),1.1,2.5,0);
        // Left panel (gathered)
        for(let i=0;i<5;i++){
            const x=-0.9+i*0.08, wave=Math.sin(i*1.2)*0.04;
            add(box(0.1,2.2,0.06+wave,cm),x,1.3,wave);
        }
        // Right panel
        for(let i=0;i<5;i++){
            const x=0.5+i*0.08, wave=Math.sin(i*1.2)*0.04;
            add(box(0.1,2.2,0.06+wave,cm),x,1.3,wave);
        }
        // Tie-backs
        add(box(0.5,0.04,0.04,rm),-0.65,1.0,0.08); add(box(0.5,0.04,0.04,rm),0.75,1.0,0.08);
    }
    else if (type === 'mirror') {
        const fm=M(0x8a7a6a,0.4); const gm=new THREE.MeshStandardMaterial({color:0xc8dde8,roughness:0.02,metalness:0.9,transparent:true,opacity:0.7});
        // Outer frame
        add(box(0.9,1.4,0.06,fm),0,0.7,0);
        // Inner frame bevel
        add(box(0.82,1.32,0.02,M(0x7a6a5a,0.5)),0,0.7,0.03);
        // Mirror glass
        add(new THREE.Mesh(new THREE.BoxGeometry(0.76,1.26,0.01),gm),0,0.7,0.04);
        // Hanging bracket
        add(box(0.1,0.04,0.04,M(0x888888,0.2,0.8)),0,1.4,0);
    }
    else if (type === 'spiralstairs') {
        // Spiral Staircase - Steps arranged in a circle
        const stepCount = 16;
        const radius = 1.2;
        const stepHeight = 0.15;
        const stepWidth = 0.8;
        const stepDepth = 0.4;
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.4 });
        
        // Central pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, stepCount * stepHeight), 
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 })
        );
        pole.position.y = (stepCount * stepHeight) / 2;
        group.add(pole);
        
        // Create steps
        for (let i = 0; i < stepCount; i++) {
            const angle = (i / stepCount) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Individual step
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), 
                new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
            );
            step.position.set(x, (i + 0.5) * stepHeight, z);
            step.rotation.y = angle + Math.PI / 2;
            group.add(step);
        }
        
        // Create continuous spiral handrail using curve
        const railPoints = [];
        for (let i = 0; i <= stepCount; i++) {
            const angle = (i / stepCount) * Math.PI * 2;
            const x = Math.cos(angle) * (radius + 0.35);
            const z = Math.sin(angle) * (radius + 0.35);
            const y = i * stepHeight + 0.9;
            railPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const railCurve = new THREE.CatmullRomCurve3(railPoints);
        const railGeometry = new THREE.TubeGeometry(railCurve, 100, 0.025, 8, false);
        const rail = new THREE.Mesh(railGeometry, railMaterial);
        group.add(rail);
        
        // Vertical posts at regular intervals
        for (let i = 0; i < stepCount; i += 2) {
            const angle = (i / stepCount) * Math.PI * 2;
            const x = Math.cos(angle) * (radius + 0.35);
            const z = Math.sin(angle) * (radius + 0.35);
            const baseY = i * stepHeight;
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9), 
                railMaterial
            );
            post.position.set(x, baseY + 0.45, z);
            group.add(post);
        }
    }
    
    // ── CEILING FAN ──────────────────────────────────────────────────────────
    else if (type === 'ceilingfan') {
        const metalMat = M(0x888888, 0.2, 0.8);
        const bladeMat = M(0xd4a96a, 0.5);
        const glassMat = M(0xfff8e0, 0.05, 0.0, { transparent:true, opacity:0.9, emissive:0xfff8c0, emissiveIntensity:1.2 });

        // Ceiling canopy (flat disc)
        add(cyl(0.1, 0.1, 0.04, metalMat, 24), 0, -0.02, 0);
        // Down rod
        add(cyl(0.016, 0.016, 0.28, metalMat), 0, -0.2, 0);
        // Motor housing — wider, flatter, more realistic
        add(cyl(0.16, 0.14, 0.1, metalMat, 32), 0, -0.39, 0);
        add(cyl(0.1, 0.1, 0.04, metalMat, 24), 0, -0.46, 0);
        // Light kit bowl (hemisphere)
        const bowlGeo = new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI*2, 0, Math.PI*0.55);
        const bowl = new THREE.Mesh(bowlGeo, glassMat);
        bowl.rotation.x = Math.PI; bowl.position.set(0, -0.52, 0);
        group.add(bowl);
        // Bulb inside bowl
        add(sph(0.04, M(0xfffde0, 0.05, 0, { emissive:0xfff8a0, emissiveIntensity:2.0 }), 10), 0, -0.5, 0);

        // 5 blades — tapered shape using custom geometry
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            // Blade: wide at tip, narrow at root — use scaled box with taper via vertices
            const bladeShape = new THREE.Shape();
            bladeShape.moveTo(-0.07, 0);
            bladeShape.lineTo(-0.04, 0.52);
            bladeShape.lineTo(0.04, 0.52);
            bladeShape.lineTo(0.07, 0);
            bladeShape.closePath();
            const bladeGeo = new THREE.ShapeGeometry(bladeShape);
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.rotation.x = -Math.PI / 2 + 0.08; // slight pitch
            blade.rotation.z = angle;
            blade.position.set(Math.cos(angle)*0.22, -0.4, Math.sin(angle)*0.22);
            group.add(blade);
            // Back face
            const bladeBack = blade.clone();
            bladeBack.material = M(0xb8904a, 0.6);
            bladeBack.rotation.x = Math.PI / 2 - 0.08;
            bladeBack.rotation.z = angle;
            bladeBack.position.copy(blade.position);
            group.add(bladeBack);
            // Blade bracket (metal arm from motor to blade root)
            const bkt = box(0.18, 0.012, 0.022, metalMat);
            bkt.position.set(Math.cos(angle)*0.1, -0.41, Math.sin(angle)*0.1);
            bkt.rotation.y = angle; group.add(bkt);
        }
    }

    // ── CHANDELIER ───────────────────────────────────────────────────────────
    else if (type === 'chandelier') {
        const brassMat  = M(0xd4a017, 0.2, 0.9);
        const crystalMat= M(0xe8f4ff, 0.02, 0.1, { transparent:true, opacity:0.8, emissive:0xfff8e0, emissiveIntensity:0.8 });
        const bulbMat   = M(0xfffde0, 0.05, 0.0, { emissive:0xfff8a0, emissiveIntensity:2.5 });

        // Ceiling rose
        add(cyl(0.1, 0.1, 0.05, brassMat, 20), 0, -0.025, 0);
        // Main chain rod
        add(cyl(0.012, 0.012, 0.5, brassMat), 0, -0.28, 0);
        // Central crown
        add(cyl(0.18, 0.12, 0.1, brassMat, 20), 0, -0.58, 0);
        // Lower cup
        add(cyl(0.08, 0.14, 0.08, brassMat, 20), 0, -0.68, 0);

        // 6 arms with candle cups and bulbs
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const cx = Math.cos(a) * 0.32, cz = Math.sin(a) * 0.32;
            // Curved arm (approximated as angled box)
            const arm = box(0.34, 0.018, 0.018, brassMat);
            arm.position.set(Math.cos(a)*0.17, -0.62, Math.sin(a)*0.17);
            arm.rotation.y = a; arm.rotation.z = 0.22;
            group.add(arm);
            // Candle cup
            add(cyl(0.03, 0.025, 0.06, brassMat, 12), cx, -0.52, cz);
            // Bulb
            add(sph(0.035, bulbMat, 10), cx, -0.47, cz);
            // Crystal drops (3 per arm)
            for (let d = 0; d < 3; d++) {
                const dx = cx + Math.cos(a + (d-1)*0.3)*0.04;
                const dz = cz + Math.sin(a + (d-1)*0.3)*0.04;
                const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), crystalMat);
                crystal.position.set(dx, -0.62 - d*0.06, dz);
                group.add(crystal);
            }
        }
        // Bottom crystal cluster
        for (let i = 0; i < 8; i++) {
            const a = (i/8)*Math.PI*2, r = 0.06 + (i%2)*0.04;
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.022), crystalMat);
            crystal.position.set(Math.cos(a)*r, -0.76 - (i%3)*0.05, Math.sin(a)*r);
            group.add(crystal);
        }
    }

    // ── PENDANT LIGHT ────────────────────────────────────────────────────────
    else if (type === 'pendantlight') {
        const cordMat  = M(0x1a1a1a, 0.9);
        const shadeMat = M(0x2c2c2c, 0.4, 0.5);
        const innerMat = M(0xfff8e0, 0.1, 0.0, { emissive:0xfff8a0, emissiveIntensity:2.5 });
        const ceilingMat = M(0x888888, 0.3, 0.6);

        // Ceiling canopy
        add(cyl(0.07, 0.07, 0.03, ceilingMat, 16), 0, -0.015, 0);
        // Cord
        add(cyl(0.006, 0.006, 0.55, cordMat), 0, -0.3, 0);
        // Shade — wide industrial cone
        const shadeGeo = new THREE.CylinderGeometry(0.22, 0.08, 0.2, 24, 1, true);
        const shade = new THREE.Mesh(shadeGeo, shadeMat);
        shade.position.set(0, -0.65, 0);
        group.add(shade);
        // Shade top cap
        add(cyl(0.08, 0.08, 0.015, shadeMat, 16), 0, -0.555, 0);
        // Bulb inside
        add(sph(0.055, innerMat, 12), 0, -0.63, 0);
        // Shade inner rim glow
        const rimGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.01, 24);
        const rim = new THREE.Mesh(rimGeo, M(0xfff5a0, 0.1, 0, { emissive:0xfff5a0, emissiveIntensity:0.5 }));
        rim.position.set(0, -0.745, 0);
        group.add(rim);
    }

    // ── RECESSED SPOTLIGHT ───────────────────────────────────────────────────
    else if (type === 'spotlight') {
        // Dark housing so it's visible on white ceiling, bright bulb visible on dark
        const housingMat = M(0x2a2a2a, 0.3, 0.6);   // dark grey — visible on white
        const trimMat    = M(0x1a1a1a, 0.2, 0.7);   // near-black trim ring
        const reflMat    = M(0xc8c8c8, 0.05, 0.95); // polished reflector
        const bulbMat    = M(0xfffde0, 0.02, 0.0, { emissive:0xfff8c0, emissiveIntensity:4.0 }); // very bright

        // Outer trim ring (dark, visible on any background)
        add(cyl(0.1, 0.1, 0.014, trimMat, 24), 0, -0.007, 0);
        // Housing cylinder
        add(cyl(0.078, 0.078, 0.07, housingMat, 20), 0, -0.042, 0);
        // Inner reflector cone
        const reflGeo = new THREE.CylinderGeometry(0.062, 0.02, 0.06, 20, 1, true);
        const refl = new THREE.Mesh(reflGeo, reflMat);
        refl.position.set(0, -0.04, 0);
        group.add(refl);
        // Bright bulb
        add(sph(0.025, bulbMat, 10), 0, -0.06, 0);
        // Light cone (visible glow beam)
        const coneGeo = new THREE.ConeGeometry(0.22, 0.4, 20, 1, true);
        const cone = new THREE.Mesh(coneGeo, M(0xfffde0, 0.1, 0, {
            transparent:true, opacity:0.08,
            emissive:0xfffde0, emissiveIntensity:0.5,
            side: THREE.DoubleSide
        }));
        cone.position.set(0, -0.26, 0);
        cone.rotation.x = Math.PI;
        group.add(cone);
    }

    // ── AC UNIT (wall-mounted split AC) ──────────────────────────────────────
    else if (type === 'ac') {
        const bodyMat  = M(0xf0f0f0, 0.3, 0.1);
        const ventMat  = M(0xd8d8d8, 0.4, 0.1);
        const detailMat= M(0xcccccc, 0.3, 0.2);
        const ledMat   = M(0x00ff88, 0.1, 0.0, { emissive:0x00ff88, emissiveIntensity:1.5 });

        // Main body — wide flat unit
        add(box(1.0, 0.28, 0.22, bodyMat), 0, 0, 0);
        // Front face panel (slightly recessed)
        add(box(0.96, 0.24, 0.01, M(0xfafafa, 0.2, 0.1)), 0, 0, 0.115);
        // Top vent grille (horizontal slats)
        for (let i = 0; i < 6; i++) {
            add(box(0.88, 0.012, 0.06, ventMat), 0, 0.08, 0.12 + i*0.001);
        }
        // Front air outlet grille (angled slats)
        for (let i = 0; i < 8; i++) {
            const slat = box(0.82, 0.008, 0.055, ventMat);
            slat.position.set(0, -0.04 + i*0.012, 0.115);
            slat.rotation.x = 0.25;
            group.add(slat);
        }
        // Flap at bottom of outlet
        add(box(0.84, 0.012, 0.07, detailMat), 0, -0.1, 0.11);
        // Control panel strip (right side)
        add(box(0.12, 0.06, 0.012, M(0xe8e8e8, 0.3)), 0.38, 0.04, 0.116);
        // LED indicator
        add(box(0.018, 0.018, 0.008, ledMat), 0.38, 0.06, 0.12);
        // Brand strip
        add(box(0.3, 0.018, 0.008, M(0xdddddd, 0.3)), -0.1, 0.1, 0.12);
        // Side vents
        add(box(0.01, 0.2, 0.18, ventMat), 0.51, 0, 0);
        add(box(0.01, 0.2, 0.18, ventMat), -0.51, 0, 0);
        // Mounting bracket (back)
        add(box(0.9, 0.06, 0.04, M(0xaaaaaa, 0.4, 0.3)), 0, 0.1, -0.13);
    }
    const CEILING_ITEMS = ['ceilingfan','chandelier','pendantlight','spotlight'];
    const roomH = parseFloat(document.getElementById('roomHeight')?.value || 8);
    const roomL = parseFloat(document.getElementById('roomLength')?.value || 20);
    const spawnY = (type === 'windowwall') ? 0.9
                 : CEILING_ITEMS.includes(type) ? roomH - 0.05
                 : (type === 'ac') ? roomH * 0.72
                 : 0;
    // AC spawns near the back wall, centered — easy to select and move
    const spawnX = (type === 'ac') ? 0 : (Math.random() - 0.5) * 10;
    const spawnZ = (type === 'ac') ? -(roomL / 2 - 0.15) : (Math.random() - 0.5) * 10;
    group.position.set(spawnX, spawnY, spawnZ);

    group.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    group.userData.type = type;
    
    scene.add(group);
    furnitureList.push(group);
    enableDragging();

    // Apply current wall style to newly added wall furniture
    const wallTypes = ['interiorwall', 'doorwall', 'windowwall'];
    if (wallTypes.includes(type)) {
        const styleSelect = document.getElementById('wallStyleSelect');
        const style = styleSelect ? styleSelect.value : 'plain';
        // Temporarily select this group so changeWallStyle targets it
        const prevSelected = new Set(selectedObjects);
        selectedObjects.clear();
        selectedObjects.add(group);
        changeWallStyle(style);
        selectedObjects.clear();
        prevSelected.forEach(o => selectedObjects.add(o));
    }
    
    return group; // Return the created furniture object
}

// Global raycaster and mouse for selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Convert screen coords to normalised device coords relative to the canvas
function toNDC(clientX, clientY) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    return {
        x:  ((clientX - rect.left)  / rect.width)  * 2 - 1,
        y: -((clientY - rect.top)   / rect.height)  * 2 + 1
    };
}

// Setup event listeners once
let draggingEnabled = false;

function enableDragging() {
    if (draggingEnabled) return; // Already enabled
    draggingEnabled = true;
    
    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);
}

function handleClick(e) {
    const ndc = toNDC(e.clientX, e.clientY);
    mouse.x = ndc.x; mouse.y = ndc.y;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(furnitureList, true);
    
    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        while (clickedObject.parent && !furnitureList.includes(clickedObject)) {
            clickedObject = clickedObject.parent;
        }
        
        if (e.ctrlKey || e.metaKey) {
            if (selectedObjects.has(clickedObject)) {
                selectedObjects.delete(clickedObject);
            } else {
                selectedObjects.add(clickedObject);
            }
        } else {
            selectedObjects.clear();
            selectedObjects.add(clickedObject);
        }
        updateSelectionHighlight();
        // Sync scale slider to selected object
        if (selectedObjects.size === 1) {
            const obj = [...selectedObjects][0];
            const slider = document.getElementById('scaleSlider');
            const label = document.getElementById('scaleValue');
            if (slider) slider.value = obj.scale.x;
            if (label) label.textContent = obj.scale.x.toFixed(2) + 'x';
        }
    } else {
        selectedObjects.clear();
        updateSelectionHighlight();
    }
}

function handleMouseDown(e) {
    const ndc = toNDC(e.clientX, e.clientY);
    mouse.x = ndc.x; mouse.y = ndc.y;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(furnitureList, true);
    
    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;
        while (clickedObject.parent && !furnitureList.includes(clickedObject)) {
            clickedObject = clickedObject.parent;
        }
        
        if (selectedObjects.has(clickedObject)) {
            orbitControls.enabled = false;
            draggedObject = clickedObject;
            const objY = clickedObject.position.y;
            const hPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -objY);
            const intersection = new THREE.Vector3();
            const hit = raycaster.ray.intersectPlane(hPlane, intersection);
            if (hit) {
                dragOffset.copy(intersection);
                dragOffset.y = objY;
            } else {
                dragOffset.copy(clickedObject.position);
            }
        }
    }
}

function handleMouseMove(e) {
    if (!draggedObject) return;
    
    const ndc = toNDC(e.clientX, e.clientY);
    mouse.x = ndc.x; mouse.y = ndc.y;
    raycaster.setFromCamera(mouse, camera);

    const objY = draggedObject.position.y;
    const intersection = new THREE.Vector3();

    // Try horizontal plane at object's Y first
    const hPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -objY);
    const hitH = raycaster.ray.intersectPlane(hPlane, intersection);

    if (!hitH) {
        // Fallback: vertical plane facing the camera (for wall-mounted items viewed from low angle)
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0; camDir.normalize();
        const vPlane = new THREE.Plane(camDir, -camDir.dot(draggedObject.position));
        const hitV = raycaster.ray.intersectPlane(vPlane, intersection);
        if (!hitV) return;
        intersection.y = objY; // keep Y locked
    }

    const delta = new THREE.Vector3().subVectors(intersection, dragOffset);
    delta.y = 0; // never change Y while dragging

    selectedObjects.forEach(obj => { obj.position.add(delta); });
    dragOffset.copy(intersection);
    dragOffset.y = objY;

    // ── Boundary warning ──────────────────────────────────────────────────
    checkBoundaryWarning();
}

function handleMouseUp() {
    if (draggedObject) {
        setTimeout(() => window.saveSession(), 200);
    }
    draggedObject = null;
    orbitControls.enabled = true;
    clearBoundaryWarning();
}

let _boundaryWarningActive = false;

function checkBoundaryWarning() {
    if (selectedObjects.size === 0) { clearBoundaryWarning(); return; }

    const rw = parseFloat(document.getElementById('roomWidth')?.value  || 20);
    const rl = parseFloat(document.getElementById('roomLength')?.value || 20);
    const hw = rw / 2, hl = rl / 2;

    let outside = false;
    selectedObjects.forEach(obj => {
        const p = obj.position;
        if (Math.abs(p.x) > hw || Math.abs(p.z) > hl) outside = true;
    });

    if (outside) {
        // Turn grid red
        if (grid) grid.material.color.setHex(0xff4444);
        if (grid) grid.material.opacity = 0.55;
        // Show warning toast
        let toast = document.getElementById('boundaryToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'boundaryToast';
            Object.assign(toast.style, {
                position: 'fixed', bottom: '70px', left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(239,68,68,0.92)',
                color: '#fff', fontSize: '12px', fontWeight: '700',
                padding: '7px 18px', borderRadius: '6px',
                zIndex: '9999', pointerEvents: 'none',
                letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            });
            toast.textContent = '⚠ Outside room boundary';
            document.body.appendChild(toast);
        }
        toast.style.display = 'block';
        _boundaryWarningActive = true;
    } else {
        clearBoundaryWarning();
    }
}

function clearBoundaryWarning() {
    if (!_boundaryWarningActive) return;
    if (grid) { grid.material.color.setHex(0x999999); grid.material.opacity = 0.35; }
    const toast = document.getElementById('boundaryToast');
    if (toast) toast.style.display = 'none';
    _boundaryWarningActive = false;
}

function updateSelectionHighlight() {
    furnitureList.forEach(obj => {
        obj.traverse(child => {
            if (child.isMesh) {
                if (selectedObjects.has(obj)) {
                    child.material.emissive.setHex(0x444444);
                } else {
                    child.material.emissive.setHex(0x000000);
                }
            }
        });
    });
    updatePropsPanel();
}

function updatePropsPanel() {
    const panel = document.getElementById('propsContent');
    if (!panel) return;
    if (selectedObjects.size === 0) {
        panel.innerHTML = '<div class="props-empty">Select a furniture item to see its properties</div>';
        return;
    }
    const obj = [...selectedObjects][0];
    const pos = obj.position;
    const rot = ((obj.rotation.y * 180 / Math.PI) % 360).toFixed(0);
    const sc  = obj.scale.x.toFixed(2);
    const type = obj.userData.type || '—';
    panel.innerHTML = `
        <div class="props-row">
            <div class="props-label">Type</div>
            <div class="props-value" style="text-transform:capitalize;">${type.replace(/([A-Z])/g,' $1')}</div>
        </div>
        <hr style="border:none;border-top:1px solid #383c46;margin:8px 0;">
        <div class="props-label" style="margin-bottom:8px;">Position</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
            <div><div class="props-label">X</div><div class="props-value">${pos.x.toFixed(2)}</div></div>
            <div><div class="props-label">Y</div><div class="props-value">${pos.y.toFixed(2)}</div></div>
            <div><div class="props-label">Z</div><div class="props-value">${pos.z.toFixed(2)}</div></div>
        </div>
        <hr style="border:none;border-top:1px solid #383c46;margin:8px 0;">
        <div class="props-row">
            <div class="props-label">Rotation Y</div>
            <div class="props-value">${rot}°</div>
        </div>
        <div class="props-row">
            <div class="props-label">Scale</div>
            <div class="props-value">${sc}×</div>
        </div>
        <hr style="border:none;border-top:1px solid #383c46;margin:10px 0;">
        <div style="margin-bottom:8px;">
            <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px;">Scale</div>
            <div style="display:flex;align-items:center;gap:6px;">
                <button onclick="scaleSelected(-0.1)" style="width:28px;height:28px;background:#252830;border:1px solid #383c46;border-radius:4px;color:#e2e8f0;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;">−</button>
                <input type="range" id="scaleSlider" min="0.2" max="3" step="0.05" value="${sc}" oninput="applyScaleFromSlider(this.value)" style="flex:1;height:4px;accent-color:#84cc16;cursor:pointer;">
                <button onclick="scaleSelected(0.1)" style="width:28px;height:28px;background:#252830;border:1px solid #383c46;border-radius:4px;color:#e2e8f0;font-size:14px;font-weight:700;cursor:pointer;flex-shrink:0;">+</button>
            </div>
            <div style="text-align:center;font-size:10px;color:#64748b;margin-top:3px;">Size: <span id="scaleValue">${sc}x</span></div>
        </div>
        <button onclick="rotateSelected()" style="width:100%;height:30px;background:#252830;border:1px solid #383c46;border-radius:5px;color:#e2e8f0;font-size:11px;font-weight:600;cursor:pointer;margin-bottom:6px;" onmouseover="this.style.borderColor='#84cc16'" onmouseout="this.style.borderColor='#383c46'">↻ Rotate 90°</button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            <button onclick="moveSelectedY(0.1)" style="height:30px;background:#252830;border:1px solid #383c46;border-radius:5px;color:#e2e8f0;font-size:11px;font-weight:600;cursor:pointer;" onmouseover="this.style.borderColor='#84cc16'" onmouseout="this.style.borderColor='#383c46'">↑ Up</button>
            <button onclick="moveSelectedY(-0.1)" style="height:30px;background:#252830;border:1px solid #383c46;border-radius:5px;color:#e2e8f0;font-size:11px;font-weight:600;cursor:pointer;" onmouseover="this.style.borderColor='#84cc16'" onmouseout="this.style.borderColor='#383c46'">↓ Down</button>
        </div>
        <button onclick="deleteSelected()" style="width:100%;height:30px;background:#3a1a1a;border:1px solid #5a2020;border-radius:5px;color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;" onmouseover="this.style.background='#ef4444';this.style.color='#fff'" onmouseout="this.style.background='#3a1a1a';this.style.color='#ef4444'">✕ Delete</button>
    `;
}

function addFurniture(type) {
    const obj = createFurniture(type);
    obj.userData.type = type;
}

function addSelectedFurniture() {
    const select = document.getElementById('furnitureSelect');
    const type = select.value;
    if (type) {
        createFurniture(type);
        select.value = '';
        setTimeout(() => window.saveSession(), 200);
    } else {
        alert('Please select furniture first');
    }
}

function rotateSelected() {
    if (selectedObjects.size === 0) return alert("Select an object first");
    selectedObjects.forEach(obj => {
        obj.rotation.y += Math.PI / 2;
    });
    setTimeout(() => window.saveSession(), 200);
}

function moveSelectedY(delta) {
    if (selectedObjects.size === 0) return;
    selectedObjects.forEach(obj => {
        obj.position.y = Math.max(0, obj.position.y + delta);
    });
    setTimeout(() => window.saveSession(), 200);
}

function scaleSelected(delta) {
    if (selectedObjects.size === 0) return alert("Select an object first");
    selectedObjects.forEach(obj => {
        const current = obj.scale.x;
        const next = Math.max(0.2, Math.min(3, current + delta));
        obj.scale.setScalar(next);
        // Sync slider
        const slider = document.getElementById('scaleSlider');
        const label = document.getElementById('scaleValue');
        if (slider) slider.value = next;
        if (label) label.textContent = next.toFixed(2) + 'x';
    });
    setTimeout(() => window.saveSession(), 200);
}

function applyScaleFromSlider(value) {
    const v = parseFloat(value);
    const label = document.getElementById('scaleValue');
    if (label) label.textContent = v.toFixed(2) + 'x';
    if (selectedObjects.size === 0) return;
    selectedObjects.forEach(obj => {
        obj.scale.setScalar(v);
    });
    setTimeout(() => window.saveSession(), 200);
}

function changeWallColor(color) {
    const styleSelect = document.getElementById('wallStyleSelect');
    const style = styleSelect ? styleSelect.value : 'plain';
    if (style === 'plain') {
        // Just update color directly
        walls.traverse(child => {
            if (child.isMesh) child.material.color.setStyle(color);
        });
    } else {
        // Regenerate texture with new color baked in
        changeWallStyle(style);
    }
    setTimeout(() => window.saveSession(), 200);
}

function changeWallStyle(style) {
    const wallColorEl = document.getElementById('wallColor');
    const baseColor = wallColorEl ? wallColorEl.value : '#f2ede8';
    const hr = parseInt(baseColor.slice(1,3),16);
    const hg = parseInt(baseColor.slice(3,5),16);
    const hb = parseInt(baseColor.slice(5,7),16);

    let tex = null, rough = 0.92, metal = 0.0;

    if (style !== 'plain') {
        const size = 512;
        const cv = document.createElement('canvas');
        cv.width = cv.height = size;
        const ctx = cv.getContext('2d');

        if (style === 'brick') {
            // Mortar background (lighter than brick)
            ctx.fillStyle = `rgb(${Math.min(255,hr+40)},${Math.min(255,hg+30)},${Math.min(255,hb+20)})`;
            ctx.fillRect(0,0,size,size);
            const bw=120, bh=52, gap=8;
            for(let row=0; row<size/bh+2; row++){
                const off=(row%2)*(bw/2);
                for(let col=-1; col<size/bw+2; col++){
                    const x=col*bw+off, y=row*bh;
                    const v=Math.floor(Math.random()*25-12);
                    ctx.fillStyle=`rgb(${Math.min(255,Math.max(0,hr+v))},${Math.min(255,Math.max(0,hg+v-5))},${Math.min(255,Math.max(0,hb+v-10))})`;
                    ctx.fillRect(x+gap/2, y+gap/2, bw-gap, bh-gap);
                    ctx.fillStyle='rgba(255,255,255,0.12)';
                    ctx.fillRect(x+gap/2, y+gap/2, bw-gap, 6);
                    ctx.fillStyle='rgba(0,0,0,0.18)';
                    ctx.fillRect(x+gap/2, y+bh-gap/2-5, bw-gap, 5);
                }
            }
            rough=0.95; metal=0.0;
            tex = new THREE.CanvasTexture(cv);
            tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
            tex.repeat.set(2,2);

        } else if (style === 'woodpanel') {
            const pw=size/5;
            for(let i=0;i<5;i++){
                const v=Math.floor(Math.random()*20-10);
                ctx.fillStyle=`rgb(${Math.min(255,Math.max(0,hr+v))},${Math.min(255,Math.max(0,hg+v-8))},${Math.min(255,Math.max(0,hb+v-15))})`;
                ctx.fillRect(i*pw, 0, pw-4, size);
                for(let g=0;g<size;g+=12){
                    const wave=Math.sin(g*0.05)*3;
                    ctx.strokeStyle=`rgba(0,0,0,${0.06+Math.random()*0.06})`;
                    ctx.lineWidth=1;
                    ctx.beginPath(); ctx.moveTo(i*pw+wave,g); ctx.lineTo(i*pw+pw-4+wave,g+10); ctx.stroke();
                }
                ctx.fillStyle='rgba(255,255,255,0.18)';
                ctx.fillRect(i*pw, 0, 3, size);
                ctx.fillStyle='rgba(0,0,0,0.35)';
                ctx.fillRect(i*pw+pw-4, 0, 4, size);
            }
            rough=0.65; metal=0.05;
            tex = new THREE.CanvasTexture(cv);
            tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
            tex.repeat.set(1.5,1.5);

        } else if (style === 'tile') {
            ctx.fillStyle=`rgb(${Math.min(255,hr-20)},${Math.min(255,hg-20)},${Math.min(255,hb-20)})`;
            ctx.fillRect(0,0,size,size);
            const tw=120, gap=8;
            for(let row=0;row<size/tw+1;row++){
                for(let col=0;col<size/tw+1;col++){
                    const tx=col*tw+gap/2, ty=row*tw+gap/2, ts=tw-gap;
                    ctx.fillStyle=`rgb(${Math.min(255,hr+15)},${Math.min(255,hg+15)},${Math.min(255,hb+15)})`;
                    ctx.fillRect(tx,ty,ts,ts);
                    const grad=ctx.createLinearGradient(tx,ty,tx+ts,ty+ts);
                    grad.addColorStop(0,'rgba(255,255,255,0.22)');
                    grad.addColorStop(0.5,'rgba(255,255,255,0.05)');
                    grad.addColorStop(1,'rgba(0,0,0,0.08)');
                    ctx.fillStyle=grad;
                    ctx.fillRect(tx,ty,ts,ts);
                }
            }
            rough=0.1; metal=0.3;
            tex = new THREE.CanvasTexture(cv);
            tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
            tex.repeat.set(3,3);

        } else if (style === 'concrete') {
            ctx.fillStyle=baseColor;
            ctx.fillRect(0,0,size,size);
            const imgData=ctx.getImageData(0,0,size,size);
            for(let i=0;i<imgData.data.length;i+=4){
                const n=(Math.random()-0.5)*45;
                imgData.data[i]  =Math.min(255,Math.max(0,imgData.data[i]+n));
                imgData.data[i+1]=Math.min(255,Math.max(0,imgData.data[i+1]+n));
                imgData.data[i+2]=Math.min(255,Math.max(0,imgData.data[i+2]+n));
            }
            ctx.putImageData(imgData,0,0);
            for(let y=0;y<size;y+=80){
                ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=2;
                ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(size,y); ctx.stroke();
                ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(0,y+2); ctx.lineTo(size,y+2); ctx.stroke();
            }
            for(let x=60;x<size;x+=120){
                for(let y=40;y<size;y+=80){
                    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
                    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fill();
                }
            }
            rough=0.98; metal=0.0;
            tex = new THREE.CanvasTexture(cv);
            tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
            tex.repeat.set(1.5,1.5);
        }
    }

    const applyToMeshes = (meshes) => {
        meshes.forEach(child => {
            if (!child.isMesh) return;
            if (style === 'plain') {
                child.material.map = null;
                child.material.color.setStyle(baseColor);
            } else {
                child.material.map = tex;
                child.material.color.set(0xffffff);
            }
            child.material.roughness = rough;
            child.material.metalness = metal;
            child.material.needsUpdate = true;
        });
    };

    const wallFurnitureTypes = ['interiorwall','doorwall','windowwall'];
    const selectedWalls = [...selectedObjects].filter(obj =>
        obj.userData && wallFurnitureTypes.includes(obj.userData.type)
    );

    if (selectedWalls.length > 0) {
        selectedWalls.forEach(obj => {
            const meshes = [];
            obj.traverse(child => {
                if (child.isMesh && child.material.color && child.material.color.r > 0.8 && !child.material.transparent)
                    meshes.push(child);
            });
            applyToMeshes(meshes);
        });
    } else {
        const roomMeshes = [];
        walls.traverse(child => { if (child.isMesh) roomMeshes.push(child); });
        applyToMeshes(roomMeshes);
    }

    setTimeout(() => window.saveSession(), 200);
}

// Apply full room state (used when loading a saved design)
function applyRoomState(r) {
    if (!r) return;
    if (r.width)  document.getElementById('roomWidth').value  = r.width;
    if (r.length) document.getElementById('roomLength').value = r.length;
    if (r.height) document.getElementById('roomHeight').value = r.height;
    updateRoomSize();
    if (r.wallColor)  { document.getElementById('wallColor').value  = r.wallColor;  changeWallColor(r.wallColor); }
    if (r.wallStyle)  { document.getElementById('wallStyleSelect').value = r.wallStyle; changeWallStyle(r.wallStyle); }
    if (r.floorColor) { document.getElementById('floorColor').value = r.floorColor; changeFloorColor(r.floorColor); }
    if (r.roofColor)  { document.getElementById('roofColor').value  = r.roofColor;  changeRoofColor(r.roofColor); }
}

function changeFloorColor(color) {
    floor.material.color.setStyle(color);
    floor.material.map = makeFloorTexture(color);
    floor.material.needsUpdate = true;
    setTimeout(() => window.saveSession(), 200);
}

function changeRoofColor(color) {
    roof.material.color.setStyle(color);
    setTimeout(() => window.saveSession(), 200);
}

function toggleWalls() {
    walls.visible = !walls.visible;
}

function toggleRoof() {
    roof.visible = !roof.visible;
    // Also hide/show ceiling-mounted items
    const CEILING_ITEMS = ['ceilingfan','chandelier','pendantlight','spotlight'];
    furnitureList.forEach(obj => {
        if (CEILING_ITEMS.includes(obj.userData.type)) {
            obj.visible = roof.visible;
        }
    });
}

function toggleGrid() {
    grid.visible = !grid.visible;
}

function updateRoomSize() {
    const width  = parseFloat(document.getElementById('roomWidth').value)  || 20;
    const length = parseFloat(document.getElementById('roomLength').value) || 20;
    const height = parseFloat(document.getElementById('roomHeight').value) || 8;

    // Store current colors
    const currentFloorColor = floor.material.color.clone();
    const currentWallColor  = walls.children[0] ? walls.children[0].material.color.clone() : new THREE.Color(0xf2ede8);

    // ── Floor: exact room dimensions ──────────────────────────────
    scene.remove(floor);
    const floorColorHex = '#' + currentFloorColor.getHexString();
    floor = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({
            color: currentFloorColor,
            map: makeFloorTexture(floorColorHex),
            roughness: 0.82,
            metalness: 0.02
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ── Grid: 1 cell = 1 metre, exact rectangle ──────────────────
    scene.remove(grid);
    grid = makeGrid(width, length);
    scene.add(grid);

    // ── Walls ─────────────────────────────────────────────────────
    scene.remove(walls);
    walls = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: currentWallColor, roughness: 0.88, metalness: 0.0, side: THREE.DoubleSide });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
    backWall.position.set(0, height / 2, -length / 2);
    backWall.receiveShadow = true;
    walls.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(length, height), wallMat);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    walls.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(length, height), wallMat);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    walls.add(rightWall);

    scene.add(walls);

    // Re-apply wall style after rebuild
    const styleSelect = document.getElementById('wallStyleSelect');
    if (styleSelect) window.changeWallStyle(styleSelect.value || 'plain');
    const currentRoofColor   = roof.material.color.clone();
    const currentRoofOpacity = roof.material.opacity;
    scene.remove(roof);
    roof = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({
            color: currentRoofColor,
            roughness: 0.95,
            metalness: 0.0,
            emissive: 0xfff8f0,
            emissiveIntensity: 0.06,
            transparent: true,
            opacity: currentRoofOpacity,
            side: THREE.DoubleSide
        })
    );
    roof.rotation.x = Math.PI / 2;
    roof.position.y = height;
    roof.receiveShadow = true;
    roof.castShadow = false;
    scene.add(roof);

    // Update shadow camera to cover the room
    // (find the sun light and resize its shadow frustum)
    scene.traverse(obj => {
        if (obj.isDirectionalLight && obj.castShadow) {
            const half = Math.max(width, length) / 2 + 4;
            obj.shadow.camera.left   = -half;
            obj.shadow.camera.right  =  half;
            obj.shadow.camera.top    =  half;
            obj.shadow.camera.bottom = -half;
            obj.shadow.camera.updateProjectionMatrix();
        }
    });
    setTimeout(() => window.saveSession(), 300);
}

function deleteSelected() {
    if (selectedObjects.size === 0) return alert("Select an object first");
    selectedObjects.forEach(obj => {
        scene.remove(obj);
        furnitureList = furnitureList.filter(o => o !== obj);
    });
    selectedObjects.clear();
    updateSelectionHighlight();
    setTimeout(() => window.saveSession(), 200);
}

async function saveDesign() {
    // Check if user is logged in
    if (!window.currentUser) {
        const signIn = confirm('You need to sign in to save your design. Would you like to go to the sign in page?');
        if (signIn) {
            document.body.classList.add('page-transition');
            setTimeout(() => {
                window.location.href = '/';
            }, 300);
        }
        return;
    }
    
    // Ask user for design name
    const designName = prompt('Enter a name for your design:', `Design ${new Date().toLocaleString()}`);
    if (!designName) {
        return; // User cancelled
    }
    
    const furnitureData = furnitureList.map(obj => ({
        type: obj.userData.type,
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
        rotation: obj.rotation.y,
        scale: obj.scale.x
    }));

    const roomData = {
        width:      parseFloat(document.getElementById('roomWidth').value)  || 20,
        length:     parseFloat(document.getElementById('roomLength').value) || 20,
        height:     parseFloat(document.getElementById('roomHeight').value) || 8,
        wallColor:  document.getElementById('wallColor').value,
        wallStyle:  document.getElementById('wallStyleSelect').value,
        floorColor: document.getElementById('floorColor').value,
        roofColor:  document.getElementById('roofColor').value,
    };
    
    try {
        const response = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: designName, furniture: furnitureData, room: roomData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
        } else {
            alert("Failed to save design: " + result.message);
        }
    } catch (error) {
        alert("Error saving design: " + error.message);
    }
}

async function loadDesign() {
    // Check if user is logged in
    if (!window.currentUser) {
        const signIn = confirm('You need to sign in to load your saved designs. Would you like to go to the sign in page?');
        if (signIn) {
            document.body.classList.add('page-transition');
            setTimeout(() => {
                window.location.href = '/';
            }, 300);
        }
        return;
    }
    
    try {
        // Load the most recent design
        const loadResponse = await fetch(`/load`);
        const loadResult = await loadResponse.json();
        
        if (!loadResult.success) {
            alert("No saved designs found. Use 'Manage Designs' to see all your designs.");
            return;
        }
        
        // Clear current furniture
        furnitureList.forEach(obj => scene.remove(obj));
        furnitureList = [];
        
        // Add loaded furniture
        loadResult.furniture.forEach(item => {
            const obj = createFurniture(item.type);
            obj.position.set(item.x, item.y, item.z);
            obj.rotation.y = item.rotation || 0;
            if (item.scale) obj.scale.setScalar(item.scale);
        });

        // Restore room state
        if (loadResult.room) applyRoomState(loadResult.room);
        
        alert(`Latest design "${loadResult.design_name}" loaded successfully!`);
    } catch (error) {
        alert("Error loading design: " + error.message);
    }
}

async function manageDesigns() {
    if (!window.currentUser) {
        const signIn = confirm('You need to sign in to manage your saved designs. Would you like to go to the sign in page?');
        if (signIn) {
            document.body.classList.add('page-transition');
            setTimeout(() => { window.location.href = '/'; }, 300);
        }
        return;
    }

    try {
        const response = await fetch("/designs");
        const result = await response.json();

        const modal = document.getElementById('designsModal');
        const list  = document.getElementById('designsList');
        const sub   = document.getElementById('designsSubtitle');

        if (!result.success || result.designs.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#6b7280;font-size:14px;">No saved designs yet.</div>`;
            sub.textContent = '';
        } else {
            sub.textContent = `${result.designs.length} design${result.designs.length > 1 ? 's' : ''}`;
            list.innerHTML = result.designs.map((d, i) => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:8px;background:#fafafa;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${d.name}</div>
                        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${d.furniture_count} items &nbsp;·&nbsp; ${d.updated_at}</div>
                    </div>
                    <button onclick="loadDesignById(${d.id},'${d.name.replace(/'/g,"\\'")}',this)"
                        style="background:#84cc16;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;">
                        Load
                    </button>
                    <button onclick="deleteDesignById(${d.id},'${d.name.replace(/'/g,"\\'")}',this)"
                        style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:6px 10px;font-size:12px;font-weight:600;cursor:pointer;">
                        ✕
                    </button>
                </div>
            `).join('');
        }

        modal.style.display = 'flex';
    } catch (error) {
        alert("Error loading designs: " + error.message);
    }
}

function closeDesignsModal() {
    document.getElementById('designsModal').style.display = 'none';
}

async function loadDesignById(id, name, btn) {
    try {
        btn.textContent = '...';
        btn.disabled = true;
        const res  = await fetch(`/load?design_id=${id}`);
        const data = await res.json();
        if (!data.success) { alert("Failed to load: " + data.message); btn.textContent='Load'; btn.disabled=false; return; }

        furnitureList.forEach(obj => scene.remove(obj));
        furnitureList = [];
        data.furniture.forEach(item => {
            const obj = createFurniture(item.type);
            obj.position.set(item.x, item.y, item.z);
            obj.rotation.y = item.rotation || 0;
            if (item.scale) obj.scale.setScalar(item.scale);
        });
        if (data.room) applyRoomState(data.room);

        closeDesignsModal();
        // small toast
        const t = document.createElement('div');
        t.textContent = `"${data.design_name}" loaded`;
        Object.assign(t.style, {position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:'#111',color:'#fff',padding:'10px 20px',borderRadius:'8px',fontSize:'13px',zIndex:'99999',opacity:'1',transition:'opacity 0.4s'});
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),400); }, 2000);
    } catch(e) { alert("Error: " + e.message); }
}

async function deleteDesignById(id, name, btn) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
        const res  = await fetch(`/delete_design/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            // remove the row
            btn.closest('div[style]').remove();
            // update subtitle count
            const remaining = document.querySelectorAll('#designsList > div').length;
            document.getElementById('designsSubtitle').textContent = remaining ? `${remaining} design${remaining>1?'s':''}` : '';
            if (!remaining) document.getElementById('designsList').innerHTML = `<div style="text-align:center;padding:40px 20px;color:#6b7280;font-size:14px;">No saved designs yet.</div>`;
        } else {
            alert("Delete failed: " + data.message);
        }
    } catch(e) { alert("Error: " + e.message); }
}



// ===== ENHANCEMENT FEATURES =====

// History for undo/redo
let actionHistory = [];
let historyIndex = -1;

// Save current state to history
function saveState() {
    const state = {
        furniture: furnitureList.map(obj => ({
            type: obj.userData.type,
            x: obj.position.x,
            y: obj.position.y,
            z: obj.position.z,
            rotation: obj.rotation.y,
            scale: obj.scale.x
        }))
    };
    actionHistory = actionHistory.slice(0, historyIndex + 1);
    actionHistory.push(state);
    historyIndex++;
    if (actionHistory.length > 20) {
        actionHistory.shift();
        historyIndex--;
    }
}

// Undo last action
function undoAction() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(actionHistory[historyIndex]);
    } else {
        alert('Nothing to undo');
    }
}

// Redo action
function redoAction() {
    if (historyIndex < actionHistory.length - 1) {
        historyIndex++;
        restoreState(actionHistory[historyIndex]);
    } else {
        alert('Nothing to redo');
    }
}

// Restore state from history
function restoreState(state) {
    furnitureList.forEach(obj => scene.remove(obj));
    furnitureList = [];
    selectedObjects.clear();
    state.furniture.forEach(item => {
        const obj = createFurniture(item.type);
        obj.position.set(item.x, item.y, item.z);
        obj.rotation.y = item.rotation;
        if (item.scale) obj.scale.setScalar(item.scale);
    });
    updateSelectionHighlight();
}

// Reset camera to default position
function resetCamera() {
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
}

// Top-down view
function topView() {
    const roomWidth = parseFloat(document.getElementById('roomWidth').value) || 20;
    const roomLength = parseFloat(document.getElementById('roomLength').value) || 20;
    const maxDim = Math.max(roomWidth, roomLength);
    
    camera.position.set(0, maxDim * 1.2, 0);
    camera.lookAt(0, 0, 0);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
}

// Capture screenshot and download
function captureScreenshot() {
    try {
        // Render the scene
        renderer.render(scene, camera);
        
        // Get canvas data as image
        const canvas = renderer.domElement;
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `design_${new Date().getTime()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        });
        
        alert('Screenshot saved!');
    } catch (error) {
        alert('Error capturing screenshot: ' + error.message);
    }
}

// ===== SESSION AUTO-SAVE FEATURE =====

// Auto-save current session to localStorage
function saveSession() {
    const sessionData = {
        furniture: furnitureList.map(obj => ({
            type: obj.userData.type,
            x: obj.position.x,
            y: obj.position.y,
            z: obj.position.z,
            rotation: obj.rotation.y,
            scale: obj.scale.x
        })),
        room: {
            width:      parseFloat(document.getElementById('roomWidth').value)  || 20,
            length:     parseFloat(document.getElementById('roomLength').value) || 20,
            height:     parseFloat(document.getElementById('roomHeight').value) || 8,
            wallColor:  document.getElementById('wallColor').value,
            wallStyle:  document.getElementById('wallStyleSelect').value,
            floorColor: document.getElementById('floorColor').value,
            roofColor:  document.getElementById('roofColor').value,
        },
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('currentSession', JSON.stringify(sessionData));
}

// Load session from localStorage
function loadSession() {
    try {
        const sessionData = localStorage.getItem('currentSession');
        if (!sessionData) return false;
        
        const session = JSON.parse(sessionData);
        
        furnitureList.forEach(obj => scene.remove(obj));
        furnitureList = [];

        // Restore room dimensions + colors
        const r = session.room || {};
        const rw = r.width  || session.roomWidth  || 20;
        const rl = r.length || session.roomLength || 20;
        const rh = r.height || 8;
        document.getElementById('roomWidth').value  = rw;
        document.getElementById('roomLength').value = rl;
        document.getElementById('roomHeight').value = rh;
        updateRoomSize();

        if (r.wallColor || session.wallColor) {
            const wc = r.wallColor || session.wallColor;
            document.getElementById('wallColor').value = wc;
            changeWallColor(wc);
        }
        if (r.wallStyle) {
            document.getElementById('wallStyleSelect').value = r.wallStyle;
            changeWallStyle(r.wallStyle);
        }
        if (r.floorColor || session.floorColor) {
            const fc = r.floorColor || session.floorColor;
            document.getElementById('floorColor').value = fc;
            changeFloorColor(fc);
        }
        if (r.roofColor) {
            document.getElementById('roofColor').value = r.roofColor;
            changeRoofColor(r.roofColor);
        }

        // Restore furniture
        session.furniture.forEach(item => {
            const obj = createFurniture(item.type);
            obj.position.set(item.x, item.y, item.z);
            obj.rotation.y = item.rotation || 0;
            if (item.scale) obj.scale.setScalar(item.scale);
        });

        return true;
    } catch (error) {
        console.error('Error loading session:', error);
        return false;
    }
}

// Clear current session
function clearSession() {
    localStorage.removeItem('currentSession');
    console.log('Session cleared');
}

// Auto-save session periodically (every 10 seconds)
setInterval(() => {
    if (furnitureList.length > 0) {
        saveSession();
    }
}, 10000);

// Save session before page unload
window.addEventListener('beforeunload', () => {
    saveSession();
});

// Expose functions globally
window.saveSession = saveSession;
window.loadSession = loadSession;
window.clearSession = clearSession;
// Use getter so window.furnitureList always reflects the current array
Object.defineProperty(window, 'furnitureList', { get: () => furnitureList, set: v => { furnitureList = v; } });
window.scene = scene;

// Save initial state for undo/redo
setTimeout(() => saveState(), 1000);

// Always-on keyboard listener for Q/E shortcuts and walk mode WASD
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// ===== FIRST-PERSON WALK MODE =====

function toggleWalkMode() {
    isWalkMode = !isWalkMode;
    
    const btn = document.getElementById('walkModeBtn');
    const controls = document.getElementById('walkControls');
    
    if (isWalkMode) {
        // Enter walk mode
        orbitControls.enabled = false;
        camera.position.y = 1.7;
        camera.rotation.order = 'YXZ';
        yaw = 0;
        pitch = 0;
        camera.rotation.set(0, 0, 0);
        renderer.domElement.requestPointerLock();
        btn.textContent = '🎨 Design Mode';
        btn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        controls.classList.add('active');
        document.addEventListener('mousemove', onMouseMove);
    } else {
        // Exit walk mode
        orbitControls.enabled = true;
        
        // Exit pointer lock
        document.exitPointerLock();
        
        // Reset camera
        camera.position.set(12, 10, 12);
        camera.lookAt(0, 0, 0);
        orbitControls.target.set(0, 0, 0);
        orbitControls.update();
        
        // Update button
        btn.textContent = '🚶 Walk Mode';
        btn.style.background = 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)';
        
        // Hide controls overlay
        controls.classList.remove('active');
        document.removeEventListener('mousemove', onMouseMove);
        keys = { w: false, a: false, s: false, d: false };
        updateKeyVisuals();
    }
}

function onMouseMove(event) {
    if (!isWalkMode) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    yaw -= movementX * lookSpeed;
    pitch -= movementY * lookSpeed;
    
    // Limit pitch to prevent flipping
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

function onKeyDown(event) {
    // Q/E always move selected furniture up/down (design mode)
    if (!isWalkMode) {
        if (event.code === 'KeyQ') { moveSelectedY(0.1); return; }
        if (event.code === 'KeyE') { moveSelectedY(-0.1); return; }
        return; // ignore other keys in design mode
    }
    // Walk mode WASD
    switch(event.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 's': keys.s = true; break;
        case 'd': keys.d = true; break;
    }
    updateKeyVisuals();
}

function onKeyUp(event) {
    if (!isWalkMode) return;
    
    switch(event.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 's': keys.s = false; break;
        case 'd': keys.d = false; break;
    }
    updateKeyVisuals();
}

function updateKeyVisuals() {
    const keyW = document.getElementById('keyW');
    const keyA = document.getElementById('keyA');
    const keyS = document.getElementById('keyS');
    const keyD = document.getElementById('keyD');
    
    if (keyW) keyW.classList.toggle('active', keys.w);
    if (keyA) keyA.classList.toggle('active', keys.a);
    if (keyS) keyS.classList.toggle('active', keys.s);
    if (keyD) keyD.classList.toggle('active', keys.d);
}

function updateWalkMode() {
    if (!isWalkMode) return;
    
    // Calculate movement direction
    const direction = new THREE.Vector3();
    
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;
    
    if (direction.length() > 0) {
        direction.normalize();
        
        // Apply only Y rotation (horizontal) to movement, ignore pitch
        const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
        direction.applyEuler(euler);
        
        // Move camera horizontally only
        camera.position.x += direction.x * moveSpeed;
        camera.position.z += direction.z * moveSpeed;
        
        // Always keep camera at eye level (don't let it go up or down)
        camera.position.y = 1.7;
    }
}

