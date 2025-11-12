let savedPoints = [];
let currentContextLatLng = null;
let markerCount = 0;
window.pathline = null;

const map = L.map('map', { contextmenu: false })
    .setView([10.810711652959442, 106.66883361367069], 18);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    minZoom: 3
}).addTo(map);

const searchNearbyMarkers = L.layerGroup().addTo(map);
window.searchNearbyMarkers = searchNearbyMarkers;

var redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
var blueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
var greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.control.scale({ imperial: false, metric: true }).addTo(map);

map.on('mousemove', function (e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    const el = document.getElementById('coordinateDisplay');
    if (el) el.textContent = `Lat: ${lat}, Lon: ${lng}`;
});

map.on('contextmenu', function (e) {
    e.originalEvent.preventDefault();
    currentContextLatLng = e.latlng;

    const contextMenu = document.getElementById('contextMenu');
    const current_lat = e.latlng.lat.toFixed(6);
    const current_lon = e.latlng.lng.toFixed(6);

    const latEl = document.getElementById("current_lat");
    const lonEl = document.getElementById("current_lon");
    if (latEl) latEl.value = current_lat;
    if (lonEl) lonEl.value = current_lon;

    searchNearbyMarkers.clearLayers();
    L.marker(e.latlng, { icon: redIcon }).addTo(searchNearbyMarkers);

    if (contextMenu) {
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.originalEvent.pageX + 'px';
        contextMenu.style.top = e.originalEvent.pageY + 'px';
    }

    if (isNaN(current_lat) || isNaN(current_lon)) {
        alert("Thiếu toạ độ! Bạn chưa click vào bản đồ.");
        return;
    }
});

function closeContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) contextMenu.style.display = 'none';
    currentContextLatLng = null;
}

function onClickFindSearchNearby() {
    const current_lat = parseFloat(document.getElementById("current_lat").value);
    const current_lon = parseFloat(document.getElementById("current_lon").value);
    const distance = parseFloat(document.getElementById("distance").value);
    const duration = parseFloat(document.getElementById("duration").value);
    const number = parseInt(document.getElementById("number").value, 10);
    const categorySelect = document.querySelector("#contextMenu select");
    const categoryid = categorySelect ? categorySelect.value : "";

    const payload = { current_lat, current_lon, distance, duration, number, categoryid };

    searchNearby(payload)
        .then((data) => {
            if (data && data.data) {
                setSearchResultsFromAPI(data);
            } else {
                alert("Không có kết quả từ API tìm kiếm gần đây.");
            }
        })
        .catch((error) => {
            console.error("❌ Lỗi khi tìm kiếm gần đây:", error);
        })
        .finally(() => closeContextMenu());
}

function searchNearby(params) {
    const url = "http://10.222.3.84:18080/indoors/v1/route/findPoisAround";

    const cleanedParams = {
        current_lon: Number(params.current_lon),
        current_lat: Number(params.current_lat),
        distance: Number(params.distance),
        duration: Number(params.duration),
        number: Number(params.number),
        categoryid: params.categoryid,
    };

    const queryString = new URLSearchParams(cleanedParams).toString();
    const fullUrl = `${url}?${queryString}`;

    return fetch(fullUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IjEyNTY1NDYyIn0.eyJhdXRob3JpemF0aW9uIjoiW3tcImlkXCI6XCIwODY4MWJjOC1jODkwLTRkOGMtYTk1Mi1hNDlmNGJiYzUzZjBcIixcInJvbGVpZFwiOlwiNjA2MTI2NDMtY2I4Yy00ZmM2LWFjZDYtM2YzMDE5ZmFmNDUxXCIsXCJ1c2VyaWRcIjpcIjA4ODI4MGE0LWYxOTYtNDY0Zi04YjAwLTg2OTEzOWQxMzM5MlwifSx7XCJpZFwiOlwiZGI1MjhhNjMtNGQxNS00YzM5LTg3OWEtNGRmZGYzYjVhN2RmXCIsXCJyb2xlaWRcIjpcImZkNjQ1YjFkLWYzYTMtNDRlMy1hNTU1LTJjYTljNDk4YzQ3NlwiLFwidXNlcmlkXCI6XCIwODgyODBhNC1mMTk2LTQ2NGYtOGIwMC04NjkxMzlkMTMzOTJcIn1dIiwiZXhwIjoxODEyNDAwMTA0LjI4MDkzMywiaWF0IjoxNzYyNDAwMTA0LjI4MDkzMywiaXNzIjoidmJkd2YiLCJuYmYiOjE3NjI0MDAxMDQuMjgwOTMzLCJwcm9kdWN0aWQiOiIyZmVlMmUzZi1mZTg3LTQ0MjktODUzMS1iNThiYzI2NjBmMGEiLCJzdWIiOiIwODgyODBhNC1mMTk2LTQ2NGYtOGIwMC04NjkxMzlkMTMzOTIifQ.WBjgFciXD-E1LuE0sGZEkfDVkCt-Euiv13Qc6b1znw4",
        },
    }).then(r => r.json());
}

