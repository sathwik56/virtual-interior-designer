import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, orbitControls;
let furnitureList = [], selectedObjects = new Set(), walls = null, floor = null, grid = null;
let draggedObject = null, dragOffset = new THREE.Vector3();

init();
animate();

window.addFurniture = addFurniture;
window.addSelectedFurniture = addSelectedFurniture;
window.rotateSelected = rotateSelected;
window.changeWallColor = changeWallColor;
window.changeFloorColor = changeFloorColor;
window.toggleWalls = toggleWalls;
window.toggleGrid = toggleGrid;
window.saveDesign = saveDesign;
window.loadDesign = loadDesign;
window.deleteSelected = deleteSelected;
window.updateRoomSize = updateRoomSize;
window.manageDesigns = manageDesigns;
window.undoAction = undoAction;
window.redoAction = redoAction;
window.resetCamera = resetCamera;
window.topView = topView;
window.captureScreenshot = captureScreenshot;
window.createFurniture = createFurniture;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1f2e);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(12, 10, 12);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    // Professional lighting with realistic depth and shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

    floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Professional light gray grid
    grid = new THREE.GridHelper(20, 20, 0x4a5568, 0x4a5568);
    grid.position.y = 0.02;
    scene.add(grid);

    walls = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x374151, side: THREE.DoubleSide });
    
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
    backWall.position.set(0, 4, -10);
    walls.add(backWall);
    
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
    leftWall.position.set(-10, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    walls.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMat);
    rightWall.position.set(10, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    walls.add(rightWall);
    
    scene.add(walls);

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, camera);
}

