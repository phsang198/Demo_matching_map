// Xử lý event từ WebSocket
const mixedLayer = L.featureGroup();
// const map = L.map('map').setView([10.76, 106.66], 13);
const vbd = L.tileLayer('http://images.vietbando.com/ImageLoader/GetImage.ashx?Ver=2016&LayerIds=VBD&Level={z}&X={x}&Y={y}');
const API_WORKFLOW_URL = 'http://10.222.3.84:5012/api/v2/workflow/instance/{id}/invoke/await';
// Danh sách quản lý lớp đang có
const layerMap = new Map();

// Load dữ liệu tracking
async function invokeData(event) {
    const instanceId = localStorage.getItem('instanceId');
    let distanceInput = parseInt(document.getElementById('distanceInput').value);

    document.querySelector('.controls2').style.display = 'none';
    // Validation
    if (!distanceInput) {
        showStatus('Vui lòng nhập khoảng cách!', 'error');
        return;
    }

    if (event === "finish") distanceInput = 0;

    try {

        let apiUrl = API_WORKFLOW_URL;

        apiUrl = apiUrl.replace('{id}', instanceId);

        console.log('Fetching:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '801bd483-42b5-4388-8323-a986bfcfbb37'
            },
            body: JSON.stringify([{
                "id": "update",
                "processid": "Process_1",
                "index": 0,
                "formName": "",
                "assigneeType": "unknow",
                "assigneeName": "unknow",
                "form": null,
                "InvokeData": {
                    "distance": distanceInput
                }
            }])
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

    } catch (error) {
        console.error('Error loading tracking data:', error);
        showStatus('Lỗi khi tải dữ liệu: ' + error.message, 'error');
    }
}

