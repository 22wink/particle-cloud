import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';

const container = document.getElementById('webgl-container');
const statusEl = document.getElementById('status');
const video = document.getElementById('video');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050a, 0.05);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = true;
controls.enablePan = true;
controls.maxPolarAngle = Math.PI * 0.9;

scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const dirLight = new THREE.DirectionalLight(0xffd700, 0.8);
dirLight.position.set(3, 3, 3);
scene.add(dirLight);

const particleGroup = new THREE.Group();
scene.add(particleGroup);

// 手势状态：0=握拳(土星), 1=张开(爱心)
let gestureState = 0; // 0: 握拳/默认, 1: 五指张开
let gestureStateSmooth = 0;
let lastGestureTime = performance.now();

// ========== 创建土星+小行星带 ==========
function createSaturnParticles(count = 3200) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const basePositions = new Float32Array(count * 3);
  
  const saturnColor = new THREE.Color('#f4a460');
  const ringColor1 = new THREE.Color('#d4a574');
  const ringColor2 = new THREE.Color('#8b7355');
  
  // 土星球体粒子
  const sphereCount = Math.floor(count * 0.4);
  for (let i = 0; i < sphereCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 0.8 + Math.random() * 0.3;
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;
    
    const color = saturnColor.clone().lerp(ringColor1, Math.random() * 0.3);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    seeds[i] = Math.random() * Math.PI * 2;
  }
  
  // 小行星带（土星环）
  const ringCount = count - sphereCount;
  for (let i = sphereCount; i < count; i++) {
    const r = 1.2 + Math.random() * 0.8;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 0.15;
    
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;
    
    const t = (r - 1.2) / 0.8;
    const color = ringColor1.clone().lerp(ringColor2, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    seeds[i] = theta;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return { geometry, basePositions };
}

// ========== 创建3D爱心粒子 ==========
function insideHeart(x, y) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

function createHeartParticles(count = 4800) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const basePositions = new Float32Array(count * 3);
  
  const c1 = new THREE.Color('#ff1744');
  const c2 = new THREE.Color('#ff6b9d');
  const c3 = new THREE.Color('#ffc1cc');
  
  let i = 0;
  while (i < count) {
    const x = THREE.MathUtils.randFloatSpread(2.4);
    const y = THREE.MathUtils.randFloatSpread(2.4);
    if (!insideHeart(x, y)) continue;
    
    const z = THREE.MathUtils.randFloatSpread(0.6) + Math.sin((x * x + y * y) * 4) * 0.12;
    positions[i * 3] = x * 1.1;
    positions[i * 3 + 1] = y * 1.1;
    positions[i * 3 + 2] = z;
    basePositions[i * 3] = x * 1.1;
    basePositions[i * 3 + 1] = y * 1.1;
    basePositions[i * 3 + 2] = z;
    
    const mix = THREE.MathUtils.smoothstep(y, -1.4, 1.4);
    const color = c1.clone().lerp(c2, mix * 0.7).lerp(c3, 0.15 + Math.random() * 0.25);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    
    seeds[i] = Math.random() * Math.PI * 2;
    i++;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  return { geometry, basePositions };
}

// 创建两种粒子系统
const saturnData = createSaturnParticles();
const heartData = createHeartParticles();

// 使用同一套粒子，根据状态切换目标位置
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(saturnData.geometry.attributes.position.array), 3));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(saturnData.geometry.attributes.color.array), 3));
particleGeometry.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(saturnData.geometry.attributes.aSeed.array), 1));
particleGeometry.setAttribute('targetPosition', new THREE.BufferAttribute(new Float32Array(heartData.basePositions), 3));