function createFurniture(type) {
    const group = new THREE.Group();
    
    if (type === 'bed') {
        // White mattress
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        mattress.position.y = 0.4;
        group.add(mattress);
        // Dark wood headboard
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 }));
        headboard.position.set(0, 0.8, -0.9);
        group.add(headboard);
        // Wood base
        const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 2), new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 }));
        base.position.y = 0.15;
        group.add(base);
    }
    else if (type === 'sofa') {
        // Gray fabric sofa with proper floor positioning
        // Base/legs
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 }));
        base.position.y = 0.075;
        group.add(base);
        // Seat cushion
        const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 1), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 }));
        seat.position.y = 0.35;
        group.add(seat);
        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 }));
        back.position.set(0, 0.75, -0.4);
        group.add(back);
        // Arms
        [1.15, -1.15].forEach(x => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 }));
            arm.position.set(x, 0.55, 0);
            group.add(arm);
        });
    }
    else if (type === 'table') {
        // Natural light oak dining table
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0xc9a87c, roughness: 0.4 }));
        top.position.y = 0.75;
        group.add(top);
        [0.6, -0.6].forEach(x => {
            [0.6, -0.6].forEach(z => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0xb89968, roughness: 0.5 }));
                leg.position.set(x, 0.35, z);
                group.add(leg);
            });
        });
    }
    else if (type === 'chair') {
        // Black office chair
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }));
        seat.position.y = 0.45;
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }));
        back.position.set(0, 0.7, -0.21);
        group.add(back);
        [0.2, -0.2].forEach(x => {
            [0.2, -0.2].forEach(z => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 }));
                leg.position.set(x, 0.225, z);
                group.add(leg);
            });
        });
    }
    else if (type === 'cabinet') {
        // Light wood cabinet - positioned so bottom sits on floor
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.6), new THREE.MeshStandardMaterial({ color: 0xa0826d, roughness: 0.5 }));
        body.position.y = 1.01;  // Slightly above floor to prevent z-fighting
        group.add(body);
        [0.3, -0.3].forEach(x => {
            const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.02), new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.6 }));
            door.position.set(x, 1.01, 0.31);
            group.add(door);
            // Door handle
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 }));
            handle.position.set(x - 0.15, 1.01, 0.33);
            group.add(handle);
        });
    }
    else if (type === 'desk') {
        // Modern white desk
        const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 }));
        top.position.y = 0.75;
        group.add(top);
        [0.9, -0.9].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.4 }));
            leg.position.set(x, 0.35, 0);
            group.add(leg);
        });
    }
    else if (type === 'bookshelf') {
        // Natural wood bookshelf with glass door - properly positioned on floor
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.4), new THREE.MeshStandardMaterial({ color: 0xc9a87c, roughness: 0.6 }));
        body.position.y = 1.26;  // Height is 2.5, so center at 1.25 puts bottom at 0.01 (slightly above floor)
        group.add(body);
        [0.8, 0.4, 0, -0.4, -0.8].forEach(y => {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.35), new THREE.MeshStandardMaterial({ color: 0xb89968 }));
            shelf.position.set(0, y + 1.26, 0);
            group.add(shelf);
        });
        // Glass door
        const glassDoor = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 2.4, 0.02), 
            new THREE.MeshStandardMaterial({ 
                color: 0xadd8e6, 
                transparent: true, 
                opacity: 0.3, 
                roughness: 0.1 
            })
        );
        glassDoor.position.set(0, 1.26, 0.21);
        group.add(glassDoor);
        // Door handle
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.15, 0.05), 
            new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 })
        );
        handle.position.set(0.6, 1.26, 0.23);
        group.add(handle);
    }
    else if (type === 'nightstand') {
        // Light wood nightstand
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: 0xa0826d, roughness: 0.5 }));
        body.position.y = 0.3;
        group.add(body);
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.02), new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
        drawer.position.set(0, 0.3, 0.26);
        group.add(drawer);
        // Knob
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 }));
        knob.position.set(0, 0.3, 0.28);
        group.add(knob);
    }
    else if (type === 'wardrobe') {
        // White wardrobe
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.8), new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 }));
        body.position.y = 1.25;
        group.add(body);
        [0.5, -0.5].forEach(x => {
            const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.3, 0.02), new THREE.MeshStandardMaterial({ color: 0xf0f0f0 }));
            door.position.set(x, 1.25, 0.41);
            group.add(door);
            // Handle
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.05), new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.7 }));
            handle.position.set(x - 0.3, 1.25, 0.43);
            group.add(handle);
        });
    }
    else if (type === 'coffeetable') {
        // Glass coffee table
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x87ceeb, roughness: 0.1, transparent: true, opacity: 0.6 }));
        top.position.y = 0.4;
        group.add(top);
        [0.5, -0.5].forEach(x => {
            [0.3, -0.3].forEach(z => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.06), new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8 }));
                leg.position.set(x, 0.175, z);
                group.add(leg);
            });
        });
    }
    else if (type === 'tvstand') {
        // Black TV stand
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 }));
        body.position.y = 0.3;
        group.add(body);
        [0.8, -0.8].forEach(x => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
            leg.position.set(x, 0.125, 0);
            group.add(leg);
        });
    }
    else if (type === 'dresser') {
        // Mahogany dresser
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.5 }));
        body.position.y = 0.6;
        group.add(body);
        [0.4, 0, -0.4].forEach(y => {
            const drawer = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.02), new THREE.MeshStandardMaterial({ color: 0x5a3a1f }));
            drawer.position.set(0, y, 0.31);
            group.add(drawer);
            // Handles
            [-0.4, 0.4].forEach(x => {
                const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.03), new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8 }));
                handle.position.set(x, y, 0.33);
                group.add(handle);
            });
        });
    }
    else if (type === 'armchair') {
        // Beige armchair with proper floor positioning
        // Base/legs
        const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0xb8956f, roughness: 0.8 }));
        base.position.y = 0.05;
        group.add(base);
        // Seat cushion
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 1), new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 }));
        seat.position.y = 0.275;
        group.add(seat);
        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 }));
        back.position.set(0, 0.65, -0.4);
        group.add(back);
        // Arms
        [0.45, -0.45].forEach(x => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 }));
            arm.position.set(x, 0.5, 0);
            group.add(arm);
        });
    }
    else if (type === 'diningchair') {
        // Brown wooden dining chair
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6 }));
        seat.position.y = 0.45;
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6 }));
        back.position.set(0, 0.75, -0.21);
        group.add(back);
        [0.2, -0.2].forEach(x => {
            [0.2, -0.2].forEach(z => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x8b6914 }));
                leg.position.set(x, 0.225, z);
                group.add(leg);
            });
        });
    }
    else if (type === 'lamp') {
        // Modern lamp
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05), new THREE.MeshStandardMaterial({ color: 0x2f4f4f, metalness: 0.6 }));
        base.position.y = 0.025;
        group.add(base);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), new THREE.MeshStandardMaterial({ color: 0x2f4f4f, metalness: 0.7 }));
        pole.position.y = 0.4;
        group.add(pole);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xfffacd, roughness: 0.4, emissive: 0xffffe0, emissiveIntensity: 0.2 }));
        shade.position.y = 0.95;
        group.add(shade);
    }
    else if (type === 'interiorwall') {
        // Interior Wall - Clean white
        const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        wall.position.y = 1.25;
        group.add(wall);
    }
    else if (type === 'doorwall') {
        // Wall with Door - White wall with dark door
        const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        wall.position.y = 1.25;
        group.add(wall);
        
        // Door opening (darker rectangle)
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }));
        doorFrame.position.set(0, 1, 0);
        group.add(doorFrame);
        
        // Door handle
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 }));
        handle.position.set(0.3, 1, 0.07);
        group.add(handle);
    }
    else if (type === 'windowwall') {
        // Wall with Window - Create wall with actual window opening
        
        // Bottom part of wall (below window)
        const wallBottom = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        wallBottom.position.y = 0.25;
        group.add(wallBottom);
        
        // Top part of wall (above window)
        const wallTop = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        wallTop.position.y = 2;
        group.add(wallTop);
        
        // Left side of wall (beside window)
        const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        wallLeft.position.set(-1.05, 1, 0);
        group.add(wallLeft);
        
        // Right side of wall (beside window)
        const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
        wallRight.position.set(1.05, 1, 0);
        group.add(wallRight);
        
        // Window glass (light blue, semi-transparent)
        const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 0.02), new THREE.MeshStandardMaterial({ 
            color: 0x87ceeb, 
            transparent: true, 
            opacity: 0.4,
            roughness: 0.1 
        }));
        windowGlass.position.set(0, 1, 0);
        group.add(windowGlass);
        
        // Window frame (brown wood)
        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }));
        frameTop.position.set(0, 1.5, 0);
        group.add(frameTop);
        
        const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }));
        frameBottom.position.set(0, 0.5, 0);
        group.add(frameBottom);
        
        const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }));
        frameLeft.position.set(-0.6, 1, 0);
        group.add(frameLeft);
        
        const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.12), new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }));
        frameRight.position.set(0.6, 1, 0);
        group.add(frameRight);
    }
    else if (type === 'glasswall') {
        // Glass Wall - Transparent with metal frame
        const glass = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 0.05), new THREE.MeshStandardMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.1
        }));
        glass.position.y = 1.25;
        group.add(glass);
        
        // Metal frame
        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.8 }));
        frameTop.position.y = 2.45;
        group.add(frameTop);
        
        const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.8 }));
        frameBottom.position.y = 0.05;
        group.add(frameBottom);
        
        const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.8 }));
        frameLeft.position.set(-1.45, 1.25, 0);
        group.add(frameLeft);
        
        const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 0.08), new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.8 }));
        frameRight.position.set(1.45, 1.25, 0);
        group.add(frameRight);
    }
    else if (type === 'straightstairs') {
        // Straight Staircase - 12 steps going up
        const stepCount = 12;
        const stepWidth = 1.2;
        const stepDepth = 0.3;
        const stepHeight = 0.18;
        
        for (let i = 0; i < stepCount; i++) {
            // Individual step
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), 
                new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
            );
            step.position.set(0, (i + 0.5) * stepHeight, i * stepDepth - 1.5);
            group.add(step);
        }
        
        // Handrail material
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.4 });
        
        // Left handrail - continuous rail following the stairs
        const leftRailPoints = [];
        for (let i = 0; i <= stepCount; i++) {
            leftRailPoints.push(new THREE.Vector3(
                -0.55,
                i * stepHeight + 0.9,
                i * stepDepth - 1.5
            ));
        }
        const leftRailCurve = new THREE.CatmullRomCurve3(leftRailPoints);
        const leftRailGeometry = new THREE.TubeGeometry(leftRailCurve, 50, 0.025, 8, false);
        const leftRail = new THREE.Mesh(leftRailGeometry, railMaterial);
        group.add(leftRail);
        
        // Right handrail - continuous rail following the stairs
        const rightRailPoints = [];
        for (let i = 0; i <= stepCount; i++) {
            rightRailPoints.push(new THREE.Vector3(
                0.55,
                i * stepHeight + 0.9,
                i * stepDepth - 1.5
            ));
        }
        const rightRailCurve = new THREE.CatmullRomCurve3(rightRailPoints);
        const rightRailGeometry = new THREE.TubeGeometry(rightRailCurve, 50, 0.025, 8, false);
        const rightRail = new THREE.Mesh(rightRailGeometry, railMaterial);
        group.add(rightRail);
        
        // Vertical posts (supports)
        for (let i = 0; i <= stepCount; i += 2) {
            const postY = i * stepHeight + 0.9;
            const postZ = i * stepDepth - 1.5;
            
            // Left post
            const leftPost = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9), 
                railMaterial
            );
            leftPost.position.set(-0.55, postY / 2, postZ);
            group.add(leftPost);
            
            // Right post
            const rightPost = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9), 
                railMaterial
            );
            rightPost.position.set(0.55, postY / 2, postZ);
            group.add(rightPost);
        }
    }
    else if (type === 'lshapedstairs') {
        // L-Shaped Staircase - Two flights at 90 degrees
        const stepWidth = 1.2;
        const stepDepth = 0.3;
        const stepHeight = 0.18;
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.4 });
        
        // First flight (6 steps going forward)
        for (let i = 0; i < 6; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), 
                new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
            );
            step.position.set(0, (i + 0.5) * stepHeight, i * stepDepth - 0.8);
            group.add(step);
        }
        
        // Landing platform
        const landing = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.18, 1.2), 
            new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
        );
        landing.position.set(0, 6 * stepHeight + 0.09, 1);
        group.add(landing);
        
        // Second flight (6 steps going right)
        for (let i = 0; i < 6; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(stepDepth, stepHeight, stepWidth), 
                new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 })
            );
            step.position.set(i * stepDepth + 0.8, (i + 6.5) * stepHeight, 1);
            group.add(step);
        }
        
        // First flight handrail - continuous tube
        const firstFlightPoints = [];
        for (let i = 0; i <= 6; i++) {
            firstFlightPoints.push(new THREE.Vector3(
                -0.55,
                i * stepHeight + 0.9,
                i * stepDepth - 0.8
            ));
        }
        const firstFlightCurve = new THREE.CatmullRomCurve3(firstFlightPoints);
        const firstFlightGeometry = new THREE.TubeGeometry(firstFlightCurve, 30, 0.025, 8, false);
        const firstFlightRail = new THREE.Mesh(firstFlightGeometry, railMaterial);
        group.add(firstFlightRail);
        
        // Second flight handrail - continuous tube
        const secondFlightPoints = [];
        for (let i = 0; i <= 6; i++) {
            secondFlightPoints.push(new THREE.Vector3(
                i * stepDepth + 0.8,
                (i + 6) * stepHeight + 0.9,
                1.55
            ));
        }
        const secondFlightCurve = new THREE.CatmullRomCurve3(secondFlightPoints);
        const secondFlightGeometry = new THREE.TubeGeometry(secondFlightCurve, 30, 0.025, 8, false);
        const secondFlightRail = new THREE.Mesh(secondFlightGeometry, railMaterial);
        group.add(secondFlightRail);
        
        // Vertical posts for first flight
        for (let i = 0; i <= 6; i += 2) {
            const postY = i * stepHeight + 0.9;
            const postZ = i * stepDepth - 0.8;
            
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9), 
                railMaterial
            );
            post.position.set(-0.55, postY / 2, postZ);
            group.add(post);
        }
        
        // Vertical posts for second flight
        for (let i = 0; i <= 6; i += 2) {
            const postY = (i + 6) * stepHeight + 0.9;
            const postX = i * stepDepth + 0.8;
            
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9), 
                railMaterial
            );
            post.position.set(postX, postY / 2, 1.55);
            group.add(post);
        }
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
            const y = i * stepHeight + 0.9;
            
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9), 
                railMaterial
            );
            post.position.set(x, y / 2, z);
            group.add(post);
        }
    }
    
    // Set position for furniture (not demo)
    group.position.set((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10);
    
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
    
    return group; // Return the created furniture object
}

