import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';

/**
 * FLAPAYBORD 3D ENGINE — OVERKILL EDITION
 * Cinematic Hyper-Realism Pipeline
 */

const WIDTH = 400;
const HEIGHT = 600;
const PIPE_GAP = 5.5;
const PIPE_WIDTH = 1.6;
const BIRD_SIZE = 0.65;
const WORLD_SPEED_BASE = 0.16;

const canvasWrapper = document.getElementById('canvas-wrapper');
const mainMenu = document.getElementById('main-menu');
const uiOverlay = document.getElementById('ui-overlay');
const scoreDisplay = document.getElementById('score-display');
const startBtn = document.getElementById('start-btn');
const skinBtns = document.querySelectorAll('.skin-btn');

let score = 0;
let isGameRunning = false;
let isGameOver = false;
let survivalTime = 0;
let currentSpeed = WORLD_SPEED_BASE;

let scene, camera, renderer, composer, clock = new THREE.Clock();
let birdMesh, birdInnerCore, water, sky, sun;
let pipes = [];
let birdY = 0, birdVelocity = 0;
const GRAVITY = -0.016, LIFT = 0.38;

// --- PROCEDURAL ASSET GENERATOR ---
function createNoiseTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(256, 256);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const val = Math.random() * 255;
        imgData.data[i] = val; imgData.data[i+1] = val; imgData.data[i+2] = val; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
const noiseTex = createNoiseTexture();

// --- INITIALIZE OVERKILL ENGINE ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT, 0.1, 2000);
    camera.position.set(0, 1, 16);

    renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance", antialias: false });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    canvasWrapper.appendChild(renderer.domElement);

    // 1. PHYSICAL SKY & SUN
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    sun = new THREE.Vector3();
    const effectController = { turbidity: 10, rayleigh: 3, mieCoefficient: 0.005, mieDirectionalG: 0.7, elevation: 2, azimuth: 180 };
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sun);

    // 2. REALISTIC OCEAN
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(waterGeometry, {
        textureWidth: 512, textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(), sunColor: 0xffffff, waterColor: 0x001e0f, distortionScale: 3.7,
        fog: scene.fog !== undefined
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = -12;
    scene.add(water);

    // 3. CINEMATIC POST-PROCESSING
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bokehPass = new BokehPass(scene, camera, { focus: 16.0, aperture: 0.0001, maxblur: 0.01 });
    composer.addPass(bokehPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 1.2, 0.4, 0.85);
    composer.addPass(bloomPass);

    const rgbShift = new ShaderPass(RGBShiftShader);
    rgbShift.uniforms['amount'].value = 0.0015;
    composer.addPass(rgbShift);

    composer.addPass(new SMAAPass(WIDTH * window.devicePixelRatio, HEIGHT * window.devicePixelRatio));

    // 4. LIGHTING
    scene.add(new THREE.HemisphereLight(0x443333, 0x111122, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.copy(sun).multiplyScalar(100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.set(-25, 25, 25, -25, 0.1, 500);
    scene.add(dirLight);

    createBird();
    setupPipes();
    animate();
}

function createBird() {
    const group = new THREE.Group();
    
    // Outer Glass Shell
    const shellGeo = new THREE.IcosahedronGeometry(BIRD_SIZE, 3);
    const shellMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0,
        transmission: 1, thickness: 0.5,
        ior: 1.5, reflectivity: 0.5, clearcoat: 1, clearcoatRoughness: 0
    });
    birdMesh = new THREE.Mesh(shellGeo, shellMat);
    birdMesh.castShadow = true;
    group.add(birdMesh);

    // Inner Glowing Core
    const coreGeo = new THREE.SphereGeometry(BIRD_SIZE * 0.4, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x00d2ff, emissiveIntensity: 5 });
    birdInnerCore = new THREE.Mesh(coreGeo, coreMat);
    group.add(birdInnerCore);

    group.position.set(-5, 0, 0);
    scene.add(group);
    birdMesh.parentGroup = group;
}

function setupPipes() {
    for (let i = 0; i < 5; i++) {
        pipes.push(createPipePair(15 + i * 13));
    }
}

function createPipePair(x) {
    const topHeight = Math.random() * 8 + 3;
    const bottomHeight = 22 - topHeight - PIPE_GAP;

    const mat = new THREE.MeshStandardMaterial({ 
        color: 0x333333, metalness: 0.8, roughness: 0.3,
        roughnessMap: noiseTex, bumpMap: noiseTex, bumpScale: 0.05,
        emissive: 0x11ff44, emissiveIntensity: 0.1
    });

    const top = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_WIDTH, PIPE_WIDTH, topHeight, 32), mat);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_WIDTH, PIPE_WIDTH, bottomHeight, 32), mat);
    
    // Neon Rim Detail
    const rimGeo = new THREE.TorusGeometry(PIPE_WIDTH, 0.1, 16, 32);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x11ff44, emissive: 0x11ff44, emissiveIntensity: 2 });
    const rimT = new THREE.Mesh(rimGeo, rimMat);
    const rimB = new THREE.Mesh(rimGeo, rimMat);
    rimT.rotation.x = Math.PI/2; rimB.rotation.x = Math.PI/2;
    top.add(rimT); bot.add(rimB);
    rimT.position.y = -topHeight/2; rimB.position.y = bottomHeight/2;

    top.castShadow = bot.castShadow = top.receiveShadow = bot.receiveShadow = true;
    scene.add(top); scene.add(bot);

    return { top, bot, x, passed: false, topH: topHeight, botH: bottomHeight };
}

