import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18.0/dist/lil-gui.esm.min.js';

let coord = [];
let initialCoord = [];
let initialCameraPosition;
let initialCameraRotation;
let initialElevation;
let userPoint = null;
const trackGroup = new THREE.Group();

const container = document.getElementById('threejs-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 1, 1000);
camera.position.set(-1.5, -68, 26);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.add(trackGroup);

const axesHelper = new THREE.AxesHelper(3);
scene.add(axesHelper);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.minDistance = 1;
controls.maxDistance = 500;

let isRotating = true;
let rotationDirection = 1;
let speedRotation = 5;

const gui = new GUI({ container, title: 'Contrôles animation' });
const settings = {
    'Rotation On/Off': () => { isRotating = !isRotating; },
    'Reverse Rotation': () => { rotationDirection *= -1; },
    'Elevation': 20,
    'Speed': 5,
    'Reset': resetView
};

gui.add(settings, 'Rotation On/Off').name('Rotation On/Off');
gui.add(settings, 'Reverse Rotation').name('Reverse');
const elevationController = gui.add(settings, 'Elevation', 10, 30, 1)
    .name('Elévation')
    .onChange(updateElevationScale);
const speedController = gui.add(settings, 'Speed', 0, 10, 1)
    .name('Speed')
    .onChange(value => { speedRotation = value; });
gui.add(settings, 'Reset').name('Réinitialiser Vue');

async function loadGPXFile(url) {
    const response = await fetch(url);
    const data = await response.text();
    return extractTrackPoints(data);
}

async function init(gpx) {
    try {
        coord = await loadGPXFile(gpx);
        initialCoord = [...coord];
        initialElevation = settings.Elevation;
        updateElevationScale(settings.Elevation);

        initialCameraPosition = camera.position.clone();
        initialCameraRotation = camera.rotation.clone();

        updatePoint(42.80133, 0.55807, 950, true);
    } catch (error) {
        console.error('Erreur lors du chargement du fichier GPX', error);
    }
}

function createLine(points, color) {
    const material = new THREE.LineBasicMaterial({ color });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, material);
}

function createSegmentsFromCoords(coords) {
    while (trackGroup.children.length > 0) {
        const child = trackGroup.children.pop();
        trackGroup.remove(child);
    }

    for (let i = 0; i < coords.length - 1; i++) {
        const start = new THREE.Vector3(coords[i].x, coords[i].y, coords[i].z);
        const end = new THREE.Vector3(coords[i + 1].x, coords[i + 1].y, coords[i + 1].z);
        const color = end.z > start.z ? 0xff0000 : 0x00ff00;
        const segment = createLine([start, end], color);
        trackGroup.add(segment);
    }

    if (userPoint) trackGroup.add(userPoint);
}

function updateElevationScale(scale) {
    const coordResult = {
        X: findMinMax(coord, 'x'),
        Y: findMinMax(coord, 'y'),
        Z: findMinMax(coord, 'z')
    };
    const moyX = (coordResult.X.max + coordResult.X.min) / 2;
    const moyY = (coordResult.Y.max + coordResult.Y.min) / 2;

    const scalingFactor = 40 - scale;
    const listCoords = coord.map(e => ({
        x: (e.x - moyX) * 1000,
        y: (e.y - moyY) * 1000,
        z: (e.z - coordResult.Z.min) / scalingFactor
    }));

    createSegmentsFromCoords(listCoords);

    if (userPoint) {
        const userLon = userPoint.userData.originalLon;
        const userLat = userPoint.userData.originalLat;
        const userEle = userPoint.userData.originalEle;

        const adjustedX = (userLon - moyX) * 1000;
        const adjustedY = (userLat - moyY) * 1000;
        const adjustedZ = (userEle - coordResult.Z.min) / scalingFactor;

        userPoint.position.set(adjustedX, adjustedY, adjustedZ);
    }
}

function updatePoint(lat, lon, ele, isPointModified) {
    // Mise à jour des coordonnées uniquement si isPointModified est vrai
    if (isPointModified && userPoint) {
        userPoint.userData = { originalLat: lat, originalLon: lon, originalEle: ele };
    }

    // Recalculer la position du point utilisateur
    const coordResult = {
        X: findMinMax(coord, 'x'),
        Y: findMinMax(coord, 'y'),
        Z: findMinMax(coord, 'z')
    };
    const moyX = (coordResult.X.max + coordResult.X.min) / 2;
    const moyY = (coordResult.Y.max + coordResult.Y.min) / 2;
    const moyZ = coordResult.Z.min;

    const scalingFactor = 1000;
    const elevationScale = 40 - settings.Elevation;
    const x = (lon - moyX) * scalingFactor;
    const y = (lat - moyY) * scalingFactor;
    const z = (ele - moyZ) / elevationScale;

    if (!userPoint) {
        // Créer le point utilisateur s'il n'existe pas
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        userPoint = new THREE.Mesh(geometry, material);
        trackGroup.add(userPoint);
    }

    // Mettre à jour la position du point utilisateur
    userPoint.position.set(x, y, z);
}


function animate() {
    requestAnimationFrame(animate);

    if (isRotating) {
        trackGroup.rotation.z += 0.001 * speedRotation * rotationDirection;
    }

    controls.update();
    renderer.render(scene, camera);
}

function extractTrackPoints(gpxContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'application/xml');
    const trkpts = xmlDoc.getElementsByTagName('trkpt');
    const coordinates = [];
    for (let i = 0; i < trkpts.length; i++) {
        const trkpt = trkpts[i];
        const lat = Number(trkpt.getAttribute('lat'));
        const lon = Number(trkpt.getAttribute('lon'));
        const ele = Number(trkpt.getElementsByTagName('ele')[0].textContent);
        coordinates.push({ x: lon, y: lat, z: ele });
    }
    return coordinates;
}

function findMinMax(trackPoints, axis) {
    return trackPoints.reduce(
        (acc, point) => ({
            min: Math.min(acc.min, point[axis]),
            max: Math.max(acc.max, point[axis])
        }),
        { min: trackPoints[0][axis], max: trackPoints[0][axis] }
    );
}

function resetView() {
    // Réinitialiser les coordonnées à leur état initial
    coord = [...initialCoord];
    updateElevationScale(initialElevation);

    // Réinitialiser la position et la rotation de la caméra
    camera.position.copy(initialCameraPosition);
    camera.rotation.copy(initialCameraRotation);
    controls.reset();

    // Mettre à jour le point utilisateur si existant
    if (userPoint) {
        const { originalLat, originalLon, originalEle } = userPoint.userData;
        updatePoint(originalLat, originalLon, originalEle, false);
    }

    // Mettre à jour l'affichage de l'interface utilisateur
    gui.updateDisplay();
}

    init(trackIndex);
    animate();