function enableDragging() {
    if (dragControls) dragControls.dispose();
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    renderer.domElement.addEventListener("click", (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
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
        } else {
            selectedObjects.clear();
            updateSelectionHighlight();
        }
    });
    
    renderer.domElement.addEventListener("mousedown", (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
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
                dragOffset.copy(draggedObject.position);
            }
        }
    });
    
    renderer.domElement.addEventListener("mousemove", (e) => {
        if (!draggedObject) return;
        
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        
        const planeNormal = new THREE.Vector3(0, 1, 0);
        const plane = new THREE.Plane(planeNormal, 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        
        const delta = new THREE.Vector3().subVectors(intersection, dragOffset);
        
        selectedObjects.forEach(obj => {
            obj.position.add(delta);
        });
        
        dragOffset.copy(intersection);
    });
    
    renderer.domElement.addEventListener("mouseup", () => {
        if (draggedObject) {
            setTimeout(() => window.saveSession(), 200);
        }
        draggedObject = null;
        orbitControls.enabled = true;
    });
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
}

function addFurniture(type) {
    createFurniture(type);
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

function changeWallColor(color) {
    walls.traverse(child => {
        if (child.isMesh) {
            child.material.color.setStyle(color);
        }
    });
    setTimeout(() => window.saveSession(), 200);
}

function changeFloorColor(color) {
    floor.material.color.setStyle(color);
    setTimeout(() => window.saveSession(), 200);
}

function toggleWalls() {
    walls.visible = !walls.visible;
}

function toggleGrid() {
    grid.visible = !grid.visible;
}

function updateRoomSize() {
    const width = parseFloat(document.getElementById('roomWidth').value) || 20;
    const length = parseFloat(document.getElementById('roomLength').value) || 20;
    
    // Store current colors
    const currentFloorColor = floor.material.color.clone();
    const currentWallColor = walls.children[0] ? walls.children[0].material.color.clone() : new THREE.Color(0x374151);
    
    // Update floor to match exact room dimensions
    scene.remove(floor);
    floor = new THREE.Mesh(
        new THREE.PlaneGeometry(width, length),
        new THREE.MeshStandardMaterial({ color: currentFloorColor, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Update grid to match exact room dimensions
    const divisions = Math.max(10, Math.floor(Math.max(width, length)));
    
    scene.remove(grid);
    grid = new THREE.GridHelper(Math.max(width, length), divisions, 0x4a5568, 0x4a5568);
    grid.position.y = 0.02;
    
    // Scale grid to match rectangular rooms (if width != length)
    if (width !== length) {
        grid.scale.set(width / Math.max(width, length), 1, length / Math.max(width, length));
    }
    
    scene.add(grid);
    
    // Update walls to match exact room dimensions
    scene.remove(walls);
    walls = new THREE.Group();
    const wallMat = new THREE.MeshStandardMaterial({ color: currentWallColor, side: THREE.DoubleSide });
    
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, 8), wallMat);
    backWall.position.set(0, 4, -length / 2);
    walls.add(backWall);
    
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(length, 8), wallMat);
    leftWall.position.set(-width / 2, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    walls.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(length, 8), wallMat);
    rightWall.position.set(width / 2, 4, 0);
    rightWall.rotation.y = -Math.PI / 2;
    walls.add(rightWall);
    
    scene.add(walls);
}

function deleteSelected() {
    if (selectedObjects.size === 0) return alert("Select an object first");
    selectedObjects.forEach(obj => {
        scene.remove(obj);
        furnitureList = furnitureList.filter(o => o !== obj);
    });
    selectedObjects.clear();
    enableDragging();
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
        rotation: obj.rotation.y
    }));
    
    try {
        const response = await fetch("/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: designName,
                furniture: furnitureData
            })
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
            createFurniture(item.type);
            const obj = furnitureList[furnitureList.length - 1];
            obj.position.set(item.x, item.y, item.z);
            obj.rotation.y = item.rotation || 0;
        });
        
        alert(`Latest design "${loadResult.design_name}" loaded successfully!`);
    } catch (error) {
        alert("Error loading design: " + error.message);
    }
}

