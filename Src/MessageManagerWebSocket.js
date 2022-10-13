import { IMessageManager,UserStruct,MessageHandlerResult } from "./SimpleChatCommand_Server.js";
import WebSocket,{WebSocketServer} from "ws";
export class UserStructWebSocket extends UserStruct{
    #m_WebSocket=null;
    constructor(webSocket){
        super("");
        this.#m_WebSocket=webSocket;
    }
    GetWebSocket(){
        return this.#m_WebSocket;
    }
}
export class MessageManagerWebSocket extends IMessageManager{
    m_WebSocketServer=null;
    m_WebSocketConfig=null;
    m_Port=8080;
    m_MessageHandler=null;
    constructor(obj){
        super();
        //this.m_UserManager=userManager;
        if(obj instanceof WebSocket){
            this.m_WebSocketServer=obj;
        }else if(obj instanceof Object){
            this.m_WebSocketConfig=obj;
        }else{
            this.m_Port=obj;
        }
    }
    Start(){
        if(this.m_WebSocketServer===null){
            if(this.m_WebSocketConfig===null){
                this.m_WebSocketServer=new WebSocketServer({port:this.m_Port});
            }else{
                this.m_WebSocketServer=new WebSocketServer(this.m_WebSocketConfig);
            }
        }
        this.m_WebSocketServer.on("connection",this.#OnConnection.bind(this))
    }
    async #OnConnection(webSocket,request){
        let user=new UserStructWebSocket(webSocket);
        webSocket.on("message",async(data,isBinary)=>{
            let inputObj={};
            try{
                inputObj=JSON.parse(data);
                let result=await this.m_MessageHandler(user,inputObj);
                webSocket.send(JSON.stringify(result));
            }catch{
                webSocket.send("json parse error!");
            }
            
        })
        webSocket.on("close",async(code,reason)=>{
            let result=await this.m_MessageHandler(user,{Command:"Logout",data:""});
            webSocket.send(JSON.stringify(result));
        });
    }
    SetMessageHandler(messageHandler){
        this.m_MessageHandler=messageHandler;
    }
    SendMessage(sender,receiver,message){
        if(!sender instanceof UserStructWebSocket||!receiver instanceof UserStructWebSocket){
            throw "Internal Error 100";//wrong user type
        }
        let data={
            Sender:sender.ID,
            Receiver:receiver.ID,
            Message:message
        };
        receiver.GetWebSocket().send(JSON.stringify(data));
        return "success";
    }
}