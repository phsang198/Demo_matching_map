// Thêm biến để lưu tracking data
let vehicleMap = new Map();
let trackingPolyline = null;
let trackingMarkers = [];
// Thêm biến để quản lý instances
let instanceMap = new Map();
let activeInstanceId = null;
let filterLevel = 50;
let instanceCounter = 0;
// API Configuration
const API_BASE_URL = 'http://10.222.3.84:18083/api/v2';
const API_WORKFLOW_URL = 'http://10.222.3.84:5012/api/v2/workflow/instance/{id}/invoke/await';

// Khởi tạo giá trị thời gian mặc định (24h gần nhất)
function initializeDateTime() {
    const now = new Date();
    const endTime = new Date(now);
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h trước
    
    // Format datetime-local
    document.getElementById('endTime').value = formatDateTimeLocal(endTime);
    document.getElementById('startTime').value = formatDateTimeLocal(startTime);
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Load danh sách vehicle từ API
async function loadVehicleList() {
    try {
        console.log('Đang tải danh sách phương tiện...');
        
        const response = await fetch(`${API_BASE_URL}/tracking/device/info?options=all`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const vehicleList = data.data.devices || [];
        
        // Populate combobox
        const select = document.getElementById('vehicleSelect');
        select.innerHTML = '<option value="">-- Chọn phương tiện --</option>';

        let count = 0;
        if (Array.isArray(vehicleList) && vehicleList.length > 0) {
            for (const vehicle of vehicleList) {
                count++;
                const option = document.createElement('option');
                option.value = vehicle[0];
                option.textContent = vehicle[1];
                select.appendChild(option);
                vehicleMap.set(vehicle[1], vehicle[0]);
                if (count >= 50) {
                    break; // Giới hạn 50 phương tiện hiển thị
                }
            }

            showStatus(`Đã tải ${vehicleList.length} phương tiện`, 'success');
        } else {
            console.log('Không tìm thấy phương tiện nào');
        }

        console.log('Vehicle list loaded:', vehicleList);
        
    } catch (error) {
        console.error('Error loading vehicle list:', error);
        showStatus('Lỗi khi tải danh sách: ' + error.message, 'error');
        
        // Fallback: Thêm option test
        const select = document.getElementById('vehicleSelect');
        select.innerHTML = `
            <option value="">-- Chọn phương tiện --</option>
            <option value="test1">Test Vehicle 1</option>
            <option value="test2">Test Vehicle 2</option>
        `;
    }
}

// Load dữ liệu tracking
async function loadTrackingData() {
    const vehicleId = document.getElementById('vehicleSelect').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const filterLevel = parseInt(document.getElementById('filterSlider').value);
    
    // choose active value in select

    // Validation
    if (!vehicleId) {
        showStatus('Vui lòng chọn phương tiện!', 'error');
        return;
    }
    
    if (!startTime || !endTime) {
        showStatus('Vui lòng nhập đầy đủ thời gian!', 'error');
        return;
    }
    
    if (new Date(startTime) >= new Date(endTime)) {
        showStatus('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!', 'error');
        return;
    }
    
    try {
        showStatus('Đang tải dữ liệu tracking...', 'info');
        
        // Chuyển đổi thời gian sang timestamp
        const startTimestamp = new Date(startTime).getTime();
        const endTimestamp = new Date(endTime).getTime();
        // TODO: Thay đổi URL API theo endpoint thực tế của bạn
        let apiUrl = API_WORKFLOW_URL;

        apiUrl = apiUrl.replace('{id}', activeInstanceId);
        
        console.log('Fetching:', apiUrl);

        const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': '801bd483-42b5-4388-8323-a986bfcfbb37'
                },
                body: JSON.stringify([{
                    "id": "user",
                    "processid": "Process_1",
                    "index": 0,
                    "formName": "",
                    "assigneeType": "unknow",
                    "assigneeName": "unknow",
                    "form": null,
                    "InvokeData": {
                        "vehicleId": vehicleId,
                        "startTime": 1743917988537684,
                        "endTime": 1743921588537684,
                        "filterLevel": filterLevel
                    }
                }])
            });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        document.querySelector('.btn-load').disabled = true;
        // // Giả lập dữ liệu để test (xóa phần này khi có API thật)
        // const mockData = [
        //     [10.845224936734395, 106.82555349008709, -127, 15, 1743917789964769],
        //     [10.844955045473729, 106.82519741446447, -126, 15, 1743917799875208],
        //     [10.844685154213063, 106.82484133884185, -125, 15, 1743917809785647],
        //     [10.844415262952397, 106.82448526321923, -124, 15, 1743917819696086]
        // ];
        
        
        // const data = mockData; // Xóa dòng này khi có API thật
        
        // if (data && data.length > 0) {
        //     drawTrackingRoute(data);
        //     showTrackingInfo(data, vehicleId);
        //     showStatus(`Đã tải ${data.length} điểm tracking`, 'success');
        // } else {
        //     showStatus('Không có dữ liệu tracking trong khoảng thời gian này', 'info');
        // }
        
    } catch (error) {
        console.error('Error loading tracking data:', error);
        showStatus('Lỗi khi tải dữ liệu: ' + error.message, 'error');
    }
}

