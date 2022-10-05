import { Mutex } from "async-mutex";
export class IUserManager{
    async CreateUser(userName,password){
        throw "no implementation";
    }
    async Auth(userName,password){
        throw "no implementation";
    }
}
export class IMessageManager{
    SetMessageHandler(messageHandler){
        throw "no implementation";
    }
    SendMessage(sender,receiver,message){
        throw "no implementation";
    }
}
export class UserStruct{
    ID="";
    constructor(id){
        if(!!id){
            this.ID=id;
        }
    }
    IsLoggedIn(){
        return this.ID!=="";
    }
}
export class CommandStruct{
    Command="";
    Data="";
}
export class LoginStruct{
    UserID="";
    Password="";
}
export class MessageStruct{
    Receiver=null;//UserStruct
    Message="";
}
export class BroadcastStruct{
    Receivers=[];//list of UserStruct
    Broadcast="";
}
export class MessageHandlerResult{
    Command="";
    State="";
    Data=null;
    constructor(command,state,data){
        this.Command=command;
        this.State=state;
        this.Data=data;
    }
}
export class SimpleChatCommand{
    #m_UserValidator=null;
    #m_MessageManager=null;
    #m_CmdMap=new Map();
    #m_UserManager=new UserManager();
    constructor(userValidator,messageManager){
        this.#CheckConstructParameter(userValidator,messageManager);
        this.#SetDefaultCommands();
        this.#m_MessageManager.SetMessageHandler(this.MessageHandler.bind(this));
    }
        #CheckConstructParameter(userValidator,messageManager){
            if(userValidator instanceof IUserManager){
                this.#m_UserValidator=userValidator;
            }else{
                throw "Please input instance of IUserManager";
            }
            if(messageManager instanceof IMessageManager){
                this.#m_MessageManager=messageManager;
            }else{
                throw "Please input instance of IMessageManager";
            }
        }
        #SetDefaultCommands(){
            this.#m_CmdMap=new Map([
                ["Login",this.#Login.bind(this)],
                ["SendMessage",this.#SendMessage.bind(this)],
                ["Broadcast",this.#Broadcast.bind(this)],
                ["Logout",this.#Logout.bind(this)]
            ]);
        }
    AddCustomerCommand(commandName,commandFunc){
        this.#CheckCustomerCommandParameter(commandName,commandFunc);
        this.#m_CmdMap.set(commandName,commandFunc);
    }
        #CheckCustomerCommandParameter(commandName,commandFunc){
            if(!commandName instanceof String){
                throw "commandName must be a String";
            }
            if(!commandFunc instanceof Function){
                throw "commandFunc must be a Function";
            }
        }
    async MessageHandler(sender,commandObj){
        let result=new MessageHandlerResult("","failed","no processed");
        try{
            this.#CheckSenderObj(sender);
            this.#CheckCommandObj(commandObj);
            let {Command:command,Data:data}=commandObj;
            result.Command=command;
            if(sender.IsLoggedIn()||command==="Login"){//TODO islogin
                result.Data=await this.#m_CmdMap.get(command)(sender,data);
                result.State="success";
            }else{
                result.Data="no logging";
                result.State="failed";
            }
        }catch(e){
            console.warn(e)
            result.Data=e;
            result.State="failed";
        }
        return result;
    }
        #CheckSenderObj(senderObj){
            if(!senderObj instanceof UserStruct){
                throw "The Sender is not a instance of UserStruct";
            }
        }
        #CheckCommandObj(commandObj){
            if(!commandObj instanceof CommandStruct){
                throw "The obj is not a instance of CommandStruct";
            }
            if(!this.#m_CmdMap.has(commandObj["Command"])){
                throw "Wrong Command";
            }
        }
    //Command handler
    async #Login(sender,data){
        if(sender.IsLoggedIn()){
            throw "The User Is Login";
        }else{
            let userInfo=data;
            if(!userInfo instanceof LoginStruct){
                throw "Wrong Login Details";
            }else{
                let IsPasswordRight=await this.#m_UserValidator.Auth(userInfo.UserID,userInfo.Password);
                if(IsPasswordRight){
                    if(this.#m_UserManager.GetUserByID(userInfo.UserID)===null){
                        sender.ID=userInfo.UserID;
                        await this.#m_UserManager.AddUser_Async(sender);
                    }else{
                        throw "This user is already logged in";
                    }
                }
            }
        }
        return sender;
    }
    async #SendMessage(sender,data){
        let messageObj=data;
        this.#CheckMessageObj(messageObj);
        let {Receiver:receiverID,Message:message}=messageObj;
        let receiver=this.#m_UserManager.GetUserByID(receiverID);
        if(receiver===null){
            throw "The receiver does not exist";
        }
        return this.#m_MessageManager.SendMessage(sender,receiver,message);
    }
        #CheckMessageObj(messageObj){
            if(!messageObj instanceof MessageStruct){
                throw "The messageObj is not a instance of MessageStruct";
            }
        }
    async #Broadcast(sender,data){
        let broadcastObj=data;
        let ret=[];
        this.#CheckBroadcastObj(broadcastObj);
        let {Receivers:receivers,Broadcast:broadcast}=broadcastObj;
        for(let receiver of receivers){
            let result;
            try{
                result=await this.#SendMessage(sender,{Receiver:receiver,Message:broadcast})
            }catch(e){
                result=e;
            }
            ret.push(result);
        }
        return ret
    }
        #CheckBroadcastObj(broadcastObj){
            if(!broadcastObj instanceof BroadcastStruct){
                throw "The obj is not a instance of BroadcastStruct";
            }
        }
    async #Logout(sender){
        return await this.#m_UserManager.RemoveUser_Async(sender)?"success":"failed";
    }
}
export class UserManager{
    #m_Mutex=new Mutex();
    #m_Users=new Map();
    async AddUser_Async(user){
        let ret=false;
        const release = await this.#m_Mutex.acquire();
        if(user instanceof UserStruct){
            if(!this.#m_Users.has(user.ID)){
                this.#m_Users.set(user.ID,user);
                ret=true;
            }
        }
        release();
        return ret;
    }
    async RemoveUser_Async(user){
        let ret=false;
        const release = await this.#m_Mutex.acquire();
        if(this.#m_Users.has(user.ID)){
            ret=this.#m_Users.delete(user.ID);
            ret=true;
        }
        release();
        return ret;
    }
    GetUserByID(userID){
        let ret=null;
        if(this.#m_Users.has(userID)){
            ret=this.#m_Users.get(userID);
        }
        return ret;
    }
    GetUsers(){
        return this.#m_Users.keys();
    }
}