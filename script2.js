// Initialiser la carte
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let polylines = [];
let loadedFilesCount = 0;
let totalFiles = 0;
let dynamicMarker = null;

// Groupes de traces avec plusieurs fichiers GPX par groupe
const traceGroups = [
    {
        gpxFiles: ['data/trace1.gpx', 'data/trace2.gpx'],
        coordinates: [],
        elevations: [],
        traceColors: [],
        traceName:[],
        traceDesc:[],
        circle: null,
        isCircleVisible: true,
    },
    {
        gpxFiles: ['data/trace5.gpx'],
        coordinates: [],
        elevations: [],
        traceColors: [],
        traceName:[],
        traceDesc:[],
        circle: null,
        isCircleVisible: true,
    },
    {
        gpxFiles: [ 'data/circuit1.gpx', 'data/circuit2.gpx'],
        coordinates: [],
        elevations: [],
        traceColors: [],
        traceName:[],
        traceDesc:[],
        circle: null,
        isCircleVisible: true,
    },
];

// Calculer le nombre total de fichiers à charger
traceGroups.forEach(group => {
    totalFiles += group.gpxFiles.length;
    loadGPXFiles(group.gpxFiles, group.coordinates, group.elevations, group.traceColors,group.traceDesc,group.traceName, () => updateCircle(group));
});

// Charger plusieurs fichiers GPX et stocker les couleurs spécifiques à chaque tracé
function loadGPXFiles(gpxFiles, coordinates, elevations, traceColors, traceDesc, traceName, updateCircleCallback) {
    gpxFiles.forEach(filename => {
        fetch(filename)
            .then(response => response.text())
            .then(gpxData => {
                // Appel parseGPX
                const { GPXcolor, GPXname, GPXdesc } = parseGPX(gpxData, coordinates, elevations);

                // Stocker les informations extraites
                traceColors.push(GPXcolor);
                traceName.push(GPXname);
                traceDesc.push(GPXdesc);

                updateCircleCallback();

                loadedFilesCount++;
                if (loadedFilesCount === totalFiles) {
                    updateMapView();
                }
            })
            .catch(error => console.error('Erreur lors du chargement du fichier GPX:', error));
    });
}

// Parser le contenu GPX pour extraire les coordonnées, les élévations et la couleur
function parseGPX(gpxData, coordinates, elevations) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'application/xml');
    const trackPoints = xmlDoc.getElementsByTagName('trkpt');

    // Extraire les balises <color>, <name> et <desc>
    let colorTag = xmlDoc.getElementsByTagName('color')[0]?.textContent?.trim();
    let nameTag = xmlDoc.getElementsByTagName('name')[0]?.textContent?.trim();
    let descTag = xmlDoc.getElementsByTagName('desc')[0]?.textContent?.trim();

    // Définir les valeurs par défaut si les balises sont absentes ou vides
    const GPXcolor = colorTag ? `#${colorTag}` : '#ff0000';
    const GPXname = nameTag || 'No Name';
    const GPXdesc = descTag || 'No Description';

    let trackCoordinates = [];
    let trackElevations = [];

    // Extraire les coordonnées et élévations
    for (let i = 0; i < trackPoints.length; i++) {
        const point = trackPoints[i];
        const lat = point.getAttribute('lat');
        const lon = point.getAttribute('lon');
        const ele = point.getElementsByTagName('ele')[0]?.textContent;

        if (lat && lon && ele) {
            trackCoordinates.push([parseFloat(lat), parseFloat(lon)]);
            trackElevations.push(parseFloat(ele));
        }
    }

    coordinates.push(trackCoordinates);
    elevations.push(trackElevations);

    // Retourner les informations extraites
    return { GPXcolor, GPXname, GPXdesc };
}

// Ajuster la vue de la carte pour englober toutes les traces chargées
function updateMapView() {
    const allCoordinates = traceGroups.flatMap(group => group.coordinates).flat();
    if (allCoordinates.length > 0) {
        const bounds = L.latLngBounds(allCoordinates);
        map.fitBounds(bounds);
    }
}

// Mettre à jour le cercle de chaque groupe sur la carte
function updateCircle(group) {
    if (group.circle) map.removeLayer(group.circle);

    if (group.coordinates.length > 0 && group.isCircleVisible) {
        const allCoordinates = group.coordinates.flat();
        const bounds = L.latLngBounds(allCoordinates);
        const center = bounds.getCenter();
        const radius = center.distanceTo(bounds.getNorthEast());

        group.circle = L.circle(center, {
            radius: radius,
            color: 'black',
            fillColor: 'red',
            fillOpacity: 0.5
        }).addTo(map);

        group.circle.bindTooltip(`${group.gpxFiles.length}`, { permanent: true, direction: 'center' }).openTooltip();

        group.circle.on('click', function () {
            group.isCircleVisible = false;
            map.removeLayer(group.circle);
            displayTracks(group.coordinates, group.traceColors, group.traceName, group.traceDesc, group.elevations);

            traceGroups.forEach(otherGroup => {
                if (otherGroup !== group && !otherGroup.isCircleVisible) {
                    otherGroup.isCircleVisible = true;
                    updateCircle(otherGroup);
                }
            });
        });
    }
}

