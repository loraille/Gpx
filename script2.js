const map = L.map('map').setView([45.24685410861277, 0.5582427978515626], 10); // Zoom initial
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        let coordinates = [];
        let elevations = [];
        let circle;
        let polylines = [];

        const gpxFiles = ['data/trace1.gpx', 'data/trace2.gpx']; // Liste des fichiers GPX

        gpxFiles.forEach(filename => {
            fetch(filename)
                .then(response => response.text())
                .then(gpxData => {
                    parseGPX(gpxData);
                })
                .catch(error => console.error('Error loading GPX file:', error));
        });

        function parseGPX(gpxData) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxData, 'application/xml');
            const trackPoints = xmlDoc.getElementsByTagName('trkpt');

            let trackCoordinates = [];
            let trackElevations = [];

            for (let i = 0; i < trackPoints.length; i++) {
                const point = trackPoints[i];
                const lat = point.getAttribute('lat');
                const lon = point.getAttribute('lon');
                const ele = point.getElementsByTagName('ele')[0]?.textContent;

                if (lat && lon && ele) {
                    trackCoordinates.push([lat, lon]);
                    trackElevations.push(parseFloat(ele));
                }
            }

            coordinates.push(trackCoordinates);
            elevations.push(trackElevations);

            updateCircle();
        }

        function updateCircle() {
            const allCoordinates = [].concat(...coordinates);
            const bounds = L.latLngBounds(allCoordinates);
            const center = bounds.getCenter();
            const radius = bounds.getNorthEast().distanceTo(center);

            if (circle) {
                map.removeLayer(circle);
            }

            circle = L.circle(center, {
                radius: radius,
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5
            }).addTo(map);

            circle.bindTooltip(coordinates.length.toString(), { permanent: true, direction: 'center' }).openTooltip();

            circle.on('click', function() {
                displayTracks();
            });
        }

        function displayTracks() {
            polylines.forEach(polyline => map.removeLayer(polyline));
            polylines = [];

            coordinates.forEach(trackCoordinates => {
                const polyline = L.polyline(trackCoordinates, { color: 'blue' }).addTo(map);
                polylines.push(polyline);
            });

            const allCoordinates = [].concat(...coordinates);
            const bounds = L.latLngBounds(allCoordinates);
            map.fitBounds(bounds);
        }

        map.on('moveend', function() {
            const center = map.getCenter();
            const zoom = map.getZoom();
            console.log(`Zoom: ${zoom}, Coordinates: ${center.lat}, ${center.lng}`);
        });

        map.on('zoomend', function() {
            const center = map.getCenter();
            const zoom = map.getZoom();
            console.log(`Zoom: ${zoom}, Coordinates: ${center.lat}, ${center.lng}`);
        });