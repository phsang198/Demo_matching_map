// Mảng lưu trữ các điểm đã thêm
let savedPoints = [];
let currentContextLatLng = null;
let markerCount = 0;

// Khởi tạo bản đồ tại TP.HCM
const map = L.map('map', {
    contextmenu: false // Tắt context menu mặc định
}).setView([10.810711652959442, 106.66883361367069], 18);

// Thêm tile layer từ OpenStreetMap
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    minZoom: 3
})

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

// Scale control
L.control.scale({
    imperial: false,
    metric: true
}).addTo(map);

// ============ CHỨC NĂNG MỚI ============

// 1. Hiển thị tọa độ khi di chuyển chuột
map.on('mousemove', function(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    document.getElementById('coordinateDisplay').textContent = `Lat: ${lat}, Lon: ${lng}`;
});

// 2. Mở context menu khi click chuột phải
map.on('contextmenu', function(e) {
    e.originalEvent.preventDefault();
    
    currentContextLatLng = e.latlng;
    
    const contextMenu = document.getElementById('contextMenu');
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    
    // Hiển thị tọa độ trong context menu
    document.getElementById('contextCoords').textContent = `Lat: ${lat}, Lon: ${lng}`;
    
    // Xóa input trước đó
    document.getElementById('pointName').value = '';
    
    // Hiển thị menu tại vị trí click
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.originalEvent.pageX + 'px';
    contextMenu.style.top = e.originalEvent.pageY + 'px';
    
    // Focus vào input
    setTimeout(() => {
        document.getElementById('pointName').focus();
    }, 100);
});

// Đóng context menu khi click ra ngoài
document.addEventListener('click', function(e) {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu.contains(e.target)) {
        closeContextMenu();
    }
});

// Cho phép Enter để lưu điểm
document.getElementById('pointName').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        savePoint();
    }
});

// Hàm đóng context menu
function closeContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
    currentContextLatLng = null;
}

// Thêm biến để lưu polyline ở đầu file (sau dòng let markerCount = 0;)
let routeLine = null;
let pathline = null;

