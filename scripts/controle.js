//menu burger
const menuMobile = document.querySelector('.menuMobile');
const menu = document.getElementById('mobileCtrl');
const trackMenuSelector=document.querySelector('.selectionTrack')
let menuContent = false;
menuMobile.addEventListener('click', () => {
    menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    menuContent = !menuContent;
});

function checkWindowWidth(element) {
    const thresholdWidth = 800; // Définissez la largeur seuil au-dessus de laquelle vous souhaitez masquer l'élément

    if (window.innerWidth > thresholdWidth) {
        element.style.display = 'none';
    } else {
        if (menuContent) {
            element.style.display = 'block'; // Ou toute autre valeur de display que vous souhaitez utiliser
        }
    }
}

// Appeler la fonction au chargement de la page
window.addEventListener('load', () => {
    checkWindowWidth(menu);
    checkWindowWidth(menuMobile);
    checkWindowWidth(trackMenuSelector);
});

// Appeler la fonction lorsque la fenêtre est redimensionnée
window.addEventListener('resize', () => {
    checkWindowWidth(menu);
    checkWindowWidth(menuMobile);
    checkWindowWidth(trackMenuSelector);
});

// Gestion des boutons version WEB pour charger les traces
document.getElementById('btnVtt').addEventListener('click', () => {
    displayAcitvity('vtt');
});
document.getElementById('btnCourse').addEventListener('click', () => {
    displayAcitvity('course');
});
document.getElementById('btnTrail').addEventListener('click', () => {
    displayAcitvity('trail');
});
// Gestion des boutons version MOBILE pour charger les traces
document.getElementById('mblVtt').addEventListener('click', () => {
    displayAcitvity('vtt');
    menuMobile.style.display = 'none';
});
document.getElementById('mblCrs').addEventListener('click', () => {
    displayAcitvity('course');
    menuMobile.style.display = 'none';
});
document.getElementById('mblTrail').addEventListener('click', () => {
    displayAcitvity('trail');
    menuMobile.style.display = 'none';
});

const displayAcitvity = (activity) => {
    document.getElementById('pageAccueil').style.display = 'none';
    document.getElementById('map').style.display = 'flex';
    resetMap();
    // Construire le nom de la variable dynamique
    const variableName = activity + 'GPX';
    // Accéder à la variable dynamique en utilisant window
    traceGroups = window[variableName];
    readTracks();
    map.invalidateSize();
    activityShow = activity;
};

//affiche le menu de navigation des tracks si map est visible
document.addEventListener('DOMContentLoaded', function() {
    const mapElement = document.getElementById('map');
    const selectionTrackElement = document.querySelector('.selectionTrack');

    function updateSelectionTrackVisibility() {
        if (window.getComputedStyle(mapElement).display === 'flex') {
            selectionTrackElement.classList.add('visible');
        } else {
            selectionTrackElement.classList.remove('visible');
        }
    }

    // Appel initial pour vérifier l'état au chargement de la page
    updateSelectionTrackVisibility();

    // Ajoutez un écouteur d'événement pour vérifier les changements de style
    const observer = new MutationObserver(updateSelectionTrackVisibility);
    observer.observe(mapElement, { attributes: true, attributeFilter: ['style'] });

    // Vous pouvez également ajouter un écouteur d'événement pour les changements de classe
    mapElement.addEventListener('classChanged', updateSelectionTrackVisibility);
});

//////////////////////////Bandeau defilant///////////////////

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
const nextSundayDate = getNextSundayFormatted();
const startingPoint = "la halle de St Pardoux La Rivière";
const churchRomain = "l'église de Champs-Romain";
const noSortie= `⚠️Pas de sortie organisée ce dimanche ${nextSundayDate} 😥😪😭`;
const planified= `🚴Rendez-vous ce dimanche ${nextSundayDate} à 9h devant ${startingPoint} pour la sortie VTT dominicale pour une boucle vers Sceau St Angel ! 🚴🚴`;
const toPlanified= `⚠️Pas encore de choix sur la sortie VTT de ce dimanche ${nextSundayDate} 😬😬😬`;
document.querySelector('.marquee-content span').textContent =planified;

