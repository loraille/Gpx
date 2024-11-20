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
