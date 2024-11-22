// Initialiser la carte
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let traceGroups=null;
let polylines = [];
let loadedFilesCount = 0;
let totalFiles = 0;
let dynamicMarker = null;
let step=20
let options={}
let markerPoint={
    x:0,
    y:0,
    z:0
}

// Récupération des tarcks en fonction de l'activité
document.getElementById('btnVtt').addEventListener('click',()=>{
    
    traceGroups=vttGPX
    readTracks()
})
document.getElementById('btnCourse').addEventListener('click',()=>{
    
    traceGroups=courseGPX
    readTracks()
})
document.getElementById('btnTrail').addEventListener('click',()=>{
     
    traceGroups=trailGPX
    readTracks()
})

// Calculer le nombre total de fichiers à charger
function readTracks(){
    if (traceGroups){
        traceGroups.forEach(group => {
            totalFiles += group.gpxFiles.length;
            loadGPXFiles(group.gpxFiles, group.coordinates, group.elevations, group.traceColors,group.traceDesc,group.traceName, () => updateCircle(group));
        });
    }
}


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
    // Supprimer le cercle existant si il y en a un
    if (group.circle) {
        map.removeLayer(group.circle);
        if (group.textMarker) map.removeLayer(group.textMarker); // Supprimer l'ancien marqueur de texte
    }

    if (group.coordinates.length > 0 && group.isCircleVisible) {
        const allCoordinates = group.coordinates.flat();
        const bounds = L.latLngBounds(allCoordinates);
        const center = bounds.getCenter();
        const radius = center.distanceTo(bounds.getNorthEast());

        // Créer et afficher le cercle rouge
        group.circle = L.circle(center, {
            radius: radius,
            color: 'black',       // Bordure noire
            fillColor: 'red',     // Fond rouge
            fillOpacity: 1        // Opacité à 100% pour un cercle entièrement rouge
        }).addTo(map);

        // Ajouter un texte au centre du cercle pour afficher le nombre de tracks
        const customIcon = L.divIcon({
            className: 'custom-track-count',  // Classe CSS pour styliser le texte
            html: `<span>${group.gpxFiles.length}</span>`,  // Contient le nombre
            iconSize: [20, 20],   // Ajuste la taille du texte (vous pouvez l’adapter)
            iconAnchor: [10, 10]  // Positionne le texte au centre du cercle
        });

        // Créer un marqueur unique pour afficher le texte au centre du cercle
        group.textMarker = L.marker(center, { icon: customIcon }).addTo(map);

        // Gérer le clic sur le texte pour zoomer et propager le clic au cercle
        group.textMarker.on('click', function () {
            map.setView(center, 14); // Zoomer sur le centre du cercle avec un niveau de zoom de 14
            group.circle.fire('click'); // Propager manuellement le clic au cercle
        });

        // Ajouter un événement au clic sur le cercle
        group.circle.on('click', function () {
            clearElevationChart(); // Effacer le graphique d'élévation

            // Zoom sur le cercle
            map.setView(center, 14); // Zoomer sur le centre du cercle avec un niveau de zoom de 14

            // Cacher le cercle et le texte, et afficher les traces
            group.isCircleVisible = false;
            map.removeLayer(group.circle);
            map.removeLayer(group.textMarker);
            displayTracks(group.coordinates, group.traceColors, group.traceName, group.traceDesc, group.elevations);

            // Réafficher les cercles des autres groupes qui sont visibles
            traceGroups.forEach(otherGroup => {
                if (otherGroup !== group && !otherGroup.isCircleVisible) {
                    otherGroup.isCircleVisible = true;
                    updateCircle(otherGroup);
                }
            });
        });
    }
}




// Fonction pour effacer le graphique d'élévation
function clearElevationChart() {
    // Si le graphique d'élévation existe, le détruire
    if (elevationChart) {
        elevationChart.destroy();  // Détruire l'instance du graphique
        elevationChart = null; // Réinitialiser la variable
    }

    // Optionnel : vous pouvez aussi vider le conteneur du graphique si nécessaire
    const chartContainer = document.getElementById("myChart");
    chartContainer.innerHTML = ''; // Effacer le contenu HTML du graphique
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
            
            updateDynamicMarker(datum.lat, datum.lon,datum.elev); // Met à jour le marqueur dynamique sur la carte
          
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
const textColor='#ffffff'
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
            fillOpacity:1,
            interpolation: { type: "smooth" },
            tooltip,
            marker: {
                itemStyler: (params) => {
                    if (params.datum.elev ===  minElevation) return { fill: 'green', size: 8 };
                    else if (params.datum.elev ===  maxElevation) return { fill: 'red', size: 8 };
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
                color:textColor,
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


