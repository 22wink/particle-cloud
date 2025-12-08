import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();

const targets = [
  {
    from: path.join(root, 'node_modules/three/build/three.module.js'),
    to: path.join(root, 'public/libs/three.module.js'),
  },
  {
    from: path.join(root, 'node_modules/three/build/three.core.js'),
    to: path.join(root, 'public/libs/three.core.js'),
  },
  {
    from: path.join(root, 'node_modules/three/examples/jsm/controls/OrbitControls.js'),
    to: path.join(root, 'public/libs/OrbitControls.js'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/camera_utils/camera_utils.js'),
    to: path.join(root, 'public/libs/mediapipe/camera_utils.js'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hands.js'),
    to: path.join(root, 'public/libs/mediapipe/hands.js'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hands_solution_packed_assets.data'),
    to: path.join(root, 'public/libs/mediapipe/hands_solution_packed_assets.data'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hands_solution_packed_assets_loader.js'),
    to: path.join(root, 'public/libs/mediapipe/hands_solution_packed_assets_loader.js'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hands_solution_simd_wasm_bin.js'),
    to: path.join(root, 'public/libs/mediapipe/hands_solution_simd_wasm_bin.js'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hands_solution_simd_wasm_bin.wasm'),
    to: path.join(root, 'public/libs/mediapipe/hands_solution_simd_wasm_bin.wasm'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hands.binarypb'),
    to: path.join(root, 'public/libs/mediapipe/hands.binarypb'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hand_landmark_full.tflite'),
    to: path.join(root, 'public/libs/mediapipe/hand_landmark_full.tflite'),
  },
  {
    from: path.join(root, 'node_modules/@mediapipe/hands/hand_landmark_lite.tflite'),
    to: path.join(root, 'public/libs/mediapipe/hand_landmark_lite.tflite'),
  },
];

async function ensureDir(targetPath) {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
}

async function copyAsset(entry) {
  await ensureDir(entry.to);
  await fs.copyFile(entry.from, entry.to);
}

async function patchOrbitControlsImport() {
  const target = path.join(root, 'public/libs/OrbitControls.js');
  try {
    let content = await fs.readFile(target, 'utf8');
    // 确保使用本地 three.module.js，避免浏览器解析裸模块
    content = content.replace(/from ['"]three['"];?/, "import * as THREE from './three.module.js';\nconst { Controls, MOUSE, Quaternion, Spherical, TOUCH, Vector2, Vector3, Plane, Ray, MathUtils } = THREE;");
    await fs.writeFile(target, content, 'utf8');
  } catch (err) {
    console.warn('补丁 OrbitControls 失败:', err?.message || err);
  }
}

async function main() {
  await Promise.all(targets.map(copyAsset));
  await patchOrbitControlsImport();
  // copy license notice for local libs
  const notice = [
    'This project bundles third-party libraries locally to avoid CDN usage.',
    'three.js is licensed under MIT: https://github.com/mrdoob/three.js/blob/dev/LICENSE',
    'MediaPipe Hands is provided by Google: https://github.com/google/mediapipe',
  ].join('\n');
  await ensureDir(path.join(root, 'public/libs/NOTICE.txt'));
  await fs.writeFile(path.join(root, 'public/libs/NOTICE.txt'), notice, 'utf8');
}

main().catch((err) => {
  console.error('Failed to copy libraries:', err);
  process.exit(1);
});

