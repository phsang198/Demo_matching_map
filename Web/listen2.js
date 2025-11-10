// WebSocket Manager đơn giản
function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
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
                if (data.data && data.data.view == "result" && data.data.open == undefined) {
                    console.log('processing event data...');
                    // Gọi hàm process
                    (async () => {
                        await processEvent(data);
                        await sleep(1000);
                    })();
                    // const viewUrl = `${data.data.view}.html`;
                    // console.log(`[WS] Opening view: ${viewUrl}`);
                    // window.open(viewUrl);
                    // onclose();
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