// Init renderer
var renderer = new THREE.WebGLRenderer({
    alpha: true
});
renderer.setClearColor(new THREE.Color('lightgrey'), 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0px';
renderer.domElement.style.left = '0px';
document.body.appendChild(renderer.domElement);

// Array of functions for the rendering loop
var onRenderFcts = [];

// Init scene and camera
var scene = new THREE.Scene();
var camera = new THREE.Camera();
scene.add(camera);

// Handle arToolkitSource
var arToolkitSource = new THREEx.ArToolkitSource({
    sourceType: 'webcam',
});
arToolkitSource.init(function onReady() {
    onResize();
});

// Handle resize
window.addEventListener('resize', function () {
    onResize();
});
function onResize() {
    arToolkitSource.onResizeElement();
    arToolkitSource.copyElementSizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
    }
}

// Initialize arToolkitContext
var arToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: THREEx.ArToolkitContext.baseURL + 'data/camera_para.dat',
    detectionMode: 'mono',
    maxDetectionRate: 30,
    canvasWidth: 80 * 3,
    canvasHeight: 60 * 3,
});
arToolkitContext.init(function onCompleted() {
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
});

// Update artoolkit on every frame
onRenderFcts.push(function () {
    if (arToolkitSource.ready === false) return;
    arToolkitContext.update(arToolkitSource.domElement);
});

// Create a ArMarkerControls
var markerRoot = new THREE.Group();
scene.add(markerRoot);
var artoolkitMarker = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
    type: 'pattern',
    patternUrl: THREEx.ArToolkitContext.baseURL + 'data/my_ag_pattern_ratio05_3.patt',
});

// Build a smoothedControls
var smoothedRoot = new THREE.Group();
scene.add(smoothedRoot);
var smoothedControls = new THREEx.ArSmoothedControls(smoothedRoot, {
    lerpPosition: 0.4,
    lerpQuaternion: 0.3,
    lerpScale: 1,
});
onRenderFcts.push(function (delta) {
    smoothedControls.update(markerRoot);
});

// Add objects to the AR scene
var arWorldRoot = smoothedRoot;

// Add a box
var boxGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
var boxMaterial = new THREE.MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
});
var boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
boxMesh.position.y = boxGeometry.parameters.height / 2;
arWorldRoot.add(boxMesh);

// Add a torus knot
// var surfaceGeometry = new THREE.TorusKnotGeometry(0.3, 0.1, 64, 16);
// var surfaceMaterial = new THREE.MeshNormalMaterial();
// var surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
// surfaceMesh.position.y = 0.5;
// arWorldRoot.add(surfaceMesh);


// Generate surface geometry
const numU = 48;
const numV = 24;
const R = 1;
const a = 0.24;
const n = 3;
const surfaceGeometry = createCorrugatedSphereGeometry(numU, numV, R, a, n);

// --- Normalize to fit inside a 1×1×1 cube ---

// Compute bounding box
surfaceGeometry.computeBoundingBox();
const bbox = surfaceGeometry.boundingBox;

// Find size and center
const size = new THREE.Vector3();
const center = new THREE.Vector3();
bbox.getSize(size);
bbox.getCenter(center);

// Move geometry so center is at origin
surfaceGeometry.translate(-center.x, -center.y, -center.z);

// Uniformly scale it down to fit inside unit cube
const maxDim = Math.max(size.x, size.y, size.z);
const scale = 1 / maxDim;


// const surfaceMaterial = new THREE.MeshNormalMaterial({
//     color: 0xCCCC33,
//     flatShading: true,
//     side: THREE.DoubleSide,
//     shininess: 50
// });

const surfaceMaterial = new THREE.MeshPhongMaterial({
    color: 0x00FF00,    // bright green
    flatShading: true,
    side: THREE.DoubleSide,
    shininess: 50
});

const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2
});

const surfaceGroup = new THREE.Group();
surfaceGroup.position.y = 0.5;
arWorldRoot.add(surfaceGroup);

const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
surfaceMesh.scale.setScalar(scale);
surfaceGroup.add(surfaceMesh);

const wireframeMesh = new THREE.Mesh(surfaceGeometry, wireframeMaterial);
wireframeMesh.scale.setScalar(scale);
surfaceGroup.add(wireframeMesh);


// Add ambient light for basic global illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
arWorldRoot.add(ambientLight);

// Add a directional light to create shading and highlights
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
arWorldRoot.add(directionalLight);


const diagAxis = new THREE.Vector3(1, -1, -1).normalize();
const diagSpeed = 0.07;
const diagQuat = new THREE.Quaternion();
onRenderFcts.push(function () {
    diagQuat.setFromAxisAngle(diagAxis, diagSpeed);
    surfaceGroup.quaternion.premultiply(diagQuat);

    surfaceGroup.rotateY(0.01)
});


// Render the scene
var stats = new Stats();
document.body.appendChild(stats.dom);
onRenderFcts.push(function () {
    renderer.render(scene, camera);
    stats.update();
});

// Run the rendering loop
var lastTimeMsec = null;
requestAnimationFrame(function animate(nowMsec) {
    requestAnimationFrame(animate);
    lastTimeMsec = lastTimeMsec || nowMsec - 1000 / 60;
    var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
    lastTimeMsec = nowMsec;
    onRenderFcts.forEach(function (onRenderFct) {
        onRenderFct(deltaMsec / 1000, nowMsec / 1000);
    });
});