const particleMaterial = new THREE.PointsMaterial({
  size: 0.04,
  transparent: true,
  depthWrite: false,
  opacity: 1.0,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
particleGroup.add(particles);

// 放大20%
particleGroup.scale.setScalar(2);

// 存储当前位置和目标位置
const currentPositions = new Float32Array(saturnData.basePositions);
const targetPositions = new Float32Array(saturnData.basePositions);

function updateStatus(text, accent = false) {
  statusEl.textContent = text;
  statusEl.style.color = accent ? '#ff1744' : 'var(--muted)';
}

// 检测五指是否张开
function isFingersOpen(hand) {
  const fingerTips = [4, 8, 12, 16, 20]; // 拇指、食指、中指、无名指、小指指尖
  const fingerMCPs = [2, 5, 9, 13, 17]; // 对应的掌指关节
  
  let openCount = 0;
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = hand[fingerTips[i]];
    const mcp = hand[fingerMCPs[i]];
    const dist = Math.hypot(tip.x - mcp.x, tip.y - mcp.y, tip.z - mcp.z);
    const wristToMcp = Math.hypot(mcp.x - hand[0].x, mcp.y - hand[0].y, mcp.z - hand[0].z);
    // 如果指尖到MCP的距离大于MCP到手腕距离的0.6倍，认为手指张开
    if (dist > wristToMcp * 0.6) {
      openCount++;
    }
  }
  // 至少4根手指张开认为是五指张开
  return openCount >= 4;
}

// 检测是否握拳
function isFist(hand) {
  const fingerTips = [4, 8, 12, 16, 20];
  const fingerMCPs = [2, 5, 9, 13, 17];
  
  let closedCount = 0;
  for (let i = 0; i < fingerTips.length; i++) {
    const tip = hand[fingerTips[i]];
    const mcp = hand[fingerMCPs[i]];
    const dist = Math.hypot(tip.x - mcp.x, tip.y - mcp.y, tip.z - mcp.z);
    const wristToMcp = Math.hypot(mcp.x - hand[0].x, mcp.y - hand[0].y, mcp.z - hand[0].z);
    // 如果指尖到MCP的距离小于MCP到手腕距离的0.4倍，认为手指闭合
    if (dist < wristToMcp * 0.4) {
      closedCount++;
    }
  }
  // 至少4根手指闭合认为是握拳
  return closedCount >= 4;
}

async function setupHands() {
  if (!window.Hands || !window.Camera) {
    updateStatus('本地库未加载，请刷新重试', false);
    return;
  }

  const hands = new window.Hands({
    locateFile: (file) => `./libs/mediapipe/${file}`,
  });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  hands.onResults((results) => {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      updateStatus('未检测到手势，试试抬高手掌~');
      gestureState = 0; // 默认状态
      return;
    }
    
    const hand = results.multiHandLandmarks[0];
    
    if (isFingersOpen(hand)) {
      gestureState = 1; // 五指张开 -> 爱心
      updateStatus('💕 五指张开：粒子汇聚成爱心！', true);
    } else if (isFist(hand)) {
      gestureState = 0; // 握拳 -> 土星
      updateStatus('🪐 握拳：恢复土星样式', true);
    } else {
      // 中间状态保持当前状态
    }
    
    lastGestureTime = performance.now();
  });

  try {
    const cameraUtils = new window.Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 640,
      height: 480,
    });
    await cameraUtils.start();
    video.style.display = 'block';
    updateStatus('摄像头已开启，握拳=土星，五指张开=爱心！', true);
  } catch (err) {
    console.error(err);
    updateStatus('摄像头不可用，请检查权限', false);
  }
}

setupHands();