async function manageDesigns() {
    // Check if user is logged in
    if (!window.currentUser) {
        const signIn = confirm('You need to sign in to manage your saved designs. Would you like to go to the sign in page?');
        if (signIn) {
            document.body.classList.add('page-transition');
            setTimeout(() => {
                window.location.href = '/';
            }, 300);
        }
        return;
    }
    
    try {
        // Get list of user's designs
        const response = await fetch("/designs");
        const result = await response.json();
        
        if (!result.success || result.designs.length === 0) {
            alert("You don't have any saved designs yet.");
            return;
        }
        
        // Create a formatted list of designs
        let message = "YOUR SAVED DESIGNS:\n\n";
        result.designs.forEach((design, index) => {
            message += `${index + 1}. ${design.name}\n`;
            message += `   Items: ${design.furniture_count} | Updated: ${design.updated_at}\n\n`;
        });
        message += "\nOptions:\n";
        message += "• Enter number to LOAD a design\n";
        message += "• Enter number with 'D' to DELETE (e.g., '2D' to delete design 2)\n";
        message += "• Press Cancel to close\n";
        
        const input = prompt(message);
        
        if (!input) {
            return; // User cancelled
        }
        
        // Check if user wants to delete (ends with 'D' or 'd')
        if (input.toUpperCase().endsWith('D')) {
            const designIndex = parseInt(input.slice(0, -1)) - 1;
            
            if (designIndex < 0 || designIndex >= result.designs.length) {
                alert("Invalid design number");
                return;
            }
            
            const designToDelete = result.designs[designIndex];
            
            // Confirm deletion
            if (!confirm(`Are you sure you want to delete "${designToDelete.name}"?\n\nThis action cannot be undone.`)) {
                return;
            }
            
            // Delete the design
            const deleteResponse = await fetch(`/delete_design/${designToDelete.id}`, {
                method: 'DELETE'
            });
            
            const deleteResult = await deleteResponse.json();
            
            if (deleteResult.success) {
                alert(`Design "${designToDelete.name}" deleted successfully!`);
            } else {
                alert("Failed to delete design: " + deleteResult.message);
            }
        } else {
            // Load design
            const designIndex = parseInt(input) - 1;
            
            if (designIndex < 0 || designIndex >= result.designs.length) {
                alert("Invalid design number");
                return;
            }
            
            const selectedDesign = result.designs[designIndex];
            
            // Load the selected design
            const loadResponse = await fetch(`/load?design_id=${selectedDesign.id}`);
            const loadResult = await loadResponse.json();
            
            if (!loadResult.success) {
                alert("Failed to load design: " + loadResult.message);
                return;
            }
            
            // Clear current furniture
            furnitureList.forEach(obj => scene.remove(obj));
            furnitureList = [];
            
            // Add loaded furniture
            loadResult.furniture.forEach(item => {
                createFurniture(item.type);
                const obj = furnitureList[furnitureList.length - 1];
                obj.position.set(item.x, item.y, item.z);
                obj.rotation.y = item.rotation || 0;
            });
            
            alert(`Design "${loadResult.design_name}" loaded successfully!`);
        }
    } catch (error) {
        alert("Error managing designs: " + error.message);
    }
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
            rotation: obj.rotation.y
        }))
    };
    
    // Remove any states after current index
    actionHistory = actionHistory.slice(0, historyIndex + 1);
    actionHistory.push(state);
    historyIndex++;
    
    // Limit history to 20 actions
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
    // Clear current furniture
    furnitureList.forEach(obj => scene.remove(obj));
    furnitureList = [];
    
    // Recreate furniture from state
    state.furniture.forEach(item => {
        const furniture = createFurniture(item.type);
        furniture.position.set(item.x, item.y, item.z);
        furniture.rotation.y = item.rotation;
        furniture.userData.type = item.type;
        scene.add(furniture);
        furnitureList.push(furniture);
    });
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
            rotation: obj.rotation.y
        })),
        roomWidth: parseFloat(document.getElementById('roomWidth').value) || 20,
        roomLength: parseFloat(document.getElementById('roomLength').value) || 20,
        wallColor: document.getElementById('wallColor').value,
        floorColor: document.getElementById('floorColor').value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('currentSession', JSON.stringify(sessionData));
    console.log('Session auto-saved:', sessionData.furniture.length, 'items');
}

