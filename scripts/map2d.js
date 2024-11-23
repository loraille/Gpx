// Initialiser la carte
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let traceGroups = null;
let polylines = [];
let loadedFilesCount = 0;
let totalFiles = 0;
let dynamicMarker = null;
let step = 20;
let options = {};
let markerPoint = {
    x: 0,
    y: 0,
    z: 0
};

// Récupération des traces en fonction de l'activité
document.getElementById('btnVtt').addEventListener('click', () => {
    resetMap();
    traceGroups = vttGPX;
    readTracks();
});
document.getElementById('btnCourse').addEventListener('click', () => {
    resetMap();
    traceGroups = courseGPX;
    readTracks();
});
document.getElementById('btnTrail').addEventListener('click', () => {
    resetMap();
    traceGroups = trailGPX;
    readTracks();
});

// Calculer le nombre total de fichiers à charger
function readTracks() {
    if (traceGroups) {
        traceGroups.forEach(group => {
            totalFiles += group.gpxFiles.length;
            loadGPXFiles(group.gpxFiles, group.coordinates, group.elevations, group.traceColors, group.traceDesc, group.traceName);
        });
    }
}

// Charger plusieurs fichiers GPX et stocker les couleurs spécifiques à chaque tracé
function loadGPXFiles(gpxFiles, coordinates, elevations, traceColors, traceDesc, traceName) {
    gpxFiles.forEach(filename => {
        fetch(filename)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur lors du chargement du fichier GPX: ${filename}`);
                }
                return response.text();
            })
            .then(gpxData => {
                // Appel parseGPX
                const { GPXcolor, GPXname, GPXdesc } = parseGPX(gpxData, coordinates, elevations);

                // Stocker les informations extraites
                traceColors.push(GPXcolor);
                traceName.push(GPXname);
                traceDesc.push(GPXdesc);

                loadedFilesCount++;
                console.log(`Loaded file: ${filename}`); // Débogage
                if (loadedFilesCount === totalFiles) {
                    displayTracks(coordinates, traceColors, traceName, traceDesc, elevations);
                }
            })
            .catch(error => console.error(error));
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
            document.getElementById('trackName').textContent = `${traceNames[index]}`;
            document.getElementById('trackDesc').textContent = `${traceDescs[index]}`;

            createElevationChart(elevations[index], trackCoordinates);

            // Zoomer sur le tracé sélectionné
            const bounds = L.latLngBounds(trackCoordinates);
            map.fitBounds(bounds);

            // Réduire l'opacité des autres tracés
            polylines.forEach(otherPolyline => {
                if (otherPolyline !== polyline) {
                    otherPolyline.setStyle({ opacity: 0.3 });
                } else {
                    otherPolyline.setStyle({ opacity: 1 });
                }
            });
        });
    });

    const allCoordinates = coordinates.flat();
    const bounds = L.latLngBounds(allCoordinates);
    map.fitBounds(bounds);
}

let elevationChart = null; // Variable globale pour stocker l'instance du graphique

// Créer la timeline avec les distances cumulées en x
function createElevationChart(elevations, coordinates) {
    const distances = calculateDistances(coordinates); // Distances cumulées en km
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);

    if (elevationChart) {
        elevationChart.destroy();
    }
    const datasElevation = elevations.map((e, index) => {
        return { dist: distances[index], elev: e, lat: coordinates[index][0], lon: coordinates[index][1] };
    });

    function getData() {
        return datasElevation;
    }

    // Définition du tooltip avec récupération des données survolées
    const tooltip = {
        renderer: ({ datum }) => {
            if (datum && datum.lat && datum.lon) {

                updateDynamicMarker(datum.lat, datum.lon, datum.elev); // Met à jour le marqueur dynamique sur la carte

                return {
                    //renvoi en légende
                    title: `Distance: ${datum.dist.toFixed(1)} km`,
                    content: `Élévation: ${datum.elev.toFixed(0)} m`
                };
            } else {
                console.warn("Données invalides pour le tooltip:", datum);
                return null;
            }
        },
    };

    // Création du graphique
    const { AgCharts } = agCharts;
    const textColor = '#ffffff';
    options = {
        container: document.getElementById("myChart"),

        data: getData(),
        series: [
            {
                type: "area",
                xKey: "dist",
                yKey: "elev",
                yName: "Élévation",
                fill: '#e67e30',
                fillOpacity: 1,
                interpolation: { type: "smooth" },
                tooltip,
                marker: {
                    itemStyler: (params) => {
                        if (params.datum.elev === minElevation) return { fill: 'green', size: 8 };
                        else if (params.datum.elev === maxElevation) return { fill: 'red', size: 8 };
                        else return { size: 0 };
                    }
                },
            }
        ],
        axes: [
            {
                type: "category",
                position: "bottom",
                // title: {
                //     text: "Distance (km)",
                // },
                label: {
                    color: textColor,
                    formatter: (params) => `${params.value} km`,
                },
            },
            {
                type: "number",
                position: "left",
                title: {
                    color: textColor,
                    text: "Élévation (m)",
                },
                label: {
                    color: textColor,
                    formatter: (params) => `${params.value} m`,
                },
                interval: { step: step },
                min: minElevation,
            },
        ],
        background: {
            fill: 'transparent',
        },
    };

    elevationChart = AgCharts.create(options);
}

// Fonction pour ajuster le "step" de l'axe des élévations
function setStep(step) {
    const axis = options.axes?.[1];
    axis.interval = { step: step };
    elevationChart.update(options);
}

// Fonction pour ajuster le "step" de l'axe des élévations
function resetInterval() {
    const axis = options.axes?.[1];
    axis.interval = { step: 20 };
    elevationChart.update(options);
}

// Fonction pour mettre à jour le marqueur dynamique sur la carte
function updateDynamicMarker(lat, lon, elev) {
    if (!lat || !lon) {
        console.warn("Invalid lat/lon for dynamic marker:", lat, lon);
        return;
    }

    if (dynamicMarker) {
        dynamicMarker.setLatLng([lat, lon]); // Déplacer le marqueur existant
    } else {
        dynamicMarker = L.marker([lat, lon], { draggable: false }).addTo(map); // Ajouter un nouveau marqueur si nécessaire
    }
}

// Ajouter un gestionnaire d'événement pour le survol du graphique
const chartContainer = document.getElementById('myChart');

// Afficher le marqueur dynamique
chartContainer.addEventListener('mouseover', function () {
    // Le marqueur reste visible tant que l'on est sur le graphique
    if (dynamicMarker) {
        dynamicMarker.addTo(map); // Si le marqueur existe, on le maintient sur la carte
    }
});

// supprimer le marqueur
chartContainer.addEventListener('mouseout', function () {
    // Supprimer le marqueur de la carte si on sort du graphique
    if (dynamicMarker) {
        map.removeLayer(dynamicMarker);
        dynamicMarker = null; // Réinitialiser le marqueur
    }
});

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
        const roundedDistance = parseFloat((totalDistance / 1000).toFixed(1));
        distances.push(roundedDistance);
    }

    return distances;
}

// Fonction pour réinitialiser la carte
function resetMap() {
    // Supprimer tous les tracés existants
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];

    // Réinitialiser les variables globales
    loadedFilesCount = 0;
    totalFiles = 0;
    dynamicMarker = null;
    step = 20;
    options = {};
    markerPoint = { x: 0, y: 0, z: 0 };

    // Réinitialiser la vue de la carte à sa position initiale
    map.setView([0, 0], 2);

    // Effacer le graphique d'élévation
    clearElevationChart();
}

// Fonction pour effacer le graphique d'élévation
function clearElevationChart() {
    // Si le graphique d'élévation existe, le détruire
    if (elevationChart) {
        elevationChart.destroy();
        elevationChart = null;
    }

    // Optionnel : vous pouvez aussi vider le conteneur du graphique si nécessaire
    const chartContainer = document.getElementById("myChart");
    chartContainer.innerHTML = ''; // Effacer le contenu HTML du graphique
}