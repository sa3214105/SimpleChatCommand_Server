//TODO thread safe
import WebSocket,{WebSocketServer} from "ws";
import fs from "fs";
export class IUserManager{
    constructor(){
    }
    async CreateUser(userName,password){
        throw "no implementation";
    }
    async Auth(userName,password){
        throw "no implementation";
    }
}
export class SimpleChatService{
    m_WebSocketServer=null;
    m_ConfigPath="./ServerConfig.json";
    m_CmdMap=new Map();
    m_UserMap=new Map();
    m_UserManager=null;
    m_CustomLogFunc=null;
    //Public Method
    constructor(userManager){
        if(userManager instanceof IUserManager){
            this.m_UserManager=userManager;
        }else{
            throw "Please input instance of IUserManager"
        }
        this.m_CmdMap=new Map([
            ["Login",this.#Login.bind(this)],
            ["SenMessage",this.#SendMessage.bind(this)],
            ["Broadcast",this.#Broadcast.bind(this)]
        ]);
    }
    async Start(){
        let config=await this.#GetServerConfig();
        this.#Log("info","CreateServer...");
        this.m_WebSocketServer=new WebSocketServer(config);
        this.m_WebSocketServer.on("connection",this.#OnServerConnect.bind(this));
        this.m_WebSocketServer.on("error",this.#OnServerError.bind(this));
    }
    async Close(){
        this.m_WebSocketServer.close();
    }
    GetCommandList(){
        return this.m_CmdMap.keys();
    }
    SetLogger(func){
        this.m_CustomLogFunc=func;
    }
    //Websocket Socket EventHandler
    #OnServerConnect(webSocket){
        webSocket.on("message",this.#OnMessage.bind(this,webSocket));
        webSocket.on("open",this.#OnOpen.bind(this));
        webSocket.on("close",this.#OnClose.bind(this,webSocket));
    }
    async #OnMessage(webSocket,message){
        this.#Log("info:message",message.toString());
        try{
            await this.#DoCmd(webSocket,message);
        }catch(err){
            this.#Log("Err:",err.toString());
            console.debug(err);
            webSocket.send(err.toString());
        }
    }
    #OnOpen(){
        this.#Log("info","Open");
    }
    #OnClose(webSocket){
        let user=this.#GetUserByWebSocket(webSocket);
        if(!!user){
            this.m_UserMap.delete(user.userName);
        }
        this.#Log("info","Close");
    }
    #OnServerError(err){
        this.#Log("err",err,"ERROR");
        console.err(err);
    }
    //Basic Command
    async #DoCmd(webSocket,message){
        let ret=false;
        let inputObj=null;
        try{
            inputObj=JSON.parse(message);
        }catch{
            throw "json parse error!";
        }
        let cmdFun=null;
        if(inputObj.Cmd){
            cmdFun=this.m_CmdMap.get(inputObj.Cmd);
            let user=this.#GetUserByWebSocket(webSocket);
            if(inputObj.Cmd==="Login"||user){
                if(inputObj.Cmd="Login"){
                    user={webSocket};
                }
                await cmdFun(user,inputObj);
                webSocket.send("success login");
            }else{
                throw "not logged in!"
            }
        }else{
            throw "message must contain Cmd"
        }
    }
    async #Login(user,inputObj){
        let {UserName,Password}=inputObj;
        if(this.m_UserMap.has(UserName)){
            throw "This user is already logged in!";
        }
        if(UserName&&Password){
            let isSuccess=await this.m_UserManager.Auth(UserName,Password);
            if(isSuccess){
                this.m_UserMap.set(UserName,user.webSocket);
            }else{
                throw "Login failed!";
            }
        }else{
            throw "UserName or Password isEmpty"
        }
    }
    #SendMessage(user,inputObj){
        inputObj.sender=user.userName;
        let {receiver}=inputObj;
        receiverWebSocket=this.m_UserMap.get(receiver);
        receiverWebSocket.send(JSON.stringify(inputObj));
    }
    #Broadcast(user,inputObj){
        inputObj.sender=user.userName;
        for(let [userName,webSocket] of m_UserMap.entries()){
            webSocket.send(JSON.stringify(inputObj));
        }
    }
    //Other
    #Log(title,message,type="Info"){
        console.log(title,message,type);
        if(this.m_CustomLogFunc!==null){
            this.m_CustomLogFunc(title,message,type)
        }
    }
    #GetUserByWebSocket(_webSocket){
        for(let [userName,webSocket] of this.m_UserMap.entries()){
            if(webSocket===_webSocket){
                return {userName,webSocket};
            }
        }
        return null;
    }
    async #GetServerConfig(){
        return JSON.parse(fs.readFileSync(this.m_ConfigPath,"utf-8"));
    }
}
