import * as SCC from "../Src/CSimpleChatCommand.js";
class MessageManagerForTest extends SCC.IMessageManager{
    #m_EventListener=null;
    #m_LastMessage="";
    #m_LastHandlerResult="";
    async SendCommand_Async(CommandObj,sender){
        if(!sender){
            sender=new SCC.UserStruct("");
        }
        this.#m_LastHandlerResult=await this.#m_EventListener(sender,CommandObj);
        return sender;
    }
    GetLastMessage(){
        return this.#m_LastMessage;
    }
    GetLastHandlerResult(){
        return this.#m_LastHandlerResult;
    }
    //inheritance by IMessageManager
    SetMessageHandler(messageHandler){
        this.#m_EventListener=messageHandler;
    }
    SendMessage(sender,receiver,message){
        this.#m_LastMessage=
            `${JSON.stringify(sender)} -> ${JSON.stringify(receiver)}
            {${message}}`;
        console.log(this.#m_LastMessage);
        return true;
    }
}
class UserManagerForTest extends SCC.IUserManager{
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
test("CreateObject",()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
})
test("Login_HappyPath",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
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
    let userManager=new UserManagerForTest();
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
//Repeat login
test("Login_UnhappyPath_1",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
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
        "This user is already logged in"
    ))
})
test("Logout",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
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
test("SendMessage1",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
    let message="test";
    let senderLoginObj={
        Command:"Login",
        Data:{
            UserID:"user1",
            Password:"p@ssw0rd"
        }
    }
    let receiverLoginObj={
        Command:"Login",
        Data:{
            UserID:"user2",
            Password:"p@ssw0rd"
        }
    }
    let sender=await messageManager.SendCommand_Async(
        senderLoginObj
    );
    let receiver=await messageManager.SendCommand_Async(
        receiverLoginObj
    );
    let commandObj={
        Command:"SendMessage",
        Data:{
            Receiver:receiver.ID,
            Message:message
        }
    }
    let resultMessage=
            `${JSON.stringify(sender)} -> ${JSON.stringify(receiver)}
            {${message}}`;
    await messageManager.SendCommand_Async(
        commandObj,sender
    );
    expect(messageManager.GetLastMessage()).toBe(resultMessage);
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"SendMessage",
        State:"success",
        Data:true
    })
})