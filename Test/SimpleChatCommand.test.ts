import {SimpleChatCommandServer,IAuthenticator,IMessageManager, Client, Request, Response, User, isRequest, MessagePackageStruct} from "../Src/SimpleChatCommandServer"
class ClientForTest implements Client{
    static Index = 0;
    private ID:number;
    private Server:MessageServerForTest;
    public Messages:MessagePackageStruct[] = [];
    constructor(server:MessageServerForTest){
        this.ID = ClientForTest.Index++;
        this.Server = server;
    }
    connect(){
        this.Server.userConnect(this);
    }
    disconnect(){
        this.Server.userDisConnect(this);
    }
    setMessage(data:MessagePackageStruct){
        this.Messages.push(data);
    }
    async sendMessage(data:Request){
        return this.Server.userSendMessage(this,data);
    }
}
class MessageServerForTest implements IMessageManager{
    private m_Clients:Array<Client>=[];
    private m_MessageListener:((client: Client, command: Request) => Promise<Response>)|null=null;
    private m_ConnectListener:((client:Client)=>void)|null=null;
    private m_DisConnectListener:((client:Client)=>void)|null=null;
    public ResponseStack:Array<{receiver:Client,response:Response}>=[];
    userConnect(client:ClientForTest){
        if(this.m_ConnectListener){
            this.m_ConnectListener(client);
        }
    }
    userDisConnect(client:ClientForTest){
        if(this.m_DisConnectListener){
            this.m_DisConnectListener(client);
        }
    }
    async userSendMessage(client: ClientForTest,data: Request){
        if(this.m_MessageListener){
            //TODO 確認isRequest是否需要存在
            // if(isRequest(data))
            {
                const response = await this.m_MessageListener(client,data)
                this.ResponseStack.push({receiver:client,response});
                return response;
            }
        }
    }
    sendMessage(receiver: Client, data: MessagePackageStruct): boolean {
        //TODO Client正常判斷
        const receiverTest = receiver as ClientForTest;
        receiverTest.setMessage(data);
        return true;
    }
    getLastResponse(){
        return this.ResponseStack[this.ResponseStack.length-1];
    }
    onMessage(listener: (client: Client, command: Request) => Promise<Response>): void {
        this.m_MessageListener = listener;
    }
    onUserConnect(listener: (client: Client) => void): void {
        this.m_ConnectListener = listener;
    }
    onUserDisconnect(listener: (client: Client) => void): void {
        this.m_DisConnectListener = listener;
    }
}
type DefaultUser = User & {password:string};
const user1: DefaultUser = {ID:"test",Name:"testAlias",password:"p@ssw0rd"};
const user2: DefaultUser =  {ID:"test2",Name:"test2Alias",password:"p@ssw0rd"};
const user3: DefaultUser =  {ID:"test3",Name:"test3Alias",password:"p@ssw0rd"};
class AuthenticatorForTest implements IAuthenticator{
    private m_Users:Map<string,User>;
    private m_Index:number = 1;
    constructor(){
        this.m_Users =new Map([
            [
                JSON.stringify({userName:"test",password:"p@ssw0rd"}),
                user1
            ],
            [
                JSON.stringify({userName:"test2",password:"p@ssw0rd"}),
                user2
            ],
            [
                JSON.stringify({userName:"test3",password:"p@ssw0rd"}),
                user3
            ]
        ]);
    }
    async createUser(userName: string, password: string): Promise<boolean> {
        if(this.m_Users.has(JSON.stringify({userName,password}))){
            return false;
        }
        this.m_Users.set(
            JSON.stringify({userName,password}),
            {
                ID:(this.m_Index++).toString(),
                Name:userName
            }
            );
        return true;
    }
    async auth(userName: string, password: string): Promise<User | null> {  
        return this.m_Users.get(JSON.stringify({userName,password}))??null;
    }

}
function getInitObject(){
    const messageServer = new MessageServerForTest();
    const authenticator = new AuthenticatorForTest();
    const sccServer = new SimpleChatCommandServer(authenticator,messageServer);
    return{
        messageServer,
        authenticator,
        sccServer
    }
}
function getSuccessLoginCommand(user:DefaultUser){
    return {
        Command:"Login",
        Data:{
            UserID:user.ID,
            Password:user.password
        }
    };
}
function getFailedLoginCommand(){
    return {
        Command:"Login",
        Data:{
            UserID:"test",
            Password:"wrong_p@ssw0rd"
        }
    };
}
test("Login_HappyPath",async ()=>{
    const {messageServer,authenticator,sccServer} = getInitObject();
    const loginObj = getSuccessLoginCommand(user1);
    const client = new ClientForTest(messageServer);
    await client.sendMessage(loginObj);
    const lastMessage = messageServer.getLastResponse();
    expect(lastMessage.receiver===client).toBe(true);
    expect(lastMessage.response).toEqual(new Response("Login","success",{User:"test"}));
});
//Wrong password
test("Login_UnhappyPath_0",async()=>{
    const {messageServer,authenticator,sccServer} = getInitObject();
    const loginObj=getFailedLoginCommand();
    const client = new ClientForTest(messageServer);
    const user=await messageServer.userSendMessage(client,loginObj);
    const lastMessage = messageServer.getLastResponse();
    expect(lastMessage.receiver===client).toBe(true);
    expect(lastMessage.response).toEqual(new Response("Login","failed",{err:"Wrong Username or Password"}));
})
//Login to an account already be signed by other client
test("Login_UnhappyPath_1",async()=>{
    const {messageServer,authenticator,sccServer} = getInitObject();
    const loginObj=getSuccessLoginCommand(user1);
    const client1 = new ClientForTest(messageServer);
    await client1.sendMessage(loginObj);
    const lastMessage1 = messageServer.getLastResponse();
    expect(lastMessage1.receiver===client1).toBe(true);
    expect(lastMessage1.response).toEqual(new Response("Login","success",{User:"test"}));
    const client2 = new ClientForTest(messageServer);
    await client2.sendMessage(loginObj);
    const lastMessage2 = messageServer.getLastResponse();
    expect(lastMessage2.receiver===client2).toBe(true);
    //TODO user重構
    expect(lastMessage2.response).toEqual(new Response("Login","failed",{err:"This account is already logged in by other user"}));
})
//Repeat login
test("Login_UnhappyPath_2",async()=>{
    const {messageServer,authenticator,sccServer} = getInitObject();
    const loginObj=getSuccessLoginCommand(user1);
    const client = new ClientForTest(messageServer);
    await client.sendMessage(loginObj);
    await client.sendMessage(loginObj);
    expect(messageServer.getLastResponse().response).toEqual(new Response("Login","failed",{err:"The User Is Login"}));
})
test("Logout_HappyPath",async()=>{
    const {messageServer,authenticator,sccServer} = getInitObject();
    const loginObj=getSuccessLoginCommand(user1);
    const logoutObj={
        Command:"Logout",
        Data:{}
    }
    const client1 = new ClientForTest(messageServer);
    await client1.sendMessage(loginObj);
    expect(messageServer.getLastResponse().response).toEqual(new Response(
        "Login",
        "success",
        {User:loginObj.Data.UserID}
    ));
    await messageServer.userSendMessage(client1,logoutObj);
    expect(messageServer.getLastResponse().response).toEqual(new Response(
        "Logout",
        "success",
        null
    ))
    const client2 = new ClientForTest(messageServer);
    await client2.sendMessage(loginObj);
    expect(messageServer.getLastResponse().receiver).toEqual(client2);
    expect(messageServer.getLastResponse().response).toEqual(new Response(
        loginObj.Command,
        "success",
        {User:loginObj.Data.UserID}
    ))
})
// //logout before login
test("Logout_UnhappyPath",async()=>{
    const {messageServer,authenticator,sccServer} = getInitObject();
    const client1 = new ClientForTest(messageServer);
    const logoutObj={
        Command:"Logout",
        Data:{}
    }
    await client1.sendMessage(logoutObj);
    expect(messageServer.getLastResponse().response).toEqual(new Response(
        logoutObj.Command,
        "failed",
        {
            "err": "No logging!",
        }
    ));
})
//TODO disconnect logout
test("SendMessage_HappyPath",async()=>{
    let {messageServer,authenticator,sccServer}=getInitObject();
    let message="test";

    const senderClient = new ClientForTest(messageServer);
    const senderLoginObj = getSuccessLoginCommand(user1);
    const result1 = await senderClient.sendMessage(senderLoginObj);
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:senderLoginObj.Data.UserID}
    ));

    const receiverClient = new ClientForTest(messageServer);
    const receiverLoginObj = getSuccessLoginCommand(user2);
    const result2 = await receiverClient.sendMessage(receiverLoginObj);
    expect(result2).toEqual(new Response(
        "Login",
        "success",
        {User:receiverLoginObj.Data.UserID}
    ));

    let commandObj = {
        Command:"SendMessage",
        Data:{
            Receiver:receiverLoginObj.Data.UserID,
            Message:message
        }
    }
    
    const result3 = await senderClient.sendMessage(commandObj);
    expect(result3).toEqual(new Response(
        "SendMessage",
        "success",
        null
    ));
    
    const receiverLastMessage = receiverClient.Messages[receiverClient.Messages.length - 1];
    expect(receiverLastMessage).toEqual(
        new MessagePackageStruct(
            user1.ID,
            user2.ID,
            message
        )
    );
})
//the receiver does not exist
test("SendMessage_UnhappyPath",async()=>{
    let {messageServer,authenticator,sccServer}=getInitObject();
    let message="test";

    const senderClient = new ClientForTest(messageServer);
    const senderLoginObj = getSuccessLoginCommand(user1);
    const result1 = await senderClient.sendMessage(senderLoginObj);
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:senderLoginObj.Data.UserID}
    ));

    let commandObj = {
        Command:"SendMessage",
        Data:{
            Receiver:user2.ID,
            Message:message
        }
    }
    
    const result2 = await senderClient.sendMessage(commandObj);
    expect(result2).toEqual(new Response(
        "SendMessage",
        "failed",
        {
            err: "The receiver does not exist"
        }
    ));
})
test("Broadcast_HappyPath",async()=>{
    const {messageServer,authenticator,sccServer}=getInitObject();
    
    const client1 = new ClientForTest(messageServer);
    const user1LoginObj = getSuccessLoginCommand(user1);
    const result1 = await client1.sendMessage(user1LoginObj);
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:user1.ID}
    ));

    const client2 = new ClientForTest(messageServer);
    const user2LoginObj = getSuccessLoginCommand(user2);
    const result2 = await client2.sendMessage(user2LoginObj);
    expect(result2).toEqual(new Response(
        "Login",
        "success",
        {User:user2.ID}
    ));

    const client3 = new ClientForTest(messageServer);
    const user3LoginObj = getSuccessLoginCommand(user3);
    const result3 = await client3.sendMessage(user3LoginObj);
    expect(result3).toEqual(new Response(
        "Login",
        "success",
        {User:user3.ID}
    ));


    let broadcastCommandObj={
        Command:"Broadcast",
        Data:{
            Broadcast:"test"
        }
    }
    const result4 = await client1.sendMessage(broadcastCommandObj);
    expect(result4).toEqual(new Response(
        "Broadcast",
        "success",
        [
            {id:user2.ID,isSuccess:true},
            {id:user3.ID,isSuccess:true}
        ]
    ));

    const broadcast1 = client2.Messages[client2.Messages.length - 1];
    expect(broadcast1).toEqual(new MessagePackageStruct(
        user1.ID,
        user2.ID,
        "test"
    ));
    const broadcast2 = client3.Messages[client3.Messages.length - 1];
    expect(broadcast2).toEqual(new MessagePackageStruct(
        user1.ID,
        user3.ID,
        "test"
    ));
})
//Wrong Broadcast Struct
test("Broadcast_UnHappyPath",async()=>{
    const {messageServer,authenticator,sccServer}=getInitObject();
    
    const client1 = new ClientForTest(messageServer);
    const result1 = await client1.sendMessage(getSuccessLoginCommand(user1));
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:user1.ID}
    ));

    const result2 = await client1.sendMessage({
        Command:"Broadcast",
        Data:{}
    });
    expect(result2).toEqual({
        Command:"Broadcast",
        State:"failed",
        Data:{
            err:"Wrong Parameter"
        }
    })
})
test("GetUsers",async()=>{
    const {messageServer,authenticator,sccServer}=getInitObject();

    const client1 = new ClientForTest(messageServer);
    const result1 = await client1.sendMessage(getSuccessLoginCommand(user1));
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:user1.ID}
    ));
    const client2 = new ClientForTest(messageServer);
    const result2 = await client2.sendMessage(getSuccessLoginCommand(user2));
    expect(result2).toEqual(new Response(
        "Login",
        "success",
        {User:user2.ID}
    ));
    const client3 = new ClientForTest(messageServer);
    const result3 = await client3.sendMessage(getSuccessLoginCommand(user3));
    expect(result3).toEqual(new Response(
        "Login",
        "success",
        {User:user3.ID}
    ));

    const result4 = await client1.sendMessage({
        Command:"GetUsers",
        Data:{}
    });
    expect(result4).toEqual({
        Command:"GetUsers",
        State:"success",
        Data:[
            user1.ID,
            user2.ID,
            user3.ID
        ]
    })
})
test("WrongCommandStruct",async()=>{
    const {messageServer,authenticator,sccServer}=getInitObject();

    const client1 = new ClientForTest(messageServer);
    const result1 = await client1.sendMessage(getSuccessLoginCommand(user1));
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:user1.ID}
    ));

    const result2 = await client1.sendMessage({
        Command:"Test",
        Data:""
    });
    expect(result2).toEqual({
        Command:"Test",
        State:"failed",
        Data:{
            err:"Command does not exist!"
        }
    })
})
test("AddCustomerCommand",async()=>{
    const {messageServer,authenticator,sccServer}=getInitObject();
    sccServer.addCustomerCommand("Customer1",async(sender,data)=>{
        return {sender,data};
    })

    const client = new ClientForTest(messageServer);
    const result1 = await client.sendMessage(getSuccessLoginCommand(user1));
    expect(result1).toEqual(new Response(
        "Login",
        "success",
        {User:user1.ID}
    ));

    const result2 = await client.sendMessage({
        Command:"Customer1",
        Data:"test"
    });
    expect(result2).toEqual({
        Command:"Customer1",
        State:"success",
        Data:{data:"test",sender:client}
    })
})