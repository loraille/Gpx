import { display3d,display3dLocal } from "./map3d.js";


// Obtenez les éléments pour la modale
var modal = document.getElementById("myModal");
var btn = document.getElementById("yourGpx");
var btnCloseModal = document.getElementsByClassName("close")[0];

const closeModal=()=>{modal.style.display = "none"}
const openModal=()=>{modal.style.display = "block"}

// Lorsque l'utilisateur clique sur le bouton, ouvrez la modale
btn.onclick = function() {
   openModal();
}
// Lorsque l'utilisateur clique sur <span> (x), fermez la modale
btnCloseModal.onclick = function() {
    closeModal() ;
}
// Lorsque l'utilisateur clique n'importe où en dehors de la modale
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// Récupérer le paramètre de requête 'index' pour afficher le tracé
const urlParams = new URLSearchParams(window.location.search);
let trackIndex = urlParams.get('index');
const selectedActivity=urlParams.get('activity')

//ouvre la modale si le lien vient du header depuis index.html
if(selectedActivity==='accueil'){
    openModal()
}

//valeur de l'activité
let activityTracks = '';
let activityColor=''
const descriptionContainer=document.querySelectorAll('.titleContainer')
    if(urlParams.get('activity').includes('vtt')){
        activityTracks = '"VTT"';
        activityColor = '#3CB371';
    }else if(urlParams.get('activity').includes('course')){
        activityTracks = '"Course"';
        activityColor = '#1E90FF';
    }else if(urlParams.get('activity').includes('trail')){
        activityTracks = '"Trail"';
        activityColor = '#D2691E';
    }else{
        activityTracks = '"Accueil"';
        document.querySelector('.retourContainer h3').textContent="Retour à l'accueil"
        document.getElementById('trackDownload').style.display='none'
        activityColor = '#8a961e';
    }
    //applique les couleurs sur les descriptions
for (let e of descriptionContainer) {
    e.style.border=`1px solid ${activityColor}`
}
    //mecanique caché/affiché catégories
const sections = document.querySelectorAll('.titleContainer .upDown');

for (let img of sections) {
    img.style.cursor='pointer'
    img.addEventListener('click', () => {
        let nextSibling = img.closest('.titleContainer').nextElementSibling;
        while (nextSibling && !nextSibling.classList.contains('titleContainer')) {
            if (nextSibling.style.display === 'none') {
                // Restaurer l'affichage en utilisant la valeur stockée
                nextSibling.style.display = nextSibling.getAttribute('data-default-display') || '';
                img.src='../img/up.png'
            } else {
                // Masquer l'élément et stocker la valeur par défaut
                nextSibling.setAttribute('data-default-display', window.getComputedStyle(nextSibling).display);
                nextSibling.style.display = 'none';
                img.src='../img/down.png'
            }
            nextSibling = nextSibling.nextElementSibling;
        }
    });
}
//couleur de fond des images infos
const imgInfos=document.querySelectorAll('.imgInfo')
for (let img of imgInfos) {
    img.style.backgroundColor=activityColor 
}

//retour
document.getElementById('backTracks').addEventListener('click',()=>{
    window.location.href = `index.html?index=${selectedActivity}`;
})
if (selectedActivity!=='accueil'){
    document.getElementById('trackActivity').textContent=activityTracks
}

//download map
document.getElementById('trackDownload').href=trackIndex