async function processEvent(eventData) {
    console.log('[Process] Received event:', eventData);

    if (!eventData.data) {
        console.warn('[Process] No data in event');
        return;
    }

    if (eventData.data.layers != undefined && eventData.data.layers.length > 0) {
        const { instanceid, layers, view } = eventData.data;

        if (!layers || layers.length === 0) {
            console.warn('[Process] No layers in event');
            return;
        }

        // Map layer names to categoryid
        const layerCategories = {
            'fire': '8472aa54-4f43-44ab-87e2-f3108085cff7',
            'camera': 'b15ab62e-d6b4-42a1-b2b4-7d04419bbcf7'
        };

        for (const layer_name of layers) {

            const apiUrl = `http://10.222.3.84:18080/indoors/v1/poi/outdoorpoi?categoryid=${layerCategories[layer_name]}&minlon=106.600780604012712&minlat=10.879530389315462&maxlon=106.834583399422868&maxlat=10.741266173198298`;
            console.log('[Process] Fetching POIs:', apiUrl);

            const headers = new Headers();
            headers.append('content-type', 'application/json');
            headers.append('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IjEyNTY1NDYyIn0.eyJhdXRob3JpemF0aW9uIjoiW3tcImlkXCI6XCIwODY4MWJjOC1jODkwLTRkOGMtYTk1Mi1hNDlmNGJiYzUzZjBcIixcInJvbGVpZFwiOlwiNjA2MTI2NDMtY2I4Yy00ZmM2LWFjZDYtM2YzMDE5ZmFmNDUxXCIsXCJ1c2VyaWRcIjpcIjA4ODI4MGE0LWYxOTYtNDY0Zi04YjAwLTg2OTEzOWQxMzM5MlwifSx7XCJpZFwiOlwiZGI1MjhhNjMtNGQxNS00YzM5LTg3OWEtNGRmZGYzYjVhN2RmXCIsXCJyb2xlaWRcIjpcImZkNjQ1YjFkLWYzYTMtNDRlMy1hNTU1LTJjYTljNDk4YzQ3NlwiLFwidXNlcmlkXCI6XCIwODgyODBhNC1mMTk2LTQ2NGYtOGIwMC04NjkxMzlkMTMzOTJcIn1dIiwiZXhwIjoxODEyNDAwMTA0LjI4MDkzMywiaWF0IjoxNzYyNDAwMTA0LjI4MDkzMywiaXNzIjoidmJkd2YiLCJuYmYiOjE3NjI0MDAxMDQuMjgwOTMzLCJwcm9kdWN0aWQiOiIyZmVlMmUzZi1mZTg3LTQ0MjktODUzMS1iNThiYzI2NjBmMGEiLCJzdWIiOiIwODgyODBhNC1mMTk2LTQ2NGYtOGIwMC04NjkxMzlkMTMzOTIifQ.WBjgFciXD-E1LuE0sGZEkfDVkCt-Euiv13Qc6b1znw4');


            try {
                const response = await fetch(apiUrl, { headers });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                console.log('[Process] POI Response:', result);

                if (result.code === 200 && result.data && result.data.pois) {
                    drawPOIs(layer_name, result.data.pois, instanceid, layers);

                } else {
                    console.warn('[Process] Invalid response format');
                }

            } catch (error) {
                console.error('[Process] Error fetching POIs:', error);
            }
        }
    }

    let func = [];
    func = eventData.data.func;
    if (!layerMap.has('Route')) {
        addDynamicLayer('Route', mixedLayer, 'Route');
    }
    if (func.includes('fire')) {
        // Xử lý sự kiện cho layer "fire"
        let fireCoord = eventData.data.event;
        zoomToCoord(fireCoord.lon, fireCoord.lat, eventData.data.zoomlevel);
        // Thêm marker vào bản đồ
        const marker = L.marker([fireCoord.lat, fireCoord.lon], { icon: redIcon })
            .bindPopup(`<div class="marker-popup"><strong>Event Occuring</strong></div>`)
            .openPopup();
        mixedLayer.addLayer(marker);
    }
    if (func.includes('hydrant')) {
        // Xử lý sự kiện cho layer "hydrant"
        let hydrantCoord = eventData.data.event;
        zoomToCoord(hydrantCoord.lon, hydrantCoord.lat, eventData.data.zoomlevel);
        // Thêm marker vào bản đồ
        const marker = L.marker([hydrantCoord.lat, hydrantCoord.lon], { icon: blueIcon })
            .bindPopup(`<div class="marker-popup"><strong>Nearest Fire Hydrant</strong></div>`)
            .openPopup();
        mixedLayer.addLayer(marker);
    }
    // kiểm tra nếu có key path thì vẽ line
    if ("path" in eventData.data) {
        let pathLine = drawRouteLine(eventData.data.path);
        mixedLayer.addLayer(pathLine);
    }
    if ("lst_nearest" in eventData.data) {
        let lst_nearest = eventData.data.lst_nearest;
        lst_nearest.forEach((point, i) => {
            const marker = L.marker([point[1], point[0]], { icon: greenIcon })
                .bindPopup(`<div class="marker-popup"><strong>Nearest ${i + 1}</strong></div>`)
                .openPopup();
            mixedLayer.addLayer(marker);
        });
    }
    if (func.includes('alert')) {
        let message = eventData.data.msg;
        console.log('[Alert] Message:', message);
        Swal.fire({
            icon: 'info',
            title: 'Thông báo',
            text: message,
            confirmButtonText: 'OK'
        });
        // hiện controls2
        localStorage.setItem('instanceId', eventData.data.instanceid);
        if (!eventData.data.finish) document.querySelector('.controls2').style.display = 'block';
    }

}
// Vẽ POIs lên bản đồ
function drawPOIs(layerName, pois, instanceId, layers) {
    console.log(`[Draw POIs] Drawing ${pois.length} points for instance ${instanceId}`);

    console.log('layerMap:', layerMap);
    if (layerMap.has(layerName)) { return; } // nếu đã có lớp thì không thêm nữa
    // Icon cho từng loại layer
    const layerIcons = {
        'fire': '<img src="fire-hydrant.png" style="width:24px;height:24px;">',
        'camera': '<img src="security-camera.png" style="width:24px;height:24px;">',
        'default': '📍'
    };
    const layerGroup = [];
    pois.forEach(poi => {
        const { general, particular } = poi;
        const { latitude, longitude, name, categoryid } = general;

        // Xác định layer type
        const layerType = layers.find(layer => {
            const layerCategories = {
                'fire': '8472aa54-4f43-44ab-87e2-f3108085cff7',
                'camera': 'b15ab62e-d6b4-42a1-b2b4-7d04419bbcf7'
            };
            return layerCategories[layer] === categoryid;
        }) || 'default';

        // Tạo custom icon
        const icon = L.divIcon({
            html: `<div style="font-size: 24px;">${layerIcons[layerType] || layerIcons.default}</div>`,
            className: 'poi-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Tạo marker
        const marker = L.marker([latitude, longitude], { icon: icon })

        // Popup content
        const popupContent = `
            <div class="marker-popup">
                <strong>${layerIcons[layerType]} ${name}</strong><br>
                <small>Layer: ${layerType}</small><br>
                ${general.address ? `📍 ${general.address}<br>` : ''}
                ${particular.type ? `Type: ${particular.type}<br>` : ''}
                ${particular.status ? `Status: ${particular.status}<br>` : ''}
                ${particular.amenity ? `Amenity: ${particular.amenity}<br>` : ''}
                <hr style="margin: 5px 0;">
                <small>Lat: ${latitude.toFixed(6)}<br>Lon: ${longitude.toFixed(6)}</small>
            </div>
        `;

        marker.bindPopup(popupContent);

        // thêm marker vào nhóm layer tương ứng
        layerGroup.push(marker);

    });
    let layer = L.layerGroup(layerGroup);
    addDynamicLayer(layerName, layer, layerName);

    console.log(`[Draw POIs] Done drawing ${pois.length} points`);
}

function addDynamicLayer(id, layer, displayName) {
    layerMap.set(id, layer);
    map.addLayer(layer); // mặc định bật

    const list = document.getElementById('layer-list');
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" id="chk-${id}" checked> ${displayName}`;
    list.appendChild(label);

    document.getElementById(`chk-${id}`).addEventListener('change', e => {
        e.target.checked ? map.addLayer(layer) : map.removeLayer(layer);
    });
}

const hcmMarker = L.marker([10.810711652959442, 106.66883361367069], { icon: redIcon })
    .bindPopup('<div class="marker-popup" style="color: red;"><strong>TP. Hồ Chí Minh</strong> Thành phố lớn nhất Việt Nam</div>');

addDynamicLayer('osm', osm, 'OpenStreetMap');
addDynamicLayer('vbd', vbd, 'Vietbando');
addDynamicLayer('hcmMarker', hcmMarker, 'Cty');

let data = localStorage.getItem('data');
if (data) {
    data = JSON.parse(data);
    processEvent(data);
}