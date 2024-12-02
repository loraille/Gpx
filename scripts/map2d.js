const urlParams = new URLSearchParams(window.location.search);
const activity = urlParams.get('index');
if (activity===''){
    let activityShow=''
}else{
    activityShow=activity
}

// Initialiser la carte
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variables globales
let traceGroups = null;
let polylines = [];
let loadedFilesCount = 0;
let totalFiles = 0;
let hoveredPolyline = null;
let trackData = [];



// Affiche les tracks en fonction du retour vtt course trail
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
            loadGPXFiles(group.gpxFiles);
        });
    }
}

// Charger les fichiers GPX
function loadGPXFiles(gpxFiles) {
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
                //console.log(`Chargement réussi : ${filename}`);

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

let currentTrackIndex = 0;
if (document.getElementById('previous')){
document.getElementById('previous').addEventListener('click', () => {
    if (currentTrackIndex!==0){
        currentTrackIndex -=1;
    }else{
        currentTrackIndex=trackData.length-1
    }
    updateTrackDisplay();
});
}
if(document.getElementById('next')){
document.getElementById('next').addEventListener('click', () => {
    if (currentTrackIndex!==trackData.length-1){
        currentTrackIndex +=1;
    }else{
        currentTrackIndex=0
    }
    updateTrackDisplay();
});
}  

function updateTrackDisplay() {
    polylines.forEach((polyline, index) => {
        if (index === currentTrackIndex) {
            polyline.setStyle({ opacity: 1, weight: 5 });
        } else {
            polyline.setStyle({ opacity: 0.3, weight: 3 });
        }
    });
    if(document.getElementById('selectTrack')!==''){
        const selectedTrack= document.getElementById('selectTrack')
        selectedTrack.textContent=trackData[currentTrackIndex].name.toUpperCase()
        selectedTrack.addEventListener('click',()=>{
            window.location.href = `trackInfos.html?index=${trackData[currentTrackIndex].filename}&activity=${activityShow}`;
        })
     }
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
            //console.log('Trace survolée :', hoveredPolyline.gpxFile);
        });

        polyline.on('mouseout', () => {
            hoveredPolyline = null;
            polylines.forEach(p => p.setStyle({ opacity: 1 }));
            polyline.setStyle({ weight: 3 });
        });

        polyline.on('click', () => {
            if (hoveredPolyline) {
                const selectedGPXFile = hoveredPolyline.gpxFile;
                //console.log('Fichier GPX sélectionné :', selectedGPXFile);
                //envoi fichier + activité
                window.location.href = `trackInfos.html?index=${selectedGPXFile}&activity=${activityShow}`;
            }
        });
        polylines.push(polyline);
    });

    // Ajuster la vue pour inclure tous les tracés
    const allCoordinates = trackData.flatMap(data => data.coordinates);
    const bounds = L.latLngBounds(allCoordinates);
    map.fitBounds(bounds);
    //maj si on est en format mobile des tracks
    const menuMobile=document.querySelector('.selectionTrack')
    const computedStyle = window.getComputedStyle(menuMobile)
    if(computedStyle.display!=="none"){
        updateTrackDisplay()
    }
    
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


  
