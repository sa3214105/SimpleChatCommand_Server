import { ServerOptions, WebSocketServer,WebSocket,MessageEvent, RawData } from "ws";
import { Client, IMessageManager, Request, Response, User, isRequest,MessagePackageStruct } from "./SimpleChatCommandServer";

class ClientWebSocket implements Client {
    private WebSocket: WebSocket;
    user: User | null = null;
    constructor(webSocket: WebSocket) {
        this.WebSocket = webSocket;
    }
    GetWebSocket() {
        return this.WebSocket;
    }
}
export class MessageManagerWebSocket implements IMessageManager {
    private WebSocketServer: WebSocketServer | null = null;
    private MessageListener: ((client: Client, command: Request) => Promise<Response>) | null = null;
    private UserConnectListener: ((client: Client) => void) = () => { };
    private UserDisconnectListener: ((client: Client) => void) = () => { };
    private Port = 0;
    constructor(obj: WebSocketServer | ServerOptions | number) {
        if (obj instanceof WebSocketServer) {
            this.WebSocketServer = obj;
        } else if (typeof obj === "number") {
            this.WebSocketServer = new WebSocketServer({ port: obj });
        } else {
            this.WebSocketServer = new WebSocketServer(obj);
        }
        this.WebSocketServer.on("connection", this.onConnection.bind(this))
    }
    private onConnection(webSocket: WebSocket) {
        let client = new ClientWebSocket(webSocket);
        this.UserConnectListener(client);
        webSocket.on("message",async(data:RawData)=>{
            if(this.MessageListener){
                try{
                    let inputObj=JSON.parse(data.toString());
                    if(isRequest(inputObj)){
                        let result=await this.MessageListener(client,inputObj);
                        webSocket.send(JSON.stringify(result));
                    }else{
                        webSocket.send("wrong request schema");
                    }
                }catch{
                    webSocket.send("json parse error!");
                }
            }
        });
        webSocket.on("close",()=>{
            this.UserDisconnectListener(client);
        });
    }
    stop() {
        if (this.WebSocketServer !== null) {
            this.WebSocketServer.close();
        }
    }
    sendMessage(receiver: Client, message: MessagePackageStruct): boolean {
        if(!(receiver instanceof ClientWebSocket)){
            return false;
        }
        try{
            receiver.GetWebSocket().send(JSON.stringify(message));
            return true;
        }catch(e){
            let errorMsg = e instanceof Error ? e.message : "UnKnown error!";
            console.error(errorMsg);
            return false;
        }
    }
    onMessage(listener: (client: Client, command: Request) => Promise<Response>): void {
        this.MessageListener = listener;
    }
    onUserConnect(listener: (client: Client) => void): void {
        this.UserConnectListener = listener;
    }
    onUserDisconnect(listener: (client: Client) => void): void {
        this.UserDisconnectListener = listener;
    }
}