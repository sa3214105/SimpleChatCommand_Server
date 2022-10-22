import { Mutex } from "async-mutex";
import * as UTILITY from "./Utility.js";
/**
 * If you want to customize UserValidator please extends this interface.
 * @Interface 
 * @name IUserValidator
 */
export class IUserValidator{
    constructor(){}
    /**
     * Create user 
     * @param {string} userName 
     * @param {string} password 
     */
    async CreateUser(userName,password){
        throw new Error("no implementation");
    }
    /**
     * Create Auth 
     * @param {string} userName 
     * @param {string} password 
     */
    async Auth(userName,password){
        throw new Error("no implementation");
    }
}
/**
 * If you want to customize MessageManager please extends this interface.
 * @Interface 
 * @name IMessageManager
 */
export class IMessageManager{
    /**
     * 
     * @param {function} messageHandler 
     */
    SetMessageHandler(messageHandler){
        throw new Error("no implementation");
    }
    /**
     * 
     * @param {UserStruct} sender 
     * @param {UserStruct} receiver 
     * @param {string} message 
     */
    SendMessage(sender,receiver,message){
        throw new Error("no implementation");
    }
}
/**@class */
export class UserStruct{
    /**@member {string}*/ID="";
    IsLoggedIn(){
        return this.ID!=="";
    }
}
/**@class */
export class CommandStruct{
    /**@member {string}*/Command="";
    /**@member {string}*/Data="";
}
/**@class */
export class LoginStruct{
    /**@member {string}*/UserID="";
    /**@member {string}*/Password="";
}
/**@class */
export class MessageStruct{
    /**@member {object}*/Receiver=null;//UserStruct
    /**@member {string}*/Message="";
}
/**@class */
export class BroadcastStruct{
    /**@member {string}*/Broadcast="";
}
/**@class */
export class MessageHandlerResult{
    /**@member {string}*/Command="";
    /**@member {string}*/State="";
    /**@member {object}*/Data=null;
    constructor(command,state,data){
        this.Command=command;
        this.State=state;
        this.Data=data;
    }
}
/**
 *@class Control data flow and manage command.
 */
export class SimpleChatCommand_Server{
    #m_UserValidator=null;
    #m_MessageManager=null;
    #m_CmdMap=new Map();
    #m_UserManager=new UserManager();
    /**
     * 
     * @param {IUserValidator} userValidator 
     * @param {IMessageManager} messageManager 
     */
    constructor(userValidator,messageManager){
        this.#CheckConstructParameter(userValidator,messageManager);
        this.#SetDefaultCommands();
        this.#m_MessageManager.SetMessageHandler(this.#MessageHandler.bind(this));
    }
        #CheckConstructParameter(userValidator,messageManager){
            if(userValidator instanceof IUserValidator){
                this.#m_UserValidator=userValidator;
            }else{
                throw new Error("Please input instance of IUserValidator");
            }
            if(messageManager instanceof IMessageManager){
                this.#m_MessageManager=messageManager;
            }else{
                throw new Error("Please input instance of IMessageManager");
            }
        }
        #SetDefaultCommands(){
            this.#m_CmdMap=new Map([
                ["Login",this.#Login.bind(this)],
                ["SendMessage",this.#SendMessage.bind(this)],
                ["Broadcast",this.#Broadcast.bind(this)],
                ["Logout",this.#Logout.bind(this)],
                ["GetUsers",this.#GetUsers.bind(this)]
            ]);
        }
    /**
     * Add Customer Command
     * @param {string} commandName 
     * @param {function} commandFunc 
     */
    AddCustomerCommand(commandName,commandFunc){
        this.#CheckCustomerCommandParameter(commandName,commandFunc);
        this.#m_CmdMap.set(commandName,commandFunc);
    }
        #CheckCustomerCommandParameter(commandName,commandFunc){
            if(typeof(commandName)!=="string"){
                throw new Error("CommandName must be a String");
            }
            if(typeof(commandFunc)!=="function"){
                throw new Error("CommandFunc must be a Function");
            }
        }
    async #MessageHandler(sender,commandObj){
        let result=new MessageHandlerResult("","failed","no processed");
        try{
            this.#CheckSenderObj(sender);
            this.#CheckCommandObj(commandObj);
            let {Command:command,Data:data}=commandObj;
            result.Command=command;
            if(sender.IsLoggedIn()||command==="Login"){
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
            if(!(senderObj instanceof UserStruct)){
                throw new Error("The Sender is not a instance of UserStruct");
            }
        }
        #CheckCommandObj(commandObj){
            if(!UTILITY.InstanceOf_Soft(CommandStruct,commandObj)){
                throw new Error("The obj is not a instance of CommandStruct");
            }
            if(!this.#m_CmdMap.has(commandObj["Command"])){
                throw new Error("Wrong Command");
            }
        }
    //Command handler
    async #Login(sender,data){
        if(sender.IsLoggedIn()){
            throw new Error("The User Is Login");
        }else{
            let userInfo=data;
            if(!UTILITY.InstanceOf_Soft(LoginStruct,userInfo)){
                throw new Error("Wrong Login Struct");
            }else{
                let IsPasswordRight=await this.#m_UserValidator.Auth(userInfo.UserID,userInfo.Password);
                if(IsPasswordRight){
                    if(this.#m_UserManager.GetUserByID(userInfo.UserID)===null){
                        sender.ID=userInfo.UserID;
                        await this.#m_UserManager.AddUser_Async(sender);
                    }else{
                        throw new Error("This account is already logged in");
                    }
                }else{
                    throw new Error("Wrong UserID or Password");
                }
            }
        }
        return {User:sender.ID};
    }
    async #SendMessage(sender,data){
        let messageObj=data;
        this.#CheckMessageObj(messageObj);
        let {Receiver:receiverID,Message:message}=messageObj;
        let receiver=this.#m_UserManager.GetUserByID(receiverID);
        if(receiver===null){
            throw new Error("The receiver does not exist");
        }
        return this.#m_MessageManager.SendMessage(sender,receiver,message);
    }
        #CheckMessageObj(messageObj){
            if(!UTILITY.InstanceOf_Soft(MessageStruct,messageObj)){
                throw new Error("The messageObj is not a instance of MessageStruct");
            }
        }
    async #Broadcast(sender,data){
        let broadcastObj=data;
        let ret=[];
        this.#CheckBroadcastObj(broadcastObj);
        let {Broadcast:broadcast}=broadcastObj;
        for(let receiver of this.#m_UserManager.GetUsers()){
            let result;
            try{
                if(sender!=receiver){
                    result=await this.#SendMessage(sender,{Receiver:receiver,Message:broadcast})
                }
            }catch(e){
                result=e;
            }
            ret.push(result);
        }
        return ret
    }
        #CheckBroadcastObj(broadcastObj){
            if(!UTILITY.InstanceOf_Soft(BroadcastStruct,broadcastObj)){
                throw new Error("The obj is not a instance of BroadcastStruct");
            }
        }
    async #Logout(sender){
        await this.#m_UserManager.RemoveUser_Async(sender);
    }
    async #GetUsers(sender){
        return this.#m_UserManager.GetUsers();
    }
}
class UserManager{
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
            user.ID="";
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
        return [...this.#m_Users.keys()];
    }
}