import { IMessageManager,UserStruct,MessageHandlerResult } from "./CSimpleChatCommand.js";
import WebSocket,{WebSocketServer} from "ws";
export class MessageManagerWebSocket extends IMessageManager{
    m_WebSocketServer=null;
    m_Port=8080;
    m_MessageHandler=null;
    m_UserMap=new Map();
    m_WebSocketMap=new Map();
    constructor(port){
        super();
        this.m_Port=port;
    }
    Start(){
        this.m_WebSocketServer=new WebSocketServer(
            {
                port:this.m_Port
            }
        );
        this.m_WebSocketServer.on("connection",this.#OnConnection.bind(this))
    }
    async #OnConnection(webSocket,request){
        
        webSocket.on("message",async(data,isBinary)=>{
            let user=null;
            let inputObj={};
            try{
                inputObj=JSON.parse(data);
            }catch{
                throw "json parse error!";
            }
            if(this.m_WebSocketMap.has(webSocket)){
                user=this.m_WebSocketMap.get(webSocket);
            }
            let result=null;
            result=await this.m_MessageHandler(user,inputObj);
            if(
                user===null&&
                result instanceof MessageHandlerResult&&
                result.Command==="Login"){
                    user=result.Data;
                    if(user!==null&&!this.m_UserMap.has(user.ID)){
                        this.m_UserMap.set(user.ID,webSocket);
                        this.m_WebSocketMap.set(webSocket,user.ID);
                    }else{//TODO 需再優化
                        result.State="failed";
                        result.Data=undefined;
                    }
            }//Login
            webSocket.send(JSON.stringify(result));
        });
        webSocket.on("close",(code,reason)=>{
            let userID=this.m_WebSocketMap.get(webSocket);
            this.m_UserMap.delete(userID);
            this.m_WebSocketMap.delete(webSocket);
        });
    }
    SetMessageHandler(messageHandler){
        this.m_MessageHandler=messageHandler;
    }
    SendMessage(sender,receiver,message){
        let data={
            Sender:sender,
            Receiver:receiver,
            Message:message
        };
        if(this.m_UserMap.has(receiver)){
            let receiverWebSocket=this.m_UserMap.get(receiver);
            receiverWebSocket.send(JSON.stringify(data));
        }else{
            throw "receiver does not exist"
        }
    }
    GetUsers(){
        return this.m_UserMap.keys();
    }
    GetUsersByGroup(){
        return this.GetUsers();
    }
}