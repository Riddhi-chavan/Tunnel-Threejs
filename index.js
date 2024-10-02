import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import spline from "./spline.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// Create a line geometry from the spline
const points = spline.getPoints(100);
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
const line = new THREE.Line(geometry, material);
// scene.add(line);

// Create a tube geometry from the spline
const tubeGeo = new THREE.TubeGeometry(spline, 222, 0.65, 16, true);
const tubeMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  
  wireframe: true,
});
const tube = new THREE.Mesh(tubeGeo, tubeMat);

// Create edges geometry from the spline
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMet = new THREE.LineBasicMaterial({ color: 0xffffff });
const line2 = new THREE.LineSegments(edges, lineMet);
scene.add(line2);

const numBoxes = 55;
const size = 0.075;
const boxGeo = new THREE.BoxGeometry(size, size, size);
const glowSize = size * 1.2; // Slightly larger for the glow effect
const glowGeo = new THREE.BoxGeometry(glowSize, glowSize, glowSize);

const boxes = [];
const glows = [];

for (let i = 0; i < numBoxes; i++) {
  const p = (i / numBoxes + Math.random() * 0.1) % 1;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;
  
  const rote = new THREE.Vector3(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );
  
  const edges = new THREE.EdgesGeometry(boxGeo, 0.2);
  const color = new THREE.Color().setHSL(1.0 - p, 1, 0.5);
  const lineMet = new THREE.LineBasicMaterial({ color });
  const boxLine = new THREE.LineSegments(edges, lineMet);
  boxLine.position.copy(pos);
  boxLine.rotation.set(rote.x, rote.y, rote.z);
  boxLine.visible = false; // Initially hidden
  scene.add(boxLine);
  boxes.push(boxLine);

  // Create glow effect
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: color },
      intensity: { value: 0.5 }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 glowColor;
      uniform float intensity;
      void main() {
        float brightness = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(glowColor, 1.0) * brightness * intensity;
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  const glowMesh = new THREE.Mesh(glowGeo, glowMaterial);
  glowMesh.position.copy(pos);
  glowMesh.rotation.set(rote.x, rote.y, rote.z);
  glowMesh.visible = false; // Initially hidden
  scene.add(glowMesh);
  glows.push(glowMesh);
}

function updateCamera(t) {
  const time = t * 0.1;
  const looptime = 10 * 1000;
  const p = (time % looptime) / looptime;
  const pos = tubeGeo.parameters.path.getPointAt(p);
  const lookAt = tubeGeo.parameters.path.getPointAt((p + 0.03) % 1);
  camera.position.copy(pos);
  camera.lookAt(lookAt);
}


function updateBoxVisibility() {
  const cameraPosition = camera.position;
  const visibilityThreshold = 7; 

  for (let i = 0; i < numBoxes; i++) {
    const box = boxes[i];
    const glow = glows[i];
    const distance = box.position.distanceTo(cameraPosition);

    if (distance < visibilityThreshold) {
      box.visible = true;
      glow.visible = true;
    } else {
      box.visible = false;
      glow.visible = false;
    }
  }
}

function animate(t = 0) {
  requestAnimationFrame(animate);
  updateCamera(t);
  updateBoxVisibility();
  renderer.render(scene, camera);
  controls.update();
}

animate();