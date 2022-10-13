import * as SCC from "../Src/CSimpleChatCommand.js";
class MessageManagerForTest extends SCC.IMessageManager{
    #m_EventListener=null;
    MessageObjList=[];
    HandlerResultList=[];
    async SendCommand_Async(CommandObj,sender){
        if(!sender){
            sender=new SCC.UserStruct("");
        }
        this.HandlerResultList.push(await this.#m_EventListener(sender,CommandObj));
        return sender;
    }
    GetLastMessage(){
        return this.MessageObjList[this.MessageObjList.length-1];
    }
    GetLastHandlerResult(){
        return this.HandlerResultList[this.HandlerResultList.length-1];
    }
    IsAllResultSuccess(){
        return this.HandlerResultList.every((result)=>result.State==="success");
    }
    //inheritance by IMessageManager
    SetMessageHandler(messageHandler){
        this.#m_EventListener=messageHandler;
    }
    SendMessage(sender,receiver,message){
        this.MessageObjList.push({sender,receiver,message})
        return true;
    }
}
class UserValidatorForTest extends SCC.IUserManager{
    m_Users=[
        ["user1","p@ssw0rd"],
        ["user2","p@ssw0rd"],
        ["user3","p@ssw0rd"],
    ]
    async CreateUser(userName,password){
        this.m_Users.push(userName);
    }
    async Auth(userName,password){
       return this.m_Users.find(user=>user[0]===userName&&user[1]===password);
    }
}
function init(){
    let MessageManager=new MessageManagerForTest();
    let UserManager=new UserValidatorForTest();
    let SccObj=new SCC.SimpleChatCommand(UserManager,MessageManager)
    return {
        MessageManager,
        UserManager,
        SccObj};
}
function GetLoginObj(userID,password){
    return {
        Command:"Login",
        Data:{
            UserID:userID||"user1",
            Password:password||"p@ssw0rd"
        }
    }
}
test("CreateObject",()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserValidatorForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
})
test("Login_HappyPath",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserValidatorForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
    let loginObj={
        Command:"Login",
        Data:{
            UserID:"user1",
            Password:"p@ssw0rd"
        }
    }
    let user=await messageManager.SendCommand_Async(loginObj);
    expect(user.IsLoggedIn()).toBe(true);
    expect(user.ID).toBe(loginObj.Data.UserID);
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        loginObj.Command,
        "success",
        {User:loginObj.Data.UserID}
    ));
})
//Wrong password
test("Login_UnhappyPath_0",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserValidatorForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
    let loginObj={
        Command:"Login",
        Data:{
            UserID:"user1",
            Password:"wrong_p@ssw0rd"
        }
    }
    let user=await messageManager.SendCommand_Async(loginObj);
    expect(user.IsLoggedIn()).toBe(false);
    expect(user.ID).toBe("");
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        loginObj.Command,
        "failed",
        "Wrong UserID or Password"
    ));
})
//Login to an account already signed in
test("Login_UnhappyPath_1",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserValidatorForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
    let loginObj={
        Command:"Login",
        Data:{
            UserID:"user1",
            Password:"p@ssw0rd"
        }
    }
    let user1=await messageManager.SendCommand_Async(loginObj);
    expect(user1.IsLoggedIn()).toBe(true);
    expect(user1.ID).toBe(loginObj.Data.UserID);
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        loginObj.Command,
        "success",
        {User:loginObj.Data.UserID}
    ));
    let user2=await messageManager.SendCommand_Async(loginObj);
    expect(user2.IsLoggedIn()).toBe(false);
    expect(user2.ID).toBe("");
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        loginObj.Command,
        "failed",
        "This account is already logged in"
    ))
})
//Repeat login
test("Login_UnhappyPath_2",async()=>{
    let {MessageManager:messageManager}=init();
    let loginObj=GetLoginObj("user1");
    let sender=await messageManager.SendCommand_Async(loginObj);
    await messageManager.SendCommand_Async(loginObj,sender);
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"Login",
        State:"failed",
        Data:"The User Is Login"
    });
})
//Wrong login struct
test("Login_UnHappyPath_3",async()=>{
    let {MessageManager:messageManager}=init();
    await messageManager.SendCommand_Async({
        Command:"Login",
        Data:{}
    })
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"Login",
        State:"failed",
        Data:"Wrong Login Struct"
    })
})
test("Logout_HappyPath",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserValidatorForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
    let loginObj={
        Command:"Login",
        Data:{
            UserID:"user1",
            Password:"p@ssw0rd"
        }
    }
    let logoutObj={
        Command:"Logout",
        Data:""
    }
    let user1=await messageManager.SendCommand_Async(loginObj);
    expect(user1.IsLoggedIn()).toBe(true);
    expect(user1.ID).toBe(loginObj.Data.UserID);
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        loginObj.Command,
        "success",
        {User:loginObj.Data.UserID}
    ));
    await messageManager.SendCommand_Async(logoutObj,user1);
    expect(user1.IsLoggedIn()).toBe(false);
    expect(user1.ID).toBe("");
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        logoutObj.Command,
        "success"
    ))
    let user2=await messageManager.SendCommand_Async(loginObj);
    expect(user2.IsLoggedIn()).toBe(true);
    expect(user2.ID).toBe(loginObj.Data.UserID);
    expect(messageManager.GetLastHandlerResult()).toEqual(new SCC.MessageHandlerResult(
        loginObj.Command,
        "success",
        {User:loginObj.Data.UserID}
    ))
})
//logout before login
test("LogOut_UnhappyPath",async()=>{
    let {MessageManager:messageManager}=init();
    await messageManager.SendCommand_Async({
        Command:"Logout",
        Data:""
    })
    expect(messageManager.IsAllResultSuccess()).toBe(false);
})
test("SendMessage_HappyPath",async()=>{
    let {MessageManager:messageManager}=init();
    let message="test";
    let senderID="user1";
    let receiverID="user2";
    let sender=await messageManager.SendCommand_Async(
        GetLoginObj(senderID)
    );
    let receiver=await messageManager.SendCommand_Async(
        GetLoginObj(receiverID)
    );
    let commandObj={
        Command:"SendMessage",
        Data:{
            Receiver:receiverID,
            Message:message
        }
    }
    await messageManager.SendCommand_Async(
        commandObj,sender
    );
    expect(messageManager.GetLastMessage()).toEqual({sender,receiver,message});
    expect(messageManager.IsAllResultSuccess()).toBe(true);
})
//the receiver does not exist
test("SendMessage_UnhappyPath",async()=>{
    let {MessageManager:messageManager}=init();
    let senderID="user1";
    let receiverID="user2";
    let sender=await messageManager.SendCommand_Async(GetLoginObj(senderID));
    await messageManager.SendCommand_Async({
        Command:"SendMessage",
        Data:{
            Receiver:receiverID,
            Message:"test"
        }
    },sender);
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"SendMessage",
        State:"failed",
        Data:"The receiver does not exist"
    });
})
test("Broadcast_HappyPath",async()=>{
    let {MessageManager:messageManager}=init();
    let senderID="user1";
    let receiverIDs=["user2","user3"];
    let sender=await messageManager.SendCommand_Async(GetLoginObj(senderID));
    let receivers=await Promise.all(
        receiverIDs.map(receiverID=>messageManager.SendCommand_Async(GetLoginObj(receiverID)))
    )
    let broadcastCommandObj={
        Command:"Broadcast",
        Data:{
            Broadcast:"test"
        }
    }
    await messageManager.SendCommand_Async(broadcastCommandObj,sender);
    for(let receiver of receivers){
        let cmpResult=messageManager.MessageObjList.some(message=>{
            return message.sender===sender&&message.receiver===receiver
        })
        expect(cmpResult).toBe(true);
    }
    expect(messageManager.IsAllResultSuccess()).toBe(true);
})
//Wrong Broadcast Struct
test("Broadcast_UnHappyPath",async()=>{
    let {MessageManager:messageManager}=init();
    let sender=await messageManager.SendCommand_Async(GetLoginObj("user1"));
    await messageManager.SendCommand_Async({
        Command:"Broadcast",
        Data:{}
    },sender);
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"Broadcast",
        State:"failed",
        Data:"The obj is not a instance of BroadcastStruct"
    })
})
test("WrongCommandStruct",async()=>{
    let {MessageManager:messageManager}=init();
    await messageManager.SendCommand_Async({});
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"",
        State:"failed",
        Data:"The obj is not a instance of CommandStruct"
    })
    await messageManager.SendCommand_Async({
        Command:"Test",
        Data:""
    });
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"",
        State:"failed",
        Data:"Wrong Command"
    })
})
test("AddCustomerCommand",async()=>{
    let {MessageManager:messageManager,SccObj:sccObj}=init();
    sccObj.AddCustomerCommand("Customer1",async(sender,data)=>{
        return {sender,data};
    })
    let sender=await messageManager.SendCommand_Async(GetLoginObj("user1"));
    await messageManager.SendCommand_Async({
        Command:"Customer1",
        Data:"test"
    },sender);
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"Customer1",
        State:"success",
        Data:{data:"test",sender}
    })
})