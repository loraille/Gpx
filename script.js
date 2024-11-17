const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', handleFileSelect);

let polyline;
let coordinates = [];
let elevations = [];

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const gpxData = e.target.result;
            parseGPX(gpxData);
        };
        reader.readAsText(file);
    }
}

function parseGPX(gpxData) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'application/xml');
    const trackPoints = xmlDoc.getElementsByTagName('trkpt');

    coordinates = [];
    elevations = [];

    for (let i = 0; i < trackPoints.length; i++) {
        const point = trackPoints[i];
        const lat = point.getAttribute('lat');
        const lon = point.getAttribute('lon');
        const ele = point.getElementsByTagName('ele')[0]?.textContent;

        if (lat && lon && ele) {
            coordinates.push([lat, lon]);
            elevations.push(parseFloat(ele));
        }
    }

    displayTrack(coordinates);
}

function displayTrack(coordinates) {
    if (polyline) {
        map.removeLayer(polyline);
    }
    polyline = L.polyline(coordinates, { color: 'red' }).addTo(map);
    map.fitBounds(polyline.getBounds());

    polyline.on('click', function(e) {
        const closestPointIndex = getClosestPointIndex(e.latlng, coordinates);
        displayElevationInfo(closestPointIndex);
    });
}

function getClosestPointIndex(latlng, coordinates) {
    let minDistance = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < coordinates.length; i++) {
        const distance = latlng.distanceTo(L.latLng(coordinates[i]));
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }
    return closestIndex;
}

function displayElevationInfo(index) {
    const elevationInfoDiv = document.getElementById('elevationInfo');
    elevationInfoDiv.textContent = `Coord: ${coordinates[index]} Elevation at point ${index + 1}: ${elevations[index]} meters`;
console.log(coordinates[index])
}