// Thay thế hàm savePoint() bằng code này:
function savePoint() {
    pointName = document.getElementById('pointName').value.trim();
    
    if (!pointName) {
        pointName = `Điểm #${savedPoints.length + 1}`;
    }
    
    if (!currentContextLatLng) {
        alert('Lỗi: Không xác định được tọa độ!');
        return;
    }
    
    // Tạo object điểm mới
    const newPoint = {
        id: Date.now(),
        name: pointName,
        lat: currentContextLatLng.lat,
        lng: currentContextLatLng.lng
    };
    
    // Thêm vào mảng
    savedPoints.push(newPoint);
    
    // Thêm marker vào bản đồ
    const marker = L.marker([newPoint.lat, newPoint.lng]).addTo(map)
        .bindPopup(`<div class="marker-popup"><strong>${newPoint.name}</strong><br>Lat: ${newPoint.lat.toFixed(6)}<br>Lon: ${newPoint.lng.toFixed(6)}</div>`)
        .openPopup();
    
    // Lưu marker vào object để có thể xóa sau
    newPoint.marker = marker;
    
    // VẼ LINE NỐI ĐIỂM
    updateRouteLine();
    
    // Cập nhật danh sách hiển thị
    updatePointsList();
    
    // Đóng context menu
    closeContextMenu();
    
    console.log('Điểm đã lưu:', newPoint);
    console.log('Tổng số điểm:', savedPoints.length);
    console.log('Mảng điểm:', savedPoints);
}
// vẽ line từ [[lat,lng], [lat,lng], ...   ]
function distanceInMeters(p1, p2) {
    const R = 6371000; // bán kính Trái Đất (m)
    const lat1 = p1[0] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLng = (p2[1] - p1[1]) * Math.PI / 180;

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function drawRouteLine(array) {
    console.log("Drawing route line with points:", array);
    // duyệt array và vẽ lên map
    // Nếu có ít nhất 2 điểm thì vẽ đường
    if (array.length >= 2) {
        const latlngs = array.map(point => [point[0], point[1]]);
        
        console.log("LatLngs for polyline2:", latlngs);
        pathline = L.polyline(latlngs, {
            color: '#750ec9ff',
            weight: 3,
            opacity: 0.7,
            smoothFactor: 1
        });
        // Thêm mũi tên
        //vẽ mũi tên vào tất cả các điểm ở giữa array
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
        return pathline;
    }
}


// Hàm cập nhật danh sách điểm
function updatePointsList() {
    const pointsList = document.getElementById('pointsList');
    
    // Xóa nội dung cũ trừ tiêu đề
    pointsList.innerHTML = '<strong style="margin-top: 10px;">Danh sách điểm đã lưu:</strong>';
    
    if (savedPoints.length === 0) {
        pointsList.innerHTML += '<div style="font-size: 12px; color: #999; padding: 5px;">Chưa có điểm nào</div>';
        return;
    }
    
    // Thêm từng điểm
    savedPoints.forEach((point, index) => {
        const pointItem = document.createElement('div');
        pointItem.className = 'point-item';
        pointItem.innerHTML = `
            <span>${index + 1}. ${point.name}</span>
            <button onclick="removePoint(${point.id})">Xóa</button>
        `;
        pointsList.appendChild(pointItem);
    });
}

// Cập nhật hàm removePoint
function removePoint(pointId) {
    const pointIndex = savedPoints.findIndex(p => p.id === pointId);
    
    if (pointIndex !== -1) {
        const point = savedPoints[pointIndex];
        
        // Xóa marker khỏi bản đồ
        if (point.marker) {
            map.removeLayer(point.marker);
        }
        
        // Xóa khỏi mảng
        savedPoints.splice(pointIndex, 1);
        
        // Cập nhật đường nối
        updateRouteLine();
        
        // Cập nhật danh sách
        updatePointsList();
        
        console.log('Đã xóa điểm:', point.name);
        console.log('Còn lại:', savedPoints.length, 'điểm');
    }
}

// Cập nhật hàm clearAllPoints
function clearAllPoints() {
    if (savedPoints.length === 0) {
        alert('Không có điểm nào để xóa!');
        return;
    }
    
    if (confirm(`Bạn có chắc muốn xóa tất cả ${savedPoints.length} điểm?`)) {
        // Xóa tất cả marker
        savedPoints.forEach(point => {
            if (point.marker) {
                map.removeLayer(point.marker);
            }
        });
        
        // Xóa đường nối
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }
        
        // Xóa mảng
        savedPoints = [];
        
        // Cập nhật danh sách
        updatePointsList();
        
        console.log('Đã xóa tất cả điểm!');
    }
}
// ============ CÁC HÀM ĐIỀU KHIỂN BẢN ĐỒ ============

// Cập nhật zoom level
map.on('zoomend', function() {
    document.getElementById('zoom-level').textContent = map.getZoom();
});

function zoomIn() {
    map.zoomIn();
}

function zoomOut() {
    map.zoomOut();
}

function goToHCM() {
    map.flyTo([10.810711652959442, 106.66883361367069], 18, {
        duration: 2
    });
}

function goToHanoi() {
    map.flyTo([21.0285, 105.8542], 18, {
        duration: 2
    });
}
function zoomToCoord(lon, lat,zoomLevel) {
    map.flyTo([lat, lon], zoomLevel, {
        duration: 1
    });
}

function addMarker() {
    const center = map.getCenter();
    markerCount++;
    L.marker(center).addTo(map)
        .bindPopup(`<div class="marker-popup"><strong>Marker #${markerCount}</strong>Vị trí hiện tại trên bản đồ</div>`)
        .openPopup();
}

// Khởi tạo danh sách điểm ban đầu
updatePointsList();

console.log('🗺️ Bản đồ OpenStreetMap đã sẵn sàng!');
console.log('📍 Click chuột phải để thêm điểm đến');

