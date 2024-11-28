
// Initialiser la carte
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function getNextSundayFormatted() {
    // Créer un objet Date avec la date actuelle
    const today = new Date();
    // Obtenir le jour de la semaine (0 pour dimanche, 1 pour lundi, ..., 6 pour samedi)
    const dayOfWeek = today.getDay();
    // Calculer le nombre de jours à ajouter pour atteindre le dimanche suivant
    const daysUntilSunday = (7 - dayOfWeek) % 7; // Si aujourd'hui est dimanche, daysUntilSunday sera 0
    // Ajouter les jours nécessaires à la date actuelle
    today.setDate(today.getDate() + daysUntilSunday);

    // Formater la date avec Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    return formatter.format(today);
}
function formatDateWithIntl(date) {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    return formatter.format(date); 
}
// messages défilants
const date=getNextSundayFormatted()
const sp="la halle de St Pardoux La Rivière"
const cr="l'église de Champs-Romain"
const message2=`⚠️Pas de sortie organisée ce dimanche ${date} 😥😪😭`
const message1=`🚴Rendez-vous dimanche ${date} à 9h devant ${sp} pour la sortie VTT dominicale ! 🚴🚴`
document.querySelector('.marquee-content span').textContent=message2

const datenow=new Date()
console.log(formatDateWithIntl(datenow))


// Variables globales
let traceGroups = null;
let polylines = [];
let loadedFilesCount = 0;
let totalFiles = 0;
let hoveredPolyline = null;
let trackData = [];

// Gestion des boutons pour charger les traces
document.getElementById('btnVtt').addEventListener('click', () => {
    document.getElementById('pageAccueil').style.display = 'none';
    document.getElementById('map').style.display = 'flex';
      resetMap();
    traceGroups = vttGPX;
    readTracks();
    map.invalidateSize()
});
document.getElementById('btnCourse').addEventListener('click', () => {
    document.getElementById('pageAccueil').style.display = 'none';
    document.getElementById('map').style.display = 'flex';
    resetMap();
    traceGroups = courseGPX;
    readTracks();
    map.invalidateSize()
});
document.getElementById('btnTrail').addEventListener('click', () => {
    document.getElementById('pageAccueil').style.display = 'none';
    document.getElementById('map').style.display = 'flex';
    resetMap();
    traceGroups = trailGPX;
    readTracks();
    map.invalidateSize()
});
// Affiche les tracks en fonction du retour vtt course trail
const urlParams = new URLSearchParams(window.location.search);
const activity = urlParams.get('index');
if(activity!==null){

    if(activity.includes('vtt')){
        document.getElementById('pageAccueil').style.display = 'none';
        document.getElementById('map').style.display = 'flex';
        traceGroups = vttGPX;
        readTracks();
        map.invalidateSize()
    }else if(activity.includes('trail')){
        document.getElementById('pageAccueil').style.display = 'none';
        document.getElementById('map').style.display = 'flex';
        traceGroups = trailGPX;
        readTracks();
        map.invalidateSize()
    }else if(activity.includes('course')){
        document.getElementById('pageAccueil').style.display = 'none';
        document.getElementById('map').style.display = 'flex';
        traceGroups = courseGPX;
        readTracks();
        map.invalidateSize()
    }
}
// Lire et charger les traces
function readTracks() {
    if (traceGroups) {
        traceGroups.forEach(group => {
            totalFiles += group.gpxFiles.length;
            loadGPXFiles(group.gpxFiles, group.coordinates, group.elevations, group.traceColors, group.traceDesc, group.traceName);
        });
    }
}

// Charger les fichiers GPX
function loadGPXFiles(gpxFiles, coordinates, elevations, traceColors, traceDesc, traceName) {
    gpxFiles.forEach((filename, index) => {
        fetch(filename)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur lors du chargement du fichier GPX: ${filename}`);
                }
                return response.text();
            })
            .then(gpxData => {
                const { GPXcolor, GPXname, GPXdesc, trackCoordinates, trackElevations } = parseGPX(gpxData);

                // Ajouter les informations au tableau trackData
                trackData.push({
                    filename,
                    coordinates: trackCoordinates,
                    elevations: trackElevations,
                    color: GPXcolor,
                    name: GPXname,
                    desc: GPXdesc
                });

                loadedFilesCount++;
                console.log(`Chargement réussi : ${filename}`);

                if (loadedFilesCount === totalFiles) {
                    displayTracks(trackData);
                }
            })
            .catch(error => console.error(error));
    });
}

// Parser le contenu GPX pour extraire les données
function parseGPX(gpxData) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxData, 'application/xml');
    const trackPoints = xmlDoc.getElementsByTagName('trkpt');

    // Extraire les balises <color>, <name>, et <desc>
    let colorTag = xmlDoc.getElementsByTagName('color')[0]?.textContent?.trim();
    let nameTag = xmlDoc.getElementsByTagName('name')[0]?.textContent?.trim();
    let descTag = xmlDoc.getElementsByTagName('desc')[0]?.textContent?.trim();

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

    return { GPXcolor, GPXname, GPXdesc, trackCoordinates, trackElevations };
}

// Afficher les tracés avec gestion des interactions
function displayTracks(trackData) {
    // Supprimer tous les tracés existants
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];

    trackData.forEach(data => {
        const polyline = L.polyline(data.coordinates, { color: data.color, weight: 3, opacity: 1 }).addTo(map);
        polyline.gpxFile = data.filename;

        // Gestion des événements de survol et clic
        polyline.on('mouseover', () => {
            hoveredPolyline = polyline;
            polylines.forEach(p => {
                if (p !== polyline) p.setStyle({ opacity: 0.3 });
            });
            polyline.setStyle({ weight: 5 });
            console.log('Trace survolée :', hoveredPolyline.gpxFile);
        });

        polyline.on('mouseout', () => {
            hoveredPolyline = null;
            polylines.forEach(p => p.setStyle({ opacity: 1 }));
            polyline.setStyle({ weight: 3 });
        });

        polyline.on('click', () => {
            if (hoveredPolyline) {
                const selectedGPXFile = hoveredPolyline.gpxFile;
                console.log('Fichier GPX sélectionné :', selectedGPXFile);
                window.location.href = `trackInfos.html?index=${selectedGPXFile}`;
            }
        });

        polylines.push(polyline);
    });

    // Ajuster la vue pour inclure tous les tracés
    const allCoordinates = trackData.flatMap(data => data.coordinates);
    const bounds = L.latLngBounds(allCoordinates);
    map.fitBounds(bounds);
}

// Réinitialiser la carte
function resetMap() {
    // Supprimer tous les tracés existants
    polylines.forEach(polyline => map.removeLayer(polyline));
    polylines = [];

    // Réinitialiser les variables globales
    loadedFilesCount = 0;
    totalFiles = 0;
    trackData = [];

    // Réinitialiser la vue de la carte
    map.setView([0, 0], 2);
}
