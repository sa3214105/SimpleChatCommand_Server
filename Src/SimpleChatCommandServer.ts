import { Mutex } from "async-mutex";
export type User = {
    ID: string;
    Name: string;
}
//TODO 無法約束 來源ID跟用戶ID 未確定Map是否正常
export interface Client {
}

export type Request = {
    Command: string;
    Data: Object;
}
export function isRequest(object:any):object is Request{
    return object && typeof(object.Command) === "string" && typeof(object.Data) === "object";
}

export type LoginParameter = {
    UserID: string;
    Password: string;
}
export function isLoginParameter(obj: any): obj is LoginParameter {
    return obj && typeof(obj.UserID) === "string" && typeof(obj.Password) === "string";
}

export type SendMessageParameter = {
    Receiver: string;
    Message: string;
}
export function isSendMessageParameter(obj: any): obj is SendMessageParameter {
    return obj && typeof(obj.Receiver) === "string" && typeof(obj.Message) === "string";
}

export type BroadcastParameter = {
    Broadcast: string;
}
export function isBroadcastParameter(obj: any): obj is BroadcastParameter {
    return obj && typeof(obj.Broadcast) === "string";
}

export class Response {
    Command: string = "";
    State: string = "";
    Data: object | null = null;
    constructor(command: string, state: string, data: object | null) {
        this.Command = command;
        this.State = state;
        this.Data = data;
    }
}
export class MessagePackageStruct{
    Sender: string;
    Receiver: string;
    Message: string;
    constructor(sender: string, receiver: string, message: string,) {
        this.Sender = sender;
        this.Receiver = receiver;
        this.Message = message;
    }
}
export interface IMessageManager {
    //TODO object 改 Response
    sendMessage(receiver: Client, data: MessagePackageStruct): boolean;
    onMessage(listener: (client: Client, command: Request) => Promise<Response>): void;
    onUserConnect(listener: (client: Client) => void): void;
    onUserDisconnect(listener: (client: Client) => void): void;
}
export interface IAuthenticator {
    createUser(userName: string, password: string): Promise<boolean>;
    auth(userName: string, password: string): Promise<User | null>
}
class UserManager {
    private Mutex = new Mutex();
    private ClientUserMap: Map<Client,User> = new Map();
    private IDMap: Map<string,{user:User,client:Client}> = new Map();
    async AddUser_Async(client:Client,user: User) {
        let ret = false;
        const release = await this.Mutex.acquire();
        if (!this.ClientUserMap.has(client) &&
            !this.IDMap.has(user.ID)){
            this.ClientUserMap.set(client, user);
            this.IDMap.set(user.ID, {user,client});
            ret = true;
        }
        release();
        return ret;
    }
    async RemoveUser_Async(client:Client) {
        let ret = false;
        const release = await this.Mutex.acquire();
        if (this.ClientUserMap.has(client)) {
            const user = this.ClientUserMap.get(client);
            if(user){
                ret = this.ClientUserMap.delete(client) && this.IDMap.delete(user.ID);
            }
        }
        release();
        return ret;
    }
    GetClientByID(userID:string){
        return this.IDMap.get(userID)?.client;
    }
    GetUserByID(userID: string) {
        return this.IDMap.get(userID)?.user;
    }
    GetUserByClient(client: Client) {
        return this.ClientUserMap.get(client);
    }
    GetUsers() {
        return Array.from(this.IDMap.values()).map(value=>value.user.ID);
    }
    GetClients() {
        return Array.from(this.IDMap.values()).map(value=>value.client);
    }
    GetUserWithClient(){
        return Array.from(this.IDMap.values());
    }
}
export class SimpleChatCommandServer {
    private Authenticator: IAuthenticator;
    private MessageManager: IMessageManager;
    private UserManager = new UserManager;
    private CommandMap: Map<string, (sender: Client, parameter: object) => Promise<object | null>>;
    constructor(authenticator: IAuthenticator, messageManager: IMessageManager) {
        this.Authenticator = authenticator;
        this.MessageManager = messageManager;
        this.MessageManager.onMessage(this.onMessage.bind(this));
        this.MessageManager.onUserDisconnect(client => {
            let user = this.UserManager.GetUserByClient(client);
            if(user){
                this.UserManager.RemoveUser_Async(user);
            }
        });
        this.CommandMap = new Map();
        this.initDefaultCommand();
    }
    private initDefaultCommand() {
        this.CommandMap.set("Login", this.login.bind(this));
        this.CommandMap.set("SendMessage", this.sendMessage.bind(this));
        this.CommandMap.set("Broadcast", this.broadcast.bind(this));
        this.CommandMap.set("Logout", this.logout.bind(this));
        this.CommandMap.set("GetUsers", this.getUsers.bind(this));
    }
    addCustomerCommand(name: string, listener: (sender: Client, commandObj: object) => Promise<object | null>) {
        this.CommandMap.set(name, listener);
    }
    private log(msg: string) {
        console.log(msg);
    }
    private async onMessage(client: Client, request: Request): Promise<Response> {
        try {
            if (this.UserManager.GetUserByClient(client) || request.Command === "Login") {
                let commandListener = this.CommandMap.get(request.Command);
                if (commandListener) {
                    return new Response(
                        request.Command,
                        "success",
                        await commandListener(client, request.Data)
                    );
                } else {
                    return new Response(request.Command, "failed", { err: "Command does not exist!" });
                }
            }
            else {
                return new Response(request.Command, "failed", { err: "No logging!" });
            }
        } catch (e) {
            let errorMsg = e instanceof Error ? e.message : "UnKnown error!";
            this.log(errorMsg);
            return new Response(request.Command, "failed", { err: errorMsg });
        }
    }
    private async login(client: Client, requestParam: object) {
        if (this.UserManager.GetUserByClient(client)) {
            throw new Error("The User Is Login");
        }
        if (!isLoginParameter(requestParam)) {
            throw new Error("Wrong Parameter");
        }
        if (this.UserManager.GetUserByID(requestParam.UserID)) {
            throw new Error("This account is already logged in by other user");
        }
        let user = await this.Authenticator.auth(requestParam.UserID, requestParam.Password)
        if (!user) {
            throw new Error("Wrong Username or Password");
        }
        await this.UserManager.AddUser_Async(client,user);
        return { User: user.ID };
    }
    private async sendMessage(client: Client, requestParam: object) {
        if (!isSendMessageParameter(requestParam)) {
            throw new Error("Wrong Parameter");
        }
        const receiver = this.UserManager.GetUserByID(requestParam.Receiver);
        if (!receiver) {
            throw new Error("The receiver does not exist");
        }
        const receiverClient = this.UserManager.GetClientByID(requestParam.Receiver);
        if(!receiverClient){
            throw new Error("The receiver does not exist");
        }
        const sender = this.UserManager.GetUserByClient(client);
        if (!sender) {
            throw new Error("No logging!");
        }
        const messageObject = new MessagePackageStruct(sender.ID,receiver.ID,requestParam.Message);
        if (!this.MessageManager.sendMessage(receiverClient, messageObject)) {
            throw new Error("Failed to send message!");
        }
        return null;
    }
    private async broadcast(client: Client, requestParam: object) {
        if (!isBroadcastParameter(requestParam)) {
            throw new Error("Wrong Parameter");
        }
        let sender = this.UserManager.GetUserByClient(client);
        if (!sender) {
            throw new Error("No logging!");
        }
        let ret = [];
        for (let receiver of this.UserManager.GetUserWithClient()) {
            if (sender !== receiver.user) {
                let messageObject = new MessagePackageStruct(sender.ID,receiver.user.ID,requestParam.Broadcast);
                let isSuccess = this.MessageManager.sendMessage(receiver.client, messageObject);
                ret.push({ id: receiver.user.ID, isSuccess });
            }
        }
        return ret;
    }
    private async logout(client: Client, requestParam: object) {
        let user = this.UserManager.GetUserByClient(client);
        if (!user) {
            throw new Error("No logging!");
        }
        //TODO 修正client無內容的問題
        if (!await this.UserManager.RemoveUser_Async(client)) {
            throw new Error("Logout Failed!");
        }
        return null;
    }
    private async getUsers(client: Client, requestParam: object) {
        if (!this.UserManager.GetUserByClient(client)) {
            throw new Error("No logging!");
        }
        return this.UserManager.GetUsers();
    }
}