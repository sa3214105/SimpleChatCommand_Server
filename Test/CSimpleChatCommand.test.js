import * as SCC from "../Src/CSimpleChatCommand.js";
class MessageManagerForTest extends SCC.IMessageManager{
    #m_EventListener=null;
    #m_LastMessage="";
    #m_LastHandlerResult="";
    async SendCommand(sender,CommandObj){
        this.#m_LastHandlerResult=await this.#m_EventListener(sender,CommandObj);
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
        "user1",
        "user2",
        "user12"
    ]
    async CreateUser(userName,password){
        this.m_Users.push(userName);
    }
    async Auth(userName,password){
       return this.m_Users.find(user=>user===userName);
    }
}
test("CreateObject",()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
})
test("SendMessage",async()=>{
    let messageManager=new MessageManagerForTest();
    let userManager=new UserManagerForTest();
    let sccObj=new SCC.SimpleChatCommand(userManager,messageManager);
    let sender=new SCC.UserStruct("");
    let receiver=new SCC.UserStruct("");
    let message="test";
    let loginObj={
        Command:"Login",
        Data:{
            UserID:"user1",
            Password:""
        }
    }
    let loginObj2={
        Command:"Login",
        Data:{
            UserID:"user2",
            Password:""
        }
    }
    await messageManager.SendCommand(
        sender,
        loginObj
    );
    await messageManager.SendCommand(
        receiver,
        loginObj2
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
    await messageManager.SendCommand(
        sender,
        commandObj
    );
    expect(messageManager.GetLastMessage()).toBe(resultMessage);
    expect(messageManager.GetLastHandlerResult()).toEqual({
        Command:"SendMessage",
        State:"success",
        Data:true
    })
})