// Initialiser la carte
const map = L.map('map').setView([0, 0], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let polylines = [];
let dynamicMarker = null;
let step = 20;
let options = {};
let elevationChart = null;


if(trackIndex!==null){
    // Lire le fichier GPX
    fetch(trackIndex)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur lors du chargement du fichier GPX: ${trackIndex}`);
        }
        return response.text();
    })
    .then(gpxData => {
        const { coordinates, elevations, GPXcolor, GPXname, GPXdesc } = parseGPX(gpxData);
        displayTrack(coordinates, elevations, GPXcolor, GPXname, GPXdesc);
        display3d(trackIndex)
    })
    .catch(error => console.error(error));
}
// Parser le contenu GPX pour extraire les coordonnées, les élévations et la couleur
function parseGPX(gpxData) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'application/xml');
    const trackPoints = xmlDoc.getElementsByTagName('trkpt');

    // Extraire les balises metadata
    let colorTag = xmlDoc.getElementsByTagName('color')[0]?.textContent?.trim();
    let nameTag = xmlDoc.getElementsByTagName('name')[0]?.textContent?.trim();
    let descTag = xmlDoc.getElementsByTagName('desc')[0]?.textContent?.trim();
   
   
    // Définir les valeurs par défaut si les balises sont absentes ou vides
    const GPXcolor = colorTag ? `#${colorTag}` : '#ff0000';
    const GPXname = nameTag || 'No Name';
    const GPXdesc = descTag || 'No Description';


    let coordinates = [];
    let elevations = [];

    // Extraire les coordonnées et élévations
    for (let i = 0; i < trackPoints.length; i++) {
        const point = trackPoints[i];
        const lat = point.getAttribute('lat');
        const lon = point.getAttribute('lon');
        const ele = point.getElementsByTagName('ele')[0]?.textContent;

        if (lat && lon && ele) {
            coordinates.push([parseFloat(lat), parseFloat(lon)]);
            elevations.push(parseFloat(ele));
        }
    }

    return { coordinates, elevations, GPXcolor, GPXname, GPXdesc };
}

// Afficher le tracé avec la couleur spécifique et la timeline
function displayTrack(coordinates, elevations, color, name, desc) {
 
    const polyline = L.polyline(coordinates, { color: 'red', weight: 3 }).addTo(map);
    polylines.push(polyline);

   //récupérations des infos
    document.getElementById('trackName').textContent = `"${name}"`.toUpperCase();
    document.getElementById('trackDesc').textContent = `${desc}`;
  
    createElevationChart(elevations, coordinates);

   
    //récupération des limites poura afficher la map
    const bounds = L.latLngBounds(coordinates);
    map.fitBounds(bounds);
}

// Créer la timeline avec les distances cumulées en x
function createElevationChart(elevations, coordinates) {
    const distances = calculateDistances(coordinates); // Distances cumulées en km
    const totalDistance = distances[distances.length - 1]; // Distance totale en km
    document.getElementById('distance').textContent = `${totalDistance.toFixed(1)} km`;
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    document.getElementById('Amin').textContent = `${minElevation.toFixed(0)}m`;
    document.getElementById('Amax').textContent = `${maxElevation.toFixed(0)}m`;

    if (elevationChart) {
        elevationChart.destroy();
    }
    const datasElevation = elevations.map((e, index) => {
        return {
            dist: distances[index],
            elev: e,
            lat: coordinates[index][0],
            lon: coordinates[index][1],
            isMin: index === elevations.findIndex(e => e === minElevation),
            isMax: index === elevations.findIndex(e => e === maxElevation)
        };
    });
    // Trouver l'index du premier min et du premier max dans datasElevation
    const minIndex = datasElevation.findIndex(d => d.elev === minElevation);
    const maxIndex = datasElevation.findIndex(d => d.elev === maxElevation);

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
                    content: `Élévation: ${Math.round(datum.elev)} m`
                };
            } else {
                console.warn("Données invalides pour le tooltip:", datum);
                return null;
            }
        },
    };

    // Préparer les données pour la série scatter (min et max)
    const scatterPoints = datasElevation.filter(d => d.isMin || d.isMax);

    // Création du graphique
    const { AgCharts } = agCharts;
    const textColor = '#ffffff';

    options = {
        container: document.getElementById("myChart"),
        palette: null,
        data: getData(),
        series: [
            {
                type: "area",
                xKey: "dist",
                yKey: "elev",
                yName: "Élévation",
                fill: activityColor,
                fillOpacity: 1,
                interpolation: { type: "smooth" },
                tooltip,
            },
            {
                type: "scatter",
                data: scatterPoints,
                fill: 'red',
                stroke: "black",
                xKey: "dist",
                yKey: "elev",
                yName:"Élévation min/max",
                xName:"Distance",
                tooltip,
            }
        ],
        axes: [
            {
                type: "category",
                position: "bottom",
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
                min: minElevation-10,
                max: maxElevation+10,
            },
        ],
        background: {
            fill: 'transparent',
        },
    };

    elevationChart = AgCharts.create(options);
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


// Fonction pour lire le fichier GPX chargé par l'utilisateur
document.getElementById('gpxFileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
         // Supprimer tous les tracés existants
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];

    // Réinitialiser les variables globales
    // let loadedFilesCount = 0;
    // let totalFiles = 0;
    // let trackData = [];

    // Réinitialiser la vue de la carte
    map.setView([0, 0], 2);
        const reader = new FileReader();
        reader.onload = function (e) {
            const gpxData = e.target.result;
            const { coordinates, elevations, GPXcolor, GPXname, GPXdesc } = parseGPX(gpxData);
            displayTrack(coordinates, elevations, GPXcolor, GPXname, GPXdesc);
         
            display3dLocal(gpxData)
        };
        reader.readAsText(file);
        closeModal();
    }
});