function animateParticles(time) {
  const posAttr = particleGeometry.attributes.position;
  const positions = posAttr.array;
  const seeds = particleGeometry.getAttribute('aSeed');
  const timeFactor = time * 0.0005;
  
  // 平滑过渡状态
  gestureStateSmooth = THREE.MathUtils.lerp(gestureStateSmooth, gestureState, 0.08);
  
  // 根据状态选择目标位置
  const saturnPositions = saturnData.basePositions;
  const heartPositions = heartData.basePositions;
  
  for (let i = 0; i < seeds.count; i++) {
    const seed = seeds.getX(i);
    const baseIndex = i * 3;
    
    // 获取目标位置（在土星和爱心之间插值）
    const targetX = THREE.MathUtils.lerp(saturnPositions[baseIndex], heartPositions[baseIndex], gestureStateSmooth);
    const targetY = THREE.MathUtils.lerp(saturnPositions[baseIndex + 1], heartPositions[baseIndex + 1], gestureStateSmooth);
    const targetZ = THREE.MathUtils.lerp(saturnPositions[baseIndex + 2], heartPositions[baseIndex + 2], gestureStateSmooth);
    
    // 平滑移动到目标位置
    currentPositions[baseIndex] = THREE.MathUtils.lerp(currentPositions[baseIndex], targetX, 0.1);
    currentPositions[baseIndex + 1] = THREE.MathUtils.lerp(currentPositions[baseIndex + 1], targetY, 0.1);
    currentPositions[baseIndex + 2] = THREE.MathUtils.lerp(currentPositions[baseIndex + 2], targetZ, 0.1);
    
    // 添加轻微的动态效果
    const wave = Math.sin(seed + timeFactor) * 0.02 * (1 - gestureStateSmooth);
    const swirl = Math.cos(seed * 1.5 + timeFactor * 1.2) * 0.015 * (1 - gestureStateSmooth);
    
    positions[baseIndex] = currentPositions[baseIndex] + wave;
    positions[baseIndex + 1] = currentPositions[baseIndex + 1] + swirl;
    positions[baseIndex + 2] = currentPositions[baseIndex + 2] + wave * 0.5;
  }
  
  posAttr.needsUpdate = true;
  
  // 更新颜色（土星色 -> 爱心色）
  const colors = particleGeometry.attributes.color.array;
  const saturnColors = saturnData.geometry.attributes.color.array;
  const heartColors = heartData.geometry.attributes.color.array;
  
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = THREE.MathUtils.lerp(saturnColors[i], heartColors[i], gestureStateSmooth);
    colors[i + 1] = THREE.MathUtils.lerp(saturnColors[i + 1], heartColors[i + 1], gestureStateSmooth);
    colors[i + 2] = THREE.MathUtils.lerp(saturnColors[i + 2], heartColors[i + 2], gestureStateSmooth);
  }
  particleGeometry.attributes.color.needsUpdate = true;
}

function renderLoop(time) {
  const now = performance.now();
  const sinceLastGesture = (now - lastGestureTime) / 1000;
  
  // 2秒无手势后恢复默认状态
  if (sinceLastGesture > 2) {
    gestureState = 0;
  }
  
  // 土星旋转（倾斜旋转）
  if (gestureStateSmooth < 0.3) {
    // 设置倾斜角度（约30度）
    const tiltAngle = Math.PI / 6; // 30度
    particleGroup.rotation.x = tiltAngle;
    particleGroup.rotation.y += 0.002;
  }
  
  // 爱心状态：面朝用户，停止旋转，保持水平
  if (gestureStateSmooth > 0.7) {
    // 计算从粒子组中心指向相机的方向
    const particleWorldPos = new THREE.Vector3();
    particleGroup.getWorldPosition(particleWorldPos);
    const cameraPos = camera.position.clone();
    const direction = new THREE.Vector3().subVectors(cameraPos, particleWorldPos).normalize();
    
    // 计算目标旋转（让爱心朝向相机，但保持水平）
    const targetRotationY = Math.atan2(direction.x, direction.z);
    const targetRotationX = 0; // 爱心保持水平，不倾斜
    
    // 平滑旋转到目标方向
    particleGroup.rotation.y = THREE.MathUtils.lerp(particleGroup.rotation.y, targetRotationY, 0.1);
    particleGroup.rotation.x = THREE.MathUtils.lerp(particleGroup.rotation.x, targetRotationX, 0.1);
  }
  
  // 过渡状态：平滑切换倾斜角度
  if (gestureStateSmooth >= 0.3 && gestureStateSmooth <= 0.7) {
    const tiltAngle = Math.PI / 6; // 土星的倾斜角度
    const targetTilt = THREE.MathUtils.lerp(tiltAngle, 0, (gestureStateSmooth - 0.3) / 0.4);
    particleGroup.rotation.x = THREE.MathUtils.lerp(particleGroup.rotation.x, targetTilt, 0.1);
  }
  
  // 根据状态调整粒子大小和透明度
  particleMaterial.size = THREE.MathUtils.lerp(0.035, 0.045, gestureStateSmooth);
  particleMaterial.opacity = THREE.MathUtils.lerp(0.9, 1.0, gestureStateSmooth);
  
  animateParticles(time);
  
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