// Load session from localStorage
function loadSession() {
    try {
        const sessionData = localStorage.getItem('currentSession');
        if (!sessionData) {
            console.log('No previous session found');
            return false;
        }
        
        const session = JSON.parse(sessionData);
        console.log('Loading session from:', session.timestamp);
        
        // Clear current furniture
        furnitureList.forEach(obj => scene.remove(obj));
        furnitureList = [];
        
        // Restore room size
        if (session.roomWidth && session.roomLength) {
            document.getElementById('roomWidth').value = session.roomWidth;
            document.getElementById('roomLength').value = session.roomLength;
            updateRoomSize();
        }
        
        // Restore colors
        if (session.wallColor) {
            document.getElementById('wallColor').value = session.wallColor;
            changeWallColor(session.wallColor);
        }
        if (session.floorColor) {
            document.getElementById('floorColor').value = session.floorColor;
            changeFloorColor(session.floorColor);
        }
        
        // Restore furniture
        session.furniture.forEach(item => {
            createFurniture(item.type);
            const obj = furnitureList[furnitureList.length - 1];
            obj.position.set(item.x, item.y, item.z);
            obj.rotation.y = item.rotation || 0;
        });
        
        console.log('Session restored:', session.furniture.length, 'items');
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
window.furnitureList = furnitureList;
window.scene = scene;

// Save initial state for undo/redo
setTimeout(() => saveState(), 1000);

