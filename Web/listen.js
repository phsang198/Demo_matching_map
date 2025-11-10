// WebSocket Manager đơn giản
let isopened = 0; 

const wsManager = {
    connections: new Map(),
    
    connect(instanceId) {
        const ws = new WebSocket(`ws://10.225.0.240:8765/chat?instanceId=${instanceId}&type=bot&user=web_user`);
        
        ws.onopen = () => {
            console.log(`[WS Connected] ${instanceId}`);
        };
        
        ws.onmessage = (event) => {
            console.log(`[WS Event] ${instanceId}:`, event.data);
            try {
                const data = JSON.parse(event.data);
                console.log(`[WS Parsed] ${instanceId}:`, data);
                if (data.data && data.data.view) {
                    console.log('processing event data...');

                    if (data.data.view == "input") {
                        processEventMain(data);
                        return;
                    }
                    if (data.data.view == "result" && data.data.open) {
                        localStorage.setItem("data", JSON.stringify(data));
                        const viewUrl = `${data.data.view}.html`;
                        console.log(`[WS] Opening view: ${viewUrl}`);
                        window.open(viewUrl);
                        return;
                    }
                }
            } catch (e) {
                console.error(`[WS Parser Error] ${instanceId}:`, e);
            }
        };
        
        ws.onerror = (error) => {
            console.error(`[WS Error] ${instanceId}:`, error);
        };
        
        ws.onclose = () => {
            console.log(`[WS Closed] ${instanceId}`);
            this.connections.delete(instanceId);
        };
        
        this.connections.set(instanceId, ws);
        return ws;
    },
    
    disconnect(instanceId) {
        const ws = this.connections.get(instanceId);
        if (ws) ws.close();
    }
};

wsManager.connect('demo_instance');