// Vẽ route tracking lên bản đồ
function drawTrackingRoute(data) {
    // Xóa route cũ nếu có
    clearTrackingRoute();
    
    // Chuyển đổi dữ liệu sang format [lat, lng]
    const latlngs = data.map(point => [point[0], point[1]]);
    
    // Vẽ polyline
    trackingPolyline = L.polyline(latlngs, {
        color: '#FF5722',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(map);
    
    // Thêm marker cho điểm đầu và điểm cuối
    const startPoint = data[0];
    const endPoint = data[data.length - 1];
    
    // Marker điểm bắt đầu (màu xanh)
    const startMarker = L.circleMarker([startPoint[0], startPoint[1]], {
        radius: 8,
        fillColor: '#4CAF50',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    startMarker.bindPopup('<strong>Điểm bắt đầu</strong><br>' + formatTimestamp(startPoint[4]));
    trackingMarkers.push(startMarker);
    
    // Marker điểm kết thúc (màu đỏ)
    const endMarker = L.circleMarker([endPoint[0], endPoint[1]], {
        radius: 8,
        fillColor: '#f44336',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    endMarker.bindPopup('<strong>Điểm kết thúc</strong><br>' + formatTimestamp(endPoint[4]));
    trackingMarkers.push(endMarker);
    
    // Zoom đến route
    map.fitBounds(trackingPolyline.getBounds(), { padding: [50, 50] });
}

// Xóa tracking route
function clearTrackingRoute() {
    if (trackingPolyline) {
        map.removeLayer(trackingPolyline);
        trackingPolyline = null;
    }
    
    trackingMarkers.forEach(marker => map.removeLayer(marker));
    trackingMarkers = [];
}

// Hiển thị thông tin tracking
function showTrackingInfo(data, vehicleId) {
    const info = document.getElementById('trackingInfo');
    const details = document.getElementById('trackingDetails');
    
    const startPoint = data[0];
    const endPoint = data[data.length - 1];
    const totalDistance = calculateTotalDistance(data);
    const duration = (endPoint[4] - startPoint[4]) / 1000 / 60; // minutes
    
    details.innerHTML = `
        • Phương tiện: <strong>${vehicleId}</strong><br>
        • Số điểm: <strong>${data.length}</strong><br>
        • Khoảng cách: <strong>${totalDistance.toFixed(2)} km</strong><br>
        • Thời gian: <strong>${duration.toFixed(0)} phút</strong><br>
        • Bắt đầu: ${formatTimestamp(startPoint[4])}<br>
        • Kết thúc: ${formatTimestamp(endPoint[4])}
    `;
    
    info.style.display = 'block';
}

// Tính tổng khoảng cách
function calculateTotalDistance(data) {
    let total = 0;
    for (let i = 1; i < data.length; i++) {
        const lat1 = data[i - 1][0];
        const lng1 = data[i - 1][1];
        const lat2 = data[i][0];
        const lng2 = data[i][1];
        
        total += getDistanceFromLatLng(lat1, lng1, lat2, lng2);
    }
    return total;
}

// Tính khoảng cách giữa 2 điểm (Haversine formula)
function getDistanceFromLatLng(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLng = deg2rad(lng2 - lng1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp / 1000); // Chia 1000 nếu timestamp là microseconds
    return date.toLocaleString('vi-VN');
}

// Hiển thị status message
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}


// Cập nhật giá trị filter slider
function updateFilterValue(value) {
    filterLevel = parseInt(value);
    document.getElementById('filterValue').textContent = value;
    
    // Nếu có instance đang active, cập nhật giá trị filter của nó
    if (activeInstanceId) {
        const instance = instanceMap.get(activeInstanceId);
        if (instance) {
            instance.filterLevel = filterLevel;
            updateInstanceList();
        }
    }
}

// Tạo instance mới
function updateInstance(instanceId) {
    const instance = instanceMap.get(instanceId);

    instance.vehicleId = document.getElementById('vehicleSelect').value || '';
    instance.startTime = document.getElementById('startTime').value || '';
    instance.endTime = document.getElementById('endTime').value || '';
    instance.filterLevel = filterLevel;
    instance.trackingData = null;
    instance.polyline = null;
}
// Tạo instance mới
async function createNewInstance() {
    try {
        showStatus('Đang tạo instance mới...', 'info');
        
        // Gọi API để tạo instance
        const response = await fetch('http://10.222.3.84:5012/api/v2/workflow/model/start_id/6909c05ffcd083fe8d0647e5/await', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '801bd483-42b5-4388-8323-a986bfcfbb37'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
            return;
        }

        document.querySelector('.btn-load').disabled = false;

        const data = await response.json();
        console.log('API Response:', data);
        
        // Lấy instanceId từ response (điều chỉnh theo cấu trúc response thực tế)
        const instanceId = data.instance ;
        
        if (!instanceId) {
            throw new Error('Không nhận được instanceId từ API');
        }
        
        const newInstance = {
            id: instanceId, // Sử dụng instanceId từ API
            name: instanceId,
            vehicleId: document.getElementById('vehicleSelect').value || '',
            startTime: document.getElementById('startTime').value || '',
            endTime: document.getElementById('endTime').value || '',
            filterLevel: document.getElementById('filterSlider').value || 50,
            trackingData: null,
            polyline: null,
            markers: [],
            createdAt: new Date(),
        };
        
        instanceMap.set(newInstance.id, newInstance);
        setActiveInstance(newInstance.id);
        updateInstanceList();
        
        console.log('New instance created with ID:', instanceId);
        showStatus(`Instance "${newInstance.name}" đã được tạo`, 'success');
        
    } catch (error) {
        console.error('Error creating instance:', error);
        showStatus('Lỗi khi tạo instance: ' + error.message, 'error');
    }
}
// Set instance đang active
function setActiveInstance(instanceId) {
    activeInstanceId = instanceId;
    
    const instance = instanceMap.get(instanceId);
    if (instance) {
        // Load dữ liệu của instance vào form
        document.getElementById('vehicleSelect').value = instance.vehicleId;
        document.getElementById('startTime').value = instance.startTime;
        document.getElementById('endTime').value = instance.endTime;
        document.getElementById('filterSlider').value = instance.filterLevel;
        document.getElementById('filterValue').textContent = instance.filterLevel;
        filterLevel = instance.filterLevel;
        
        // Hiển thị tracking data của instance này
        if (instance.trackingData) {
            drawTrackingRoute(instance.trackingData, instance);
            showTrackingInfo(instance.trackingData, instance.vehicleId);
        } else {
            clearTrackingRoute();
        }
    }
    
    updateInstanceList();
}

// Xóa instance
function deleteInstance(instanceId, event) {
    event.stopPropagation(); // Prevent triggering setActiveInstance
    
    const instance = instanceMap.get(instanceId);
    if (!instance) return;
    
    if (confirm(`Bạn có chắc muốn xóa instance "${instance.name}"?`)) {
        // Xóa polyline và markers của instance
        if (instance.polyline) {
            map.removeLayer(instance.polyline);
        }
        instance.markers.forEach(marker => map.removeLayer(marker));
        
        // Xóa khỏi mảng
        instanceMap.delete(instanceId);
        // Nếu đang active instance này, reset form
        if (activeInstanceId === instanceId) {
            activeInstanceId = null;
            clearTrackingRoute();
            
            // Nếu còn instance khác, active instance đầu tiên
            if (instanceMap.size > 0) {
                setActiveInstance(Array.from(instanceMap.values())[0].id);
            }
        }
        
        updateInstanceList();
        showStatus(`Instance "${instance.name}" đã được xóa`, 'info');
    }
}

// Cập nhật danh sách instances
function updateInstanceList() {
    const listContainer = document.getElementById('instanceList');
    
    if (instanceMap.length === 0) {
        listContainer.innerHTML = `
            <div class="no-instances">
                Chưa có instance nào.<br>
                Click + để tạo mới.
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = '';
    
    // duyet qua instanceMap va them vao html
    const instances = Array.from(instanceMap.values());
    instances.forEach(instance => {
        const item = document.createElement('div');
        item.className = `instance-item ${instance.id === activeInstanceId ? 'active' : ''}`;
        item.onclick = () => {
            setActiveInstance(instance.id);
            updateRouteLine2(instance.id);
        };
        const vehicleName = instance.vehicleId || 'Chưa chọn';
        const dataPoints = instance.trackingData ? instance.trackingData.length : 0;
        
        item.innerHTML = `
            <div class="instance-item-content">
                <div class="instance-name">${instance.name}</div>
                <div class="instance-info">
                    🚗 ${vehicleName} | 📍 ${dataPoints} điểm | 🎚️ ${instance.filterLevel}
                </div>
            </div>
            <div class="instance-actions">
                <button class="btn-delete-instance" onclick="deleteInstance(${instance.id}, event)" title="Xóa instance">
                    ✕
                </button>
            </div>
        `;
        
        listContainer.appendChild(item);
    });
}
// Hàm filter dữ liệu theo level
function applyFilterLevel(data, level) {
    if (!data || data.length === 0) return data;
    
    // level từ 10-100: 10 = giữ 10%, 100 = giữ 100%
    const keepRatio = level / 100;
    const step = Math.max(1, Math.floor(1 / keepRatio));
    
    // Luôn giữ điểm đầu và điểm cuối
    const filtered = [data[0]];
    
    for (let i = step; i < data.length - 1; i += step) {
        filtered.push(data[i]);
    }
    
    if (data.length > 1) {
        filtered.push(data[data.length - 1]);
    }
    
    console.log(`Filter level ${level}%: ${data.length} → ${filtered.length} points`);
    return filtered;
}

// Cập nhật hàm drawTrackingRoute để hỗ trợ instances
function drawTrackingRoute(data, instance) {
    // Nếu không có instance, xóa route cũ và vẽ mới
    if (!instance) {
        clearTrackingRoute();
    }
    
    const latlngs = data.map(point => [point[0], point[1]]);
    
    // Tạo màu ngẫu nhiên cho mỗi instance
    const colors = ['#FF5722', '#9C27B0', '#3F51B5', '#009688', '#FF9800', '#E91E63'];
    const randomColor = instance ? colors[instances.indexOf(instance) % colors.length] : '#FF5722';
    
    const polyline = L.polyline(latlngs, {
        color: randomColor,
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(map);
    
    // Lưu polyline vào instance hoặc biến global
    if (instance) {
        instance.polyline = polyline;
    } else {
        trackingPolyline = polyline;
    }
    
    const startPoint = data[0];
    const endPoint = data[data.length - 1];
    
    const startMarker = L.circleMarker([startPoint[0], startPoint[1]], {
        radius: 8,
        fillColor: '#4CAF50',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    startMarker.bindPopup('<strong>Điểm bắt đầu</strong><br>' + formatTimestamp(startPoint[4]));
    
    const endMarker = L.circleMarker([endPoint[0], endPoint[1]], {
        radius: 8,
        fillColor: '#f44336',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    endMarker.bindPopup('<strong>Điểm kết thúc</strong><br>' + formatTimestamp(endPoint[4]));
    
    // Lưu markers
    if (instance) {
        instance.markers = [startMarker, endMarker];
    } else {
        trackingMarkers = [startMarker, endMarker];
    }
    
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
}

// Khởi tạo khi trang load
initializeDateTime();
loadVehicleList();
console.log('Vehicle tracking module initialized.');

// Khởi tạo
updateInstanceList();