// Afficher les tracés avec les couleurs spécifiques et la timeline
function displayTracks(coordinates, traceColors, traceNames, traceDescs, elevations) {
    // Supprimer tous les tracés existants
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];

    coordinates.forEach((trackCoordinates, index) => {
        // Utiliser la couleur du tracé ou la couleur par défaut
        const color = traceColors[index];
        const polyline = L.polyline(trackCoordinates, { color: color, weight: 3 }).addTo(map);
        polylines.push(polyline);

        // Ajouter un gestionnaire d'événements click pour afficher les informations du tracé
        polyline.on('click', function () {
            document.getElementById('trackName').textContent = `Name: ${traceNames[index]}`;
            document.getElementById('trackDesc').textContent = `Description: ${traceDescs[index]}`;
            createElevationChart(elevations[index], trackCoordinates);
        });
    });

    const allCoordinates = coordinates.flat();
    const bounds = L.latLngBounds(allCoordinates);
    map.fitBounds(bounds);
}
// Créer la timeline avec les distances cumulées en x
function createElevationChart(elevations, coordinates) {
    const distances = calculateDistances(coordinates); // Distances cumulées en km

    const ctx = document.getElementById('elevationChart').getContext('2d');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances, // Les distances cumulées servent à positionner les données
            datasets: [{
                label: 'Elevation',
                data: elevations,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distance (km)'
                    },
                  
                },
                y: {
                    title: {
                        display: true,
                        text: 'Elevation (m)'
                    }
                }
            }
        }
    });
        // Ajouter un gestionnaire d'événements pour les mouvements de la souris
        ctx.canvas.addEventListener('mousemove', (event) => {
            const rect = ctx.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const chartArea = chart.chartArea;
            const chartWidth = chartArea.right - chartArea.left;
            const index = Math.floor((x - chartArea.left) / chartWidth * distances.length);
    
            if (index >= 0 && index < coordinates.length) {
                const [lat, lon] = coordinates[index];
                updateDynamicMarker(lat, lon);
            }
        });
    }


// Calculer les distances cumulées
function calculateDistances(coordinates) {
    let totalDistance = 0;
    const distances = [0]; // Ajouter un point initial à 0 km

    for (let i = 1; i < coordinates.length; i++) {
        const lat1 = coordinates[i - 1][0];
        const lon1 = coordinates[i - 1][1];
        const lat2 = coordinates[i][0];
        const lon2 = coordinates[i][1];

        const distance = haversineDistance(lat1, lon1, lat2, lon2);
        totalDistance += distance;

        // Convertir la distance cumulée en kilomètres
        distances.push(totalDistance/1000);
        console.log(`Distance cumulée: ${distances} km`);
    }

    return distances;
}
// Fonction pour mettre à jour la position du marqueur dynamique
function updateDynamicMarker(lat, lon) {
    if (dynamicMarker) {
        dynamicMarker.setLatLng([lat, lon]);
    } else {
        dynamicMarker = L.marker([lat, lon], { draggable: false }).addTo(map);
    }
}



// Calculer la distance entre deux points de coordonnées en utilisant la formule de Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
}




// Mettre à jour la position du marqueur dynamique sur la carte
function updateDynamicMarker(lat, lon) {
    if (dynamicMarker) {
        dynamicMarker.setLatLng([lat, lon]);
    } else {
        dynamicMarker = L.marker([lat, lon], { draggable: false }).addTo(map);
    }
}


function simplifyDouglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;

    let dmax = 0;
    let index = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const d = perpendicularDistance(points[i], start, end);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > tolerance) {
        const firstLine = points.slice(0, index + 1);
        const lastLine = points.slice(index);
        return simplifyDouglasPeucker(firstLine, tolerance).slice(0, -1).concat(simplifyDouglasPeucker(lastLine, tolerance));
    } else {
        return [start, end];
    }
}

function perpendicularDistance(point, lineStart, lineEnd) {
    const x0 = point[1];
    const y0 = point[0];
    const x1 = lineStart[1];
    const y1 = lineStart[0];
    const x2 = lineEnd[1];
    const y2 = lineEnd[0];

    const numerator = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
    const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

    return numerator / denominator;
}
