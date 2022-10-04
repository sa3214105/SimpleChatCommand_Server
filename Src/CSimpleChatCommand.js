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
    GetUsers(){
        throw "no implementation";
    }
    GetUsersByGroup(){
        return this.GetUsers();
    }
}
export class UserStruct{
    ID="";
    Name="";
    constructor(id,name){
        this.ID=id;
        this.Name=name;
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
                ["Broadcast",this.#Broadcast.bind(this)]
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
            if(sender!==null||command==="Login"){
                result.Data=await this.#m_CmdMap.get(command)(sender,data);
                result.State="success";
            }else{
                result.Data="no logging";
                result.State="failed";
            }
        }catch(e){
            console.warn(e)
            result.Data=e   ;
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
        let user=null;
        if(sender!==null){
            throw "The User Is Login";
        }else{
            let userInfo=data;
            if(!userInfo instanceof LoginStruct){
                throw "Wrong Login Details"
            }else{
                let IsPasswordRight=await this.#m_UserValidator.Auth(userInfo.UserID,userInfo.Password);
                if(IsPasswordRight){
                    user=new UserStruct(userInfo.UserID,userInfo.UserID);
                }
            }
        }
        return user;
    }
    async #SendMessage(sender,data){
        let messageObj=data;
        this.#CheckMessageObj(messageObj);
        let {Receiver:receiver,Message:message}=messageObj;
        return this.#m_MessageManager.SendMessage(sender,receiver,message);
    }
        #CheckMessageObj(messageObj){
            if(!messageObj instanceof MessageStruct){
                throw "The messageObj is not a instance of MessageStruct";
            }
        }
    async #Broadcast(sender,data){
        let broadcastObj=data;
        this.#CheckBroadcastObj(broadcastObj);
        let {Receivers:receivers,Broadcast:broadcast}=broadcastObj;
        return receivers.map(
            receiver=>this.#m_MessageManager.SendMessage(sender,receiver,broadcast)
        );
    }
        #CheckBroadcastObj(broadcastObj){
            if(!broadcastObj instanceof BroadcastStruct){
                throw "The obj is not a instance of BroadcastStruct";
            }
        }
}