function resetGame() {
    birdY = 0; birdVelocity = 0; score = 0; survivalTime = 0;
    currentSpeed = WORLD_SPEED_BASE; isGameOver = false;
    scoreDisplay.innerText = "0";
    birdMesh.parentGroup.position.y = 0;
    pipes.forEach((p, i) => updatePipePosition(p, 15 + i * 13));
}

function updatePipePosition(p, x) {
    const topHeight = Math.random() * 8 + 3;
    const bottomHeight = 22 - topHeight - PIPE_GAP;
    p.top.geometry.dispose(); p.bot.geometry.dispose();
    p.top.geometry = new THREE.CylinderGeometry(PIPE_WIDTH, PIPE_WIDTH, topHeight, 32);
    p.bot.geometry = new THREE.CylinderGeometry(PIPE_WIDTH, PIPE_WIDTH, bottomHeight, 32);
    p.top.position.set(x, 11 - topHeight/2, 0);
    p.bot.position.set(x, -11 + bottomHeight/2, 0);
    p.top.children[0].position.y = -topHeight/2;
    p.bot.children[0].position.y = bottomHeight/2;
    p.x = x; p.topH = topHeight; p.botH = bottomHeight; p.passed = false;
}

function update() {
    if (!isGameRunning || isGameOver) return;
    const delta = clock.getDelta();
    survivalTime += delta;
    currentSpeed = WORLD_SPEED_BASE + (survivalTime * 0.002);

    water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    
    birdVelocity += GRAVITY; birdY += birdVelocity;
    birdMesh.parentGroup.position.y = birdY;
    birdMesh.rotation.x += 0.01; birdMesh.rotation.y += 0.02;
    birdInnerCore.scale.setScalar(1 + Math.sin(survivalTime * 10) * 0.2);

    if (birdY < -11 || birdY > 11) gameOver();

    pipes.forEach(p => {
        p.x -= currentSpeed;
        p.top.position.x = p.bot.position.x = p.x;
        if (p.x < -18) updatePipePosition(p, 45);

        if (Math.abs(p.x - birdMesh.parentGroup.position.x) < (PIPE_WIDTH + BIRD_SIZE/2)) {
            if (birdY > 11 - p.topH || birdY < -11 + p.botH) gameOver();
        }

        if (p.x < birdMesh.parentGroup.position.x && !p.passed) {
            p.passed = true; score++; scoreDisplay.innerText = score;
        }
    });

    camera.position.y += (birdY * 0.4 - camera.position.y) * 0.05;
    camera.rotation.z = -birdVelocity * 0.2;
}

function gameOver() {
    isGameOver = true;
    birdInnerCore.material.emissiveIntensity = 20;
    mainMenu.style.display = 'flex';
    document.querySelector('#main-menu h1').innerText = "SYSTEM FAILURE";
    document.querySelector('#main-menu p').innerText = `STABILITY: ${score} | RUNTIME: ${Math.floor(survivalTime)}s`;
}

function animate() {
    requestAnimationFrame(animate);
    update();
    composer.render();
}

startBtn.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    uiOverlay.style.display = 'block';
    if (isGameOver) resetGame();
    isGameRunning = true;
});

skinBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        skinBtns.forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        const skin = this.dataset.skin;
        const color = skin === 'skin1' ? 0x00d2ff : (skin === 'skin2' ? 0xffd700 : 0xff0044);
        birdInnerCore.material.color.setHex(color);
        birdInnerCore.material.emissive.setHex(color);
    });
});

window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); birdVelocity = LIFT; } });
window.addEventListener('mousedown', () => { if (isGameRunning && !isGameOver) birdVelocity = LIFT; });

init();