document.addEventListener('click', function (e) {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu && !contextMenu.contains(e.target)) {
        closeContextMenu();
    }
});

function distanceInMeters(p1, p2) {
    const R = 6371000;
    const lat1 = p1[0] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLng = (p2[1] - p1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function clearArrowMarkersInMixedLayer() {
    if (typeof mixedLayer === 'undefined' || !mixedLayer?.eachLayer) return;

    const toRemove = [];
    mixedLayer.eachLayer(l => {
        if (l instanceof L.Marker) {
            const icon = l.options?.icon;
            if (icon && icon.options?.className === 'arrow-icon') {
                toRemove.push(l);
            }
        }
    });
    toRemove.forEach(l => mixedLayer.removeLayer(l));
}

function drawRouteLine(array) {
    if (window.pathline && map.hasLayer(window.pathline)) {
        map.removeLayer(window.pathline);
        window.pathline = null;
    }
    clearArrowMarkersInMixedLayer();

    console.log("Drawing route line with points:", array);
    if (array.length >= 2) {
        const latlngs = array.map(point => [point[0], point[1]]);
        pathline = L.polyline(latlngs, {
            color: '#750ec9ff',
            weight: 3,
            opacity: 0.7,
            smoothFactor: 1
        }).addTo(map);

        if (typeof mixedLayer !== 'undefined' && mixedLayer?.addLayer) {
            for (let i = 1; i < latlngs.length - 1; i++) {
                const start = latlngs[i - 1];
                const end = latlngs[i + 1];
                const dist = distanceInMeters(start, end);
                if (dist < 50) continue;
                const angle = Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI;

                const arrowIcon = L.divIcon({
                    html: `<div style="transform: rotate(${-angle}deg); color: #750ec9ff;">➤</div>`,
                    className: 'arrow-icon',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                const marker = L.marker(start, { icon: arrowIcon });
                mixedLayer.addLayer(marker);
            }
        }
        return pathline;
    }
}

map.on('zoomend', function () {
    const el = document.getElementById('zoom-level');
    if (el) el.textContent = map.getZoom();
});

function zoomIn() { map.zoomIn(); }
function zoomOut() { map.zoomOut(); }
function goToHCM() { map.flyTo([10.810711652959442, 106.66883361367069], 18, { duration: 2 }); }
function goToHanoi() { map.flyTo([21.0285, 105.8542], 18, { duration: 2 }); }
function zoomToCoord(lon, lat, zoomLevel) { map.flyTo([lat, lon], zoomLevel, { duration: 1 }); }
function addMarker() {
    const center = map.getCenter();
    markerCount++;
    L.marker(center).addTo(map)
        .bindPopup(`<div class="marker-popup"><strong>Marker #${markerCount}</strong>Vị trí hiện tại trên bản đồ</div>`)
        .openPopup();
}

console.log('🗺️ Bản đồ OpenStreetMap đã sẵn sàng!');
console.log('📍 Click chuột phải để thêm điểm đến');

const resultsMarkers = L.layerGroup().addTo(map);
const routesLayer = L.layerGroup().addTo(map);

let lastResults = null;
let activeIndex = -1;
let sourceLatLng = null;
let resultBounds = null;

const fmtDist = (m) => (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m');
const fmtDur = (s) => (s < 60 ? Math.round(s) + ' s' : Math.round(s / 60) + ' min');

const getSourceLatLng = (data) => {
    if (!data?.sources?.length) return null;
    const [lon, lat] = data.sources[0].location;
    return L.latLng(lat, lon);
};

async function drawRouteFromTo(srcLatLng, dstLatLng) {
    routesLayer.clearLayers();

    if (typeof drawRouteLine === 'function') {
        drawRouteLine([[srcLatLng.lat, srcLatLng.lng], [dstLatLng.lat, dstLatLng.lng]]);
    } else {
        L.polyline([srcLatLng, dstLatLng], { weight: 5, opacity: 0.85 }).addTo(routesLayer);
    }

    const bounds = L.latLngBounds([srcLatLng, dstLatLng]);
    map.fitBounds(bounds, { padding: [24, 24] });
}

function highlightItem(idx) {
    const list = document.querySelectorAll('.result-item');
    list.forEach((el, i) => el.classList.toggle('active', i === idx));
}

function clearRoutes() {
    routesLayer.clearLayers();
    if (window.pathline) { try { map.removeLayer(window.pathline); } catch (e) { } window.pathline = null; }
    activeIndex = -1;
    highlightItem(-1);
}

function renderResults(data) {
    lastResults = data;
    sourceLatLng = getSourceLatLng(data);

    const panel = document.getElementById('resultsPanel');
    const listEl = document.getElementById('resultsList');
    if (!panel || !listEl) {
        console.warn('⚠️ Thiếu phần tử panel kết quả (#resultsPanel/#resultsList) trong HTML.');
        return;
    }

    listEl.innerHTML = '';
    resultsMarkers.clearLayers();
    resultBounds = L.latLngBounds([]);

    if (!data?.destinations?.length) {
        panel.style.display = 'none';
        return;
    }
    panel.style.display = 'flex';

    data.destinations.forEach((dst, i) => {
        const [lon, lat] = dst.location;
        const dist = data.distances?.[i];
        const dur = data.durations?.[i];

        const m = L.marker([lat, lon]).addTo(resultsMarkers);
        m.bindPopup(`<div class="marker-popup"><strong>${dst.name || 'Điểm ' + (i + 1)}</strong><div>${dst.address || ''}</div></div>`);

        resultBounds.extend([lat, lon]);
        if (sourceLatLng) resultBounds.extend(sourceLatLng);

        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
        <div class="result-main">
            <div class="result-name">${dst.name || '(không tên)'}</div>
            <div class="result-address" title="${dst.address || ''}">${dst.address || ''}</div>
            <div class="result-meta">
            ${dist != null ? `<span class="chip">📏 ${fmtDist(dist)}</span>` : ''}
            ${dur != null ? `<span class="chip">⏱ ${fmtDur(dur)}</span>` : ''}
            </div>
        </div>
        <div class="result-actions">
            <button class="btn-mini" data-action="fly">Fly</button>
            <button class="btn-mini" data-action="route">Route</button>
        </div>
        `;

        item.addEventListener('click', async (e) => {
            if (e.target instanceof HTMLButtonElement) return;
            activeIndex = i;
            highlightItem(i);

            const src = sourceLatLng ?? map.getCenter();
            const dst = L.latLng(lat, lon);

            try {
                const pathLatLngs = await findPath(src, dst);
                if (pathLatLngs && pathLatLngs.length >= 2) {
                    const line = drawRouteLine(pathLatLngs);

                    if (line && line.getBounds) {
                        map.fitBounds(line.getBounds(), { padding: [24, 24] });
                    } else {
                        map.fitBounds(L.latLngBounds(pathLatLngs), { padding: [24, 24] });
                    }
                } else {
                    console.warn("Không nhận được path hợp lệ từ API.");
                }
            } catch (err) {
                console.error("findPath lỗi:", err);
            }
        });

        item.querySelector('[data-action="fly"]').addEventListener('click', (e) => {
            e.stopPropagation();
            map.flyTo([lat, lon], 17, { duration: 0.6 });
            m.openPopup();
        });
        item.querySelector('[data-action="route"]').addEventListener('click', async (e) => {
            e.stopPropagation();
            activeIndex = i;
            highlightItem(i);

            const src = sourceLatLng ?? map.getCenter();
            const dst = L.latLng(lat, lon);

            try {
                const pathLatLngs = await findPath(src, dst);

                if (window.pathline && map.hasLayer(window.pathline)) {
                    map.removeLayer(window.pathline);
                    window.pathline = null;
                }

                if (pathLatLngs && pathLatLngs.length >= 2) {
                    const line = drawRouteLine(pathLatLngs);

                    window.pathline = line;

                    if (line && line.getBounds) {
                        map.fitBounds(line.getBounds(), { padding: [24, 24] });
                    } else {
                        map.fitBounds(L.latLngBounds(pathLatLngs), { padding: [24, 24] });
                    }
                } else {
                    console.warn("Không nhận được path hợp lệ từ API.");
                }
            } catch (err) {
                console.error("findPath lỗi:", err);
            }
        });

        listEl.appendChild(item);
    });
}

async function findPath(srcLatLng, dstLatLng, opts = {}) {
    const baseUrl = "http://10.222.3.84:18080/indoors/v1/route/getOneRoute";
    const params = {
        type: "out-out",
        id: "null",
        startpoint: `${srcLatLng.lng},${srcLatLng.lat}`,
        endpoint: `${dstLatLng.lng},${dstLatLng.lat}`,
        engine: "osrm",
        vehicle: "taxi",
        step: "true",
        ...opts
    };
    const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IjEyNTY1NDYyIn0.eyJhdXRob3JpemF0aW9uIjoiW3tcImlkXCI6XCIwODY4MWJjOC1jODkwLTRkOGMtYTk1Mi1hNDlmNGJiYzUzZjBcIixcInJvbGVpZFwiOlwiNjA2MTI2NDMtY2I4Yy00ZmM2LWFjZDYtM2YzMDE5ZmFmNDUxXCIsXCJ1c2VyaWRcIjpcIjA4ODI4MGE0LWYxOTYtNDY0Zi04YjAwLTg2OTEzOWQxMzM5MlwifSx7XCJpZFwiOlwiZGI1MjhhNjMtNGQxNS00YzM5LTg3OWEtNGRmZGYzYjVhN2RmXCIsXCJyb2xlaWRcIjpcImZkNjQ1YjFkLWYzYTMtNDRlMy1hNTU1LTJjYTljNDk4YzQ3NlwiLFwidXNlcmlkXCI6XCIwODgyODBhNC1mMTk2LTQ2NGYtOGIwMC04NjkxMzlkMTMzOTJcIn1dIiwiZXhwIjoxODEyNDAwMTA0LjI4MDkzMywiaWF0IjoxNzYyNDAwMTA0LjI4MDkzMywiaXNzIjoidmJkd2YiLCJuYmYiOjE3NjI0MDAxMDQuMjgwOTMzLCJwcm9kdWN0aWQiOiIyZmVlMmUzZi1mZTg3LTQ0MjktODUzMS1iNThiYzI2NjBmMGEiLCJzdWIiOiIwODgyODBhNC1mMTk2LTQ2NGYtOGIwMC04NjkxMzlkMTMzOTIifQ.WBjgFciXD-E1LuE0sGZEkfDVkCt-Euiv13Qc6b1znw4"
        }
    });

    const json = await res.json();
    const segments = json?.data?.route?.paths || [];
    if (!Array.isArray(segments) || segments.length === 0) return null;

    const latlngs = [];
    for (const seg of segments) {
        const geom = Array.isArray(seg?.geometry) ? seg.geometry : [];
        for (let k = 0; k < geom.length; k++) {
            const [lon, lat] = geom[k];
            const last = latlngs[latlngs.length - 1];
            if (!last || last[0] !== lat || last[1] !== lon) {
                latlngs.push([lat, lon]);
            }
        }
    }
    return latlngs.length >= 2 ? latlngs : null;
}

function setSearchResultsFromAPI(apiJson) {
    if (apiJson?.data) renderResults(apiJson.data);
}
window.setSearchResultsFromAPI = setSearchResultsFromAPI;

const btnClearRoutes = document.getElementById('btnClearRoutes');
if (btnClearRoutes) btnClearRoutes.addEventListener('click', clearRoutes);

const btnFitAll = document.getElementById('btnFitAll');
if (btnFitAll) btnFitAll.addEventListener('click', () => {
    if (resultBounds && resultBounds.isValid()) map.fitBounds(resultBounds, { padding: [24, 24] });
});