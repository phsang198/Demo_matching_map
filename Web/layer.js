// Xử lý event từ WebSocket
async function processEvent() {
    eventData = JSON.parse(localStorage.getItem('data'));
    console.log('[Process] Received event:', eventData);
    
    if (!eventData.data) {
        console.warn('[Process] No data in event');
        return;
    }
    
    let func = [];
    func = eventData.data.func;
    if (func.includes('draw')) {
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
        
        // Lấy categoryids từ layers
        const categoryIds = layers
            .map(layer => layerCategories[layer])
            .filter(id => id)
            .join(',');
        
        if (!categoryIds) {
            console.warn('[Process] No valid category IDs for layers:', layers);
            return;
        }
        
        // Lấy bounds hiện tại của map
        const bounds = map.getBounds();
        const minlat = bounds.getSouth();
        const maxlat = bounds.getNorth();
        const minlon = bounds.getWest();
        const maxlon = bounds.getEast();
        
        // Build API URL
        // const apiUrl = `http://10.222.3.84:18080/indoors/v1/poi/outdoorpoi?categoryid=${categoryIds}&minlon=${minlon}&minlat=${minlat}&maxlon=${maxlon}&maxlat=${maxlat}`;
        const apiUrl = `http://10.222.3.84:18080/indoors/v1/poi/outdoorpoi?categoryid=${categoryIds}&minlon=106.600780604012712&minlat=10.879530389315462&maxlon=106.834583399422868&maxlat=10.741266173198298`;
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
                drawPOIs(result.data.pois, instanceid, layers);

            } else {
                console.warn('[Process] Invalid response format');
            }
            
        } catch (error) {
            console.error('[Process] Error fetching POIs:', error);
        }
    }
    if (func.includes('fire')) {
        // Xử lý sự kiện cho layer "fire"
        let fireCoord = eventData.data.event;
        zoomToCoord(fireCoord.lon, fireCoord.lat,eventData.data.zoomlevel);
    }
    if (func.includes('hydrant')) {
        // Xử lý sự kiện cho layer "hydrant"
        let hydrantCoord = eventData.data.event;
        zoomToCoord(hydrantCoord.lon, hydrantCoord.lat,eventData.data.zoomlevel, "Nearest Fire Hydrant");
    }
    // kiểm tra nếu có key path thì vẽ line
    if ("path" in eventData.data) {
        drawRouteLine(eventData.data.path);
    }

}

// Vẽ POIs lên bản đồ
function drawPOIs(pois, instanceId, layers) {
    console.log(`[Draw POIs] Drawing ${pois.length} points for instance ${instanceId}`);
    
    // Icon cho từng loại layer
    const layerIcons = {
        'fire': '🧯',
        'camera': '📸',
        'default': '📍'
    };
    
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
        const marker = L.marker([latitude, longitude], { icon: icon }).addTo(map);
        
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
        
            // // Lưu marker vào instance (nếu cần)
            // const instance = instances.find(i => i.id === instanceId);
            // if (instance) {
            //     if (!instance.poiMarkers) {
            //         instance.poiMarkers = [];
            //     }
            //     instance.poiMarkers.push(marker);
            // }
    });
    
    console.log(`[Draw POIs] Done drawing ${pois.length} points`);
}

processEvent();